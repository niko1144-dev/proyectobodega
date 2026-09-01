import crypto from 'crypto';
import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { EmailService } from '../services/emailService.js';

export const authRouter = Router();

// Iniciar Sesión (Autenticación controlada contra cuentas activadas en PlatformUser con clave personalizada)
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Debe ingresar su usuario, RUT o correo y su contraseña.' });
      return;
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPassword = String(password).trim();
    const now = new Date();

    // 1. Buscar en usuarios de plataforma autorizados
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

    // 2. Si el usuario NO está registrado o autorizado en la plataforma
    if (!user) {
      // Verificar si existe en el catálogo de Active Directory para dar un mensaje claro
      const adCached = await prisma.userADCache.findFirst({
        where: {
          OR: [
            { samAccountName: { equals: cleanId, mode: 'insensitive' } },
            { rut: { equals: cleanId, mode: 'insensitive' } },
            { email: { equals: cleanId, mode: 'insensitive' } }
          ]
        }
      });

      if (adCached) {
        res.status(403).json({
          error: `La cuenta de ${adCached.fullName} (${adCached.samAccountName}) existe en el Directorio pero aún no ha sido activada en la plataforma. Solicite a un Administrador que active su cuenta y le asigne una contraseña personalizada.`
        });
        return;
      }

      res.status(401).json({
        error: 'Usuario o credenciales no encontradas en el sistema.'
      });
      return;
    }

    // 3. Si la cuenta existe pero ha sido desactivada por el Administrador
    if (!user.isActive) {
      res.status(403).json({
        error: 'Esta cuenta de usuario ha sido desactivada por el Administrador. Contacte a la Mesa de Ayuda DTI.'
      });
      return;
    }

    // 4. Validación de la Contraseña Personalizada Asignada por el Mantenedor
    const isPasswordValid = user.passwordHash === cleanPassword;

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Contraseña incorrecta. Verifique sus credenciales personalizadas.'
      });
      return;
    }

    // 5. Actualizar última fecha de login
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
      department: user.department || 'ChileAtiende / IPS',
      branchId: user.branchId || '',
      branchName: user.branch?.name || 'Sucursal Central',
      assignedBranchIds: user.assignedBranchIds || [],
      isActive: user.isActive,
      lastLoginAt: now.toISOString(),
      authSource: 'Plataforma ITAM (Clave Personalizada)'
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

// Cambiar la propia contraseña del usuario autenticado
authRouter.post('/change-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'Identificador de usuario no proporcionado.' });
      return;
    }

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Debe ingresar la contraseña actual y la nueva contraseña.' });
      return;
    }

    const cleanCurrent = String(currentPassword).trim();
    const cleanNew = String(newPassword).trim();

    if (cleanNew.length < 4) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    const user = await prisma.platformUser.findUnique({
      where: { id: String(userId) }
    });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado en la plataforma.' });
      return;
    }

    // Verificar contraseña actual
    if (user.passwordHash !== cleanCurrent) {
      res.status(401).json({ error: 'La contraseña actual ingresada es incorrecta.' });
      return;
    }

    // Actualizar contraseña
    await prisma.platformUser.update({
      where: { id: user.id },
      data: { passwordHash: cleanNew, updatedAt: new Date() }
    });

    res.json({
      success: true,
      message: 'Tu contraseña ha sido actualizada exitosamente.'
    });
  } catch (error: any) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al actualizar contraseña', details: error.message });
  }
});

