import fs from 'fs';
import path from 'path';

function getPngDimensions(filePath: string) {
  const buf = fs.readFileSync(filePath);
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    aspectRatio: (buf.readUInt32BE(16) / buf.readUInt32BE(20)).toFixed(3)
  };
}

const lightPath = path.resolve('../frontend/src/assets/ips-chileatiende-logo-light.png');
const darkPath = path.resolve('../frontend/src/assets/ips-chileatiende-logo-dark.png');

console.log('Light:', getPngDimensions(lightPath));
console.log('Dark:', getPngDimensions(darkPath));
