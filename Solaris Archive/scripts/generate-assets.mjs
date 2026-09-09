import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";

const outDir = path.join(process.cwd(), "public", "assets");
mkdirSync(outDir, { recursive: true });

const crcTable = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    c = crcTable[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function clamp(value, min = 0, max = 255) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t
  ];
}

function addGlow(color, x, y, cx, cy, radius, glowColor, strength = 1) {
  const d = Math.hypot(x - cx, y - cy) / radius;
  const amount = clamp(1 - d, 0, 1) ** 2 * strength;
  return mix(color, glowColor, amount);
}

function hashNoise(x, y, seed = 1) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return n - Math.floor(n);
}

function writePng(filename, width, height, painter) {
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const i = row + 1 + x * 4;
      const [r, g, b, a = 255] = painter(x, y, width, height).map(Math.round);
      raw[i] = clamp(r);
      raw[i + 1] = clamp(g);
      raw[i + 2] = clamp(b);
      raw[i + 3] = clamp(a);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const png = Buffer.concat([
    signature,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND")
  ]);

  writeFileSync(path.join(outDir, filename), png);
}

function heroPainter(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  let color = ny < 0.54
    ? mix([7, 10, 15], [18, 31, 43], ny / 0.54)
    : mix([16, 27, 34], [4, 6, 10], (ny - 0.54) / 0.46);

  color = addGlow(color, nx, ny, 0.72, 0.32, 0.5, [28, 185, 180], 0.75);
  color = addGlow(color, nx, ny, 0.24, 0.4, 0.32, [190, 150, 70], 0.45);

  const farRidge = 0.52 + Math.sin(nx * 16) * 0.018 + Math.sin(nx * 31) * 0.012;
  const nearRidge = 0.67 + Math.sin(nx * 10 + 1.8) * 0.025 + Math.sin(nx * 27) * 0.017;

  if (ny > farRidge) {
    color = mix(color, [8, 14, 19], Math.min(1, (ny - farRidge) * 8));
  }
  if (ny > nearRidge) {
    color = mix(color, [3, 6, 9], Math.min(1, (ny - nearRidge) * 8));
  }

  const waterLine = 0.63 + Math.sin(nx * 18) * 0.008;
  if (ny > waterLine) {
    const ripple = Math.abs(Math.sin((nx * 70 + ny * 15) + Math.sin(ny * 20))) < 0.035;
    color = mix(color, [9, 24, 31], 0.55);
    if (ripple) color = mix(color, [79, 238, 214], 0.32);
  }

  const arc = Math.abs(Math.hypot((nx - 0.68) * 1.35, (ny - 0.43) * 1.35) - 0.22);
  if (arc < 0.004 || Math.abs(arc - 0.046) < 0.003) {
    color = mix(color, [94, 255, 224], 0.78);
  }

  const columns = [
    [0.12, 0.58, 0.02],
    [0.16, 0.5, 0.016],
    [0.8, 0.5, 0.018],
    [0.85, 0.58, 0.014]
  ];
  for (const [cx, top, width] of columns) {
    if (Math.abs(nx - cx) < width && ny > top) {
      color = mix(color, [36, 38, 37], 0.7);
      if (Math.abs(nx - cx) > width * 0.72) color = mix(color, [198, 161, 86], 0.35);
    }
  }

  const particle = hashNoise(Math.floor(nx * 180), Math.floor(ny * 90), 3);
  if (particle > 0.994 && ny < 0.58) {
    color = mix(color, [156, 255, 240], 0.7);
  }

  return [...color, 255];
}

function abstractPainter(palette, seed = 1) {
  return (x, y, w, h) => {
    const nx = x / w;
    const ny = y / h;
    let color = mix(palette[0], palette[1], ny);
    color = addGlow(color, nx, ny, 0.24 + seed * 0.07, 0.36, 0.42, palette[2], 0.8);
    color = addGlow(color, nx, ny, 0.78, 0.44 + seed * 0.025, 0.34, palette[3], 0.65);

    const band = Math.abs(Math.sin((nx * 5.5 + ny * 2.7 + seed) * Math.PI));
    if (band > 0.965) color = mix(color, palette[4], 0.58);

    const ring = Math.abs(Math.hypot(nx - 0.7, ny - 0.38) - 0.23);
    if (ring < 0.01) color = mix(color, palette[4], 0.8);

    const grain = (hashNoise(x, y, seed) - 0.5) * 9;
    return [color[0] + grain, color[1] + grain, color[2] + grain, 255];
  };
}

function mapPainter(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  let color = mix([12, 19, 23], [18, 34, 35], ny);
  const land = 0.54 + Math.sin(nx * 8) * 0.12 + Math.sin(nx * 21 + 2) * 0.04;

  if (ny < land) {
    color = mix(color, [41, 54, 44], 0.48);
  } else {
    color = mix(color, [5, 20, 29], 0.55);
  }

  const contour = Math.abs(Math.sin((ny * 19 + Math.sin(nx * 10) * 0.8) * Math.PI));
  if (contour > 0.975 && ny < land + 0.08) {
    color = mix(color, [193, 164, 91], 0.6);
  }

  const roads = Math.abs(ny - (0.47 + Math.sin(nx * 15) * 0.07));
  if (roads < 0.004) color = mix(color, [72, 222, 202], 0.75);

  const points = [
    [0.2, 0.34],
    [0.38, 0.52],
    [0.58, 0.41],
    [0.72, 0.62],
    [0.83, 0.28],
    [0.49, 0.73]
  ];
  for (const [px, py] of points) {
    const d = Math.hypot(nx - px, ny - py);
    if (d < 0.018) color = mix(color, [244, 241, 226], 0.82);
    if (d > 0.02 && d < 0.026) color = mix(color, [74, 244, 219], 0.72);
  }

  return [...color, 255];
}

writePng("hero-solaris.png", 1600, 900, heroPainter);
writePng("banner-resonance.png", 900, 500, abstractPainter([[6, 9, 14], [20, 48, 51], [49, 226, 209], [202, 168, 91], [236, 247, 244]], 1));
writePng("banner-next.png", 900, 500, abstractPainter([[9, 13, 19], [28, 36, 52], [103, 188, 246], [197, 159, 85], [236, 247, 244]], 2));
writePng("event-forge.png", 900, 500, abstractPainter([[11, 10, 12], [48, 31, 23], [231, 132, 72], [67, 227, 210], [245, 224, 163]], 3));
writePng("event-web.png", 900, 500, abstractPainter([[7, 11, 19], [25, 41, 61], [94, 244, 217], [178, 120, 213], [244, 248, 246]], 4));
writePng("event-tower.png", 900, 500, abstractPainter([[7, 10, 15], [21, 25, 30], [68, 244, 218], [198, 163, 89], [231, 239, 236]], 5));
writePng("event-code.png", 900, 500, abstractPainter([[8, 12, 17], [24, 35, 35], [65, 241, 214], [93, 134, 219], [244, 247, 245]], 6));
writePng("map-solaris.png", 1400, 900, mapPainter);

console.log("Generated project images in public/assets");
