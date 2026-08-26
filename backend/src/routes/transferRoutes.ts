import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { StockMovementType, AssetStatus } from '@prisma/client';

export const transferRouter = Router();

// ==========================================
// TRASPASO DE ACTIVOS SERIALIZADOS (HARDWARE)
// ==========================================
transferRouter.post('/assets', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      assetIds, 
      sourceBranchId, 
      destinationBranchId, 
      reason, 
      documentRef, 
      transferredByUserName 
    } = req.body;

    if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
      res.status(400).json({ error: 'Debe seleccionar al menos un activo para realizar el traspaso.' });
      return;
    }

    if (!sourceBranchId || !destinationBranchId) {
      res.status(400).json({ error: 'Bodega de origen y bodega de destino son obligatorias.' });
      return;
    }

    if (sourceBranchId === destinationBranchId) {
      res.status(400).json({ error: 'La bodega de destino no puede ser igual a la bodega de origen.' });
      return;
    }

    const [sourceBranch, destBranch] = await Promise.all([
      prisma.branch.findUnique({ where: { id: sourceBranchId } }),
      prisma.branch.findUnique({ where: { id: destinationBranchId } })
    ]);

    if (!sourceBranch || !destBranch) {
      res.status(404).json({ error: 'Una de las bodegas seleccionadas no existe.' });
      return;
    }

    if (!destBranch.isActive) {
      res.status(400).json({ error: `La bodega de destino '${destBranch.name}' se encuentra inactiva.` });
      return;
    }

    // Verificar que los activos existan y pertenezcan a la bodega de origen
    const assets = await prisma.asset.findMany({
      where: {
        id: { in: assetIds },
        currentBranchId: sourceBranchId
      },
      include: { assetType: true }
    });

    if (assets.length !== assetIds.length) {
      res.status(400).json({ 
        error: `Algunos de los activos seleccionados no se encuentran en la bodega '${sourceBranch.name}' o ya fueron trasladados.` 
      });
      return;
    }

    // Comprobar que los activos no estén asignados a funcionarios
    const assignedAssets = assets.filter(a => a.status === AssetStatus.ASIGNADO);
    if (assignedAssets.length > 0) {
      const serials = assignedAssets.map(a => a.serialNumber).join(', ');
      res.status(400).json({ 
        error: `Los siguientes activos están asignados a funcionarios y deben ser devueltos antes del traspaso: ${serials}` 
      });
      return;
    }

    const cleanUser = transferredByUserName ? String(transferredByUserName).trim() : 'Encargado DTI';
    const cleanReason = reason ? String(reason).trim() : 'Traspaso institucional entre dependencias';
    const cleanDocRef = documentRef ? String(documentRef).trim() : `TRASP-${Date.now()}`;

    // Ejecutar transacción en PostgreSQL
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar bodega de los activos
      await tx.asset.updateMany({
        where: { id: { in: assetIds } },
        data: {
          currentBranchId: destinationBranchId,
          locationDetail: `Traspasado a ${destBranch.name}`,
          updatedAt: new Date()
        }
      });

      // 2. Registrar logs de auditoría por cada activo
      for (const asset of assets) {
        await tx.assetAuditLog.create({
          data: {
            assetId: asset.id,
            serialNumber: asset.serialNumber,
            inventoryNumber: asset.inventoryNumber || null,
            previousStatus: asset.status,
            newStatus: asset.status,
            previousUserId: null,
            previousUserName: null,
            newUserId: null,
            newUserName: null,
            branchName: destBranch.name,
            changedByUserName: cleanUser,
            changeReason: `Traspaso desde ${sourceBranch.name} hacia ${destBranch.name}. Motivo: ${cleanReason}`,
            documentRef: cleanDocRef
          }
        });
      }
    });

    res.json({
      success: true,
      message: `✓ ${assets.length} activos traspasados exitosamente desde '${sourceBranch.name}' hacia '${destBranch.name}'.`,
      transferredCount: assets.length,
      documentRef: cleanDocRef
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al procesar traspaso de activos', details: error.message });
  }
});

