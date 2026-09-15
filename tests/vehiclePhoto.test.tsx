import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { VehiclePhoto } from '../src/components/VehiclePhoto';
test('foto dan placeholder asli tidak tampil sebelum pemeriksaan plat', () => {
  const html = renderToStaticMarkup(<VehiclePhoto src="https://example.com/original.jpg" placeholderSrc="https://example.com/thumb.jpg" alt="Mobil" className="aspect-video" />);
  expect(html).not.toContain('original.jpg');
  expect(html).not.toContain('thumb.jpg');
  expect(html).toContain('Memeriksa plat');
});
test('foto kosong tetap menampilkan keterangan yang sesuai', () => {
  const html = renderToStaticMarkup(<VehiclePhoto emptyLabel="Foto belum tersedia" />);
  expect(html).toContain('Foto belum tersedia');
  expect(html).not.toContain('Memeriksa plat');
});