// Solicitar recuperación de contraseña (envío de correo vía Relay institucional)
authRouter.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      res.status(400).json({ error: 'Debe ingresar su usuario, RUT o correo institucional.' });
      return;
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // 1. Buscar en usuarios de plataforma autorizados
    const user = await prisma.platformUser.findFirst({
      where: {
        OR: [
          { username: { equals: cleanId, mode: 'insensitive' } },
          { rut: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      res.status(404).json({
        error: 'No se encontró un usuario activo en el sistema con el identificador ingresado. Verifique o contacte a Mesa de Ayuda DTI.'
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        error: 'Esta cuenta de usuario se encuentra desactivada por el Administrador. Contacte a la Mesa de Ayuda DTI.'
      });
      return;
    }

    if (!user.email || !user.email.includes('@')) {
      res.status(400).json({
        error: `El usuario ${user.fullName} no tiene una dirección de correo institucional válida configurada.`
      });
      return;
    }

    // 2. Generar token criptográfico y fecha de expiración (1 hora)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 60 minutos

    // 3. Guardar token en el usuario
    await prisma.platformUser.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expiresAt
      }
    });

    // 4. Construir URL de restablecimiento
    const origin = req.get('origin') || req.get('referer');
    let baseUrl = process.env.APP_URL || origin;
    if (!baseUrl) {
      baseUrl = 'http://localhost:3000';
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
    try {
      const parsed = new URL(baseUrl);
      baseUrl = `${parsed.protocol}//${parsed.host}`;
    } catch {
      // Dejar baseUrl como está
    }

    const resetUrl = `${baseUrl}/?token=${token}`;

    // 5. Despachar correo vía Relay SMTP
    const emailResult = await EmailService.sendPasswordResetEmail({
      recipientEmail: user.email,
      recipientName: user.fullName,
      resetUrl,
      expiresInMinutes: 60
    });

    if (!emailResult.success) {
      console.error('[Auth] Error al enviar correo de restablecimiento vía Relay:', emailResult.error);
      res.status(500).json({
        error: 'Error al enviar el correo de recuperación mediante el servidor relay.',
        details: emailResult.error
      });
      return;
    }

    // Ocultar parcialmente el correo para el mensaje de confirmación
    const [localPart, domainPart] = user.email.split('@');
    const maskedLocal = localPart.length <= 2 
      ? localPart.substring(0, 1) + '***' 
      : localPart.substring(0, 2) + '***' + localPart.substring(localPart.length - 1);
    const maskedEmail = `${maskedLocal}@${domainPart}`;

    res.json({
      success: true,
      message: `Se ha enviado un enlace de recuperación al correo institucional ${maskedEmail}. Revise su bandeja de entrada (y carpeta de spam si no lo visualiza de inmediato).`,
      emailMasked: maskedEmail
    });
  } catch (error: any) {
    console.error('[Auth] Error en forgot-password:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud de recuperación', details: error.message });
  }
});

// Validar validez de un token de restablecimiento
authRouter.get('/verify-reset-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;

    if (!token) {
      res.status(400).json({ valid: false, error: 'Token no proporcionado.' });
      return;
    }

    const cleanToken = String(token).trim();

    const user = await prisma.platformUser.findFirst({
      where: {
        resetToken: cleanToken,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      res.status(400).json({
        valid: false,
        error: 'El enlace de recuperación es inválido o ha expirado. Por favor solicite uno nuevo.'
      });
      return;
    }

    res.json({
      valid: true,
      fullName: user.fullName,
      username: user.username,
      email: user.email
    });
  } catch (error: any) {
    console.error('[Auth] Error en verify-reset-token:', error);
    res.status(500).json({ valid: false, error: 'Error al verificar token de recuperación', details: error.message });
  }
});

// Restablecer contraseña con token válido
authRouter.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token y nueva contraseña son requeridos.' });
      return;
    }

    const cleanToken = String(token).trim();
    const cleanNewPassword = String(newPassword).trim();

    if (cleanNewPassword.length < 4) {
      res.status(400).json({ error: 'La nueva contraseña debe contener al menos 4 caracteres.' });
      return;
    }

    // Buscar usuario con token válido y vigente
    const user = await prisma.platformUser.findFirst({
      where: {
        resetToken: cleanToken,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      res.status(400).json({
        error: 'El enlace de recuperación es inválido o ha expirado. Por favor genere una nueva solicitud de recuperación.'
      });
      return;
    }

    // Actualizar contraseña y limpiar el token
    await prisma.platformUser.update({
      where: { id: user.id },
      data: {
        passwordHash: cleanNewPassword,
        resetToken: null,
        resetTokenExpires: null,
        updatedAt: new Date()
      }
    });

    console.log(`[Auth] ✓ Contraseña restablecida exitosamente para el usuario ${user.username} (${user.email})`);

    res.json({
      success: true,
      message: 'Su contraseña ha sido restablecida exitosamente. Ya puede iniciar sesión con su nueva clave.'
    });
  } catch (error: any) {
    console.error('[Auth] Error en reset-password:', error);
    res.status(500).json({ error: 'Error al restablecer contraseña', details: error.message });
  }
});


