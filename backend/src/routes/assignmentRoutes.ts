import { Router, Request, Response } from 'express';
import { prisma } from '../config/db.js';
import { AssignmentStatus, AssignmentType, AssetStatus, PhysicalCondition, StockMovementType } from '@prisma/client';
import { EmailService } from '../services/emailService.js';

export const assignmentRouter = Router();

// ==========================================
// RESERVAS Y CONTROL DE CONCURRENCIA
// ==========================================

// Reservar un ítem temporalmente para evitar asignación concurrente
assignmentRouter.post('/reserve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemType, itemId, quantity, userId } = req.body;
    
    // Limpiar reservas expiradas
    await prisma.itemReservation.deleteMany({
      where: { expiresAt: { lt: new Date() } }
    });

    // Verificar si ya está reservado por OTRO usuario
    const existing = await prisma.itemReservation.findUnique({
      where: { itemType_itemId: { itemType, itemId } }
    });

    if (existing && existing.reservedByUserId !== userId && existing.expiresAt > new Date()) {
      res.status(409).json({ error: 'Este ítem ya se encuentra reservado temporalmente por otro técnico.' });
      return;
    }

    // Crear o renovar la reserva (por 15 minutos)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const reservation = await prisma.itemReservation.upsert({
      where: { itemType_itemId: { itemType, itemId } },
      update: { reservedByUserId: userId, quantity: quantity || 1, expiresAt },
      create: { itemType, itemId, quantity: quantity || 1, reservedByUserId: userId, expiresAt }
    });

    res.json({ success: true, reservation });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al reservar el ítem', details: error.message });
  }
});

