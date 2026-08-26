import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { LdapService } from '../services/ldapService.js';

export const authRouter = Router();

// Iniciar Sesión (Validación de credenciales con cascada Active Directory / LDAP y fallback local)
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({ error: 'Debe ingresar su usuario, RUT o correo y contraseña.' });
      return;
    }

    const cleanId = String(identifier).trim().toLowerCase();
    const now = new Date();

    // 1. Intentar autenticación contra Active Directory (ChileAtiende con fallback IPS)
    const isLdapEnabled = process.env.LDAP_ENABLED !== 'false';
    let ldapAuthResult: any = null;

    if (isLdapEnabled) {
      try {
        ldapAuthResult = await LdapService.authenticateUser(cleanId, password);
      } catch (ldapErr: any) {
        console.warn('[Auth] Error durante intento de autenticación LDAP:', ldapErr.message);
      }
    }

    // Si la autenticación en Active Directory fue exitosa
    if (ldapAuthResult && ldapAuthResult.success && ldapAuthResult.user) {
      const ldapUser = ldapAuthResult.user;

      // Buscar si el funcionario ha sido autorizado por un Administrador en platformUser
      let user = await prisma.platformUser.findFirst({
        where: {
          OR: [
            { username: { equals: ldapUser.username, mode: 'insensitive' } },
            { rut: { equals: ldapUser.rut, mode: 'insensitive' } },
            { email: { equals: ldapUser.email, mode: 'insensitive' } }
          ]
        },
        include: { branch: true }
      });

      // Si el usuario pertenece a Active Directory pero NO ha sido dado de alta por el Administrador
      if (!user) {
        res.status(403).json({ 
          error: `Acceso no autorizado: Su cuenta institucional (${ldapUser.fullName}) es válida en Active Directory (${ldapAuthResult.domainOrigin}), pero no cuenta con permisos asignados para acceder a esta plataforma. Solicite a un Administrador que active y asigne su rol en el módulo de Gestión de Usuarios.` 
        });
        return;
      }

      // Si el usuario está registrado pero se encuentra desactivado
      if (!user.isActive) {
        res.status(403).json({ 
          error: 'Esta cuenta de usuario ha sido desactivada por el Administrador. Contacte a la Mesa de Ayuda DTI.' 
        });
        return;
      }

      // Sincronizar datos actualizados desde Active Directory conservando el rol asignado por el Administrador
      user = await prisma.platformUser.update({
        where: { id: user.id },
        data: {
          fullName: ldapUser.fullName,
          email: ldapUser.email,
          jobTitle: ldapUser.jobTitle || user.jobTitle,
          department: ldapUser.department || user.department,
          lastLoginAt: now
        },
        include: { branch: true }
      });

      const userProfile = {
        id: user.id,
        rut: user.rut,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        jobTitle: user.jobTitle || ldapUser.jobTitle,
        department: user.department || ldapUser.department,
        branchId: user.branchId || '',
        branchName: user.branch?.name || 'Dirección Nacional DTI',
        isActive: user.isActive,
        lastLoginAt: now.toISOString(),
        authSource: `Active Directory (${ldapAuthResult.domainOrigin})`
      };

      res.json({
        success: true,
        message: `Bienvenido(a), ${user.fullName} (${ldapAuthResult.domainOrigin === 'CHILEATIENDE' ? 'ChileAtiende' : 'IPS'})`,
        user: userProfile,
        domainOrigin: ldapAuthResult.domainOrigin,
        token: `session-${user.id}-${Date.now()}`
      });
      return;
    }

    // 2. Fallback: Autenticación Local en Base de Datos (para administradores o contingencia)
    const localUser = await prisma.platformUser.findFirst({
      where: {
        OR: [
          { username: { equals: cleanId, mode: 'insensitive' } },
          { rut: { equals: cleanId, mode: 'insensitive' } },
          { email: { equals: cleanId, mode: 'insensitive' } }
        ]
      },
      include: { branch: true }
    });

    if (!localUser) {
      const authMessage = ldapAuthResult && ldapAuthResult.message 
        ? ldapAuthResult.message 
        : 'Credenciales inválidas. Usuario no encontrado en los directorios Active Directory ni en el sistema local.';
      res.status(401).json({ error: authMessage });
      return;
    }

    if (!localUser.isActive) {
      res.status(403).json({ error: 'Esta cuenta de usuario ha sido desactivada por el Administrador. Contacte a la Mesa de Ayuda DTI.' });
      return;
    }

    // Validación de contraseña local (o clave maestra para soporte)
    const isPasswordValid = localUser.passwordHash === password || password === 'chileatiende2026';
    if (!isPasswordValid) {
      res.status(401).json({ error: 'Contraseña incorrecta. Verifique sus datos.' });
      return;
    }

    await prisma.platformUser.update({
      where: { id: localUser.id },
      data: { lastLoginAt: now }
    });

    const userProfile = {
      id: localUser.id,
      rut: localUser.rut,
      username: localUser.username,
      fullName: localUser.fullName,
      email: localUser.email,
      role: localUser.role,
      jobTitle: localUser.jobTitle || 'Funcionario ITAM',
      department: localUser.department || 'DTI ChileAtiende',
      branchId: localUser.branchId || '',
      branchName: localUser.branch?.name || 'Sucursal Central',
      isActive: localUser.isActive,
      lastLoginAt: now.toISOString(),
      authSource: 'Base de Datos Local'
    };

    res.json({
      success: true,
      message: `Bienvenido(a), ${localUser.fullName}`,
      user: userProfile,
      token: `session-${localUser.id}-${Date.now()}`
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
