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

// Obtener logs de auditoría globales (Kardex)
assetRouter.get('/audit-logs', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const branchName = req.query.branchName as string;
    const search = req.query.search as string;

    const where: any = {};
    if (branchName && branchName !== 'ALL') {
      where.branchName = { contains: branchName, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { inventoryNumber: { contains: search, mode: 'insensitive' } },
        { changedByUserName: { contains: search, mode: 'insensitive' } },
        { changeReason: { contains: search, mode: 'insensitive' } },
      ];
    }

    const logs = await prisma.assetAuditLog.findMany({
      where,
      include: {
        asset: {
          include: {
            assetType: true,
            currentBranch: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar logs de auditoría', details: error.message });
  }
});

// Obtener Hoja de Vida y Trazabilidad Completa del Activo (por ID, N° de Serie o N° de Inventario)
assetRouter.get('/:identifier/traceability', async (req: Request, res: Response): Promise<void> => {
  try {
    const identifier = String(req.params.identifier).trim();

    // Buscar activo por ID, Serial Number o Inventory Number
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { id: identifier },
          { serialNumber: { equals: identifier, mode: 'insensitive' } },
          { inventoryNumber: { equals: identifier, mode: 'insensitive' } }
        ]
      },
      include: {
        assetType: true,
        currentBranch: true,
        dispatchGuide: {
          include: {
            supplier: true,
            purchaseOrder: true,
            leasingContract: { include: { supplier: true } },
            branch: true
          }
        },
        purchaseOrder: { include: { supplier: true } },
        leasingContract: { include: { supplier: true } },
        auditLogs: { orderBy: { timestamp: 'desc' } },
        assignmentItems: {
          include: {
            assignment: {
              include: {
                branch: true,
                recipientUser: true,
                technicianUser: true
              }
            }
          },
          orderBy: { assignment: { createdAt: 'desc' } }
        }
      }
    });

    if (!asset) {
      res.status(404).json({ error: 'Activo no encontrado para la serie o identificador especificado.' });
      return;
    }

    // Construir línea de tiempo cronológica unificada de la vida útil del activo
    const timeline: any[] = [];

    // 1. Evento de Recepción Inicial
    timeline.push({
      id: `evt-reception-${asset.id}`,
      type: 'RECEPCION_GUIA',
      title: 'Recepción Conforme e Ingreso a Bodega',
      timestamp: asset.receptionDate || asset.dispatchGuide.receptionDate,
      category: 'INGRESO',
      actor: asset.dispatchGuide.receivedByUserName || 'Encargado de Bodega',
      branchName: asset.dispatchGuide.branch?.name || asset.currentBranch.name,
      documentRef: `Guía Despacho N° ${asset.dispatchGuide.guideNumber}`,
      documentType: 'GUIA_DESPACHO',
      details: {
        guideNumber: asset.dispatchGuide.guideNumber,
        supplierName: asset.dispatchGuide.supplier?.businessName || asset.leasingContract?.supplier.businessName || 'Proveedor Acreditado',
        ocOrContract: asset.purchaseOrder?.ocNumber ? `OC: ${asset.purchaseOrder.ocNumber}` : (asset.leasingContract?.contractNumber ? `Contrato: ${asset.leasingContract.contractNumber}` : 'Adquisición Directa'),
        physicalCondition: asset.physicalCondition,
        observations: asset.dispatchGuide.observations || 'Ingreso inicial registrado en sistema'
      }
    });

    // 2. Eventos de Asignación y Devolución
    for (const item of asset.assignmentItems) {
      const asg = item.assignment;
      
      timeline.push({
        id: `evt-asg-${item.id}`,
        type: 'ASIGNACION_ACTA',
        title: asg.assignmentType === 'DEVOLUCION' ? 'Acta de Devolución Registrada' : 'Asignación y Entrega Oficial de Equipamiento TI',
        timestamp: asg.createdAt,
        category: 'ENTREGA',
        actor: asg.technicianUser?.fullName || 'Técnico Responsable',
        branchName: asg.branch?.name || asset.currentBranch.name,
        documentRef: `Acta Folio ${asg.actNumber}`,
        documentType: 'ACTA_ASIGNACION',
        details: {
          actNumber: asg.actNumber,
          assignmentType: asg.assignmentType,
          recipientName: asg.recipientUser?.fullName || 'Funcionario',
          recipientRut: asg.recipientUser?.rut || '',
          recipientJobTitle: asg.recipientUser?.jobTitle || 'Funcionario',
          recipientDepartment: asg.recipientUser?.department || 'ChileAtiende',
          recipientBranch: asg.branch?.name || asset.currentBranch.name,
          signatureStatus: asg.status,
          digitalSignatureHash: asg.digitalSignatureHash,
          observations: asg.observations || 'Entrega conforme de hardware institucional'
        }
      });

      if (item.isReturned && item.returnedAt) {
        timeline.push({
          id: `evt-ret-${item.id}`,
          type: 'DEVOLUCION_ACTA',
          title: 'Devolución y Reingreso Físico a Bodega',
          timestamp: item.returnedAt,
          category: 'DEVOLUCION',
          actor: asg.technicianUser?.fullName || 'Técnico Responsable',
          branchName: asg.branch?.name || asset.currentBranch.name,
          documentRef: `Acta Folio ${asg.actNumber}`,
          documentType: 'ACTA_DEVOLUCION',
          details: {
            actNumber: asg.actNumber,
            conditionAtReturn: item.conditionAtReturn || 'BUENO',
            returnNotes: item.returnNotes || 'Reingreso a stock en bodega'
          }
        });
      }
    }

    // 3. Eventos de Auditoría y Kardex
    for (const log of asset.auditLogs) {
      // Evitar duplicar el evento inicial si ya está en la recepción
      if (!log.changeReason.includes('Ingreso inicial')) {
        timeline.push({
          id: `evt-audit-${log.id}`,
          type: 'AUDITORIA_KARDEX',
          title: log.newStatus === 'EN_MANTENCION' ? 'Servicio Técnico / Envío a Taller' : (log.changeReason.includes('Devolución') ? 'Reingreso Físico a Bodega' : 'Cambio de Estado o Custodia'),
          timestamp: log.timestamp,
          category: log.newStatus === 'EN_MANTENCION' ? 'MANTENCION' : 'ESTADO',
          actor: log.changedByUserName,
          branchName: log.branchName,
          documentRef: log.documentRef || undefined,
          documentType: 'LOG_KARDEX',
          details: {
            previousStatus: log.previousStatus,
            newStatus: log.newStatus,
            previousUserName: log.previousUserName,
            newUserName: log.newUserName,
            changeReason: log.changeReason
          }
        });
      }
    }

    // Ordenar cronológicamente descendente (más reciente arriba)
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      asset: {
        id: asset.id,
        serialNumber: asset.serialNumber,
        inventoryNumber: asset.inventoryNumber || undefined,
        brand: asset.brand,
        model: asset.model,
        assetTypeId: asset.assetTypeId,
        assetTypeName: asset.assetType.name,
        category: asset.assetType.category,
        propertyType: asset.propertyType,
        status: asset.status,
        physicalCondition: asset.physicalCondition,
        currentBranchId: asset.currentBranchId,
        currentBranchName: asset.currentBranch.name,
        currentBranchRegion: asset.currentBranch.region,
        currentBranchAddress: asset.currentBranch.address,
        locationDetail: asset.locationDetail || undefined,
        assignedToUserId: asset.assignedToUserId || undefined,
        assignedToUserName: asset.assignedToUserName || undefined,
        assignedToUserRut: asset.assignedToUserRut || undefined,
        assignedToUserDept: asset.assignedToUserDept || undefined,
        assignedDate: asset.assignedDate ? asset.assignedDate.toISOString() : undefined,
        specifications: asset.specifications as any,
        receptionDate: asset.receptionDate.toISOString(),
        dispatchGuideId: asset.dispatchGuideId,
        dispatchGuideNumber: asset.dispatchGuide.guideNumber,
        supplierName: asset.leasingContract?.supplier.businessName || asset.dispatchGuide.supplier?.businessName || 'Proveedor Acreditado',
        purchaseOrderId: asset.purchaseOrderId || undefined,
        purchaseOrderNumber: asset.purchaseOrder?.ocNumber || undefined,
        leasingContractId: asset.leasingContractId || undefined,
        leasingContractNumber: asset.leasingContract?.contractNumber || undefined,
        contractEndDate: asset.leasingContract?.endDate ? asset.leasingContract.endDate.toISOString() : undefined,
        notes: asset.notes || undefined
      },
      timeline
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar trazabilidad del activo', details: error.message });
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
