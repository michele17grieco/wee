/**
 * Generates the PWA PNG icons with no external dependencies:
 * a minimal PNG encoder (Node's zlib) + procedural drawing
 * (night sky, sun, two mountains).
 *
 * Usage: npm run icons
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

// ---------- PNG encoder ----------
const CRC_TABLE = new Int32Array(256)
for (let n = 0; n < 256; n++) {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  CRC_TABLE[n] = c
}
function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length)
  return out
}
function encodePng(width, height, pixelAt) {
  const raw = Buffer.alloc(height * (1 + width * 4))
  let off = 0
  for (let y = 0; y < height; y++) {
    raw[off++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelAt(x, y)
      raw[off++] = r
      raw[off++] = g
      raw[off++] = b
      raw[off++] = a
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------- Drawing (coordinates on a logical 512×512 canvas) ----------
const BG = [15, 23, 42] // slate-900
const SUN = [251, 191, 36] // amber-400
const BACK_MOUNTAIN = [56, 89, 138]
const FRONT_MOUNTAIN = [226, 232, 240] // slate-200

function scenePixel(x, y) {
  // front mountain: peak (190, 190), slope 0.95, down to the bottom
  if (y >= 190 && Math.abs(x - 190) <= (y - 190) * 0.95) return [...FRONT_MOUNTAIN, 255]
  // back mountain: peak (345, 255), slope 1.15
  if (y >= 255 && Math.abs(x - 345) <= (y - 255) * 1.15) return [...BACK_MOUNTAIN, 255]
  // sun: circle (370, 140) r 62
  if ((x - 370) ** 2 + (y - 140) ** 2 <= 62 ** 2) return [...SUN, 255]
  return [...BG, 255]
}

/** size = side in px; inset = margin fraction for maskable icons. */
function drawIcon(size, inset = 0) {
  const scale = 512 / (size * (1 - 2 * inset))
  const offset = size * inset
  return encodePng(size, size, (x, y) => {
    const sx = (x - offset) * scale
    const sy = (y - offset) * scale
    if (sx < 0 || sy < 0 || sx >= 512 || sy >= 512) return [...BG, 255]
    return scenePixel(sx, sy)
  })
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(join(OUT_DIR, 'icon-512.png'), drawIcon(512))
writeFileSync(join(OUT_DIR, 'icon-192.png'), drawIcon(192))
writeFileSync(join(OUT_DIR, 'maskable-512.png'), drawIcon(512, 0.12))
writeFileSync(join(OUT_DIR, 'apple-touch-icon.png'), drawIcon(180))
console.log('Icons written to', OUT_DIR)
