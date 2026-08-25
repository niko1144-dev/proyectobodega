import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';

export const dashboardRouter = Router();

dashboardRouter.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const branchFilter = branchId && branchId !== 'ALL' ? { currentBranchId: String(branchId) } : {};

    const [
      totalAssets,
      ownAssets,
      leasingAssets,
      inWarehouse,
      assigned,
      inMaintenance,
      contracts,
      consumableStocks,
      consumables,
      recentAuditLogs
    ] = await Promise.all([
      prisma.asset.count({ where: branchFilter }),
      prisma.asset.count({ where: { ...branchFilter, propertyType: 'PROPIO' } }),
      prisma.asset.count({ where: { ...branchFilter, propertyType: 'ARRIENDO' } }),
      prisma.asset.count({ where: { ...branchFilter, status: 'BODEGA_DISPONIBLE' } }),
      prisma.asset.count({ where: { ...branchFilter, status: 'ASIGNADO' } }),
      prisma.asset.count({ where: { ...branchFilter, status: 'EN_MANTENCION' } }),
      prisma.leasingContract.findMany({
        where: { isActive: true },
        include: { supplier: true, assets: true }
      }),
      prisma.consumableStock.findMany({
        where: branchId && branchId !== 'ALL' ? { branchId: String(branchId) } : {},
        include: { consumable: true, branch: true }
      }),
      prisma.consumable.findMany(),
      prisma.assetAuditLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 8
      })
    ]);

    // Arriendos por vencer en < 60 días
    const now = new Date();
    const expiringContracts = contracts.map(c => {
      const diffTime = new Date(c.endDate).getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        name: c.name,
        supplierName: c.supplier.businessName,
        endDate: c.endDate,
        daysLeft,
        linkedAssetsCount: c.assets.length
      };
    }).filter(c => c.daysLeft <= 60);

    // Stock crítico
    const criticalStocks = consumableStocks.map(stk => ({
      id: stk.id,
      consumableId: stk.consumableId,
      consumableName: stk.consumable.name,
      sku: stk.consumable.sku,
      branchName: stk.branch.name,
      currentQuantity: stk.currentQuantity,
      minStockAlert: stk.consumable.minStockAlert,
      isCritical: stk.currentQuantity <= stk.consumable.minStockAlert
    })).filter(s => s.isCritical);

    res.json({
      totalAssets,
      ownAssets,
      leasingAssets,
      inWarehouse,
      assigned,
      inMaintenance,
      expiringContracts,
      criticalStocks,
      recentAuditLogs
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener métricas del dashboard', details: error.message });
  }
});
