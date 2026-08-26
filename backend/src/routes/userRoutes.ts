import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { PlatformRole } from '@prisma/client';

export const userRouter = Router();

// Listar todos los usuarios de la plataforma
userRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, branchId, search } = req.query;

    const where: any = {};

    if (role && role !== 'ALL') {
      where.role = role as PlatformRole;
    }

    if (branchId && branchId !== 'ALL') {
      where.branchId = String(branchId);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { rut: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.platformUser.findMany({
      where,
      include: { branch: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = users.map(u => ({
      id: u.id,
      rut: u.rut,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      jobTitle: u.jobTitle || 'Funcionario ITAM',
      department: u.department || 'DTI',
      branchId: u.branchId || '',
      branchName: u.branch?.name || 'Sucursal Central',
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString()
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar usuarios de la plataforma', details: error.message });
  }
});

// Crear nuevo usuario (o autorizar funcionario de Active Directory)
userRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rut, username, fullName, email, password, role, jobTitle, department, branchId } = req.body;

    if (!rut || !username || !fullName || !email || !role) {
      res.status(400).json({ error: 'RUT, Nombre de Usuario, Nombre Completo, Correo y Rol son obligatorios.' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanRut = String(rut).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    // Verificar duplicados
    const existing = await prisma.platformUser.findFirst({
      where: {
        OR: [
          { rut: cleanRut },
          { username: cleanUsername },
          { email: cleanEmail }
        ]
      }
    });

    if (existing) {
      res.status(409).json({ error: 'Ya existe un usuario con este RUT, nombre de usuario o correo electrónico.' });
      return;
    }

    const newUser = await prisma.platformUser.create({
      data: {
        rut: cleanRut,
        username: cleanUsername,
        fullName: String(fullName).trim(),
        email: cleanEmail,
        passwordHash: password && String(password).trim().length > 0 ? String(password).trim() : 'AD_AUTHENTICATED',
        role: role as PlatformRole,
        jobTitle: jobTitle || 'Funcionario ITAM',
        department: department || 'División Tecnologías de la Información',
        branchId: branchId || null,
        isActive: true
      },
      include: { branch: true }
    });

    res.status(201).json({
      success: true,
      message: `Usuario ${newUser.fullName} creado exitosamente`,
      user: {
        id: newUser.id,
        rut: newUser.rut,
        username: newUser.username,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        jobTitle: newUser.jobTitle,
        branchId: newUser.branchId,
        branchName: newUser.branch?.name || 'Sucursal Central',
        isActive: newUser.isActive,
        createdAt: newUser.createdAt.toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear usuario', details: error.message });
  }
});

// Editar datos de usuario
userRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { fullName, email, role, jobTitle, department, branchId, isActive } = req.body;

    const user = await prisma.platformUser.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const updated = await prisma.platformUser.update({
      where: { id },
      data: {
        fullName: fullName !== undefined ? String(fullName).trim() : user.fullName,
        email: email !== undefined ? String(email).trim().toLowerCase() : user.email,
        role: role !== undefined ? (role as PlatformRole) : user.role,
        jobTitle: jobTitle !== undefined ? jobTitle : user.jobTitle,
        department: department !== undefined ? department : user.department,
        branchId: branchId !== undefined ? branchId : user.branchId,
        isActive: isActive !== undefined ? Boolean(isActive) : user.isActive
      },
      include: { branch: true }
    });

    res.json({
      success: true,
      message: 'Usuario actualizado correctamente',
      user: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar usuario', details: error.message });
  }
});

// Cambiar o Resetear Contraseña
userRouter.patch('/:id/password', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { newPassword } = req.body;

    if (!newPassword || String(newPassword).length < 4) {
      res.status(400).json({ error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      return;
    }

    await prisma.platformUser.update({
      where: { id },
      data: { passwordHash: String(newPassword).trim() }
    });

    res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar contraseña', details: error.message });
  }
});

// Activar o Desactivar Usuario
userRouter.patch('/:id/toggle-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.platformUser.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const updated = await prisma.platformUser.update({
      where: { id },
      data: { isActive: !user.isActive }
    });

    res.json({
      success: true,
      message: `Usuario ${updated.isActive ? 'activado' : 'desactivado'} exitosamente`,
      isActive: updated.isActive
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al cambiar estado del usuario', details: error.message });
  }
});

// Eliminar / Revocar acceso de usuario
userRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const user = await prisma.platformUser.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    await prisma.platformUser.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: `Permisos de acceso revocados y cuenta de ${user.fullName} eliminada exitosamente.`
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar usuario', details: error.message });
  }
});
