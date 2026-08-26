import { PrismaClient, AssetPropertyType, AssetStatus, PhysicalCondition, DeviceCategory, AssignmentStatus, AssignmentType, StockMovementType, PlatformRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando población masiva de datos en PostgreSQL (ChileAtiende ITAM)...');

  // 1. Limpieza controlada (Preservando usuarios sincronizados de Active Directory)
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
  await prisma.assetType.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.branch.deleteMany();

  // 2. Sucursales / Bodegas a Nivel Nacional
  const branchesData = [
    {
      id: 'branch-santiago-centro',
      code: 'SUC-STGO-CENTRO',
      name: 'Sucursal Santiago Centro (Alameda)',
      region: 'Región Metropolitana',
      commune: 'Santiago',
      address: 'Av. Libertador Bernardo O\'Higgins 1450',
    },
    {
      id: 'branch-providencia',
      code: 'SUC-PROVIDENCIA',
      name: 'Sucursal Providencia',
      region: 'Región Metropolitana',
      commune: 'Providencia',
      address: 'Av. Providencia 1245',
    },
    {
      id: 'branch-puente-alto',
      code: 'SUC-PUENTE-ALTO',
      name: 'Sucursal Puente Alto (Plaza)',
      region: 'Región Metropolitana',
      commune: 'Puente Alto',
      address: 'Av. Concha y Toro 450',
    },
    {
      id: 'branch-valparaiso',
      code: 'SUC-VALPARAISO',
      name: 'Sucursal Valparaíso (Plaza Sotomayor)',
      region: 'Región de Valparaíso',
      commune: 'Valparaíso',
      address: 'Av. Brasil 1750',
    },
    {
      id: 'branch-vina',
      code: 'SUC-VINA',
      name: 'Sucursal Viña del Mar',
      region: 'Región de Valparaíso',
      commune: 'Viña del Mar',
      address: 'Calle Arlegui 645',
    },
    {
      id: 'branch-concepcion',
      code: 'SUC-CONCEPCION',
      name: 'Sucursal Concepción Centro',
      region: 'Región del Biobío',
      commune: 'Concepción',
      address: 'Barros Arana 450',
    },
    {
      id: 'branch-antofagasta',
      code: 'SUC-ANTOFAGASTA',
      name: 'Sucursal Antofagasta',
      region: 'Región de Antofagasta',
      commune: 'Antofagasta',
      address: 'Arturo Prat 532',
    },
    {
      id: 'branch-la-serena',
      code: 'SUC-LA-SERENA',
      name: 'Sucursal La Serena',
      region: 'Región de Coquimbo',
      commune: 'La Serena',
      address: 'Balmaceda 430',
    },
    {
      id: 'branch-temuco',
      code: 'SUC-TEMUCO',
      name: 'Sucursal Temuco',
      region: 'Región de La Araucanía',
      commune: 'Temuco',
      address: 'Manuel Montt 920',
    },
    {
      id: 'branch-puerto-montt',
      code: 'SUC-PUERTO-MONTT',
      name: 'Sucursal Puerto Montt',
      region: 'Región de Los Lagos',
      commune: 'Puerto Montt',
      address: 'Benavente 405',
    }
  ];

  const branches = [];
  for (const b of branchesData) {
    const created = await prisma.branch.create({ data: b });
    branches.push(created);
  }

  const [stgoCentro, providencia, puenteAlto, valparaiso, vina, concepcion, antofagasta, laSerena, temuco, puertoMontt] = branches;

  // 3. Proveedores Acreditados
  const suppliersData = [
    {
      id: 'sup-sonda',
      rut: '76.432.109-8',
      businessName: 'Sonda S.A.',
      contactName: 'Marcelo Pardo',
      contactEmail: 'contacto.gob@sonda.com',
      contactPhone: '+56 2 2657 5000',
    },
    {
      id: 'sup-lenovo',
      rut: '76.890.123-5',
      businessName: 'Lenovo Chile SpA',
      contactName: 'Patricia Morales',
      contactEmail: 'licitaciones@lenovo.com',
      contactPhone: '+56 2 2490 8000',
    },
    {
      id: 'sup-hp',
      rut: '76.123.456-7',
      businessName: 'HP Inc Chile SpA',
      contactName: 'Lorena Valdés',
      contactEmail: 'ventas.publico@hp.com',
      contactPhone: '+56 2 2580 4000',
    },
    {
      id: 'sup-dell',
      rut: '76.998.765-4',
      businessName: 'Dell Technologies Chile',
      contactName: 'Carlos Fuenzalida',
      contactEmail: 'gobierno@dell.com',
      contactPhone: '+56 2 2390 1000',
    },
    {
      id: 'sup-cisco',
      rut: '77.112.334-9',
      businessName: 'Cisco Systems Chile',
      contactName: 'Andrea Alarcón',
      contactEmail: 'soporte.cl@cisco.com',
      contactPhone: '+56 2 2588 7000',
    }
  ];

  const suppliers = [];
  for (const s of suppliersData) {
    const created = await prisma.supplier.create({ data: s });
    suppliers.push(created);
  }
  const [sonda, lenovo, hp, dell, cisco] = suppliers;

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
      name: 'Monitor 24" IPS FHD',
      category: DeviceCategory.PANTALLAS,
      requiresInventoryNumber: true,
      iconName: 'Tv'
    }
  });

  const typePrinter = await prisma.assetType.create({
    data: {
      id: 'type-printer',
      name: 'Impresora Multifuncional Térmica / Láser',
      category: DeviceCategory.IMPRESION,
      requiresInventoryNumber: true,
      iconName: 'Printer'
    }
  });

  const typePhone = await prisma.assetType.create({
    data: {
      id: 'type-phone',
      name: 'Teléfono IP Puesto de Atención',
      category: DeviceCategory.PERIFERICOS_BIOMETRIA,
      requiresInventoryNumber: true,
      iconName: 'Phone'
    }
  });

  const typeScanner = await prisma.assetType.create({
    data: {
      id: 'type-scanner',
      name: 'Lector Cédulas / Huellero Biométrico',
      category: DeviceCategory.PERIFERICOS_BIOMETRIA,
      requiresInventoryNumber: true,
      iconName: 'Scan'
    }
  });

  const typeSwitch = await prisma.assetType.create({
    data: {
      id: 'type-switch',
      name: 'Switch de Comunicaciones 24 Puertos',
      category: DeviceCategory.REDES,
      requiresInventoryNumber: true,
      iconName: 'Network'
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

  const oc2 = await prisma.purchaseOrder.create({
    data: {
      id: 'oc-2026-002',
      ocNumber: '7310-88-LP26',
      supplierId: hp.id,
      description: 'Renovación de Puestos de Atención Multifuncionales y Escáneres de Cédula',
      orderDate: new Date('2026-02-01'),
      totalAmountCLP: 28400000,
      documentName: 'OC_7310-88-LP26_ChileCompra.pdf'
    }
  });

  const leasingSonda = await prisma.leasingContract.create({
    data: {
      id: 'cont-sonda-2024',
      contractNumber: 'LIC-ARR-2024-MICRO',
      name: 'Licitación Nacional de Arriendo Microinformática y Puestos de Atención',
      supplierId: sonda.id,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2026-09-15'), // Vence pronto (<30 días)
      warningDaysThreshold: 60,
      documentName: 'Contrato_Leasing_Sonda_2024_2026.pdf'
    }
  });

  const leasingDell = await prisma.leasingContract.create({
    data: {
      id: 'cont-dell-2025',
      contractNumber: 'LIC-ARR-2025-DELL',
      name: 'Arriendo de Equipos de Alto Rendimiento y Servidores Regionales',
      supplierId: dell.id,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2027-06-01'),
      warningDaysThreshold: 60,
      documentName: 'Contrato_Leasing_Dell_2025_2027.pdf'
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
      totalItemsCount: 20,
      documentName: 'Guia_Despacho_88492_Lenovo.pdf',
      observations: 'Recepción conforme en bodega central.'
    }
  });

  const guideHP = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-2026-002',
      guideNumber: 'GD-99120',
      supplierId: hp.id,
      purchaseOrderId: oc2.id,
      branchId: valparaiso.id,
      dispatchDate: new Date('2026-02-20'),
      receptionDate: new Date('2026-02-21T10:00:00Z'),
      receivedByUserId: 'usr-andres-navarro',
      receivedByUserName: 'Andrés Felipe Navarro Toro',
      totalItemsCount: 15,
      documentName: 'Guia_Despacho_99120_HP.pdf',
      observations: 'Ingreso directo a bodega regional Valparaíso.'
    }
  });

  const guideSonda = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-2026-003',
      guideNumber: 'GD-55102',
      supplierId: sonda.id,
      leasingContractId: leasingSonda.id,
      branchId: concepcion.id,
      dispatchDate: new Date('2026-02-18'),
      receptionDate: new Date('2026-02-19T09:45:00Z'),
      receivedByUserId: 'usr-andres-navarro',
      receivedByUserName: 'Andrés Felipe Navarro Toro',
      totalItemsCount: 12,
      documentName: 'Guia_Despacho_55102_Sonda_Leasing.pdf',
      observations: 'Equipos en modalidad de arriendo según contrato vigente.'
    }
  });

  // 7. Insumos y Stock en Bodegas
  const consumablesData = [
    {
      id: 'cns-hdmi',
      sku: 'CAB-HDMI-2M',
      name: 'Cable HDMI 2.0 Ultra HD (2 metros)',
      category: 'CABLES',
      minStockAlert: 10,
      description: 'Cable mallado de alta resistencia para puestos de doble monitor'
    },
    {
      id: 'cns-patchcord',
      sku: 'CAB-RJ45-3M',
      name: 'Patch Cord UTP Cat6 Gigabit (3 metros)',
      category: 'REDES',
      minStockAlert: 15,
      description: 'Cable de red estructurado color azul para puestos de atención'
    },
    {
      id: 'cns-power-trebol',
      sku: 'CAB-POW-TREB',
      name: 'Cable de Poder Trébol tipo C5 para Cargador Notebook',
      category: 'CABLES',
      minStockAlert: 8,
      description: 'Cable estándar con enchufe nacional chileno de 3 patas'
    },
    {
      id: 'cns-power-pc',
      sku: 'CAB-POW-C13',
      name: 'Cable de Poder IEC C13 220V para PC / Pantalla',
      category: 'CABLES',
      minStockAlert: 12,
      description: 'Cable de alimentación para monitores y ordenadores de escritorio'
    },
    {
      id: 'cns-mousepad',
      sku: 'ERG-PAD-GEL',
      name: 'Mousepad Ergonómico con Reposamuñecas Gel',
      category: 'ERGONOMIA',
      minStockAlert: 15,
      description: 'Accesorio ergonómico con base antideslizante'
    },
    {
      id: 'cns-adapter-usbc',
      sku: 'ADP-USBC-HDMI',
      name: 'Adaptador USB-C Multipuerto a HDMI 4K + USB 3.0',
      category: 'ADAPTADORES',
      minStockAlert: 10,
      description: 'Dongle de conexión para notebooks ejecutivos en salas de reuniones'
    },
    {
      id: 'cns-mouse-usb',
      sku: 'PER-MOU-USB',
      name: 'Mouse Óptico USB Ergonómico Negro',
      category: 'PERIFERICOS',
      minStockAlert: 20,
      description: 'Mouse alámbrico 1200 DPI para plataformas de atención'
    },
    {
      id: 'cns-keyboard-usb',
      sku: 'PER-KEY-USB',
      name: 'Teclado USB Español Latinoamericano',
      category: 'PERIFERICOS',
      minStockAlert: 15,
      description: 'Teclado con pad numérico y teclado de membrana silenciosa'
    },
    {
      id: 'cns-toner-laser',
      sku: 'TON-BR-660',
      name: 'Tóner Negro Brother TN-660 (2.600 págs)',
      category: 'IMPRESION',
      minStockAlert: 5,
      description: 'Consumible oficial para impresoras láser de ventanilla'
    }
  ];

  const createdConsumables = [];
  for (const c of consumablesData) {
    const created = await prisma.consumable.create({ data: c });
    createdConsumables.push(created);
  }

  // Poblar stocks variados de insumos en todas las bodegas regionales
  const stockDistributions = [
    // Santiago Centro (Bodega Central)
    { branchId: stgoCentro.id, cId: 'cns-hdmi', qty: 28 },
    { branchId: stgoCentro.id, cId: 'cns-patchcord', qty: 45 },
    { branchId: stgoCentro.id, cId: 'cns-power-trebol', qty: 18 },
    { branchId: stgoCentro.id, cId: 'cns-power-pc', qty: 22 },
    { branchId: stgoCentro.id, cId: 'cns-mousepad', qty: 32 },
    { branchId: stgoCentro.id, cId: 'cns-adapter-usbc', qty: 14 },
    { branchId: stgoCentro.id, cId: 'cns-mouse-usb', qty: 35 },
    { branchId: stgoCentro.id, cId: 'cns-keyboard-usb', qty: 25 },
    { branchId: stgoCentro.id, cId: 'cns-toner-laser', qty: 9 },

    // Providencia
    { branchId: providencia.id, cId: 'cns-hdmi', qty: 6 }, // Crítico (<10)
    { branchId: providencia.id, cId: 'cns-patchcord', qty: 14 }, // Crítico (<15)
    { branchId: providencia.id, cId: 'cns-mousepad', qty: 8 }, // Crítico (<15)
    { branchId: providencia.id, cId: 'cns-mouse-usb', qty: 12 }, // Crítico (<20)

    // Puente Alto
    { branchId: puenteAlto.id, cId: 'cns-hdmi', qty: 15 },
    { branchId: puenteAlto.id, cId: 'cns-patchcord', qty: 20 },
    { branchId: puenteAlto.id, cId: 'cns-power-trebol', qty: 4 }, // Crítico (<8)
    { branchId: puenteAlto.id, cId: 'cns-keyboard-usb', qty: 18 },

    // Valparaíso
    { branchId: valparaiso.id, cId: 'cns-hdmi', qty: 12 },
    { branchId: valparaiso.id, cId: 'cns-patchcord', qty: 30 },
    { branchId: valparaiso.id, cId: 'cns-power-pc', qty: 16 },
    { branchId: valparaiso.id, cId: 'cns-mouse-usb', qty: 24 },
    { branchId: valparaiso.id, cId: 'cns-toner-laser', qty: 3 }, // Crítico (<5)

    // Viña del Mar
    { branchId: vina.id, cId: 'cns-hdmi', qty: 8 }, // Crítico (<10)
    { branchId: vina.id, cId: 'cns-mousepad', qty: 11 }, // Crítico (<15)
    { branchId: vina.id, cId: 'cns-adapter-usbc', qty: 5 }, // Crítico (<10)

    // Concepción
    { branchId: concepcion.id, cId: 'cns-hdmi', qty: 16 },
    { branchId: concepcion.id, cId: 'cns-patchcord', qty: 28 },
    { branchId: concepcion.id, cId: 'cns-power-trebol', qty: 12 },
    { branchId: concepcion.id, cId: 'cns-mouse-usb', qty: 22 },
    { branchId: concepcion.id, cId: 'cns-keyboard-usb', qty: 19 },

    // Antofagasta
    { branchId: antofagasta.id, cId: 'cns-hdmi', qty: 5 }, // Crítico (<10)
    { branchId: antofagasta.id, cId: 'cns-patchcord', qty: 12 }, // Crítico (<15)
    { branchId: antofagasta.id, cId: 'cns-mousepad', qty: 7 }, // Crítico (<15)

    // La Serena
    { branchId: laSerena.id, cId: 'cns-hdmi', qty: 14 },
    { branchId: laSerena.id, cId: 'cns-power-trebol', qty: 10 },
    { branchId: laSerena.id, cId: 'cns-mouse-usb', qty: 18 },

    // Temuco
    { branchId: temuco.id, cId: 'cns-hdmi', qty: 11 },
    { branchId: temuco.id, cId: 'cns-patchcord', qty: 22 },
    { branchId: temuco.id, cId: 'cns-toner-laser', qty: 2 }, // Crítico (<5)

    // Puerto Montt
    { branchId: puertoMontt.id, cId: 'cns-hdmi', qty: 9 }, // Crítico (<10)
    { branchId: puertoMontt.id, cId: 'cns-power-pc', qty: 8 }, // Crítico (<12)
    { branchId: puertoMontt.id, cId: 'cns-keyboard-usb', qty: 14 } // Crítico (<15)
  ];

  for (const s of stockDistributions) {
    await prisma.consumableStock.create({
      data: {
        branchId: s.branchId,
        consumableId: s.cId,
        currentQuantity: s.qty
      }
    });
  }

  // 8. Activos TI en Todas las Bodegas
  const assetsSeedList = [
    // --- SANTIAGO CENTRO ---
    {
      id: 'ast-stgo-01',
      serialNumber: 'PF3K89LM',
      inventoryNumber: 'CA-NB-2026-00431',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Estante A1 - Bodega Central TI',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD NVMe' }
    },
    {
      id: 'ast-stgo-02',
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
      locationDetail: 'Estante A1 - Bodega Central TI',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD NVMe' }
    },
    {
      id: 'ast-stgo-03',
      serialNumber: 'PF3K89LP',
      inventoryNumber: 'CA-NB-2026-00433',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Estante A1 - Bodega Central TI',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD NVMe' }
    },
    {
      id: 'ast-stgo-04',
      serialNumber: 'CN4982310A',
      brand: 'Dell',
      model: 'Professional P2422H 24"',
      assetTypeId: typeMonitor.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideSonda.id,
      leasingContractId: leasingSonda.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Rack Monitores - Bodega Central',
      specifications: { resolucion: '1920x1080 FHD', panel: 'IPS 60Hz', conectores: 'HDMI, DisplayPort, VGA' }
    },
    {
      id: 'ast-stgo-05',
      serialNumber: 'CN4982310B',
      brand: 'Dell',
      model: 'Professional P2422H 24"',
      assetTypeId: typeMonitor.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideSonda.id,
      leasingContractId: leasingSonda.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Rack Monitores - Bodega Central',
      specifications: { resolucion: '1920x1080 FHD', panel: 'IPS 60Hz' }
    },
    {
      id: 'ast-stgo-06',
      serialNumber: 'HP-AIO-9921',
      inventoryNumber: 'CA-PC-2026-00108',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One 23.8"',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.EN_MANTENCION,
      physicalCondition: PhysicalCondition.REGULAR,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Taller de Soporte Técnico',
      specifications: { cpu: 'Intel Core i7-13700', ram: '16 GB', storage: '1 TB SSD' }
    },
    {
      id: 'ast-stgo-07',
      serialNumber: 'CSCO-2960X-01',
      inventoryNumber: 'CA-SW-2026-00054',
      brand: 'Cisco',
      model: 'Catalyst 2960-X 24 Puertos Gigabit PoE+',
      assetTypeId: typeSwitch.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Gabinete Redes Sala Servidores',
      specifications: { puertos: '24x 10/100/1000 PoE+', uplinks: '4x 1G SFP' }
    },

    // --- PROVIDENCIA ---
    {
      id: 'ast-prov-01',
      serialNumber: 'PF4X110A',
      inventoryNumber: 'CA-NB-2026-00450',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: providencia.id,
      locationDetail: 'Bodega TI Providencia Estante 1',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      id: 'ast-prov-02',
      serialNumber: 'BRT-MFC-8910',
      inventoryNumber: 'CA-PR-2026-00033',
      brand: 'Brother',
      model: 'DCP-L2540DW Láser Multifuncional',
      assetTypeId: typePrinter.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: providencia.id,
      locationDetail: 'Bodega Equipos de Ventanilla',
      specifications: { tipo: 'Láser Monocromática', velocidad: '30 ppm', duplex: 'Automático' }
    },

    // --- PUENTE ALTO ---
    {
      id: 'ast-pa-01',
      serialNumber: 'HP-NB-44219',
      inventoryNumber: 'CA-NB-2026-00512',
      brand: 'HP',
      model: 'EliteBook 640 G10',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: puenteAlto.id,
      locationDetail: 'Bodega Sucursal Puente Alto',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      id: 'ast-pa-02',
      serialNumber: 'SCAN-FUT-771',
      inventoryNumber: 'CA-SC-2026-00088',
      brand: 'Futronic',
      model: 'FS88H Lector de Huella Dactilar FIPS201',
      assetTypeId: typeScanner.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: puenteAlto.id,
      locationDetail: 'Gaveta Periféricos de Seguridad',
      specifications: { interfaz: 'USB 2.0', certificacion: 'FBI PIV / FIPS 201' }
    },

    // --- VALPARAÍSO ---
    {
      id: 'ast-valp-01',
      serialNumber: 'PF4X221V',
      inventoryNumber: 'CA-NB-2026-00460',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Bodega Regional Valparaíso',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD' }
    },
    {
      id: 'ast-valp-02',
      serialNumber: 'PF4X222V',
      inventoryNumber: 'CA-NB-2026-00461',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Bodega Regional Valparaíso',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD' }
    },
    {
      id: 'ast-valp-03',
      serialNumber: 'DEL-MON-7711',
      brand: 'Dell',
      model: 'P2422H 24" IPS',
      assetTypeId: typeMonitor.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideSonda.id,
      leasingContractId: leasingSonda.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Bodega Regional Valparaíso'
    },
    {
      id: 'ast-valp-04',
      serialNumber: 'CSCO-IP-7821',
      inventoryNumber: 'CA-TF-2026-00122',
      brand: 'Cisco',
      model: 'IP Phone 7821 PoE',
      assetTypeId: typePhone.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Rack Telefonía IP'
    },

    // --- VIÑA DEL MAR ---
    {
      id: 'ast-vina-01',
      serialNumber: 'HP-NB-44230',
      inventoryNumber: 'CA-NB-2026-00520',
      brand: 'HP',
      model: 'EliteBook 640 G10',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: vina.id,
      locationDetail: 'Bodega Sucursal Viña del Mar'
    },
    {
      id: 'ast-vina-02',
      serialNumber: 'HP-AIO-8812',
      inventoryNumber: 'CA-PC-2026-00115',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One 23.8"',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: vina.id,
      locationDetail: 'Bodega Sucursal Viña del Mar'
    },

    // --- CONCEPCIÓN ---
    {
      id: 'ast-conc-01',
      serialNumber: 'PF4X331C',
      inventoryNumber: 'CA-NB-2026-00470',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Bodega Zonal Biobío'
    },
    {
      id: 'ast-conc-02',
      serialNumber: 'PF4X332C',
      inventoryNumber: 'CA-NB-2026-00471',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Bodega Zonal Biobío'
    },
    {
      id: 'ast-conc-03',
      serialNumber: 'DEL-MON-9901',
      brand: 'Dell',
      model: 'Professional P2422H 24"',
      assetTypeId: typeMonitor.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideSonda.id,
      leasingContractId: leasingSonda.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Bodega Zonal Biobío'
    },
    {
      id: 'ast-conc-04',
      serialNumber: 'DEL-LAT-5540',
      brand: 'Dell',
      model: 'Latitude 5540 15.6"',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideSonda.id,
      leasingContractId: leasingDell.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Bodega Zonal Biobío'
    },

    // --- ANTOFAGASTA ---
    {
      id: 'ast-anto-01',
      serialNumber: 'PF4X441A',
      inventoryNumber: 'CA-NB-2026-00480',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: antofagasta.id,
      locationDetail: 'Bodega Sucursal Antofagasta'
    },
    {
      id: 'ast-anto-02',
      serialNumber: 'HP-AIO-7731',
      inventoryNumber: 'CA-PC-2026-00120',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: antofagasta.id,
      locationDetail: 'Bodega Sucursal Antofagasta'
    },

    // --- LA SERENA ---
    {
      id: 'ast-laser-01',
      serialNumber: 'PF4X551S',
      inventoryNumber: 'CA-NB-2026-00490',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: laSerena.id,
      locationDetail: 'Bodega Sucursal La Serena'
    },
    {
      id: 'ast-laser-02',
      serialNumber: 'BRT-MFC-5541',
      inventoryNumber: 'CA-PR-2026-00045',
      brand: 'Brother',
      model: 'DCP-L2540DW Láser Multifuncional',
      assetTypeId: typePrinter.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: laSerena.id,
      locationDetail: 'Bodega Sucursal La Serena'
    },

    // --- TEMUCO ---
    {
      id: 'ast-temu-01',
      serialNumber: 'PF4X661T',
      inventoryNumber: 'CA-NB-2026-00500',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: temuco.id,
      locationDetail: 'Bodega Sucursal Temuco'
    },
    {
      id: 'ast-temu-02',
      serialNumber: 'DEL-MON-6612',
      brand: 'Dell',
      model: 'P2422H 24" IPS',
      assetTypeId: typeMonitor.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guideSonda.id,
      leasingContractId: leasingSonda.id,
      currentBranchId: temuco.id,
      locationDetail: 'Bodega Sucursal Temuco'
    },

    // --- PUERTO MONTT ---
    {
      id: 'ast-pm-01',
      serialNumber: 'PF4X771P',
      inventoryNumber: 'CA-NB-2026-00510',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideLenovo.id,
      purchaseOrderId: oc1.id,
      currentBranchId: puertoMontt.id,
      locationDetail: 'Bodega Sucursal Puerto Montt'
    },
    {
      id: 'ast-pm-02',
      serialNumber: 'HP-AIO-6619',
      inventoryNumber: 'CA-PC-2026-00125',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guideHP.id,
      purchaseOrderId: oc2.id,
      currentBranchId: puertoMontt.id,
      locationDetail: 'Bodega Sucursal Puerto Montt'
    }
  ];

  for (const a of assetsSeedList) {
    await prisma.asset.create({ data: a });
  }

  // 9. Registro de Auditoría Inicial (Kardex)
  for (const a of assetsSeedList.slice(0, 8)) {
    await prisma.assetAuditLog.create({
      data: {
        assetId: a.id,
        serialNumber: a.serialNumber,
        inventoryNumber: a.inventoryNumber || null,
        newStatus: a.status,
        branchName: branches.find(b => b.id === a.currentBranchId)?.name || 'Bodega Central',
        changedByUserName: 'Andrés Felipe Navarro Toro',
        changeReason: `Ingreso inicial conforme a bodega con Guía de Despacho`,
        documentRef: a.dispatchGuideId
      }
    });
  }

  // 10. Usuarios de Plataforma RBAC
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

  console.log(`✅ Base de datos PostgreSQL poblada exitosamente:`);
  console.log(`   - ${branches.length} Sucursales / Bodegas activas.`);
  console.log(`   - ${suppliers.length} Proveedores acreditados.`);
  console.log(`   - ${consumablesData.length} Tipologías de insumos con ${stockDistributions.length} stocks distribuidos.`);
  console.log(`   - ${assetsSeedList.length} Activos TI registrados en diversas bodegas.`);
}

main()
  .catch((e) => {
    console.error('Error poblando la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
