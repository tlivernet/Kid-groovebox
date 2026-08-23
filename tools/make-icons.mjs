// Génère les icônes PNG de l'appli sans dépendance externe.
// Usage : node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, pixels) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filtre "none"
    pixels.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // 8 bits par canal
  ihdr[9] = 6;   // RVBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PADS = ['#ff5470', '#ff9f43', '#ffe14d', '#4dd2ff', '#b57bff', '#3ce88b'];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

/** Dessine la façade d'une groovebox : fond sombre + 4x4 pads colorés. */
function draw(size, margin) {
  const px = Buffer.alloc(size * size * 4);
  const bg = hex('#1c1c2b');
  const radius = size * 0.22;
  const inner = margin;
  const gridSize = size - inner * 2;
  const cell = gridSize / 4;
  const padGap = cell * 0.16;

  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Coins arrondis du fond (transparent en dehors).
      const dx = Math.max(radius - x, x - (size - 1 - radius), 0);
      const dy = Math.max(radius - y, y - (size - 1 - radius), 0);
      if (dx * dx + dy * dy > radius * radius) continue;
      set(x, y, bg);
    }
  }

  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const color = hex(PADS[(row * 4 + col) % PADS.length]);
      const x0 = inner + col * cell + padGap;
      const y0 = inner + row * cell + padGap;
      const x1 = inner + (col + 1) * cell - padGap;
      const y1 = inner + (row + 1) * cell - padGap;
      const r = (x1 - x0) * 0.25;
      for (let y = Math.floor(y0); y < y1; y++) {
        for (let x = Math.floor(x0); x < x1; x++) {
          const dx = Math.max(x0 + r - x, x - (x1 - r), 0);
          const dy = Math.max(y0 + r - y, y - (y1 - r), 0);
          if (dx * dx + dy * dy > r * r) continue;
          // Léger dégradé vertical pour donner du relief.
          const t = 1 - ((y - y0) / (y1 - y0)) * 0.35;
          set(x, y, color.map((c) => Math.min(255, Math.round(c * t))));
        }
      }
    }
  }
  return px;
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'icon-192.png'), png(192, draw(192, 20)));
writeFileSync(join(OUT, 'icon-512.png'), png(512, draw(512, 54)));
// Version "maskable" : marges plus larges pour survivre au rognage circulaire.
writeFileSync(join(OUT, 'icon-maskable-512.png'), png(512, draw(512, 104)));
console.log('Icônes générées dans', OUT);
