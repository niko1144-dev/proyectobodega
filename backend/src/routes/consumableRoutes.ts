import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { StockMovementType } from '@prisma/client';

export const consumableRouter = Router();

// Listar catálogo de consumibles
consumableRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const consumables = await prisma.consumable.findMany({
      include: { stocks: { include: { branch: true } } },
      orderBy: { name: 'asc' }
    });
    res.json(consumables);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar consumibles', details: error.message });
  }
});

// Obtener stocks por sucursal
consumableRouter.get('/stocks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const where = branchId && branchId !== 'ALL' ? { branchId: String(branchId) } : {};

    const stocks = await prisma.consumableStock.findMany({
      where,
      include: { consumable: true, branch: true }
    });

    const formatted = stocks.map(s => ({
      id: s.id,
      consumableId: s.consumableId,
      branchId: s.branchId,
      branchName: s.branch.name,
      currentQuantity: s.currentQuantity,
      lastUpdated: s.lastUpdated.toISOString()
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar stock de consumibles', details: error.message });
  }
});

// Movimientos de Kardex
consumableRouter.get('/movements', async (req: Request, res: Response): Promise<void> => {
  try {
    const { branchId } = req.query;
    const where = branchId && branchId !== 'ALL' ? { branchId: String(branchId) } : {};

    const movements = await prisma.stockMovement.findMany({
      where,
      include: { consumable: true, branch: true },
      orderBy: { timestamp: 'desc' },
      take: 50
    });

    const formatted = movements.map(m => ({
      id: m.id,
      consumableId: m.consumableId,
      consumableName: m.consumable.name,
      sku: m.consumable.sku,
      branchId: m.branchId,
      branchName: m.branch.name,
      movementType: m.movementType,
      quantity: m.quantity,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      dispatchGuideNumber: m.dispatchGuideNumber || undefined,
      assignmentActNumber: m.assignmentActNumber || undefined,
      recipientUserName: m.recipientUserName || undefined,
      registeredByUserName: m.registeredByName,
      reason: m.reason || undefined,
      timestamp: m.timestamp.toISOString()
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar movimientos de stock', details: error.message });
  }
});

// Registrar movimiento manual (Entrada / Salida / Ajuste)
consumableRouter.post('/movements', async (req: Request, res: Response): Promise<void> => {
  try {
    const { consumableId, branchId, movementType, quantity, reason, recipientUserName, registeredByName } = req.body;

    if (!consumableId || !branchId || !quantity || quantity <= 0) {
      res.status(400).json({ error: 'Datos de movimiento inválidos' });
      return;
    }

    const consumable = await prisma.consumable.findUnique({ where: { id: consumableId } });
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });

    if (!consumable || !branch) {
      res.status(404).json({ error: 'Insumo o sucursal no encontrada' });
      return;
    }

    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      let stock = await tx.consumableStock.findUnique({
        where: { consumableId_branchId: { consumableId, branchId } }
      });

      if (!stock) {
        stock = await tx.consumableStock.create({
          data: { consumableId, branchId, currentQuantity: 0 }
        });
      }

      const prevQty = stock.currentQuantity;
      let newQty = prevQty;

      if (movementType === 'INGRESO_GUIA') {
        newQty = prevQty + quantity;
      } else if (movementType === 'ENTREGA_FUNCIONARIO' || movementType === 'MERMA_DANO') {
        newQty = Math.max(0, prevQty - quantity);
      } else if (movementType === 'AJUSTE_INVENTARIO') {
        newQty = quantity;
      }

      await tx.consumableStock.update({
        where: { id: stock.id },
        data: { currentQuantity: newQty, lastUpdated: now }
      });

      const mov = await tx.stockMovement.create({
        data: {
          consumableId,
          branchId,
          movementType: (movementType as StockMovementType) || StockMovementType.INGRESO_GUIA,
          quantity,
          previousQuantity: prevQty,
          newQuantity: newQty,
          recipientUserName: recipientUserName || null,
          registeredByName: registeredByName || 'Técnico Bodega',
          reason: reason || 'Movimiento manual de stock'
        }
      });

      return { stock, mov };
    });

    res.status(201).json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al registrar movimiento', details: error.message });
  }
});
