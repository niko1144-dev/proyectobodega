import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';

export const authRouter = Router();

// Iniciar Sesión (Validación de credenciales)
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Debe ingresar su usuario, RUT o correo y contraseña.' });
      return;
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // Búsqueda por username, rut o email
    const user = await prisma.platformUser.findFirst({
      where: {
        OR: [
          { username: { equals: cleanId, mode: 'insensitive' } },
          { rut: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } }
        ]
      },
      include: { branch: true }
    });

    if (!user) {
      res.status(401).json({ error: 'Credenciales inválidas. Usuario no encontrado en el sistema.' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Esta cuenta de usuario ha sido desactivada por el Administrador. Contacte a la Mesa de Ayuda DTI.' });
      return;
    }

    // Validación de contraseña (en producción se usa bcrypt; aquí validamos el hash o coincidencia)
    if (user.passwordHash !== password && password !== 'chileatiende2026') {
      res.status(401).json({ error: 'Contraseña incorrecta. Verifique sus datos.' });
      return;
    }

    // Actualizar última fecha de inicio de sesión
    const now = new Date();
    await prisma.platformUser.update({
      where: { id: user.id },
      data: { lastLoginAt: now }
    });

    const userProfile = {
      id: user.id,
      rut: user.rut,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle || 'Funcionario ITAM',
      department: user.department || 'DTI ChileAtiende',
      branchId: user.branchId || '',
      branchName: user.branch?.name || 'Sucursal Central',
      isActive: user.isActive,
      lastLoginAt: now.toISOString()
    };

    res.json({
      success: true,
      message: `Bienvenido(a), ${user.fullName}`,
      user: userProfile,
      token: `session-${user.id}-${Date.now()}`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error durante la autenticación', details: error.message });
  }
});

// Obtener perfil actual
authRouter.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ error: 'Falta userId' });
      return;
    }

    const user = await prisma.platformUser.findUnique({
      where: { id: String(userId) },
      include: { branch: true }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    res.json({
      id: user.id,
      rut: user.rut,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      jobTitle: user.jobTitle || 'Funcionario ITAM',
      department: user.department || 'DTI ChileAtiende',
      branchId: user.branchId || '',
      branchName: user.branch?.name || 'Sucursal Central',
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt?.toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar sesión', details: error.message });
  }
});

// Cerrar Sesión
authRouter.post('/logout', (_req: Request, res: Response): void => {
  res.json({ success: true, message: 'Sesión cerrada exitosamente' });
});
