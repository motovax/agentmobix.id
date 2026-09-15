// Runtime model dilayani dari origin aplikasi; foto tidak dikirim ke layanan luar.
import { mkdir, copyFile } from 'node:fs/promises';
const target = new URL('../public/plate-runtime/v1/', import.meta.url);
await mkdir(target, { recursive: true });
for (const name of ['ort.wasm.min.mjs', 'ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']) {
  await copyFile(new URL(`../node_modules/onnxruntime-web/dist/${name}`, import.meta.url), new URL(name, target));
}
await copyFile(new URL('../node_modules/onnxruntime-web/README.md', import.meta.url), new URL('README.md', target));
