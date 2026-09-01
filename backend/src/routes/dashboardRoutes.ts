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

    // Arriendos por vencer según el umbral configurado en cada contrato (warningDaysThreshold)
    const now = new Date();
    const expiringContracts = contracts.map(c => {
      const diffTime = new Date(c.endDate).getTime() - now.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const threshold = c.warningDaysThreshold || 30;
      return {
        id: c.id,
        contractNumber: c.contractNumber,
        name: c.name,
        supplierName: c.supplier?.businessName || 'Proveedor',
        endDate: c.endDate,
        daysLeft,
        warningDaysThreshold: threshold,
        linkedAssetsCount: c.assets.length
      };
    }).filter(c => c.daysLeft >= 0 && c.daysLeft <= c.warningDaysThreshold);

    // Stock crítico según umbral mínimo de cada insumo (minStockAlert)
    const criticalStocks = consumableStocks.map(stk => ({
      id: stk.id,
      consumableId: stk.consumableId,
      consumableName: stk.consumable?.name || 'Insumo',
      sku: stk.consumable?.sku || '-',
      branchName: stk.branch?.name || 'Bodega',
      currentQuantity: stk.currentQuantity,
      minStockAlert: stk.consumable?.minStockAlert ?? 5,
      isCritical: stk.currentQuantity <= (stk.consumable?.minStockAlert ?? 5)
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

// Top 5 Productos Más Entregados (Dinámico por Rango de Fechas y Sucursal)
dashboardRouter.get('/top-delivered', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, branchId, itemType } = req.query;

    const whereClause: any = {
      status: { not: 'ANULADO' },
      assignmentType: { not: 'DEVOLUCION' }
    };

    if (branchId && branchId !== 'ALL') {
      whereClause.branchId = String(branchId);
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        const end = new Date(String(endDate));
        if (String(endDate).length === 10) {
          end.setHours(23, 59, 59, 999);
        }
        whereClause.createdAt.lte = end;
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        branch: true,
        recipientUser: true,
        technicianUser: true,
        items: {
          include: {
            asset: {
              include: {
                assetType: true
              }
            },
            consumable: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const productMap = new Map<string, {
      id: string;
      name: string;
      brand: string;
      model: string;
      category: string;
      itemType: 'HARDWARE' | 'CONSUMABLE';
      quantity: number;
      assignmentCount: number;
      recentRecipients: Array<{
        recipientName: string;
        recipientRut?: string;
        actNumber: string;
        date: string;
        branchName: string;
      }>;
    }>();

    let totalDeliveredUnits = 0;
    const allRecentDeliveries: Array<{
      actNumber: string;
      date: string;
      recipientName: string;
      recipientRut: string;
      recipientDepartment?: string;
      branchName: string;
      productName: string;
      quantity: number;
      itemType: 'HARDWARE' | 'CONSUMABLE';
    }> = [];

    const requestedType = itemType ? String(itemType).toUpperCase() : 'ALL';

    for (const assignment of assignments) {
      const actDate = assignment.createdAt.toISOString();
      const recName = assignment.recipientUser?.fullName || 'Funcionario';
      const recRut = assignment.recipientUser?.rut || '';
      const recDept = assignment.recipientUser?.department || '';
      const branchName = assignment.branch?.name || 'Bodega';

      for (const item of assignment.items) {
        if (item.asset) {
          if (requestedType === 'CONSUMABLE') continue;

          const brand = item.asset.brand || '';
          const model = item.asset.model || '';
          const typeName = item.asset.assetType?.name || 'Equipo TI';
          const productName = `${brand} ${model}`.trim() || typeName;
          const key = `HW_${productName.toLowerCase()}_${typeName.toLowerCase()}`;
          const qty = item.quantity || 1;

          totalDeliveredUnits += qty;

          const existing = productMap.get(key);
          if (!existing) {
            productMap.set(key, {
              id: item.asset.assetTypeId || key,
              name: productName,
              brand: brand || 'Genérico',
              model: model || typeName,
              category: typeName,
              itemType: 'HARDWARE',
              quantity: qty,
              assignmentCount: 1,
              recentRecipients: [{
                recipientName: recName,
                recipientRut: recRut,
                actNumber: assignment.actNumber,
                date: actDate,
                branchName
              }]
            });
          } else {
            existing.quantity += qty;
            existing.assignmentCount += 1;
            if (existing.recentRecipients.length < 5) {
              existing.recentRecipients.push({
                recipientName: recName,
                recipientRut: recRut,
                actNumber: assignment.actNumber,
                date: actDate,
                branchName
              });
            }
          }

          if (allRecentDeliveries.length < 15) {
            allRecentDeliveries.push({
              actNumber: assignment.actNumber,
              date: actDate,
              recipientName: recName,
              recipientRut: recRut,
              recipientDepartment: recDept,
              branchName,
              productName,
              quantity: qty,
              itemType: 'HARDWARE'
            });
          }
        } else if (item.consumable) {
          if (requestedType === 'HARDWARE') continue;

          const productName = item.consumable.name || 'Insumo / Periférico';
          const key = `CON_${item.consumable.id}`;
          const qty = item.quantity || 1;

          totalDeliveredUnits += qty;

          const existing = productMap.get(key);
          if (!existing) {
            productMap.set(key, {
              id: item.consumable.id,
              name: productName,
              brand: 'Insumo',
              model: item.consumable.sku || '-',
              category: item.consumable.category || 'Periféricos e Insumos',
              itemType: 'CONSUMABLE',
              quantity: qty,
              assignmentCount: 1,
              recentRecipients: [{
                recipientName: recName,
                recipientRut: recRut,
                actNumber: assignment.actNumber,
                date: actDate,
                branchName
              }]
            });
          } else {
            existing.quantity += qty;
            existing.assignmentCount += 1;
            if (existing.recentRecipients.length < 5) {
              existing.recentRecipients.push({
                recipientName: recName,
                recipientRut: recRut,
                actNumber: assignment.actNumber,
                date: actDate,
                branchName
              });
            }
          }

          if (allRecentDeliveries.length < 15) {
            allRecentDeliveries.push({
              actNumber: assignment.actNumber,
              date: actDate,
              recipientName: recName,
              recipientRut: recRut,
              recipientDepartment: recDept,
              branchName,
              productName,
              quantity: qty,
              itemType: 'CONSUMABLE'
            });
          }
        }
      }
    }

    const sortedProducts = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);

    const top5 = sortedProducts.slice(0, 5).map((p, idx) => ({
      position: idx + 1,
      id: p.id,
      name: p.name,
      brand: p.brand,
      model: p.model,
      category: p.category,
      itemType: p.itemType,
      quantity: p.quantity,
      percentage: totalDeliveredUnits > 0 ? Number(((p.quantity / totalDeliveredUnits) * 100).toFixed(1)) : 0,
      assignmentCount: p.assignmentCount,
      recentRecipients: p.recentRecipients
    }));

    let branchName = 'Todas las Sucursales (Nivel Nacional)';
    if (branchId && branchId !== 'ALL') {
      const br = await prisma.branch.findUnique({ where: { id: String(branchId) } });
      if (br) branchName = br.name;
    }

    res.json({
      items: top5,
      summary: {
        totalDeliveredUnits,
        totalAssignments: assignments.length,
        uniqueProductsCount: productMap.size,
        top1DominancePercentage: top5.length > 0 ? top5[0].percentage : 0,
        branchName,
        dateRange: {
          startDate: startDate ? String(startDate) : null,
          endDate: endDate ? String(endDate) : null
        }
      },
      recentDeliveries: allRecentDeliveries
    });
  } catch (error: any) {
    console.error('Error in /dashboard/top-delivered:', error);
    res.status(500).json({ error: 'Error al calcular top de productos entregados', details: error.message });
  }
});

