import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { LdapService } from '../services/ldapService.js';
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

// Búsqueda en tiempo real en Active Directory / Entra ID y Caché Local (Insensible a Acentos y Mayúsculas)
directoryRouter.get('/users/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    const query = q ? String(q).trim() : '';

    // Si hay búsqueda activa y LDAP está configurado, consultar en vivo y auto-sincronizar
    if (query.length >= 2 && process.env.LDAP_BIND_PASSWORD) {
      try {
        await LdapService.syncUsersToCache(query);
      } catch (err: any) {
        console.warn('Advertencia en búsqueda LDAP en vivo:', err.message);
      }
    }

    const cleanQuery = normalizeText(query);
    const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);

    const allUsers = await prisma.userADCache.findMany({
      include: {
        branch: true,
        assignedAssets: {
          include: { assetType: true }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    const filteredUsers = words.length > 0
      ? allUsers.filter(u => {
          const target = normalizeText(
            `${u.fullName} ${u.firstName} ${u.lastName} ${u.rut} ${u.samAccountName} ${u.email} ${u.department} ${u.jobTitle} ${u.branch?.name || ''}`
          );
          return words.every(w => target.includes(w));
        })
      : allUsers;

    const formatted = filteredUsers.map(u => ({
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
      assignedAssetsCount: u.assignedAssets.length
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar directorio Active Directory', details: error.message });
  }
});

// Sincronización manual / webhook con Active Directory
directoryRouter.post('/sync', async (_req: Request, res: Response): Promise<void> => {
  try {
    let syncedFromLdap = 0;
    if (process.env.LDAP_BIND_PASSWORD) {
      syncedFromLdap = await LdapService.syncUsersToCache();
    }

    const count = await prisma.userADCache.count();
    const now = new Date();
    await prisma.userADCache.updateMany({
      data: { lastSyncedAt: now }
    });

    res.json({
      success: true,
      syncedCount: syncedFromLdap > 0 ? syncedFromLdap : count,
      timestamp: now.toISOString(),
      source: syncedFromLdap > 0 ? 'Active Directory (LDAP)' : 'Base de Datos Local'
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al sincronizar directorio', details: error.message });
  }
});
