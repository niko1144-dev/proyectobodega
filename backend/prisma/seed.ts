import { PrismaClient, AssetPropertyType, AssetStatus, PhysicalCondition, DeviceCategory, AssignmentStatus, AssignmentType, StockMovementType, PlatformRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando carga de datos iniciales en PostgreSQL (ChileAtiende ITAM)...');

  // 1. Limpieza previa
  await prisma.platformUser.deleteMany();
  await prisma.assetAuditLog.deleteMany();
  await prisma.assignmentItem.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.consumableStock.deleteMany();
  await prisma.consumable.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.dispatchGuide.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.leasingContract.deleteMany();
  await prisma.userADCache.deleteMany();
  await prisma.assetType.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.branch.deleteMany();

  // 2. Sucursales
  const stgoCentro = await prisma.branch.create({
    data: {
      id: 'branch-santiago-centro',
      code: 'SUC-STGO-CENTRO',
      name: 'Sucursal Santiago Centro (Alameda)',
      region: 'Región Metropolitana',
      commune: 'Santiago',
      address: 'Av. Libertador Bernardo O\'Higgins 1450',
    }
  });

  const providencia = await prisma.branch.create({
    data: {
      id: 'branch-providencia',
      code: 'SUC-PROVIDENCIA',
      name: 'Sucursal Providencia',
      region: 'Región Metropolitana',
      commune: 'Providencia',
      address: 'Av. Providencia 1245',
    }
  });

  const valparaiso = await prisma.branch.create({
    data: {
      id: 'branch-valparaiso',
      code: 'SUC-VALPARAISO',
      name: 'Sucursal Valparaíso (Plaza Sotomayor)',
      region: 'Región de Valparaíso',
      commune: 'Valparaíso',
      address: 'Av. Brasil 1750',
    }
  });

  const concepcion = await prisma.branch.create({
    data: {
      id: 'branch-concepcion',
      code: 'SUC-CONCEPCION',
      name: 'Sucursal Concepción Centro',
      region: 'Región del Biobío',
      commune: 'Concepción',
      address: 'Barros Arana 450',
    }
  });

  // 3. Proveedores
  const sonda = await prisma.supplier.create({
    data: {
      id: 'sup-sonda',
      rut: '76.432.109-8',
      businessName: 'Sonda S.A.',
      contactName: 'Marcelo Pardo',
      contactEmail: 'contacto.gob@sonda.com',
      contactPhone: '+56 2 2657 5000',
    }
  });

  const lenovo = await prisma.supplier.create({
    data: {
      id: 'sup-lenovo',
      rut: '76.890.123-5',
      businessName: 'Lenovo Chile SpA',
      contactName: 'Patricia Morales',
      contactEmail: 'licitaciones@lenovo.com',
      contactPhone: '+56 2 2490 8000',
    }
  });

  const hp = await prisma.supplier.create({
    data: {
      id: 'sup-hp',
      rut: '76.123.456-7',
      businessName: 'HP Inc Chile SpA',
      contactName: 'Lorena Valdés',
      contactEmail: 'ventas.publico@hp.com',
      contactPhone: '+56 2 2580 4000',
    }
  });

  // 4. Tipos de Activos
  const typeNotebook = await prisma.assetType.create({
    data: {
      id: 'type-notebook',
      name: 'Notebook Corporativo',
      category: DeviceCategory.COMPUTO,
      requiresInventoryNumber: true,
      iconName: 'Laptop'
    }
  });

  const typeDesktop = await prisma.assetType.create({
    data: {
      id: 'type-desktop',
      name: 'Desktop All-in-One',
      category: DeviceCategory.COMPUTO,
      requiresInventoryNumber: true,
      iconName: 'Monitor'
    }
  });

  const typeMonitor = await prisma.assetType.create({
    data: {
      id: 'type-monitor',
      name: 'Monitor 24" IPS',
      category: DeviceCategory.PANTALLAS,
      requiresInventoryNumber: true,
      iconName: 'Tv'
    }
  });

  // 5. Órdenes de Compra y Contratos de Arriendo
  const oc1 = await prisma.purchaseOrder.create({
    data: {
      id: 'oc-2026-001',
      ocNumber: '6245-12-LR26',
      supplierId: lenovo.id,
      description: 'Adquisición de Equipamiento Portátil y Microinformática DTI - ChileAtiende',
      orderDate: new Date('2026-01-15'),
      totalAmountCLP: 45800000,
      documentName: 'OC_6245-12-LR26_ChileCompra.pdf'
    }
  });

  const leasingSonda = await prisma.leasingContract.create({
    data: {
      id: 'cont-sonda-2024',
      contractNumber: 'LIC-ARR-2024-MICRO',
      name: 'Licitación Nacional de Arriendo Microinformática y Puestos de Atención',
      supplierId: sonda.id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2026-09-15'), // Vence pronto (<60 días)
      warningDaysThreshold: 45,
      documentName: 'Contrato_Leasing_Sonda_2024_2026.pdf'
    }
  });

  // 6. Guías de Despacho
  const guideLenovo = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-2026-001',
      guideNumber: 'GD-88492',
      supplierId: lenovo.id,
      purchaseOrderId: oc1.id,
      branchId: stgoCentro.id,
      dispatchDate: new Date('2026-02-10'),
      receptionDate: new Date('2026-02-12T11:00:00Z'),
      receivedByUserId: 'usr-andres-navarro',
      receivedByUserName: 'Andrés Felipe Navarro Toro',
      totalItemsCount: 15,
      documentName: 'Guia_Despacho_88492_Lenovo.pdf',
      observations: 'Recepción conforme en bodega central.'
    }
  });

  const guideSonda = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-2026-002',
      guideNumber: 'GD-55102',
      supplierId: sonda.id,
      leasingContractId: leasingSonda.id,
      branchId: stgoCentro.id,
      dispatchDate: new Date('2026-02-18'),
      receptionDate: new Date('2026-02-19T09:45:00Z'),
      receivedByUserId: 'usr-andres-navarro',
      receivedByUserName: 'Andrés Felipe Navarro Toro',
      totalItemsCount: 10,
      documentName: 'Guia_Despacho_55102_Sonda_Leasing.pdf',
      observations: 'Equipos en modalidad de arriendo según contrato vigente.'
    }
  });

  // 7. Active Directory Users
  const userAndres = await prisma.userADCache.create({
    data: {
      id: 'usr-andres-navarro',
      adGuid: 'guid-001',
      samAccountName: 'anavarro',
      rut: '14.890.321-4',
      firstName: 'Andrés Felipe',
      lastName: 'Navarro Toro',
      fullName: 'Andrés Felipe Navarro Toro',
      email: 'andres.navarro@chileatiende.cl',
      jobTitle: 'Encargado de Bodega TI y Logística',
      department: 'División de Tecnologías de Información (DTI)',
      branchId: stgoCentro.id,
      role: 'TECNICO_BODEGA'
    }
  });

  const userCarla = await prisma.userADCache.create({
    data: {
      id: 'usr-carla-morales',
      adGuid: 'guid-002',
      samAccountName: 'cmorales',
      rut: '15.678.432-1',
      firstName: 'Carla Andrea',
      lastName: 'Morales Soto',
      fullName: 'Carla Andrea Morales Soto',
      email: 'carla.morales@chileatiende.cl',
      jobTitle: 'Ejecutiva de Atención Integral',
      department: 'Atención Ciudadana y Sucursales',
      branchId: stgoCentro.id,
      role: 'FUNCIONARIO'
    }
  });

  const userFrancisca = await prisma.userADCache.create({
    data: {
      id: 'usr-francisca-valenzuela',
      adGuid: 'guid-004',
      samAccountName: 'fvalenzuela',
      rut: '16.789.012-3',
      firstName: 'Francisca Javiera',
      lastName: 'Valenzuela Díaz',
      fullName: 'Francisca Javiera Valenzuela Díaz',
      email: 'francisca.valenzuela@chileatiende.cl',
      jobTitle: 'Asistente de Atención IPS',
      department: 'Atención Integral Valparaíso',
      branchId: valparaiso.id,
      role: 'FUNCIONARIO'
    }
  });

  // 8. Activos
  const asset1 = await prisma.asset.create({
    data: {
      id: 'ast-001',
      serialNumber: 'PF3K89LM',
      inventoryNumber: 'CA-NB-2026-00431',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Módulo 4 - Atención Presencial',
      assignedToUserId: userCarla.id,
      assignedToUserName: userCarla.fullName,
      assignedToUserRut: userCarla.rut,
      assignedToUserDept: userCarla.department,
      assignedDate: new Date('2026-02-15T14:00:00Z'),
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD' }
    }
  });

  const asset2 = await prisma.asset.create({
    data: {
      id: 'ast-002',
      serialNumber: 'PF3K89LN',
      inventoryNumber: 'CA-NB-2026-00432',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Estante 2 - Bodega TI Piso 2',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD' }
    }
  });

  const asset3 = await prisma.asset.create({
    data: {
      id: 'ast-004',
      serialNumber: 'CN4982310A',
      brand: 'Dell',
      model: 'Professional P2422H 24"',
      assetTypeId: typeMonitor.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideSonda.id,
      leasingContractId: leasingSonda.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Módulo 4 - Puesto Atención',
      assignedToUserId: userCarla.id,
      assignedToUserName: userCarla.fullName,
      assignedToUserRut: userCarla.rut,
      assignedDate: new Date('2026-02-15T14:00:00Z')
    }
  });

  // 9. Consumibles
  const hdmi = await prisma.consumable.create({
    data: {
      id: 'cns-hdmi',
      sku: 'CAB-HDMI-2M',
      name: 'Cable HDMI 2.0 Ultra HD (2 metros)',
      category: 'CABLES',
      minStockAlert: 10,
      description: 'Cable reforzado para puestos de doble pantalla'
    }
  });

  const mousepad = await prisma.consumable.create({
    data: {
      id: 'cns-mousepad',
      sku: 'ERG-PAD-GEL',
      name: 'Mousepad Ergonómico con Reposamuñecas Gel',
      category: 'ERGONOMIA',
      minStockAlert: 15,
      description: 'Accesorio ergonómico con logo ChileAtiende'
    }
  });

  // Stocks
  await prisma.consumableStock.create({
    data: {
      consumableId: hdmi.id,
      branchId: stgoCentro.id,
      currentQuantity: 4 // Alerta crítica (<10)
    }
  });

  await prisma.consumableStock.create({
    data: {
      consumableId: mousepad.id,
      branchId: stgoCentro.id,
      currentQuantity: 6 // Alerta crítica (<15)
    }
  });

  // 10. Asignación Inicial (Acta)
  const act1 = await prisma.assignment.create({
    data: {
      id: 'asg-001',
      actNumber: 'ACT-2026-00042',
      assignmentType: AssignmentType.ENTREGA_INICIAL,
      recipientUserId: userCarla.id,
      technicianUserId: userAndres.id,
      branchId: stgoCentro.id,
      status: AssignmentStatus.FIRMADO_DIGITAL,
      signedByName: userCarla.fullName,
      digitalSignatureHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      observations: 'Entrega conforme de equipamiento para módulo presencial.',
      signedAt: new Date('2026-02-15T14:05:00Z')
    }
  });

  await prisma.assignmentItem.create({
    data: {
      assignmentId: act1.id,
      assetId: asset1.id,
      quantity: 1,
      conditionAtAssignment: PhysicalCondition.BUENO
    }
  });

  await prisma.assignmentItem.create({
    data: {
      assignmentId: act1.id,
      assetId: asset3.id,
      quantity: 1,
      conditionAtAssignment: PhysicalCondition.BUENO
    }
  });

  await prisma.assignmentItem.create({
    data: {
      assignmentId: act1.id,
      consumableId: hdmi.id,
      quantity: 1,
      conditionAtAssignment: PhysicalCondition.BUENO
    }
  });

  // 11. Auditoría
  await prisma.assetAuditLog.create({
    data: {
      assetId: asset1.id,
      serialNumber: asset1.serialNumber,
      inventoryNumber: asset1.inventoryNumber,
      newStatus: AssetStatus.BODEGA_DISPONIBLE,
      branchName: stgoCentro.name,
      changedByUserName: userAndres.fullName,
      changeReason: 'Ingreso inicial a bodega con Guía GD-88492 y OC 6245-12-LR26',
      documentRef: 'GD-88492'
    }
  });

  await prisma.assetAuditLog.create({
    data: {
      assetId: asset1.id,
      serialNumber: asset1.serialNumber,
      inventoryNumber: asset1.inventoryNumber,
      previousStatus: AssetStatus.BODEGA_DISPONIBLE,
      newStatus: AssetStatus.ASIGNADO,
      newUserId: userCarla.id,
      newUserName: userCarla.fullName,
      branchName: stgoCentro.name,
      changedByUserName: userAndres.fullName,
      changeReason: 'Asignación mediante Acta de Entrega ACT-2026-00042',
      documentRef: 'ACT-2026-00042'
    }
  });

  // 12. Usuarios de la Plataforma con Roles (RBAC)
  await prisma.platformUser.create({
    data: {
      id: 'usr-admin-01',
      rut: '14.238.990-1',
      username: 'admin',
      fullName: 'Patricio Alejandro Silva Valenzuela',
      email: 'patricio.silva@chileatiende.cl',
      passwordHash: 'admin123',
      role: PlatformRole.ADMIN_TI,
      jobTitle: 'Jefe de Infraestructura & ITAM DTI',
      department: 'División Tecnologías de la Información',
      branchId: stgoCentro.id,
      isActive: true
    }
  });

  await prisma.platformUser.create({
    data: {
      id: 'usr-bodega-01',
      rut: '16.554.821-4',
      username: 'bodega',
      fullName: 'Andrés Felipe Navarro Toro',
      email: 'andres.navarro@chileatiende.cl',
      passwordHash: 'bodega123',
      role: PlatformRole.ENCARGADO_BODEGA,
      jobTitle: 'Encargado Nacional de Bodega TI',
      department: 'Logística y Activos TI',
      branchId: stgoCentro.id,
      isActive: true
    }
  });

  await prisma.platformUser.create({
    data: {
      id: 'usr-tecnico-01',
      rut: '17.432.890-K',
      username: 'tecnico',
      fullName: 'Rodrigo Ignacio Castro Herrera',
      email: 'rodrigo.castro@chileatiende.cl',
      passwordHash: 'tecnico123',
      role: PlatformRole.TECNICO_SOPORTE,
      jobTitle: 'Técnico de Soporte en Terreno',
      department: 'Soporte y Atención a Usuarios',
      branchId: providencia.id,
      isActive: true
    }
  });

  await prisma.platformUser.create({
    data: {
      id: 'usr-auditor-01',
      rut: '13.882.114-7',
      username: 'auditor',
      fullName: 'Marcela Eugenia Soto Benítez',
      email: 'marcela.soto@ips.gob.cl',
      passwordHash: 'auditor123',
      role: PlatformRole.AUDITOR_CONSULTOR,
      jobTitle: 'Auditora Senior de Control y Gestión',
      department: 'Unidad de Auditoría Interna (UAI - IPS)',
      branchId: stgoCentro.id,
      isActive: true
    }
  });

  console.log('✅ Base de datos PostgreSQL poblada exitosamente.');
}

main()
  .catch((e) => {
    console.error('Error poblando la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
