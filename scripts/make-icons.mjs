/**
 * Regenerates the PNG/ICO icons from public/favicon.svg.
 * Usage: node scripts/make-icons.mjs   (requires the "sharp" package, already installed)
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../public/', import.meta.url).pathname;
const svg = readFileSync(root + 'favicon.svg', 'utf8');
// Full-bleed variant (square corners) for platforms that apply their own mask
const square = svg.replace(/rx="[^"]+"/, 'rx="0"');

const png = (src, size) => sharp(Buffer.from(src), { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();

writeFileSync(root + 'apple-touch-icon.png', await png(square, 180));
writeFileSync(root + 'icon-192.png', await png(svg, 192));
writeFileSync(root + 'icon-512.png', await png(svg, 512));
writeFileSync(root + 'icon-maskable-512.png', await png(square, 512));

// favicon.ico with 16, 32 and 48 px PNG images
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map((s) => png(svg, s)));
const header = Buffer.alloc(6 + 16 * images.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);
let offset = header.length;
images.forEach((img, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(sizes[i], e);
  header.writeUInt8(sizes[i], e + 1);
  header.writeUInt8(0, e + 2);
  header.writeUInt8(0, e + 3);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(img.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += img.length;
});
writeFileSync(root + 'favicon.ico', Buffer.concat([header, ...images]));
console.log('Icons written to public/');
