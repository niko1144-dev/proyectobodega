import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { DeviceCategory } from '@prisma/client';
import { formatRut, cleanRut, validateRut } from '../utils/formatters.js';

export const masterRouter = Router();

// ==========================================
// SUCURSALES / BODEGAS
// ==========================================
masterRouter.get('/branches', async (req: Request, res: Response): Promise<void> => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const branches = await prisma.branch.findMany({ 
      where: includeInactive ? undefined : { isActive: true }, 
      include: {
        _count: {
          select: { assets: true, consumableStocks: true, users: true, assignments: true }
        }
      },
      orderBy: { name: 'asc' } 
    });
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar sucursales', details: error.message });
  }
});

masterRouter.post('/branches', async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, name, region, commune, address, isActive } = req.body;

    if (!code?.trim() || !name?.trim() || !region?.trim() || !commune?.trim()) {
      res.status(400).json({ error: 'Código, Nombre, Región y Comuna son campos obligatorios.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    const cleanRegion = region.trim();
    const cleanCommune = commune.trim();
    const cleanAddress = (address || '').trim() || 'Dirección no informada';

    const existing = await prisma.branch.findUnique({
      where: { code: cleanCode }
    });

    if (existing) {
      res.status(409).json({ error: `Ya existe una sucursal o bodega registrada con el código '${cleanCode}' (${existing.name})` });
      return;
    }

    const created = await prisma.branch.create({
      data: {
        code: cleanCode,
        name: cleanName,
        region: cleanRegion,
        commune: cleanCommune,
        address: cleanAddress,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({
      success: true,
      message: `Bodega '${created.name}' creada exitosamente`,
      branch: created
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una sucursal con ese código.' });
      return;
    }
    res.status(500).json({ error: 'Error al registrar sucursal o bodega', details: error.message });
  }
});

masterRouter.put('/branches/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { code, name, region, commune, address, isActive } = req.body;

    const existing = await prisma.branch.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Sucursal o bodega no encontrada' });
      return;
    }

    const cleanCode = code ? code.trim().toUpperCase() : existing.code;
    const cleanName = name ? name.trim() : existing.name;
    const cleanRegion = region ? region.trim() : existing.region;
    const cleanCommune = commune ? commune.trim() : existing.commune;
    const cleanAddress = address !== undefined ? address.trim() : existing.address;
    const cleanActive = isActive !== undefined ? Boolean(isActive) : existing.isActive;

    if (cleanCode !== existing.code) {
      const codeConflict = await prisma.branch.findUnique({ where: { code: cleanCode } });
      if (codeConflict) {
        res.status(409).json({ error: `El código '${cleanCode}' ya está siendo utilizado por otra sucursal.` });
        return;
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        code: cleanCode,
        name: cleanName,
        region: cleanRegion,
        commune: cleanCommune,
        address: cleanAddress,
        isActive: cleanActive
      }
    });

    res.json({
      success: true,
      message: `Bodega '${updated.name}' actualizada exitosamente`,
      branch: updated
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una sucursal con ese código.' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar sucursal o bodega', details: error.message });
  }
});

masterRouter.delete('/branches/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        _count: { 
          select: { 
            assets: true, 
            consumableStocks: true, 
            assignments: true, 
            dispatchGuides: true, 
            stockMovements: true 
          } 
        }
      }
    });

    if (!branch) {
      res.status(404).json({ error: 'Sucursal o bodega no encontrada' });
      return;
    }

    const assetCount = (branch as any)._count?.assets || 0;
    const assignmentCount = (branch as any)._count?.assignments || 0;
    const guideCount = (branch as any)._count?.dispatchGuides || 0;

    if (assetCount > 0 || assignmentCount > 0 || guideCount > 0) {
      res.status(400).json({ 
        error: `No es posible eliminar la bodega '${branch.name}' porque contiene ${assetCount} activos en custodia, ${guideCount} guías de despacho o ${assignmentCount} actas históricas. En su lugar, puedes desactivarla.` 
      });
      return;
    }

    // Limpiar relaciones secundarias antes de eliminar físicamente
    await prisma.consumableStock.deleteMany({ where: { branchId: id } });
    await prisma.stockMovement.deleteMany({ where: { branchId: id } });
    await prisma.userADCache.updateMany({ where: { branchId: id }, data: { branchId: null } });
    await prisma.platformUser.updateMany({ where: { branchId: id }, data: { branchId: null } });

    await prisma.branch.delete({ where: { id } });

    res.json({ 
      success: true, 
      message: `Bodega '${branch.name}' (${branch.code}) eliminada permanentemente` 
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al eliminar sucursal o bodega', details: error.message });
  }
});

