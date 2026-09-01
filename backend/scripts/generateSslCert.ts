import selfsigned from 'selfsigned';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certsDir = path.resolve(__dirname, '../certs');

if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
}

const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'server.crt');

async function main() {
  console.log('🔐 Generando certificado SSL X.509 para itam.chileatiende.cl...');

  const attrs = [
    { name: 'commonName', value: 'itam.chileatiende.cl' },
    { name: 'organizationName', value: 'ChileAtiende - IPS' }
  ];

  const pems = await selfsigned.generate(attrs, {
    days: 365 * 3,
    keySize: 2048,
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'itam.chileatiende.cl' },
          { type: 2, value: 'itam.ips.chileatiende.gob.cl' },
          { type: 2, value: 'localhost' },
          { type: 7, ip: '10.66.20.19' },
          { type: 7, ip: '127.0.0.1' }
        ]
      }
    ]
  });

  fs.writeFileSync(keyPath, pems.private, 'utf8');
  fs.writeFileSync(certPath, pems.cert, 'utf8');

  console.log('🎉 Certificados SSL generados exitosamente:');
  console.log(' - Clave Privada:', keyPath);
  console.log(' - Certificado Público:', certPath);
}

main().catch(console.error);
