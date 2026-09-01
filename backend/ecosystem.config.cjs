module.exports = {
  apps: [
    {
      name: 'itam-chileatiende',
      cwd: 'c:\\Users\\administrador\\proyectobodega\\backend',
      script: 'dist/index.js',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        HTTPS_PORT: 443,
        HTTP_PORT: 80
      }
    }
  ]
};
