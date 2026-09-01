import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

// Decode raw PNG into RGBA buffer, crop it, and encode back into PNG
function cropPng(inputPath, outputPath, cropTopRatio = 0.20, cropBottomRatio = 0.18, cropLeftRatio = 0.05, cropRightRatio = 0.05) {
  const buf = fs.readFileSync(inputPath);
  let pos = 8;
  let width = buf.readUInt32BE(16);
  let height = buf.readUInt32BE(20);
  let bitDepth = buf[24];
  let colorType = buf[25];

  let idatBuffers = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IDAT') {
      idatBuffers.push(buf.subarray(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }

  const compressed = Buffer.concat(idatBuffers);
  const decompressed = zlib.inflateSync(compressed);

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = 1 + width * bytesPerPixel;

  // Reconstruct raw scanlines removing filters
  const rawData = Buffer.alloc(width * height * bytesPerPixel);
  let srcOffset = 0;
  let dstOffset = 0;

  const prevRow = Buffer.alloc(width * bytesPerPixel);
  const currentRow = Buffer.alloc(width * bytesPerPixel);

  for (let y = 0; y < height; y++) {
    const filterType = decompressed[srcOffset++];
    for (let x = 0; x < width * bytesPerPixel; x++) {
      const xVal = decompressed[srcOffset++];
      const a = x >= bytesPerPixel ? currentRow[x - bytesPerPixel] : 0;
      const b = prevRow[x];
      const c = x >= bytesPerPixel ? prevRow[x - bytesPerPixel] : 0;

      let val = xVal;
      if (filterType === 1) { // Sub
        val = (xVal + a) & 0xff;
      } else if (filterType === 2) { // Up
        val = (xVal + b) & 0xff;
      } else if (filterType === 3) { // Average
        val = (xVal + Math.floor((a + b) / 2)) & 0xff;
      } else if (filterType === 4) { // Paeth
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        let pr = c;
        if (pa <= pb && pa <= pc) pr = a;
        else if (pb <= pc) pr = b;
        val = (xVal + pr) & 0xff;
      }
      currentRow[x] = val;
      rawData[dstOffset++] = val;
    }
    currentRow.copy(prevRow);
  }

  // Calculate crop rectangle
  const top = Math.floor(height * cropTopRatio);
  const bottom = Math.floor(height * (1 - cropBottomRatio));
  const left = Math.floor(width * cropLeftRatio);
  const right = Math.floor(width * (1 - cropRightRatio));

  const newWidth = right - left;
  const newHeight = bottom - top;

  console.log(`Original: ${width}x${height} -> Cropped: ${newWidth}x${newHeight} (Aspect Ratio: ${(newWidth / newHeight).toFixed(3)})`);

  // Build new uncompressed scanlines with filter type 0 (None)
  const newScanlines = Buffer.alloc(newHeight * (1 + newWidth * bytesPerPixel));
  let newDst = 0;

  for (let y = top; y < bottom; y++) {
    newScanlines[newDst++] = 0; // Filter None
    for (let x = left; x < right; x++) {
      const srcIdx = (y * width + x) * bytesPerPixel;
      for (let b = 0; b < bytesPerPixel; b++) {
        newScanlines[newDst++] = rawData[srcIdx + b];
      }
    }
  }

  const newIdat = zlib.deflateSync(newScanlines);

  // Build PNG chunks
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf, start, end) {
    let c = 0xffffffff;
    for (let i = start; i < end; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type, data) {
    const chunk = Buffer.alloc(12 + data.length);
    chunk.writeUInt32BE(data.length, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crc = crc32(chunk, 4, 8 + data.length);
    chunk.writeUInt32BE(crc, 8 + data.length);
    return chunk;
  }

  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(newWidth, 0);
  ihdrData.writeUInt32BE(newHeight, 4);
  ihdrData[8] = bitDepth;
  ihdrData[9] = colorType;
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', newIdat);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const finalPng = Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(outputPath, finalPng);
  console.log(`Saved cropped PNG to ${outputPath} (${finalPng.length} bytes)`);
}

const darkSrc = path.resolve('../frontend/src/assets/ips-chileatiende-logo-dark.png');
const darkDst = path.resolve('../frontend/src/assets/ips-chileatiende-logo-dark.png');
const darkPublicDst = path.resolve('../frontend/public/img/ips-chileatiende-logo-dark.png');

// Crop top 19%, bottom 19%, left 4%, right 4% -> aspect ratio ~2.95!
cropPng(darkSrc, darkDst, 0.19, 0.19, 0.04, 0.04);
fs.copyFileSync(darkDst, darkPublicDst);
console.log('Successfully updated dark mode logo files!');
