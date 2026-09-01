import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { LdapService } from '../services/ldapService.js';
import { LdapSyncService } from '../services/ldapSyncService.js';
import { normalizeText } from '../utils/formatters.js';

export const directoryRouter = Router();

// Probar conexión y autenticación con Active Directory / LDAP
directoryRouter.get('/test-ldap', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await LdapService.testConnection();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Error al probar LDAP', details: error.message });
  }
});

// Búsqueda ultrarrápida Multi-Token en PostgreSQL (Permite cualquier combinación de Nombres, Apellidos, RUT y Dominio)
directoryRouter.get('/users/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const query = q ? String(q).trim() : '';

    const words = query.split(/\s+/).filter(w => w.length > 0);
    const cleanDigits = query.replace(/[^0-9kK]/g, '').toLowerCase();

    const where: any = {};
    if (words.length > 0) {
      where.AND = words.map(w => {
        const cleanW = w.toLowerCase();
        const orConditions: any[] = [
          { fullName: { contains: w, mode: 'insensitive' } },
          { firstName: { contains: w, mode: 'insensitive' } },
          { lastName: { contains: w, mode: 'insensitive' } },
          { samAccountName: { contains: cleanW, mode: 'insensitive' } },
          { email: { contains: cleanW, mode: 'insensitive' } },
          { department: { contains: w, mode: 'insensitive' } },
          { jobTitle: { contains: w, mode: 'insensitive' } },
          { rut: { contains: w, mode: 'insensitive' } }
        ];

        // Si la palabra contiene dígitos numéricos de RUT
        const wordDigits = w.replace(/[^0-9kK]/g, '');
        if (wordDigits.length >= 3) {
          orConditions.push({ rut: { contains: wordDigits, mode: 'insensitive' } });
        }

        return { OR: orConditions };
      });
    }

    const users = await prisma.userADCache.findMany({
      where,
      select: {
        id: true,
        adGuid: true,
        samAccountName: true,
        rut: true,
        firstName: true,
        lastName: true,
        fullName: true,
        email: true,
        jobTitle: true,
        department: true,
        branchId: true,
        role: true,
        isActive: true,
        lastSyncedAt: true,
        branch: { select: { name: true } },
        _count: { select: { assignedAssets: { where: { status: { notIn: ['BODEGA_DISPONIBLE', 'DADO_DE_BAJA'] } } } } }
      },
      orderBy: { fullName: 'asc' }
    });

    // Also get consumables count (unreturned) grouped by user
    const userIds = users.map(u => u.id);
    const unreturnedConsumables = await prisma.assignmentItem.groupBy({
      by: ['assignmentId'],
      where: {
        isReturned: false,
        consumableId: { not: null },
        assignment: { recipientUserId: { in: userIds } }
      },
      _sum: { quantity: true }
    });

    // We need to map assignmentId to recipientUserId to get the correct counts
    const assignments = await prisma.assignment.findMany({
      where: { id: { in: unreturnedConsumables.map(c => c.assignmentId) } },
      select: { id: true, recipientUserId: true }
    });

    const consumableCountByUser = new Map<string, number>();
    unreturnedConsumables.forEach(c => {
      const assignment = assignments.find(a => a.id === c.assignmentId);
      if (assignment) {
        const current = consumableCountByUser.get(assignment.recipientUserId) || 0;
        consumableCountByUser.set(assignment.recipientUserId, current + (c._sum.quantity || 1));
      }
    });

    const formatted = users.map(u => ({
      id: u.id,
      adGuid: u.adGuid,
      samAccountName: u.samAccountName,
      rut: u.rut,
      firstName: u.firstName,
      lastName: u.lastName,
      fullName: u.fullName,
      email: u.email,
      jobTitle: u.jobTitle || 'Funcionario',
      department: u.department || 'ChileAtiende',
      branchId: u.branchId || '',
      branchName: u.branch?.name || 'Sucursal Central',
      role: u.role,
      isActive: u.isActive,
      lastSyncedAt: u.lastSyncedAt.toISOString(),
      assignedAssetsCount: u._count.assignedAssets + (consumableCountByUser.get(u.id) || 0)
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar directorio de funcionarios', details: error.message });
  }
});

// Sincronización manual / programada Dual-Dominio (ChileAtiende cha.cl e IPS ips.gob.cl)
directoryRouter.post('/sync', async (_req: Request, res: Response): Promise<void> => {
  try {
    const isLdapEnabled = process.env.LDAP_ENABLED !== 'false';
    let syncReport: any = null;

    if (isLdapEnabled) {
      syncReport = await LdapSyncService.syncDualDirectory();
    }

    const count = await prisma.userADCache.count();
    const now = new Date();

    if (!syncReport || syncReport.totalConsolidated === 0) {
      await prisma.userADCache.updateMany({
        data: { lastSyncedAt: now }
      });
    }

    res.json({
      success: true,
      syncedCount: syncReport && syncReport.totalConsolidated > 0 ? syncReport.totalConsolidated : count,
      timestamp: now.toISOString(),
      source: syncReport && syncReport.totalConsolidated > 0 ? 'Active Directory Dual (cha.cl & ips.gob.cl)' : 'Base de Datos Local (Caché)',
      metrics: syncReport ? {
        durationMs: syncReport.durationMs,
        chaExtracted: syncReport.chaExtracted,
        ipsExtracted: syncReport.ipsExtracted,
        dualDomainCount: syncReport.dualDomainCount,
        dbInsertedCount: syncReport.dbInsertedCount,
        dbUpdatedCount: syncReport.dbUpdatedCount,
        dbErrorsCount: syncReport.dbErrorsCount,
        domains: syncReport.domains
      } : undefined
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al sincronizar directorio dual', details: error.message });
  }
});

// Registrar / Dar de alta funcionario en Directorio Active Directory (para IPS o CHA)
directoryRouter.post('/users', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rut, samAccountName, fullName, email, jobTitle, department, branchId } = req.body;
    if (!samAccountName || !fullName || !email) {
      res.status(400).json({ error: 'Nombre de usuario, nombre completo y correo son obligatorios' });
      return;
    }
    const cleanSam = String(samAccountName).trim().toLowerCase();
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanRut = rut ? String(rut).trim() : `IPS-${cleanSam}`;

    const user = await prisma.userADCache.upsert({
      where: { samAccountName: cleanSam },
      update: {
        fullName: String(fullName).trim(),
        email: cleanEmail,
        rut: cleanRut,
        jobTitle: jobTitle || 'Funcionario IPS',
        department: department || 'Instituto de Previsión Social (IPS)',
        branchId: branchId || undefined,
        lastSyncedAt: new Date()
      },
      create: {
        adGuid: `guid-ips-${cleanSam}-${Date.now()}`,
        samAccountName: cleanSam,
        fullName: String(fullName).trim(),
        firstName: String(fullName).trim().split(' ')[0],
        lastName: String(fullName).trim().split(' ').slice(1).join(' ') || 'IPS',
        email: cleanEmail,
        rut: cleanRut,
        jobTitle: jobTitle || 'Funcionario IPS',
        department: department || 'Instituto de Previsión Social (IPS)',
        branchId: branchId || null,
        role: 'FUNCIONARIO',
        isActive: true,
        lastSyncedAt: new Date()
      }
    });

    res.status(201).json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al registrar funcionario en directorio', details: err.message });
  }
});