// ==========================================
// TRASPASO DE INSUMOS Y PERIFÉRICOS A GRANEL
// ==========================================
transferRouter.post('/consumables', async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      consumableId, 
      sourceBranchId, 
      destinationBranchId, 
      quantity, 
      reason, 
      documentRef, 
      transferredByUserName 
    } = req.body;

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      res.status(400).json({ error: 'La cantidad a traspasar debe ser un número entero mayor a cero.' });
      return;
    }

    if (!consumableId || !sourceBranchId || !destinationBranchId) {
      res.status(400).json({ error: 'Insumo, bodega de origen y bodega de destino son obligatorios.' });
      return;
    }

    if (sourceBranchId === destinationBranchId) {
      res.status(400).json({ error: 'La bodega de destino no puede ser igual a la bodega de origen.' });
      return;
    }

    const [consumable, sourceBranch, destBranch, sourceStock] = await Promise.all([
      prisma.consumable.findUnique({ where: { id: consumableId } }),
      prisma.branch.findUnique({ where: { id: sourceBranchId } }),
      prisma.branch.findUnique({ where: { id: destinationBranchId } }),
      prisma.consumableStock.findUnique({
        where: {
          consumableId_branchId: {
            consumableId,
            branchId: sourceBranchId
          }
        }
      })
    ]);

    if (!consumable) {
      res.status(404).json({ error: 'Insumo no encontrado.' });
      return;
    }

    if (!sourceBranch || !destBranch) {
      res.status(404).json({ error: 'Una de las bodegas no existe.' });
      return;
    }

    if (!destBranch.isActive) {
      res.status(400).json({ error: `La bodega de destino '${destBranch.name}' está inactiva.` });
      return;
    }

    const currentSourceQty = sourceStock ? sourceStock.currentQuantity : 0;
    if (currentSourceQty < qty) {
      res.status(400).json({ 
        error: `Stock insuficiente en '${sourceBranch.name}'. Disponible: ${currentSourceQty} unidades, solicitado: ${qty} unidades.` 
      });
      return;
    }

    const cleanUser = transferredByUserName ? String(transferredByUserName).trim() : 'Encargado DTI';
    const cleanReason = reason ? String(reason).trim() : 'Traspaso de insumos entre bodegas';
    const cleanDocRef = documentRef ? String(documentRef).trim() : `TRASP-INS-${Date.now()}`;

    // Transacción atómica
    await prisma.$transaction(async (tx) => {
      // 1. Decrementar stock en origen
      const prevSource = currentSourceQty;
      const newSource = prevSource - qty;

      await tx.consumableStock.update({
        where: {
          consumableId_branchId: {
            consumableId,
            branchId: sourceBranchId
          }
        },
        data: {
          currentQuantity: newSource,
          lastUpdated: new Date()
        }
      });

      // Registrar movimiento de egreso por traspaso en origen
      await tx.stockMovement.create({
        data: {
          consumableId,
          branchId: sourceBranchId,
          movementType: StockMovementType.TRANSFERENCIA,
          quantity: -qty,
          previousQuantity: prevSource,
          newQuantity: newSource,
          dispatchGuideNumber: cleanDocRef,
          registeredByName: cleanUser,
          reason: `Traspaso hacia '${destBranch.name}'. Motivo: ${cleanReason}`
        }
      });

      // 2. Incrementar o crear stock en destino
      const destStock = await tx.consumableStock.findUnique({
        where: {
          consumableId_branchId: {
            consumableId,
            branchId: destinationBranchId
          }
        }
      });

      const prevDest = destStock ? destStock.currentQuantity : 0;
      const newDest = prevDest + qty;

      await tx.consumableStock.upsert({
        where: {
          consumableId_branchId: {
            consumableId,
            branchId: destinationBranchId
          }
        },
        update: {
          currentQuantity: newDest,
          lastUpdated: new Date()
        },
        create: {
          consumableId,
          branchId: destinationBranchId,
          currentQuantity: qty,
          lastUpdated: new Date()
        }
      });

      // Registrar movimiento de ingreso por traspaso en destino
      await tx.stockMovement.create({
        data: {
          consumableId,
          branchId: destinationBranchId,
          movementType: StockMovementType.TRANSFERENCIA,
          quantity: qty,
          previousQuantity: prevDest,
          newQuantity: newDest,
          dispatchGuideNumber: cleanDocRef,
          registeredByName: cleanUser,
          reason: `Traspaso desde '${sourceBranch.name}'. Motivo: ${cleanReason}`
        }
      });
    });

    res.json({
      success: true,
      message: `✓ Se traspasaron ${qty} unidades de '${consumable.name}' desde '${sourceBranch.name}' hacia '${destBranch.name}'.`,
      transferredQuantity: qty,
      documentRef: cleanDocRef
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al procesar traspaso de insumos', details: error.message });
  }
});

// ==========================================
// CONSULTA DE ACTIVOS DISPONIBLES EN BODEGA
// ==========================================
transferRouter.get('/available-assets', async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    if (!branchId) {
      res.status(400).json({ error: 'branchId es requerido.' });
      return;
    }

    const assets = await prisma.asset.findMany({
      where: {
        currentBranchId: String(branchId),
        status: { in: [AssetStatus.BODEGA_DISPONIBLE, AssetStatus.EN_MANTENCION] }
      },
      include: {
        assetType: true
      },
      orderBy: { serialNumber: 'asc' }
    });

    res.json(assets);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar activos disponibles', details: error.message });
  }
});

// ==========================================
// HISTORIAL DE TRASPASOS (AUDITORÍA & KARDEX)
// ==========================================
transferRouter.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;

    // 1. Logs de auditoría de activos con "Traspaso"
    const assetAuditLogs = await prisma.assetAuditLog.findMany({
      where: {
        changeReason: { contains: 'Traspaso', mode: 'insensitive' }
      },
      include: {
        asset: {
          include: { assetType: true, currentBranch: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    // 2. Movimientos de stock con TRANSFERENCIA
    const stockMovements = await prisma.stockMovement.findMany({
      where: {
        movementType: StockMovementType.TRANSFERENCIA
      },
      include: {
        consumable: true,
        branch: true
      },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    res.json({
      assetTransfers: assetAuditLogs.map(log => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        assetId: log.assetId,
        serialNumber: log.serialNumber,
        inventoryNumber: log.inventoryNumber,
        brand: log.asset.brand,
        model: log.asset.model,
        assetType: log.asset.assetType.name,
        targetBranch: log.branchName,
        registeredBy: log.changedByUserName,
        reason: log.changeReason,
        documentRef: log.documentRef
      })),
      consumableTransfers: stockMovements.map(m => ({
        id: m.id,
        timestamp: m.timestamp.toISOString(),
        consumableId: m.consumableId,
        consumableName: m.consumable.name,
        sku: m.consumable.sku,
        branchName: m.branch.name,
        quantity: m.quantity,
        previousQuantity: m.previousQuantity,
        newQuantity: m.newQuantity,
        registeredBy: m.registeredByName,
        reason: m.reason,
        documentRef: m.dispatchGuideNumber
      }))
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar historial de traspasos', details: error.message });
  }
});