// Liberar la reserva de un ítem
assignmentRouter.post('/unreserve', async (req: Request, res: Response): Promise<void> => {
  try {
    const { itemType, itemId, userId } = req.body;
    await prisma.itemReservation.deleteMany({
      where: { itemType, itemId, reservedByUserId: userId }
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Error al liberar reserva', details: error.message });
  }
});


// Listar todas las asignaciones
assignmentRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recipientUserId } = req.query;
    const where: any = {};
    if (recipientUserId) {
      where.recipientUserId = String(recipientUserId);
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        recipientUser: true,
        technicianUser: true,
        branch: true,
        items: {
          include: {
            asset: { include: { assetType: true } },
            consumable: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = assignments.map(a => ({
      id: a.id,
      actNumber: a.actNumber,
      assignmentType: a.assignmentType,
      recipientUserId: a.recipientUserId,
      recipientName: a.recipientUser?.fullName || 'Funcionario',
      recipientRut: a.recipientUser?.rut || '',
      recipientEmail: a.recipientUser?.email || '',
      recipientJobTitle: a.recipientUser?.jobTitle || 'Funcionario',
      recipientDepartment: a.recipientUser?.department || 'ChileAtiende',
      recipientBranchName: a.branch?.name || 'Sucursal',
      technicianUserId: a.technicianUserId,
      technicianName: a.technicianUser?.fullName || 'Técnico DTI',
      technicianRut: a.technicianUser?.rut || '',
      branchId: a.branchId,
      branchName: a.branch?.name || 'Sucursal',
      status: a.status,
      actDocumentUrl: a.actDocumentUrl || undefined,
      signatureDataUrl: a.signatureDataUrl || undefined,
      signedByName: a.signedByName || undefined,
      digitalSignatureHash: a.digitalSignatureHash || undefined,
      observations: a.observations || undefined,
      createdAt: a.createdAt.toISOString(),
      signedAt: a.signedAt ? a.signedAt.toISOString() : undefined,
      returnedAt: a.returnedAt ? a.returnedAt.toISOString() : undefined,
      items: a.items.map(i => ({
        id: i.id,
        assignmentId: i.assignmentId,
        assetId: i.assetId || undefined,
        serialNumber: i.asset?.serialNumber,
        inventoryNumber: i.asset?.inventoryNumber || undefined,
        brand: i.asset?.brand,
        model: i.asset?.model,
        assetTypeName: i.asset?.assetType?.name,
        propertyType: i.asset?.propertyType,
        conditionAtAssignment: i.conditionAtAssignment,
        consumableId: i.consumableId || undefined,
        consumableSku: i.consumable?.sku,
        consumableName: i.consumable?.name,
        quantity: i.quantity,
        isReturned: i.isReturned,
        returnedAt: i.returnedAt ? i.returnedAt.toISOString() : undefined,
        conditionAtReturn: i.conditionAtReturn || undefined,
        returnNotes: i.returnNotes || undefined
      }))
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({ error: 'Error al consultar asignaciones', details: error.message });
  }
});

// Crear Asignación y Acta Oficial en PostgreSQL (Transaccional)
assignmentRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      actNumber,
      assignmentType,
      recipientUserId,
      technicianUserId,
      branchId,
      items,
      observations,
      signatureDataUrl,
      digitalSignatureHash,
      recipientRut,
      recipientName,
      recipientEmail,
      recipientJobTitle,
      recipientDepartment,
      technicianName,
      technicianRut,
      branchName,
      actDocumentPdfBase64,
      sendEmail
    } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ error: 'Debe incluir al menos un ítem para asignar' });
      return;
    }

    // 1. Resolver o Registrar Funcionario Receptor en UserADCache
    let recipient = await prisma.userADCache.findFirst({
      where: {
        OR: [
          ...(recipientUserId ? [{ id: recipientUserId }] : []),
          ...(recipientRut ? [{ rut: recipientRut }] : []),
          ...(recipientEmail ? [{ email: recipientEmail }] : [])
        ]
      }
    });

    if (!recipient) {
      const recRut = recipientRut || `11.111.111-1`;
      const recName = recipientName || 'Funcionario ChileAtiende';
      recipient = await prisma.userADCache.create({
        data: {
          id: recipientUserId || `usr-ad-${Date.now()}`,
          adGuid: `guid-ad-${Date.now()}`,
          samAccountName: (recipientEmail ? recipientEmail.split('@')[0] : `user.${Date.now()}`),
          rut: recRut,
          firstName: recName.split(' ')[0],
          lastName: recName.split(' ').slice(1).join(' ') || 'IPS',
          fullName: recName,
          email: recipientEmail || `funcionario.${Date.now()}@chileatiende.cl`,
          jobTitle: recipientJobTitle || 'Funcionario',
          department: recipientDepartment || 'ChileAtiende',
          branchId: branchId || undefined
        }
      });
    }

    // 2. Resolver o Registrar Técnico Operador en UserADCache (Garantizar FK)
    let technician = await prisma.userADCache.findFirst({
      where: {
        OR: [
          ...(technicianUserId ? [{ id: technicianUserId }] : []),
          ...(technicianRut ? [{ rut: technicianRut }] : [])
        ]
      }
    });

    if (!technician) {
      const techRut = technicianRut || '15.987.654-3';
      const techFull = technicianName || 'Técnico Soporte DTI';

      // Verificar si existe por RUT en UserADCache
      const existingTechByRut = await prisma.userADCache.findUnique({ where: { rut: techRut } });
      if (existingTechByRut) {
        technician = existingTechByRut;
      } else {
        technician = await prisma.userADCache.create({
          data: {
            id: technicianUserId || `tech-ad-${Date.now()}`,
            adGuid: `guid-tech-${Date.now()}`,
            samAccountName: `tech.${Date.now()}`,
            rut: techRut,
            firstName: techFull.split(' ')[0],
            lastName: techFull.split(' ').slice(1).join(' ') || 'Soporte',
            fullName: techFull,
            email: `${techRut}@chileatiende.cl`,
            jobTitle: 'Técnico Soporte DTI',
            department: 'División de Tecnologías de la Información',
            branchId: branchId || undefined,
            role: 'TECNICO'
          }
        });
      }
    }

    // 3. Resolver Sucursal
    let branch = await prisma.branch.findFirst({
      where: {
        OR: [
          ...(branchId && branchId !== 'ALL' ? [{ id: branchId }] : []),
          ...(branchName ? [{ name: branchName }] : [])
        ]
      }
    });

    if (!branch) {
      branch = await prisma.branch.findFirst();
      if (!branch) {
        res.status(404).json({ error: 'No se encontraron sucursales registradas' });
        return;
      }
    }

    const generatedActNumber = actNumber || `ACT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const now = new Date();

    const createdAssignment = await prisma.$transaction(async (tx) => {
      // A. Crear Cabecera del Acta
      const assignment = await tx.assignment.create({
        data: {
          actNumber: generatedActNumber,
          assignmentType: (assignmentType as AssignmentType) || AssignmentType.ENTREGA_INICIAL,
          recipientUserId: recipient.id,
          technicianUserId: technician.id,
          branchId: branch.id,
          status: signatureDataUrl ? AssignmentStatus.FIRMADO_DIGITAL : AssignmentStatus.PENDIENTE_FIRMA,
          signatureDataUrl: signatureDataUrl || null,
          signedByName: signatureDataUrl ? recipient.fullName : null,
          digitalSignatureHash: digitalSignatureHash || null,
          observations: observations || null,
          signedAt: signatureDataUrl ? now : null
        }
      });

      // B. Procesar cada ítem asignado
      for (const item of items) {
        if (item.assetId || item.serialNumber) {
          // Buscar activo por ID o por N° de Serie
          const asset = await tx.asset.findFirst({
            where: {
              OR: [
                ...(item.assetId ? [{ id: item.assetId }] : []),
                ...(item.serialNumber ? [{ serialNumber: item.serialNumber }] : [])
              ]
            }
          });

          if (asset) {
            // Cambiar estado a ASIGNADO con asignación del funcionario
            await tx.asset.update({
              where: { id: asset.id },
              data: {
                status: AssetStatus.ASIGNADO,
                assignedToUserId: recipient.id,
                assignedToUserName: recipient.fullName,
                assignedToUserRut: recipient.rut,
                assignedToUserDept: recipient.department,
                assignedDate: now,
                updatedAt: now
              }
            });

            // Registrar ítem del acta
            await tx.assignmentItem.create({
              data: {
                assignmentId: assignment.id,
                assetId: asset.id,
                quantity: 1,
                conditionAtAssignment: item.conditionAtAssignment || asset.physicalCondition || PhysicalCondition.BUENO
              }
            });

            // Registrar Log de Auditoría inmutable
            await tx.assetAuditLog.create({
              data: {
                assetId: asset.id,
                serialNumber: asset.serialNumber,
                inventoryNumber: asset.inventoryNumber,
                previousStatus: asset.status,
                newStatus: AssetStatus.ASIGNADO,
                newUserId: recipient.id,
                newUserName: recipient.fullName,
                branchName: branch.name,
                changedByUserName: technician.fullName,
                changeReason: `Asignación a funcionario mediante Acta ${assignment.actNumber}`,
                documentRef: assignment.actNumber
              }
            });
          }
        } else if (item.consumableId || item.consumableSku) {
          // Buscar consumible
          const consumable = await tx.consumable.findFirst({
            where: {
              OR: [
                ...(item.consumableId ? [{ id: item.consumableId }] : []),
                ...(item.consumableSku ? [{ sku: item.consumableSku }] : [])
              ]
            }
          });

          if (consumable) {
            const qtyToDiscount = item.quantity || 1;

            await tx.assignmentItem.create({
              data: {
                assignmentId: assignment.id,
                consumableId: consumable.id,
                quantity: qtyToDiscount,
                conditionAtAssignment: PhysicalCondition.NUEVO
              }
            });

            // Descontar stock en la bodega de origen
            const stock = await tx.consumableStock.findFirst({
              where: { consumableId: consumable.id, branchId: branch.id }
            });

            const prevQty = stock ? stock.currentQuantity : 0;
            const newQty = Math.max(0, prevQty - qtyToDiscount);

            if (stock) {
              await tx.consumableStock.update({
                where: { id: stock.id },
                data: { currentQuantity: newQty, lastUpdated: now }
              });
            } else {
              await tx.consumableStock.create({
                data: {
                  consumableId: consumable.id,
                  branchId: branch.id,
                  currentQuantity: 0,
                  lastUpdated: now
                }
              });
            }

            // Kardex de movimiento de stock
            await tx.stockMovement.create({
              data: {
                consumableId: consumable.id,
                branchId: branch.id,
                movementType: StockMovementType.ENTREGA_FUNCIONARIO,
                quantity: qtyToDiscount,
                previousQuantity: prevQty,
                newQuantity: newQty,
                assignmentActNumber: assignment.actNumber,
                recipientUserName: recipient.fullName,
                registeredByUserId: technician.id,
                registeredByName: technician.fullName,
                reason: `Entrega según Acta ${assignment.actNumber}`
              }
            });
          }
        }
      }

      // Eliminar reservas de los ítems recién asignados
      const reservedItemIds = items.map((i: any) => i.assetId || i.consumableId).filter(Boolean);
      if (reservedItemIds.length > 0) {
        await tx.itemReservation.deleteMany({
          where: { itemId: { in: reservedItemIds }, reservedByUserId: technician.id }
        });
      }

      return assignment;
    });

    // Cargar asignación completa con relaciones
    const fullAssignment = await prisma.assignment.findUnique({
      where: { id: createdAssignment.id },
      include: {
        recipientUser: true,
        technicianUser: true,
        branch: true,
        items: {
          include: {
            asset: { include: { assetType: true } },
            consumable: true
          }
        }
      }
    });

    const formattedAssignment = {
      id: fullAssignment!.id,
      actNumber: fullAssignment!.actNumber,
      assignmentType: fullAssignment!.assignmentType,
      recipientUserId: fullAssignment!.recipientUserId,
      recipientName: fullAssignment!.recipientUser?.fullName || recipient.fullName,
      recipientRut: fullAssignment!.recipientUser?.rut || recipient.rut,
      recipientEmail: fullAssignment!.recipientUser?.email || recipient.email,
      recipientJobTitle: fullAssignment!.recipientUser?.jobTitle || 'Funcionario',
      recipientDepartment: fullAssignment!.recipientUser?.department || 'ChileAtiende',
      recipientBranchName: fullAssignment!.branch?.name || branch.name,
      technicianUserId: fullAssignment!.technicianUserId,
      technicianName: fullAssignment!.technicianUser?.fullName || technician.fullName,
      technicianRut: fullAssignment!.technicianUser?.rut || technician.rut,
      branchId: fullAssignment!.branchId,
      branchName: fullAssignment!.branch?.name || branch.name,
      status: fullAssignment!.status,
      actDocumentUrl: fullAssignment!.actDocumentUrl || undefined,
      signatureDataUrl: fullAssignment!.signatureDataUrl || undefined,
      signedByName: fullAssignment!.signedByName || undefined,
      digitalSignatureHash: fullAssignment!.digitalSignatureHash || undefined,
      observations: fullAssignment!.observations || undefined,
      createdAt: fullAssignment!.createdAt.toISOString(),
      signedAt: fullAssignment!.signedAt ? fullAssignment!.signedAt.toISOString() : undefined,
      returnedAt: fullAssignment!.returnedAt ? fullAssignment!.returnedAt.toISOString() : undefined,
      items: fullAssignment!.items.map(i => ({
        id: i.id,
        assignmentId: i.assignmentId,
        assetId: i.assetId || undefined,
        serialNumber: i.asset?.serialNumber,
        inventoryNumber: i.asset?.inventoryNumber || undefined,
        brand: i.asset?.brand,
        model: i.asset?.model,
        assetTypeName: i.asset?.assetType?.name,
        propertyType: i.asset?.propertyType,
        conditionAtAssignment: i.conditionAtAssignment,
        consumableId: i.consumableId || undefined,
        consumableSku: i.consumable?.sku,
        consumableName: i.consumable?.name,
        quantity: i.quantity,
        isReturned: i.isReturned,
        returnedAt: i.returnedAt ? i.returnedAt.toISOString() : undefined,
        conditionAtReturn: i.conditionAtReturn || undefined,
        returnNotes: i.returnNotes || undefined
      }))
    };

    // Envío automático del Acta por correo electrónico vía Relay Institucional
    const targetEmail = recipientEmail || formattedAssignment.recipientEmail;
    if (sendEmail !== false && targetEmail && targetEmail.includes('@')) {
      const emailItems = formattedAssignment.items.map(i => ({
        name: i.brand ? `${i.brand} ${i.model || ''}`.trim() : (i.assetTypeName || i.consumableName || 'Ítem Asignado'),
        brand: i.brand,
        model: i.model,
        serialNumber: i.serialNumber,
        inventoryNumber: i.inventoryNumber,
        category: i.assetTypeName || 'Insumo / Periférico',
        quantity: i.quantity,
        itemType: (i.assetId || i.serialNumber ? 'HARDWARE' : 'CONSUMABLE') as 'HARDWARE' | 'CONSUMABLE'
      }));

      // Disparar envío asíncrono
      EmailService.sendAssignmentActEmail({
        recipientEmail: targetEmail,
        recipientName: formattedAssignment.recipientName,
        recipientRut: formattedAssignment.recipientRut,
        recipientJobTitle: formattedAssignment.recipientJobTitle,
        recipientDepartment: formattedAssignment.recipientDepartment,
        actNumber: formattedAssignment.actNumber,
        assignmentType: formattedAssignment.assignmentType,
        branchName: formattedAssignment.branchName,
        technicianName: formattedAssignment.technicianName,
        technicianRut: formattedAssignment.technicianRut,
        createdAt: formattedAssignment.createdAt,
        items: emailItems,
        observations: formattedAssignment.observations,
        pdfBase64: actDocumentPdfBase64 || undefined
      }).then(res => {
        if (res.success) {
          console.log(`[AssignmentRoutes] ✓ Acta ${formattedAssignment.actNumber} enviada por correo a ${targetEmail}`);
        } else {
          console.warn(`[AssignmentRoutes] ✗ No se pudo enviar el correo del acta ${formattedAssignment.actNumber}: ${res.error}`);
        }
      }).catch(err => {
        console.error('[AssignmentRoutes] Error en envío asíncrono de correo:', err);
      });
    }

    res.status(201).json({ 
      success: true, 
      assignment: formattedAssignment,
      emailSentTo: targetEmail || null
    });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    res.status(500).json({ error: 'Error al registrar la asignación', details: error.message });
  }
});

// Registrar Retorno / Devolución de Activos
assignmentRouter.post('/:id/return', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { returnedItems, returnBranchId, changedByUserName } = req.body;

    const assignment = await prisma.assignment.findFirst({
      where: {
        OR: [
          { id },
          { actNumber: id }
        ]
      },
      include: { items: { include: { asset: true } }, branch: true }
    });

    if (!assignment) {
      res.status(404).json({ error: 'Asignación no encontrada' });
      return;
    }

    let targetBranch = assignment.branch;
    if (returnBranchId && returnBranchId !== 'ALL') {
      const foundBranch = await prisma.branch.findUnique({ where: { id: returnBranchId } });
      if (foundBranch) targetBranch = foundBranch;
    }

    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const ret of returnedItems) {
        const item = assignment.items.find((i: any) => i.id === ret.itemId || i.assetId === ret.itemId);
        if (!item || !item.assetId || !item.asset) continue;

        // Actualizar item
        await tx.assignmentItem.update({
          where: { id: item.id },
          data: {
            isReturned: true,
            returnedAt: now,
            conditionAtReturn: (ret.condition as PhysicalCondition) || PhysicalCondition.BUENO,
            returnNotes: ret.notes || 'Devolución conforme'
          }
        });

        // Actualizar activo asignándole la nueva bodega de destino seleccionada
        const destStatus = (ret.destinationStatus as AssetStatus) || AssetStatus.BODEGA_DISPONIBLE;
        await tx.asset.update({
          where: { id: item.assetId },
          data: {
            status: destStatus,
            currentBranchId: targetBranch.id,
            physicalCondition: (ret.condition as PhysicalCondition) || PhysicalCondition.BUENO,
            assignedToUserId: null,
            assignedToUserName: null,
            assignedToUserRut: null,
            assignedToUserDept: null,
            assignedDate: null,
            updatedAt: now
          }
        });

        // Registrar auditoría con la bodega de destino
        await tx.assetAuditLog.create({
          data: {
            assetId: item.asset.id,
            serialNumber: item.asset.serialNumber,
            inventoryNumber: item.asset.inventoryNumber,
            previousStatus: AssetStatus.ASIGNADO,
            newStatus: destStatus,
            previousUserName: assignment.recipientUserId,
            branchName: targetBranch.name,
            changedByUserName: changedByUserName || 'Técnico Bodega',
            changeReason: `Devolución Acta ${assignment.actNumber} a bodega ${targetBranch.name}: ${ret.notes || 'Reingreso conforme'}`,
            documentRef: assignment.actNumber
          }
        });
      }

      // Comprobar si todos los activos fueron devueltos
      const remaining = await tx.assignmentItem.count({
        where: { assignmentId: assignment.id, assetId: { not: null }, isReturned: false }
      });

      await tx.assignment.update({
        where: { id: assignment.id },
        data: {
          status: remaining === 0 ? AssignmentStatus.DEVUELTO_COMPLETO : AssignmentStatus.DEVUELTO_PARCIAL,
          returnedAt: now
        }
      });
    });

    res.json({ 
      success: true, 
      message: `Devolución procesada exitosamente con reingreso a ${targetBranch.name}`,
      branchName: targetBranch.name
    });
  } catch (error: any) {
    console.error('Error in return:', error);
    res.status(500).json({ error: 'Error al procesar devolución', details: error.message });
  }
});

// Reenviar Acta Oficial por Correo Electrónico vía Relay Institucional
assignmentRouter.post('/:id/send-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const { targetEmail, pdfBase64 } = req.body;

    const assignment = await prisma.assignment.findFirst({
      where: {
        OR: [
          { id },
          { actNumber: id }
        ]
      },
      include: {
        recipientUser: true,
        technicianUser: true,
        branch: true,
        items: {
          include: {
            asset: { include: { assetType: true } },
            consumable: true
          }
        }
      }
    });

    if (!assignment) {
      res.status(404).json({ error: 'Acta de asignación no encontrada' });
      return;
    }

    const emailToSend = (targetEmail || assignment.recipientUser?.email || '').trim();
    if (!emailToSend || !emailToSend.includes('@')) {
      res.status(400).json({ error: 'El funcionario no tiene una dirección de correo válida registrada.' });
      return;
    }

    const emailItems = assignment.items.map(i => ({
      name: i.asset?.brand ? `${i.asset.brand} ${i.asset.model || ''}`.trim() : (i.asset?.assetType?.name || i.consumable?.name || 'Ítem Asignado'),
      brand: i.asset?.brand,
      model: i.asset?.model,
      serialNumber: i.asset?.serialNumber,
      inventoryNumber: i.asset?.inventoryNumber || undefined,
      category: i.asset?.assetType?.name || i.consumable?.category || 'General',
      quantity: i.quantity,
      itemType: (i.assetId || i.asset ? 'HARDWARE' : 'CONSUMABLE') as 'HARDWARE' | 'CONSUMABLE'
    }));

    const result = await EmailService.sendAssignmentActEmail({
      recipientEmail: emailToSend,
      recipientName: assignment.recipientUser?.fullName || 'Funcionario',
      recipientRut: assignment.recipientUser?.rut || undefined,
      recipientJobTitle: assignment.recipientUser?.jobTitle || undefined,
      recipientDepartment: assignment.recipientUser?.department || undefined,
      actNumber: assignment.actNumber,
      assignmentType: assignment.assignmentType,
      branchName: assignment.branch?.name || 'Sucursal',
      technicianName: assignment.technicianUser?.fullName || 'Técnico DTI',
      technicianRut: assignment.technicianUser?.rut || undefined,
      createdAt: assignment.createdAt,
      items: emailItems,
      observations: assignment.observations || undefined,
      pdfBase64: pdfBase64 || undefined
    });

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Error al enviar el correo a través del relay SMTP' });
      return;
    }

    res.json({
      success: true,
      message: `Acta ${assignment.actNumber} enviada exitosamente a ${emailToSend} vía relay`,
      messageId: result.messageId
    });
  } catch (error: any) {
    console.error('Error al reenviar acta por correo:', error);
    res.status(500).json({ error: 'Error al enviar correo', details: error.message });
  }
});

// Probar conectividad SMTP Relay
assignmentRouter.post('/test-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { targetEmail } = req.body;
    const result = await EmailService.testSmtpConnection(targetEmail);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