// ==========================================
// PROVEEDORES
// ==========================================
masterRouter.get('/suppliers', async (_req: Request, res: Response): Promise<void> => {
  try {
    const suppliers = await prisma.supplier.findMany({ 
      where: { isActive: true }, 
      include: {
        _count: {
          select: { purchaseOrders: true, leasingContracts: true, dispatchGuides: true }
        }
      },
      orderBy: { businessName: 'asc' } 
    });
    res.json(suppliers);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar proveedores', details: error.message });
  }
});

masterRouter.post('/suppliers', async (req: Request, res: Response): Promise<void> => {
  try {
    const { rut, businessName, contactName, contactEmail, contactPhone } = req.body;

    if (!rut || !rut.trim() || !businessName || !businessName.trim()) {
      res.status(400).json({ error: 'RUT y Razón Social del proveedor son obligatorios' });
      return;
    }

    const rawRut = String(rut).trim();
    const formattedRut = formatRut(rawRut);
    const cleaned = cleanRut(rawRut);
    const cleanName = businessName.trim();

    if (!validateRut(formattedRut)) {
      res.status(400).json({ error: 'El formato de RUT ingresado no es válido.' });
      return;
    }

    const existing = await prisma.supplier.findFirst({
      where: {
        OR: [
          { rut: formattedRut },
          { rut: rawRut },
          { rut: cleaned }
        ]
      }
    });

    if (existing) {
      res.status(409).json({ error: `Ya existe un proveedor registrado con el RUT '${formattedRut}' (${existing.businessName})` });
      return;
    }

    const created = await prisma.supplier.create({
      data: {
        rut: formattedRut,
        businessName: cleanName,
        contactName: contactName ? contactName.trim() : null,
        contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : null,
        contactPhone: contactPhone ? contactPhone.trim() : null,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      message: `Proveedor '${created.businessName}' registrado exitosamente`,
      supplier: created
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un proveedor con ese RUT' });
      return;
    }
    res.status(500).json({ error: 'Error al registrar proveedor', details: error.message });
  }
});

// ==========================================
// ÓRDENES DE COMPRA (OC)
// ==========================================
masterRouter.get('/purchase-orders', async (_req: Request, res: Response): Promise<void> => {
  try {
    const pos = await prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { orderDate: 'desc' }
    });
    const formatted = pos.map(p => ({
      id: p.id,
      ocNumber: p.ocNumber,
      supplierId: p.supplierId,
      supplierName: p.supplier.businessName,
      description: p.description,
      orderDate: p.orderDate.toISOString(),
      totalAmountCLP: p.totalAmountCLP,
      documentName: p.documentName,
      createdAt: p.createdAt.toISOString()
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar órdenes de compra', details: error.message });
  }
});

masterRouter.post('/purchase-orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const { ocNumber, supplierId, description, orderDate, totalAmountCLP, documentName } = req.body;

    if (!ocNumber || !ocNumber.trim() || !supplierId || !description || !description.trim()) {
      res.status(400).json({ error: 'N° de Orden de Compra, Proveedor y Descripción son obligatorios' });
      return;
    }

    const cleanOc = ocNumber.trim().toUpperCase();

    const existing = await prisma.purchaseOrder.findUnique({ where: { ocNumber: cleanOc } });
    if (existing) {
      res.status(409).json({ error: `Ya existe una Orden de Compra registrada con el número '${cleanOc}'` });
      return;
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      res.status(404).json({ error: 'El proveedor seleccionado no existe' });
      return;
    }

    const created = await prisma.purchaseOrder.create({
      data: {
        ocNumber: cleanOc,
        supplierId,
        description: description.trim(),
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        totalAmountCLP: totalAmountCLP ? parseFloat(totalAmountCLP) : null,
        documentName: documentName ? documentName.trim() : null
      },
      include: { supplier: true }
    });

    res.status(201).json({
      success: true,
      message: `Orden de Compra '${created.ocNumber}' registrada exitosamente`,
      purchaseOrder: {
        id: created.id,
        ocNumber: created.ocNumber,
        supplierId: created.supplierId,
        supplierName: created.supplier.businessName,
        description: created.description,
        orderDate: created.orderDate.toISOString(),
        totalAmountCLP: created.totalAmountCLP,
        documentName: created.documentName,
        createdAt: created.createdAt.toISOString()
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una Orden de Compra con ese número' });
      return;
    }
    res.status(500).json({ error: 'Error al registrar orden de compra', details: error.message });
  }
});

// ==========================================
// CONTRATOS DE ARRIENDO & LICITACIONES
// ==========================================
masterRouter.get('/leasing-contracts', async (_req: Request, res: Response): Promise<void> => {
  try {
    const contracts = await prisma.leasingContract.findMany({
      include: { supplier: true },
      orderBy: { endDate: 'asc' }
    });
    const formatted = contracts.map(c => ({
      id: c.id,
      contractNumber: c.contractNumber,
      name: c.name,
      supplierId: c.supplierId,
      supplierName: c.supplier.businessName,
      startDate: c.startDate.toISOString(),
      endDate: c.endDate.toISOString(),
      warningDaysThreshold: c.warningDaysThreshold,
      documentName: c.documentName,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString()
    }));
    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar contratos de leasing', details: error.message });
  }
});

masterRouter.post('/leasing-contracts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { contractNumber, name, supplierId, startDate, endDate, warningDaysThreshold, documentName } = req.body;

    if (!contractNumber || !contractNumber.trim() || !name || !name.trim() || !supplierId || !startDate || !endDate) {
      res.status(400).json({ error: 'N° de Contrato, Nombre/Licitación, Proveedor, Fecha Inicio y Fecha Término son obligatorios' });
      return;
    }

    const cleanContract = contractNumber.trim().toUpperCase();

    const existing = await prisma.leasingContract.findUnique({ where: { contractNumber: cleanContract } });
    if (existing) {
      res.status(409).json({ error: `Ya existe un contrato o licitación con el número '${cleanContract}'` });
      return;
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      res.status(404).json({ error: 'El proveedor seleccionado no existe' });
      return;
    }

    const created = await prisma.leasingContract.create({
      data: {
        contractNumber: cleanContract,
        name: name.trim(),
        supplierId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        warningDaysThreshold: warningDaysThreshold ? parseInt(warningDaysThreshold, 10) : 30,
        documentName: documentName ? documentName.trim() : null,
        isActive: true
      },
      include: { supplier: true }
    });

    res.status(201).json({
      success: true,
      message: `Contrato/Licitación '${created.contractNumber}' registrado exitosamente`,
      leasingContract: {
        id: created.id,
        contractNumber: created.contractNumber,
        name: created.name,
        supplierId: created.supplierId,
        supplierName: created.supplier.businessName,
        startDate: created.startDate.toISOString(),
        endDate: created.endDate.toISOString(),
        warningDaysThreshold: created.warningDaysThreshold,
        documentName: created.documentName,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString()
      }
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un contrato con ese número' });
      return;
    }
    res.status(500).json({ error: 'Error al registrar contrato de arriendo', details: error.message });
  }
});

// ==========================================
// TIPOS DE HARDWARE (ITAM)
// ==========================================
masterRouter.get('/asset-types', async (_req: Request, res: Response): Promise<void> => {
  try {
    const types = await prisma.assetType.findMany({ 
      include: {
        _count: {
          select: { assets: true }
        }
      },
      orderBy: { name: 'asc' } 
    });

    const formatted = types.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      requiresInventoryNumber: t.requiresInventoryNumber,
      iconName: t.iconName || 'Laptop',
      assetsCount: t._count.assets
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al consultar tipos de hardware', details: error.message });
  }
});

masterRouter.post('/asset-types', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, requiresInventoryNumber, iconName } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'El nombre del tipo de hardware es obligatorio' });
      return;
    }

    const cleanName = name.trim();
    const validCategories = Object.values(DeviceCategory);
    const selectedCategory = validCategories.includes(category) ? (category as DeviceCategory) : DeviceCategory.COMPUTO;

    const existing = await prisma.assetType.findFirst({
      where: { name: { equals: cleanName, mode: 'insensitive' } }
    });

    if (existing) {
      res.status(409).json({ error: `Ya existe un tipo de hardware registrado con el nombre '${cleanName}'` });
      return;
    }

    const created = await prisma.assetType.create({
      data: {
        name: cleanName,
        category: selectedCategory,
        requiresInventoryNumber: requiresInventoryNumber !== undefined ? Boolean(requiresInventoryNumber) : true,
        iconName: iconName || 'Laptop'
      }
    });

    res.status(201).json({
      success: true,
      message: `Tipo de hardware '${created.name}' registrado exitosamente`,
      assetType: created
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe un tipo de hardware con ese nombre' });
      return;
    }
    res.status(500).json({ error: 'Error al crear tipo de hardware', details: error.message });
  }
});

masterRouter.put('/asset-types/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, category, requiresInventoryNumber, iconName } = req.body;

    const existing = await prisma.assetType.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Tipo de hardware no encontrado' });
      return;
    }

    const updated = await prisma.assetType.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        category: category ? (category as DeviceCategory) : existing.category,
        requiresInventoryNumber: requiresInventoryNumber !== undefined ? Boolean(requiresInventoryNumber) : existing.requiresInventoryNumber,
        iconName: iconName || existing.iconName
      }
    });

    res.json({
      success: true,
      message: 'Tipo de hardware actualizado',
      assetType: updated
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al actualizar tipo de hardware', details: error.message });
  }
});
