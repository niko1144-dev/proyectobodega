import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const securityHeaders: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:4000 ws://localhost:3000 ws: http: https:; object-src 'none'; frame-ancestors 'none';",
  'X-XSS-Protection': '1; mode=block',
  'X-Permitted-Cross-Domain-Policies': 'none'
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'security-headers-plugin',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          Object.entries(securityHeaders).forEach(([header, value]) => {
            res.setHeader(header, value);
          });
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((_req, res, next) => {
          Object.entries(securityHeaders).forEach(([header, value]) => {
            res.setHeader(header, value);
          });
          next();
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: false,
    host: true,
    headers: securityHeaders,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
