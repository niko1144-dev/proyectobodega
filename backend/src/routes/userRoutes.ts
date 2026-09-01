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

    const [users, allBranches] = await Promise.all([
      prisma.platformUser.findMany({
        where,
        include: { branch: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.branch.findMany({ select: { id: true, name: true, code: true } })
    ]);

    const branchMap = new Map<string, string>();
    allBranches.forEach(b => branchMap.set(b.id, b.name));

    const formatted = users.map(u => {
      const assignedIds = u.assignedBranchIds && u.assignedBranchIds.length > 0 
        ? u.assignedBranchIds 
        : (u.branchId ? [u.branchId] : []);
      
      const assignedNames = assignedIds.map(id => branchMap.get(id) || id);

      return {
        id: u.id,
        rut: u.rut,
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        jobTitle: u.jobTitle || 'Funcionario ITAM',
        department: u.department || 'DTI',
        branchId: u.branchId || (assignedIds[0] || ''),
        branchName: u.branch?.name || (assignedNames[0] || 'Sucursal Central'),
        assignedBranchIds: assignedIds,
        assignedBranchNames: assignedNames,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : undefined,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString()
      };
    });

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar usuarios de la plataforma', details: error.message });
  }
});

// Crear nuevo usuario (o autorizar/actualizar funcionario en la plataforma con clave personalizada)
userRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rut, username, fullName, email, password, role, jobTitle, department, branchId, assignedBranchIds } = req.body;

    if (!rut || !username || !fullName || !email || !role) {
      res.status(400).json({ error: 'RUT, Nombre de Usuario, Nombre Completo, Correo y Rol son obligatorios.' });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanRut = String(rut).trim();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPassword = password ? String(password).trim() : '';

    if (!cleanPassword || cleanPassword.length < 4) {
      res.status(400).json({ error: 'Debe asignar una contraseña personalizada de al menos 4 caracteres para activar la cuenta.' });
      return;
    }

    // Normalizar lista de bodegas asignadas
    let branchList: string[] = [];
    if (Array.isArray(assignedBranchIds)) {
      branchList = assignedBranchIds.map(String).filter(Boolean);
    } else if (branchId) {
      branchList = [String(branchId)];
    }

    const primaryBranchId = branchList.length > 0 ? branchList[0] : (branchId || null);

    // Verificar si ya existe el usuario de plataforma
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
      const updated = await prisma.platformUser.update({
        where: { id: existing.id },
        data: {
          fullName: String(fullName).trim(),
          email: cleanEmail,
          passwordHash: cleanPassword,
          role: role as PlatformRole,
          jobTitle: jobTitle || existing.jobTitle,
          department: department || existing.department,
          branchId: primaryBranchId,
          assignedBranchIds: branchList,
          isActive: true
        },
        include: { branch: true }
      });

      res.json({
        success: true,
        message: `Acceso y contraseña personalizada actualizados exitosamente para ${updated.fullName}`,
        user: {
          id: updated.id,
          rut: updated.rut,
          username: updated.username,
          fullName: updated.fullName,
          email: updated.email,
          role: updated.role,
          jobTitle: updated.jobTitle,
          branchId: updated.branchId,
          branchName: updated.branch?.name || 'Sucursal Central',
          assignedBranchIds: updated.assignedBranchIds,
          isActive: updated.isActive,
          createdAt: updated.createdAt.toISOString()
        }
      });
      return;
    }

    const newUser = await prisma.platformUser.create({
      data: {
        rut: cleanRut,
        username: cleanUsername,
        fullName: String(fullName).trim(),
        email: cleanEmail,
        passwordHash: cleanPassword,
        role: role as PlatformRole,
        jobTitle: jobTitle || 'Funcionario ITAM',
        department: department || 'División Tecnologías de la Información',
        branchId: primaryBranchId,
        assignedBranchIds: branchList,
        isActive: true
      },
      include: { branch: true }
    });

    res.status(201).json({
      success: true,
      message: `Cuenta de ${newUser.fullName} activada exitosamente con su contraseña personalizada`,
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
        assignedBranchIds: newUser.assignedBranchIds,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt.toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al crear/activar usuario', details: error.message });
  }
});

// Editar datos de usuario
userRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { fullName, email, role, jobTitle, department, branchId, assignedBranchIds, isActive } = req.body;

    const user = await prisma.platformUser.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    let branchList = user.assignedBranchIds;
    if (Array.isArray(assignedBranchIds)) {
      branchList = assignedBranchIds.map(String).filter(Boolean);
    }

    const primaryBranchId = branchList.length > 0 
      ? branchList[0] 
      : (branchId !== undefined ? branchId : user.branchId);

    const updated = await prisma.platformUser.update({
      where: { id },
      data: {
        fullName: fullName !== undefined ? String(fullName).trim() : user.fullName,
        email: email !== undefined ? String(email).trim().toLowerCase() : user.email,
        role: role !== undefined ? (role as PlatformRole) : user.role,
        jobTitle: jobTitle !== undefined ? jobTitle : user.jobTitle,
        department: department !== undefined ? department : user.department,
        branchId: primaryBranchId,
        assignedBranchIds: branchList,
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
