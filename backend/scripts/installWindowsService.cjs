const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'ITAM_ChileAtiende_Server',
  description: 'Servicio Oficial de Produccion ITAM ChileAtiende / IPS (HTTPS 443 + HTTP 80)',
  script: path.resolve(__dirname, '../dist/index.js'),
  workingDirectory: path.resolve(__dirname, '..'),
  nodeOptions: [
    '--max_old_space_size=2048'
  ],
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "PORT",
      value: "4000"
    },
    {
      name: "HTTPS_PORT",
      value: "443"
    },
    {
      name: "HTTP_PORT",
      value: "80"
    }
  ]
});

svc.on('install', function () {
  console.log('✅ Servicio de Windows ITAM_ChileAtiende_Server instalado con éxito.');
  svc.start();
});

svc.on('alreadyinstalled', function () {
  console.log('ℹ️ El servicio ya estaba instalado. Iniciando...');
  svc.start();
});

svc.on('start', function () {
  console.log('🚀 Servicio de Windows ITAM_ChileAtiende_Server iniciado y ejecutándose 24/7 en segundo plano.');
});

svc.on('error', function (err) {
  console.error('❌ Error en el servicio:', err);
});

svc.install();
