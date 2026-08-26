import express from 'express';
import cors from 'cors';
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
const PORT = process.env.PORT || 4000;

// Middlewares de Seguridad y CORS
app.use((_req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' http://localhost:4000 ws://localhost:3000 ws: http: https:; object-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health Check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ITAM ChileAtiende Backend API (PostgreSQL + Prisma)',
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

// Manejador de rutas no encontradas
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint de API no encontrado' });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Servidor ITAM ChileAtiende API escuchando en puerto ${PORT}`);
  console.log(`📦 Base de Datos: PostgreSQL (Prisma ORM)`);
  console.log(`🔐 Módulos de Autenticación & Usuarios habilitados`);
  console.log(`🔗 Health Check: http://localhost:${PORT}/health`);
  console.log(`====================================================`);
});
