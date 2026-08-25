import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AssetPropertyType, PhysicalCondition, AssetStatus } from '@prisma/client';

export const receptionRouter = Router();

// Listar Guías de Despacho
receptionRouter.get('/dispatch-guides', async (req: Request, res: Response): Promise<void> => {
  try {
    const guides = await prisma.dispatchGuide.findMany({
      include: {
        supplier: true,
        purchaseOrder: true,
        leasingContract: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = guides.map(g => ({
      id: g.id,
      guideNumber: g.guideNumber,
      supplierId: g.supplierId,
      supplierName: g.supplier.businessName,
      supplierRut: g.supplier.rut,
      purchaseOrderId: g.purchaseOrderId || undefined,
      purchaseOrderNumber: g.purchaseOrder?.ocNumber || undefined,
      leasingContractId: g.leasingContractId || undefined,
      leasingContractNumber: g.leasingContract?.contractNumber || undefined,
      dispatchDate: g.dispatchDate.toISOString(),
      receptionDate: g.receptionDate.toISOString(),
      documentUrl: g.documentUrl || '',
      documentName: g.documentName || '',
      receivedByUserId: g.receivedByUserId,
      receivedByUserName: g.receivedByUserName,
      branchId: g.branchId,
      branchName: g.branch.name,
      totalItemsCount: g.totalItemsCount,
      observations: g.observations || undefined,
      createdAt: g.createdAt.toISOString()
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar guías de despacho', details: error.message });
  }
});

// Registrar Recepción Documental y Lote de Activos en PostgreSQL (Transaccional)
receptionRouter.post('/dispatch-guide', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      guideNumber,
      supplierId,
      purchaseOrderId,
      leasingContractId,
      branchId,
      dispatchDate,
      documentName,
      receivedByUserId,
      receivedByUserName,
      observations,
      propertyType,
      items // Array de activos
    } = req.body;

    if (!guideNumber || !supplierId || !branchId) {
      res.status(400).json({ error: 'N° de Guía, Proveedor y Sucursal son obligatorios' });
      return;
    }

    if (propertyType === 'PROPIO' && !purchaseOrderId) {
      res.status(400).json({ error: 'Para Activos Propios es obligatorio vincular la Orden de Compra (OC)' });
      return;
    }

    if (propertyType === 'ARRIENDO' && !leasingContractId) {
      res.status(400).json({ error: 'Para Activos en Arriendo es obligatorio vincular el Contrato de Leasing' });
      return;
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      res.status(404).json({ error: 'Sucursal no encontrada' });
      return;
    }

    // Ejecución transaccional en PostgreSQL
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear Guía de Despacho
      const guide = await tx.dispatchGuide.create({
        data: {
          guideNumber: guideNumber.trim(),
          supplierId,
          purchaseOrderId: propertyType === 'PROPIO' ? purchaseOrderId : null,
          leasingContractId: propertyType === 'ARRIENDO' ? leasingContractId : null,
          branchId,
          dispatchDate: new Date(dispatchDate || Date.now()),
          receptionDate: new Date(),
          documentName: documentName || `Guia_${guideNumber.trim()}.pdf`,
          receivedByUserId: receivedByUserId || 'usr-admin',
          receivedByUserName: receivedByUserName || 'Técnico Bodega',
          totalItemsCount: Array.isArray(items) ? items.length : 0,
          observations
        }
      });

      // 2. Crear los activos asociados
      const createdAssets = [];
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const asset = await tx.asset.create({
            data: {
              serialNumber: item.serialNumber.trim().toUpperCase(),
              inventoryNumber: propertyType === 'PROPIO' ? item.inventoryNumber?.trim().toUpperCase() : null,
              brand: item.brand.trim(),
              model: item.model.trim(),
              assetTypeId: item.assetTypeId,
              propertyType: propertyType as AssetPropertyType,
              status: AssetStatus.BODEGA_DISPONIBLE,
              physicalCondition: (item.physicalCondition as PhysicalCondition) || PhysicalCondition.NUEVO,
              dispatchGuideId: guide.id,
              purchaseOrderId: propertyType === 'PROPIO' ? purchaseOrderId : null,
              leasingContractId: propertyType === 'ARRIENDO' ? leasingContractId : null,
              currentBranchId: branchId,
              locationDetail: `Bodega TI - Recepción Guía ${guide.guideNumber}`,
              specifications: {
                cpu: item.cpu || undefined,
                ram: item.ram || undefined,
                storage: item.storage || undefined
              }
            }
          });

          // Crear Log de Auditoría inmutable
          await tx.assetAuditLog.create({
            data: {
              assetId: asset.id,
              serialNumber: asset.serialNumber,
              inventoryNumber: asset.inventoryNumber,
              newStatus: AssetStatus.BODEGA_DISPONIBLE,
              branchName: branch.name,
              changedByUserName: receivedByUserName || 'Técnico Bodega',
              changeReason: `Ingreso conforme a Bodega con Guía ${guide.guideNumber}`,
              documentRef: guide.guideNumber
            }
          });

          createdAssets.push(asset);
        }
      }

      return { guide, createdAssets };
    });

    res.status(201).json({
      success: true,
      guide: result.guide,
      assetsCreatedCount: result.createdAssets.length,
      assets: result.createdAssets
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un activo con ese Número de Serie o Número de Inventario en PostgreSQL' });
      return;
    }
    res.status(500).json({ error: 'Error al registrar recepción', details: error.message });
  }
});