// Editar funcionario en el directorio manualmente
directoryRouter.put('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rut, samAccountName, fullName, email, jobTitle, department, branchId, isActive } = req.body;
    
    const user = await prisma.userADCache.update({
      where: { id: String(id) },
      data: {
        ...(rut !== undefined && { rut }),
        ...(samAccountName !== undefined && { samAccountName }),
        ...(fullName !== undefined && { 
          fullName, 
          firstName: fullName.split(' ')[0],
          lastName: fullName.split(' ').slice(1).join(' ')
        }),
        ...(email !== undefined && { email }),
        ...(jobTitle !== undefined && { jobTitle }),
        ...(department !== undefined && { department }),
        ...(branchId !== undefined && { branchId }),
        ...(isActive !== undefined && { isActive }),
      }
    });
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: 'Error al editar funcionario en directorio', details: err.message });
  }
});

// Eliminar funcionario del directorio manualmente (si no tiene actas asociadas)
directoryRouter.delete('/users/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.userADCache.delete({ where: { id: String(id) } });
    res.json({ success: true, message: 'Funcionario eliminado del directorio' });
  } catch (err: any) {
    res.status(400).json({ error: 'No se puede eliminar el funcionario. Asegúrese de que no tenga actas asociadas.', details: err.message });
  }
});
