const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'ITAM_ChileAtiende_Server',
  script: path.resolve(__dirname, '../dist/index.js')
});

svc.on('uninstall', function () {
  console.log('✅ Servicio de Windows ITAM_ChileAtiende_Server desinstalado.');
});

svc.uninstall();
