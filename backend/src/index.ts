import https from 'https';
import http from 'http';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { dashboardRouter } from './routes/dashboardRoutes.js';
import { assetRouter } from './routes/assetRoutes.js';
import { receptionRouter } from './routes/receptionRoutes.js';
import { assignmentRouter } from './routes/assignmentRoutes.js';
import { consumableRouter } from './routes/consumableRoutes.js';
import { directoryRouter } from './routes/directoryRoutes.js';
import { masterRouter } from './routes/masterRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { userRouter } from './routes/userRoutes.js';
import { transferRouter } from './routes/transferRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const HTTPS_PORT = Number(process.env.HTTPS_PORT) || 443;
const HTTP_PORT = Number(process.env.HTTP_PORT) || 80;

// Ocultar cabecera que expone tecnología del servidor
app.disable('x-powered-by');

// Compresión GZIP de alta velocidad para payloads grandes
app.use(compression());

// Middlewares de Seguridad Estricta y Cabeceras HTTP
app.use((_req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' http: https: ws: wss:; object-src 'none'; frame-ancestors 'none'; base-uri 'self';"
  );
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ITAM ChileAtiende Backend API (PostgreSQL + Prisma + HTTPS)',
    domain: 'itam.chileatiende.cl',
    timestamp: new Date().toISOString()
  });
});

// Rutas de la API v1
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/assets', assetRouter);
app.use('/api/v1/receptions', receptionRouter);
app.use('/api/v1/assignments', assignmentRouter);
app.use('/api/v1/consumables', consumableRouter);
app.use('/api/v1/transfers', transferRouter);
app.use('/api/v1/directory', directoryRouter);
app.use('/api/v1/masters', masterRouter);

// Servir Frontend compilado (Producción Monolítica / Single-Port)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Manejador de rutas API no encontradas
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint de API no encontrado' });
});

// Verificación y Carga de Certificados SSL
const certsDir = path.resolve(__dirname, '../certs');
const defaultKeyPath = path.join(certsDir, 'server.key');
const defaultCertPath = path.join(certsDir, 'server.crt');

const sslKeyPath = process.env.SSL_KEY_PATH || defaultKeyPath;
const sslCertPath = process.env.SSL_CERT_PATH || defaultCertPath;

const hasSslCerts = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

// Iniciar Servidor HTTPS en Puerto 443 y Redirección HTTP en Puerto 80
if (hasSslCerts && process.env.HTTPS_ENABLED !== 'false') {
  try {
    const sslOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath)
    };

    const httpsServer = https.createServer(sslOptions, app);
    httpsServer.on('error', (err: any) => {
      console.warn('⚠️ No se pudo enlazar HTTPS en puerto ' + HTTPS_PORT + ':', err.message);
    });
    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🔒 Servidor HTTPS ITAM ChileAtiende activo en puerto ${HTTPS_PORT}`);
      console.log(`🌐 Dominios: https://itam.chileatiende.cl / https://itam.ips.chileatiende.gob.cl`);
      console.log(`🌐 IP Red: https://10.66.20.19`);
      console.log(`📦 Base de Datos: PostgreSQL (Prisma ORM)`);
      console.log(`====================================================`);
    });

    // Servidor HTTP estándar en Puerto 80 (HTTP directo para intranet)
    const httpServer = http.createServer(app);
    httpServer.on('error', (err: any) => {
      console.warn(`⚠️ No se pudo enlazar HTTP en puerto ${HTTP_PORT}:`, err.message);
    });
    httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
      console.log(`🌐 Servidor HTTP ITAM activo en puerto ${HTTP_PORT} (http://10.66.20.19)`);
    });

  } catch (sslErr: any) {
    console.error('⚠️ Error al iniciar servidor HTTPS:', sslErr.message);
  }
}

// Iniciar Servidor HTTP estándar en puerto secundario (4000) para contingencia / dev
if (PORT !== HTTP_PORT && PORT !== HTTPS_PORT) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ITAM escuchando en puerto ${PORT} (HTTP directo)`);
  });
}
