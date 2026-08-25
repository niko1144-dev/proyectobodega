import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AssetStatus, AssetPropertyType } from '@prisma/client';

export const assetRouter = Router();

// Listar activos con filtros
assetRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyType, status, branchId, assetTypeId, search } = req.query;

    const where: any = {};

    if (propertyType && propertyType !== 'ALL') {
      where.propertyType = propertyType as AssetPropertyType;
    }

    if (status && status !== 'ALL') {
      where.status = status as AssetStatus;
    }

    if (branchId && branchId !== 'ALL') {
      where.currentBranchId = String(branchId);
    }

    if (assetTypeId && assetTypeId !== 'ALL') {
      where.assetTypeId = String(assetTypeId);
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { serialNumber: { contains: q, mode: 'insensitive' } },
        { inventoryNumber: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { model: { contains: q, mode: 'insensitive' } },
        { assignedToUserName: { contains: q, mode: 'insensitive' } },
        { assignedToUserRut: { contains: q, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        assetType: true,
        currentBranch: true,
        dispatchGuide: true,
        purchaseOrder: true,
        leasingContract: { include: { supplier: true } },
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = assets.map(a => ({
      id: a.id,
      serialNumber: a.serialNumber,
      inventoryNumber: a.inventoryNumber || undefined,
      brand: a.brand,
      model: a.model,
      assetTypeId: a.assetTypeId,
      assetTypeName: a.assetType.name,
      category: a.assetType.category,
      propertyType: a.propertyType,
      status: a.status,
      physicalCondition: a.physicalCondition,
      dispatchGuideId: a.dispatchGuideId,
      dispatchGuideNumber: a.dispatchGuide.guideNumber,
      purchaseOrderId: a.purchaseOrderId || undefined,
      purchaseOrderNumber: a.purchaseOrder?.ocNumber || undefined,
      leasingContractId: a.leasingContractId || undefined,
      leasingContractNumber: a.leasingContract?.contractNumber || undefined,
      supplierName: a.leasingContract?.supplier.businessName || a.dispatchGuide.receivedByUserName,
      contractEndDate: a.leasingContract?.endDate ? a.leasingContract.endDate.toISOString() : undefined,
      currentBranchId: a.currentBranchId,
      currentBranchName: a.currentBranch.name,
      locationDetail: a.locationDetail || undefined,
      assignedToUserId: a.assignedToUserId || undefined,
      assignedToUserName: a.assignedToUserName || undefined,
      assignedToUserRut: a.assignedToUserRut || undefined,
      assignedToUserDept: a.assignedToUserDept || undefined,
      assignedDate: a.assignedDate ? a.assignedDate.toISOString() : undefined,
      specifications: a.specifications as any,
      receptionDate: a.receptionDate.toISOString(),
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar activos', details: error.message });
  }
});

// Obtener logs de auditoría globales
assetRouter.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const logs = await prisma.assetAuditLog.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar logs de auditoría', details: error.message });
  }
});

// Obtener activo por ID con historial
assetRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        assetType: true,
        currentBranch: true,
        dispatchGuide: true,
        purchaseOrder: true,
        leasingContract: { include: { supplier: true } },
        auditLogs: { orderBy: { timestamp: 'desc' } }
      }
    });

    if (!asset) {
      res.status(404).json({ error: 'Activo no encontrado' });
      return;
    }

    res.json(asset);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener detalle del activo', details: error.message });
  }
});

// Cambiar estado del activo
assetRouter.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { newStatus, reason, newBranchId, newLocationDetail, changedByUserName } = req.body;

    const currentAsset = await prisma.asset.findUnique({
      where: { id },
      include: { currentBranch: true }
    });

    if (!currentAsset) {
      res.status(404).json({ error: 'Activo no encontrado' });
      return;
    }

    const previousStatus = currentAsset.status;
    const previousUserId = currentAsset.assignedToUserId;
    const previousUserName = currentAsset.assignedToUserName;

    let targetBranchId = currentAsset.currentBranchId;
    let targetBranchName = currentAsset.currentBranch?.name || 'Sucursal';

    if (newBranchId) {
      const b = await prisma.branch.findUnique({ where: { id: newBranchId } });
      if (b) {
        targetBranchId = b.id;
        targetBranchName = b.name;
      }
    }

    // Actualización transaccional
    const [updatedAsset, log] = await prisma.$transaction([
      prisma.asset.update({
        where: { id },
        data: {
          status: newStatus as AssetStatus,
          currentBranchId: targetBranchId,
          locationDetail: newLocationDetail !== undefined ? newLocationDetail : currentAsset.locationDetail,
          assignedToUserId: ['BODEGA_DISPONIBLE', 'DADO_DE_BAJA', 'DEVUELTO_PROVEEDOR'].includes(newStatus) ? null : currentAsset.assignedToUserId,
          assignedToUserName: ['BODEGA_DISPONIBLE', 'DADO_DE_BAJA', 'DEVUELTO_PROVEEDOR'].includes(newStatus) ? null : currentAsset.assignedToUserName,
          assignedToUserRut: ['BODEGA_DISPONIBLE', 'DADO_DE_BAJA', 'DEVUELTO_PROVEEDOR'].includes(newStatus) ? null : currentAsset.assignedToUserRut,
          assignedToUserDept: ['BODEGA_DISPONIBLE', 'DADO_DE_BAJA', 'DEVUELTO_PROVEEDOR'].includes(newStatus) ? null : currentAsset.assignedToUserDept,
          assignedDate: ['BODEGA_DISPONIBLE', 'DADO_DE_BAJA', 'DEVUELTO_PROVEEDOR'].includes(newStatus) ? null : currentAsset.assignedDate,
        }
      }),
      prisma.assetAuditLog.create({
        data: {
          assetId: currentAsset.id,
          serialNumber: currentAsset.serialNumber,
          inventoryNumber: currentAsset.inventoryNumber,
          previousStatus: previousStatus,
          newStatus: newStatus as AssetStatus,
          previousUserId: previousUserId,
          previousUserName: previousUserName,
          branchName: targetBranchName,
          changedByUserName: changedByUserName || 'Técnico Administrador',
          changeReason: reason || `Cambio de estado a ${newStatus}`
        }
      })
    ]);

    res.json({ success: true, asset: updatedAsset, auditLog: log });
  } catch (error: any) {
    res.status(500).json({ error: 'Error actualizando estado del activo', details: error.message });
  }
});
