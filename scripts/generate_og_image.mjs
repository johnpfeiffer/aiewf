import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const width = 1200;
const height = 630;
const pixels = Buffer.alloc(width * height * 4, 255);

const colors = {
  white: [255, 255, 255],
  blue: [25, 118, 210],
  ink: [17, 24, 39],
  muted: [55, 65, 81],
  gray: [107, 114, 128],
  border: [208, 215, 222],
  light: [245, 247, 250],
};

const font = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01111", "10000", "10000", "10011", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "6": ["00111", "01000", "10000", "11110", "10001", "10001", "01110"],
};

function fillRect(x, y, w, h, color) {
  for (let row = Math.max(0, y); row < Math.min(height, y + h); row++) {
    for (let col = Math.max(0, x); col < Math.min(width, x + w); col++) {
      const offset = (row * width + col) * 4;
      pixels[offset] = color[0];
      pixels[offset + 1] = color[1];
      pixels[offset + 2] = color[2];
      pixels[offset + 3] = 255;
    }
  }
}

function drawText(text, x, y, scale, color) {
  let cursor = x;
  for (const char of text.toUpperCase()) {
    const glyph = font[char] ?? font[" "];
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === "1") {
          fillRect(cursor + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
    cursor += 6 * scale;
  }
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBytes = Buffer.from(type);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, crc]);
}

fillRect(0, 0, width, height, colors.white);
fillRect(64, 64, 1072, 502, colors.white);
fillRect(64, 64, 1072, 2, colors.border);
fillRect(64, 564, 1072, 2, colors.border);
fillRect(64, 64, 2, 502, colors.border);
fillRect(1134, 64, 2, 502, colors.border);
fillRect(104, 376, 992, 2, colors.border);
fillRect(820, 420, 238, 86, colors.light);
fillRect(820, 420, 238, 2, colors.border);
fillRect(820, 506, 238, 2, colors.border);
fillRect(820, 420, 2, 86, colors.border);
fillRect(1056, 420, 2, 86, colors.border);

drawText("AI ENGINEER", 104, 118, 8, colors.blue);
drawText("WORLDS FAIR", 104, 184, 8, colors.blue);
drawText("2026 SCHEDULE", 104, 268, 10, colors.ink);
drawText("SAVE SESSIONS + VIDEO LINKS", 104, 430, 4, colors.muted);
drawText("FENEKY.COM/AIEWF", 104, 520, 4, colors.gray);
drawText("AIEWF", 850, 446, 6, colors.ink);

const raw = Buffer.alloc((width * 4 + 1) * height);
for (let row = 0; row < height; row++) {
  raw[row * (width * 4 + 1)] = 0;
  pixels.copy(raw, row * (width * 4 + 1) + 1, row * width * 4, (row + 1) * width * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;
ihdr[9] = 6;

writeFileSync(
  "app/public/og-image.png",
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
