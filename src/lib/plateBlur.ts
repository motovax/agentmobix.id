import type { InferenceSession } from 'onnxruntime-web';
import { findPlateRegions } from './plateRegions';

export type PlateBlurResult = { blob: Blob; detected: number };
let model: Promise<InferenceSession> | undefined;
let queue: Promise<unknown> = Promise.resolve();
const cache = new Map<string, Promise<PlateBlurResult>>();
const cacheSizes = new Map<string, number>();

function loadRuntime(): Promise<typeof import('onnxruntime-web')> {
  const url = new URL(`${import.meta.env.BASE_URL}plate-runtime/v1/ort.wasm.min.mjs`, location.origin).href;
  return import(/* @vite-ignore */ url);
}

async function getModel() {
  if (!model) {
    model = (async () => {
      const ort = await loadRuntime();
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = true;
      ort.env.wasm.initTimeout = 30000;
      ort.env.wasm.wasmPaths = new URL(`${import.meta.env.BASE_URL}plate-runtime/v1/`, location.origin).href;
      const response = await fetch(`${import.meta.env.BASE_URL}models/license-plate-v1.onnx`, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('Model deteksi plat gagal dimuat.');
      return ort.InferenceSession.create(await response.arrayBuffer(), { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
    })().catch((error) => { model = undefined; throw error; });
  }
  return model;
}

/** Antrean tunggal membatasi CPU/memori saat banyak foto dibuka di ponsel. */
export function blurPlateBlob(blob: Blob): Promise<PlateBlurResult> {
  const task = queue.then(async () => {
    const bitmap = await createImageBitmap(blob);
    try {
      const instance = await getModel();
      const { Tensor } = await loadRuntime();
      const scale = Math.min(640 / bitmap.width, 640 / bitmap.height);
      const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 640;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Browser tidak mendukung pemrosesan foto.');
      ctx.fillStyle = '#727272'; ctx.fillRect(0, 0, 640, 640);
      ctx.drawImage(bitmap, (640-w)/2, (640-h)/2, w, h);
      const pixels = ctx.getImageData(0, 0, 640, 640).data;
      const tensor = new Float32Array(3 * 640 * 640);
      for (let i = 0; i < 640 * 640; i++) {
        tensor[i] = pixels[i*4]/255;
        tensor[640*640+i] = pixels[i*4+1]/255;
        tensor[2*640*640+i] = pixels[i*4+2]/255;
      }
      const input = new Tensor('float32', tensor, [1, 3, 640, 640]);
      let boxes;
      try {
        const outputs = await instance.run({ [instance.inputNames[0]]: input });
        try {
          const output = outputs[instance.outputNames[0]];
          if (output.dims.length !== 3 || output.dims[1] !== 5) throw new Error('Model deteksi plat tidak sesuai.');
          boxes = findPlateRegions(output.data as Float32Array, output.dims[2], bitmap.width, bitmap.height);
        } finally { for (const output of Object.values(outputs)) output.dispose(); }
      } finally { input.dispose(); }
      if (!boxes.length) return { blob, detected: 0 };
      const output = document.createElement('canvas');
      output.width = bitmap.width; output.height = bitmap.height;
      const out = output.getContext('2d')!;
      out.drawImage(bitmap, 0, 0);
      const patch = document.createElement('canvas'); patch.width = 6; patch.height = 2;
      const small = patch.getContext('2d')!;
      for (const box of boxes) {
        const x = box.x0, y = box.y0, w = box.x1-x, h = box.y1-y;
        small.drawImage(bitmap, x, y, w, h, 0, 0, 6, 2);
        out.save(); out.beginPath(); out.rect(x, y, w, h); out.clip();
        out.imageSmoothingEnabled = true;
        out.drawImage(patch, x, y, w, h);
        out.filter = `blur(${Math.max(4, h/6)}px)`;
        out.drawImage(patch, x-h, y-h, w+h*2, h*3);
        out.restore();
      }
      const protectedBlob = await new Promise<Blob>((resolve, reject) => output.toBlob(
        (value) => value ? resolve(value) : reject(new Error('Foto blur gagal disimpan.')), 'image/jpeg', .92,
      ));
      return { blob: protectedBlob, detected: boxes.length };
    } finally { bitmap.close(); }
  });
  queue = task.catch(() => undefined);
  return task;
}

export function blurPlateSource(src: string) {
  // Thumbnail dan lightbox berbagi hasil dengan detail cukup untuk plat kecil.
  const source = new URL(src, location.href);
  if (/^https?:$/.test(source.protocol) && source.searchParams.has('w')) {
    source.searchParams.set('w', '1600'); src = source.href;
  }
  const existing = cache.get(src);
  if (existing) return existing;
  const task = (async () => {
    const response = await fetch(src, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error('Foto gagal dimuat.');
    return blurPlateBlob(await response.blob());
  })();
  cache.set(src, task);
  if (cache.size > 40) {
    const oldest = cache.keys().next().value!;
    cache.delete(oldest); cacheSizes.delete(oldest);
  }
  void task.then((result) => {
    if (cache.get(src) !== task) return;
    cacheSizes.set(src, result.blob.size);
    let bytes = [...cacheSizes.values()].reduce((a, b) => a + b, 0);
    for (const [key, size] of cacheSizes) {
      if (bytes <= 24 * 1024 * 1024) break;
      cache.delete(key); cacheSizes.delete(key); bytes -= size;
    }
  }).catch(() => undefined);
  void task.catch(() => { if (cache.get(src) === task) cache.delete(src); });
  return task;
}
