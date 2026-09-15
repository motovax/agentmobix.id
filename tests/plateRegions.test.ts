import { describe, expect, test } from 'bun:test';
import { findPlateRegions } from '../src/lib/plateRegions';
const output = (boxes: number[][]) => Float32Array.from(Array.from({length:5}, (_,i)=>boxes.map(b=>b[i])).flat());
describe('koordinat deteksi plat YOLO', () => {
  test('menghapus letterbox dan menambahkan margin plat', () => {
    const [box] = findPlateRegions(output([[320,320,160,40,.9]]), 1, 1600, 900);
    expect(box.x0).toBeCloseTo(568);
    expect(box.x1).toBeCloseTo(1032);
    expect(box.y0).toBeCloseTo(385);
    expect(box.y1).toBeCloseTo(515);
  });
  test('menekan deteksi duplikat tetapi mempertahankan plat lain', () => {
    const boxes = findPlateRegions(output([[320,320,160,40,.9], [322,321,160,40,.8], [60,60,40,20,.7]]), 3, 640, 640);
    expect(boxes).toHaveLength(2);
    expect(boxes[0].score).toBeCloseTo(.9);
  });
  test('menolak skor rendah, NaN, kotak kosong dan format model salah', () => {
    expect(findPlateRegions(output([[320,320,100,30,.1], [NaN,50,10,10,.8], [50,50,0,20,.9]]), 3,640,640)).toEqual([]);
    expect(()=>findPlateRegions(new Float32Array(4),1,640,640)).toThrow();
  });
  test('membatasi blur pada tepi gambar termasuk orientasi potret', () => {
    const [box] = findPlateRegions(output([[140,10,160,80,.9]]),1,600,1200);
    expect(box.x0).toBe(0);
    expect(box.y0).toBe(0);
    expect(box.x1).toBeLessThanOrEqual(600);
    expect(box.y1).toBeLessThanOrEqual(1200);
  });
});
