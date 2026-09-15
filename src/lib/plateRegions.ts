export type PlateBox = { x0: number; y0: number; x1: number; y1: number; score: number };

/** YOLOv8: [1,5,8400], koordinat pusat/lebar/tinggi + probabilitas plat. */
export function findPlateRegions(data: ArrayLike<number>, count: number, width: number, height: number): PlateBox[] {
  if (data.length !== count * 5 || count <= 0 || width <= 0 || height <= 0) throw new Error('Format hasil deteksi plat tidak sesuai.');
  const scale = Math.min(640 / width, 640 / height);
  const offsetX = (640 - Math.round(width * scale)) / 2;
  const offsetY = (640 - Math.round(height * scale)) / 2;
  const boxes: PlateBox[] = [];
  for (let i = 0; i < count; i++) {
    const score = data[4 * count + i];
    const cx = data[i], cy = data[count + i], w = data[2 * count + i], h = data[3 * count + i];
    if (![score, cx, cy, w, h].every(Number.isFinite) || score < .3 || w <= 0 || h <= 0) continue;
    const box = {
      x0: Math.max(0, (cx - w * .58 - offsetX) / scale),
      y0: Math.max(0, (cy - h * .65 - offsetY) / scale),
      x1: Math.min(width, (cx + w * .58 - offsetX) / scale),
      y1: Math.min(height, (cy + h * .65 - offsetY) / scale), score,
    };
    if (box.x1 > box.x0 && box.y1 > box.y0) boxes.push(box);
  }
  // Non-maximum suppression: satu plat biasanya diprediksi oleh banyak anchor.
  const kept: PlateBox[] = [];
  for (const box of boxes.sort((a,b) => b.score - a.score)) {
    if (kept.some((other) => {
      const overlap = Math.max(0, Math.min(box.x1, other.x1) - Math.max(box.x0, other.x0)) * Math.max(0, Math.min(box.y1, other.y1) - Math.max(box.y0, other.y0));
      const area = (box.x1-box.x0)*(box.y1-box.y0)+(other.x1-other.x0)*(other.y1-other.y0)-overlap;
      return overlap / area > .45;
    })) continue;
    kept.push(box);
  }
  return kept;
}
