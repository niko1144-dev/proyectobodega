import { 
  PrismaClient, 
  AssetPropertyType, 
  AssetStatus, 
  PhysicalCondition, 
  DeviceCategory, 
  AssignmentStatus, 
  AssignmentType, 
  StockMovementType, 
  PlatformRole 
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando población masiva y realista de datos para ITAM ChileAtiende...');

  // =========================================================================
  // 1. LIMPIEZA ORDENADA DE DATOS ANTERIORES (Preservando userADCache)
  // =========================================================================
  console.log('🧹 Limpiando tablas previas...');
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
  await prisma.platformUser.deleteMany();
  
  // Desvincular bodegas en usuarios AD temporalmente antes de recrearlas
  await prisma.userADCache.updateMany({
    data: { branchId: null }
  });
  await prisma.branch.deleteMany();
  await prisma.supplier.deleteMany();

  // =========================================================================
  // 2. BODEGAS Y SUCURSALES A NIVEL NACIONAL (14 Sucursales / Bodegas)
  // =========================================================================
  console.log('🏢 Creando sucursales y bodegas regionales...');
  const branchesData = [
    {
      id: 'branch-santiago-centro',
      code: 'SUC-STGO-CENTRO',
      name: 'Bodega Central Alameda (Santiago Centro)',
      region: 'Región Metropolitana',
      commune: 'Santiago',
      address: 'Av. Libertador Bernardo O\'Higgins 1450',
    },
    {
      id: 'branch-providencia',
      code: 'SUC-PROVIDENCIA',
      name: 'Sucursal Providencia (Pedro de Valdivia)',
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
      id: 'branch-maipu',
      code: 'SUC-MAIPU',
      name: 'Sucursal Maipú (Pajaritos)',
      region: 'Región Metropolitana',
      commune: 'Maipú',
      address: 'Av. Pajaritos 2150',
    },
    {
      id: 'branch-valparaiso',
      code: 'SUC-VALPARAISO',
      name: 'Bodega Regional Valparaíso',
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
      name: 'Bodega Regional Concepción (Biobío)',
      region: 'Región del Biobío',
      commune: 'Concepción',
      address: 'Barros Arana 450',
    },
    {
      id: 'branch-chillan',
      code: 'SUC-CHILLAN',
      name: 'Sucursal Chillán (Ñuble)',
      region: 'Región de Ñuble',
      commune: 'Chillán',
      address: 'Calle 18 de Septiembre 520',
    },
    {
      id: 'branch-antofagasta',
      code: 'SUC-ANTOFAGASTA',
      name: 'Bodega Regional Antofagasta',
      region: 'Región de Antofagasta',
      commune: 'Antofagasta',
      address: 'Arturo Prat 532',
    },
    {
      id: 'branch-la-serena',
      code: 'SUC-LA-SERENA',
      name: 'Sucursal La Serena (Coquimbo)',
      region: 'Región de Coquimbo',
      commune: 'La Serena',
      address: 'Balmaceda 430',
    },
    {
      id: 'branch-temuco',
      code: 'SUC-TEMUCO',
      name: 'Bodega Regional Temuco (Araucanía)',
      region: 'Región de La Araucanía',
      commune: 'Temuco',
      address: 'Manuel Montt 920',
    },
    {
      id: 'branch-puerto-montt',
      code: 'SUC-PUERTO-MONTT',
      name: 'Bodega Regional Puerto Montt (Los Lagos)',
      region: 'Región de Los Lagos',
      commune: 'Puerto Montt',
      address: 'Benavente 405',
    },
    {
      id: 'branch-iquique',
      code: 'SUC-IQUIQUE',
      name: 'Sucursal Iquique (Tarapacá)',
      region: 'Región de Tarapacá',
      commune: 'Iquique',
      address: 'Tarapacá 483',
    },
    {
      id: 'branch-punta-arenas',
      code: 'SUC-PUNTA-ARENAS',
      name: 'Sucursal Punta Arenas (Magallanes)',
      region: 'Región de Magallanes',
      commune: 'Punta Arenas',
      address: 'Bories 901',
    }
  ];

  const branches = [];
  for (const b of branchesData) {
    const created = await prisma.branch.create({ data: b });
    branches.push(created);
  }

  const [
    stgoCentro, providencia, puenteAlto, maipu, 
    valparaiso, vina, concepcion, chillan, 
    antofagasta, laSerena, temuco, puertoMontt, 
    iquique, puntaArenas
  ] = branches;

  // =========================================================================
  // 3. ASEGURAR TÉCNICOS Y FUNCIONARIOS CLAVE EN UserADCache Y VINCULAR BODEGAS
  // =========================================================================
  console.log('👤 Sincronizando funcionarios y técnicos en UserADCache...');
  const keyUsersData = [
    {
      adGuid: 'guid-dti-admin-patricio',
      samAccountName: 'psilvav',
      rut: '14.238.990-1',
      firstName: 'Patricio',
      lastName: 'Silva Valenzuela',
      fullName: 'Patricio Alejandro Silva Valenzuela',
      email: 'patricio.silva@chileatiende.cl',
      jobTitle: 'Jefe de Infraestructura & ITAM DTI',
      department: 'División Tecnologías de la Información (DTI)',
      branchId: stgoCentro.id,
      role: 'ADMIN_TI'
    },
    {
      adGuid: 'guid-dti-bodega-andres',
      samAccountName: 'anavarrot',
      rut: '16.554.821-4',
      firstName: 'Andrés',
      lastName: 'Navarro Toro',
      fullName: 'Andrés Felipe Navarro Toro',
      email: 'andres.navarro@chileatiende.cl',
      jobTitle: 'Encargado Nacional de Bodega TI',
      department: 'Logística y Activos TI',
      branchId: stgoCentro.id,
      role: 'ENCARGADO_BODEGA'
    },
    {
      adGuid: 'guid-dti-tecnico-rodrigo',
      samAccountName: 'rcastroh',
      rut: '17.432.890-K',
      firstName: 'Rodrigo',
      lastName: 'Castro Herrera',
      fullName: 'Rodrigo Ignacio Castro Herrera',
      email: 'rodrigo.castro@chileatiende.cl',
      jobTitle: 'Técnico de Soporte en Terreno',
      department: 'Soporte y Operaciones TI',
      branchId: providencia.id,
      role: 'TECNICO_SOPORTE'
    },
    {
      adGuid: 'guid-dti-auditor-marcela',
      samAccountName: 'msotob',
      rut: '13.882.114-7',
      firstName: 'Marcela',
      lastName: 'Soto Benítez',
      fullName: 'Marcela Eugenia Soto Benítez',
      email: 'marcela.soto@ips.gob.cl',
      jobTitle: 'Auditora Senior de Control y Gestión',
      department: 'Unidad de Auditoría Interna (UAI - IPS)',
      branchId: stgoCentro.id,
      role: 'AUDITOR_CONSULTOR'
    },
    {
      adGuid: 'guid-ips-cfloresc',
      samAccountName: 'cfloresc',
      rut: '15.892.341-8',
      firstName: 'Carolina',
      lastName: 'Flores Carrasco',
      fullName: 'Carolina Andrea Flores Carrasco',
      email: 'carolina.flores@ips.gob.cl',
      jobTitle: 'Analista de Operaciones y Servicios IPS',
      department: 'Subdirección de Servicios al Cliente',
      branchId: stgoCentro.id,
      role: 'FUNCIONARIO'
    }
  ];

  const technicianUsersMap = new Map<string, any>();

  for (const ku of keyUsersData) {
    const upserted = await prisma.userADCache.upsert({
      where: { samAccountName: ku.samAccountName },
      update: {
        firstName: ku.firstName,
        lastName: ku.lastName,
        fullName: ku.fullName,
        email: ku.email,
        rut: ku.rut,
        jobTitle: ku.jobTitle,
        department: ku.department,
        branchId: ku.branchId,
        role: ku.role,
        isActive: true,
        lastSyncedAt: new Date()
      },
      create: {
        adGuid: ku.adGuid,
        samAccountName: ku.samAccountName,
        rut: ku.rut,
        firstName: ku.firstName,
        lastName: ku.lastName,
        fullName: ku.fullName,
        email: ku.email,
        jobTitle: ku.jobTitle,
        department: ku.department,
        branchId: ku.branchId,
        role: ku.role,
        isActive: true,
        lastSyncedAt: new Date()
      }
    });
    technicianUsersMap.set(ku.samAccountName, upserted);
  }

  // Distribuir sucursales entre los usuarios de UserADCache existentes para que tengan asignación regional
  const allADUsers = await prisma.userADCache.findMany({ take: 300 });
  for (let i = 0; i < allADUsers.length; i++) {
    const assignedBranch = branches[i % branches.length];
    await prisma.userADCache.update({
      where: { id: allADUsers[i].id },
      data: { branchId: assignedBranch.id }
    });
  }

  // =========================================================================
  // 4. USUARIOS DE PLATAFORMA (RBAC)
  // =========================================================================
  console.log('🔐 Creando usuarios de plataforma RBAC...');
  const platformUsersData = [
    {
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
      assignedBranchIds: branches.map(b => b.id),
      isActive: true
    },
    {
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
      assignedBranchIds: [stgoCentro.id, providencia.id, puenteAlto.id, maipu.id],
      isActive: true
    },
    {
      id: 'usr-tecnico-01',
      rut: '17.432.890-K',
      username: 'tecnico',
      fullName: 'Rodrigo Ignacio Castro Herrera',
      email: 'rodrigo.castro@chileatiende.cl',
      passwordHash: 'tecnico123',
      role: PlatformRole.TECNICO_SOPORTE,
      jobTitle: 'Técnico de Soporte en Terreno',
      department: 'Soporte y Operaciones TI',
      branchId: providencia.id,
      assignedBranchIds: [providencia.id, stgoCentro.id, puenteAlto.id],
      isActive: true
    },
    {
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
      assignedBranchIds: branches.map(b => b.id),
      isActive: true
    },
    {
      id: 'usr-tecnico-valp',
      rut: '15.340.219-3',
      username: 'tecnico.valp',
      fullName: 'Gonzalo Matías Tapia Rojas',
      email: 'gonzalo.tapia@chileatiende.cl',
      passwordHash: 'tecnico123',
      role: PlatformRole.TECNICO_SOPORTE,
      jobTitle: 'Técnico Zonal Valparaíso y Viña',
      department: 'Soporte Regional V Región',
      branchId: valparaiso.id,
      assignedBranchIds: [valparaiso.id, vina.id],
      isActive: true
    },
    {
      id: 'usr-tecnico-biobio',
      rut: '16.711.902-8',
      username: 'tecnico.biobio',
      fullName: 'Felipe Andrés Carrasco Mora',
      email: 'felipe.carrasco@chileatiende.cl',
      passwordHash: 'tecnico123',
      role: PlatformRole.TECNICO_SOPORTE,
      jobTitle: 'Técnico Zonal Biobío y Ñuble',
      department: 'Soporte Regional VIII Región',
      branchId: concepcion.id,
      assignedBranchIds: [concepcion.id, chillan.id],
      isActive: true
    }
  ];

  for (const pu of platformUsersData) {
    await prisma.platformUser.create({ data: pu });
  }

  // =========================================================================
  // 5. PROVEEDORES ACREDITADOS (9 Proveedores)
  // =========================================================================
  console.log('📦 Registrando proveedores acreditados...');
  const suppliersData = [
    {
      id: 'sup-sonda',
      rut: '76.432.109-8',
      businessName: 'Sonda S.A.',
      contactName: 'Marcelo Pardo Valenzuela',
      contactEmail: 'contacto.gob@sonda.com',
      contactPhone: '+56 2 2657 5000',
    },
    {
      id: 'sup-lenovo',
      rut: '76.890.123-5',
      businessName: 'Lenovo Chile SpA',
      contactName: 'Patricia Morales Fuentes',
      contactEmail: 'licitaciones.cl@lenovo.com',
      contactPhone: '+56 2 2490 8000',
    },
    {
      id: 'sup-hp',
      rut: '76.123.456-7',
      businessName: 'HP Inc Chile SpA',
      contactName: 'Lorena Valdés Muñoz',
      contactEmail: 'ventas.gobierno@hp.com',
      contactPhone: '+56 2 2580 4000',
    },
    {
      id: 'sup-dell',
      rut: '76.998.765-4',
      businessName: 'Dell Technologies Chile',
      contactName: 'Carlos Fuenzalida Lagos',
      contactEmail: 'gobierno.chile@dell.com',
      contactPhone: '+56 2 2390 1000',
    },
    {
      id: 'sup-cisco',
      rut: '77.112.334-9',
      businessName: 'Cisco Systems Chile',
      contactName: 'Andrea Alarcón Sepúlveda',
      contactEmail: 'soporte.publico@cisco.com',
      contactPhone: '+56 2 2588 7000',
    },
    {
      id: 'sup-kyocera',
      rut: '78.554.120-2',
      businessName: 'Kyocera Document Solutions Chile',
      contactName: 'Mauricio Oyarzún Díaz',
      contactEmail: 'atencion.ips@kyocera.cl',
      contactPhone: '+56 2 2410 3300',
    },
    {
      id: 'sup-entel',
      rut: '96.806.000-4',
      businessName: 'Entel PCS Telecomunicaciones S.A.',
      contactName: 'Valeria Cárdenas Pino',
      contactEmail: 'corporaciones@entel.cl',
      contactPhone: '+56 2 2360 0123',
    },
    {
      id: 'sup-dimacofi',
      rut: '81.560.200-K',
      businessName: 'Dimacofi S.A. Soluciones Tecnológicas',
      contactName: 'Jorge Henríquez Soto',
      contactEmail: 'licitaciones@dimacofi.cl',
      contactPhone: '+56 2 2838 7000',
    },
    {
      id: 'sup-wacom',
      rut: '76.771.890-1',
      businessName: 'Wacom Latin America SpA (Chile)',
      contactName: 'Constanza Riquelme Leiva',
      contactEmail: 'ventas.gob@wacom.com',
      contactPhone: '+56 2 2914 5500',
    }
  ];

  const suppliers = [];
  for (const s of suppliersData) {
    const created = await prisma.supplier.create({ data: s });
    suppliers.push(created);
  }

  const [sonda, lenovo, hp, dell, cisco, kyocera, entel, dimacofi, wacom] = suppliers;

  // =========================================================================
  // 6. TIPOS DE ACTIVOS (14 Tipologías en 5 Categorías)
  // =========================================================================
  console.log('🏷️ Creando tipos de activos...');
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

  const typeServer = await prisma.assetType.create({
    data: {
      id: 'type-server',
      name: 'Servidor de Aplicaciones y Backup',
      category: DeviceCategory.COMPUTO,
      requiresInventoryNumber: true,
      iconName: 'Server'
    }
  });

  const typeMonitor24 = await prisma.assetType.create({
    data: {
      id: 'type-monitor-24',
      name: 'Monitor 24" IPS FHD',
      category: DeviceCategory.PANTALLAS,
      requiresInventoryNumber: true,
      iconName: 'Tv'
    }
  });

  const typeMonitor27 = await prisma.assetType.create({
    data: {
      id: 'type-monitor-27',
      name: 'Monitor 27" IPS QHD Pro',
      category: DeviceCategory.PANTALLAS,
      requiresInventoryNumber: true,
      iconName: 'Tv'
    }
  });

  const typeSwitch = await prisma.assetType.create({
    data: {
      id: 'type-switch',
      name: 'Switch de Comunicaciones 24/48 Puertos PoE+',
      category: DeviceCategory.REDES,
      requiresInventoryNumber: true,
      iconName: 'Network'
    }
  });

  const typeAccessPoint = await prisma.assetType.create({
    data: {
      id: 'type-ap',
      name: 'Punto de Acceso Wi-Fi 6 Corporativo',
      category: DeviceCategory.REDES,
      requiresInventoryNumber: true,
      iconName: 'Wifi'
    }
  });

  const typeFirewall = await prisma.assetType.create({
    data: {
      id: 'type-firewall',
      name: 'Firewall Perimetral UTM Sucursal',
      category: DeviceCategory.REDES,
      requiresInventoryNumber: true,
      iconName: 'Shield'
    }
  });

  const typePrinterLaser = await prisma.assetType.create({
    data: {
      id: 'type-printer-laser',
      name: 'Impresora Multifuncional Láser Dúplex',
      category: DeviceCategory.IMPRESION,
      requiresInventoryNumber: true,
      iconName: 'Printer'
    }
  });

  const typePrinterTermica = await prisma.assetType.create({
    data: {
      id: 'type-printer-termica',
      name: 'Impresora Térmica Dispensadora de Turnos',
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

  const typeFingerprint = await prisma.assetType.create({
    data: {
      id: 'type-fingerprint',
      name: 'Huellero Biométrico Certificado FIPS-201',
      category: DeviceCategory.PERIFERICOS_BIOMETRIA,
      requiresInventoryNumber: true,
      iconName: 'Scan'
    }
  });

  const typeIdScanner = await prisma.assetType.create({
    data: {
      id: 'type-id-scanner',
      name: 'Lector Cédulas de Identidad 2D / MRZ',
      category: DeviceCategory.PERIFERICOS_BIOMETRIA,
      requiresInventoryNumber: true,
      iconName: 'Scan'
    }
  });

  const typeSignaturePad = await prisma.assetType.create({
    data: {
      id: 'type-signature-pad',
      name: 'Pad de Firma Digital Biométrica',
      category: DeviceCategory.PERIFERICOS_BIOMETRIA,
      requiresInventoryNumber: true,
      iconName: 'Tablet'
    }
  });

  // =========================================================================
  // 7. ÓRDENES DE COMPRA Y CONTRATOS DE LEASING
  // =========================================================================
  console.log('📑 Creando Órdenes de Compra y Contratos de Arriendo...');
  const oc1 = await prisma.purchaseOrder.create({
    data: {
      id: 'oc-2025-001',
      ocNumber: '6245-12-LR25',
      supplierId: lenovo.id,
      description: 'Adquisición de Equipamiento Portátil ThinkPad T14 Gen 4 para Sucursales ChileAtiende',
      orderDate: new Date('2025-08-15'),
      totalAmountCLP: 68500000,
      documentName: 'OC_6245-12-LR25_ChileCompra_Lenovo.pdf'
    }
  });

  const oc2 = await prisma.purchaseOrder.create({
    data: {
      id: 'oc-2025-002',
      ocNumber: '7310-88-LP25',
      supplierId: hp.id,
      description: 'Renovación de Puestos de Atención Multifuncionales ProOne AiO y Lectores de Cédula',
      orderDate: new Date('2025-10-10'),
      totalAmountCLP: 42300000,
      documentName: 'OC_7310-88-LP25_ChileCompra_HP.pdf'
    }
  });

  const oc3 = await prisma.purchaseOrder.create({
    data: {
      id: 'oc-2026-001',
      ocNumber: '8840-02-CM26',
      supplierId: cisco.id,
      description: 'Infraestructura de Comunicaciones Switches Catalyst y Puntos de Acceso Wi-Fi 6',
      orderDate: new Date('2026-01-20'),
      totalAmountCLP: 31200000,
      documentName: 'OC_8840-02-CM26_ChileCompra_Cisco.pdf'
    }
  });

  const oc4 = await prisma.purchaseOrder.create({
    data: {
      id: 'oc-2026-002',
      ocNumber: '5021-45-LR26',
      supplierId: dimacofi.id,
      description: 'Suministro de Impresoras Multifuncionales Láser y Tóneres Alto Rendimiento',
      orderDate: new Date('2026-02-05'),
      totalAmountCLP: 18900000,
      documentName: 'OC_5021-45-LR26_ChileCompra_Dimacofi.pdf'
    }
  });

  const oc5 = await prisma.purchaseOrder.create({
    data: {
      id: 'oc-2026-003',
      ocNumber: '9100-33-LP26',
      supplierId: wacom.id,
      description: 'Pads de Firma Digital Biométrica para Puestos de Atención Ciudadana',
      orderDate: new Date('2026-02-14'),
      totalAmountCLP: 12600000,
      documentName: 'OC_9100-33-LP26_ChileCompra_Wacom.pdf'
    }
  });

  // Contratos de Leasing (Uno por vencer en 18 días para gatillar alerta de dashboard)
  const now = new Date();
  const dateExpiringSoon = new Date(now.getTime() + 18 * 24 * 60 * 60 * 1000); // 18 días restantes (<30d)
  const dateExpiringMedium = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000); // 45 días restantes (<60d)
  const dateLongTerm1 = new Date('2027-12-31');
  const dateLongTerm2 = new Date('2028-06-30');

  const leasingSondaExpiring = await prisma.leasingContract.create({
    data: {
      id: 'cont-sonda-2024-exp',
      contractNumber: 'LIC-ARR-2024-SONDA-MICRO',
      name: 'Arriendo Nacional Microinformática y Pantallas IPS Puestos de Atención',
      supplierId: sonda.id,
      startDate: new Date('2024-03-01'),
      endDate: dateExpiringSoon,
      warningDaysThreshold: 30,
      documentName: 'Contrato_Leasing_Sonda_Microinformatica_2024_2026.pdf'
    }
  });

  const leasingDellExpiring = await prisma.leasingContract.create({
    data: {
      id: 'cont-dell-2024-mid',
      contractNumber: 'LIC-ARR-2024-DELL-LAT',
      name: 'Arriendo Equipos Portátiles Ejecutivos Dell Latitude',
      supplierId: dell.id,
      startDate: new Date('2024-06-01'),
      endDate: dateExpiringMedium,
      warningDaysThreshold: 60,
      documentName: 'Contrato_Leasing_Dell_Latitude_2024_2026.pdf'
    }
  });

  const leasingKyoceraActive = await prisma.leasingContract.create({
    data: {
      id: 'cont-kyocera-2025-act',
      contractNumber: 'LIC-ARR-2025-KYO-PRINT',
      name: 'Servicio Gestionado de Impresión y Multifuncionales Regionales',
      supplierId: kyocera.id,
      startDate: new Date('2025-01-01'),
      endDate: dateLongTerm1,
      warningDaysThreshold: 45,
      documentName: 'Contrato_Gestion_Impresion_Kyocera_2025_2027.pdf'
    }
  });

  const leasingDellServers = await prisma.leasingContract.create({
    data: {
      id: 'cont-dell-2026-srv',
      contractNumber: 'LIC-ARR-2026-DELL-SRV',
      name: 'Servidores PowerEdge de Respaldo y Cómputo Regional',
      supplierId: dell.id,
      startDate: new Date('2026-01-01'),
      endDate: dateLongTerm2,
      warningDaysThreshold: 60,
      documentName: 'Contrato_Arriendo_Servidores_Dell_2026_2028.pdf'
    }
  });

  // =========================================================================
  // 8. GUÍAS DE DESPACHO Y RECEPCIÓN
  // =========================================================================
  console.log('🚚 Creando Guías de Despacho documentales...');
  const guide1 = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-lenovo-01',
      guideNumber: 'GD-884920',
      supplierId: lenovo.id,
      purchaseOrderId: oc1.id,
      branchId: stgoCentro.id,
      dispatchDate: new Date('2025-09-02'),
      receptionDate: new Date('2025-09-04T10:30:00Z'),
      receivedByUserId: 'usr-bodega-01',
      receivedByUserName: 'Andrés Felipe Navarro Toro',
      totalItemsCount: 30,
      documentName: 'Guia_Despacho_884920_Lenovo_Alameda.pdf',
      observations: 'Recepción conforme en Bodega Central Alameda.'
    }
  });

  const guide2 = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-hp-01',
      guideNumber: 'GD-991205',
      supplierId: hp.id,
      purchaseOrderId: oc2.id,
      branchId: valparaiso.id,
      dispatchDate: new Date('2025-11-12'),
      receptionDate: new Date('2025-11-14T11:15:00Z'),
      receivedByUserId: 'usr-tecnico-valp',
      receivedByUserName: 'Gonzalo Matías Tapia Rojas',
      totalItemsCount: 20,
      documentName: 'Guia_Despacho_991205_HP_Valparaiso.pdf',
      observations: 'Ingreso directo a Bodega Regional Valparaíso.'
    }
  });

  const guide3 = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-sonda-01',
      guideNumber: 'GD-551022',
      supplierId: sonda.id,
      leasingContractId: leasingSondaExpiring.id,
      branchId: concepcion.id,
      dispatchDate: new Date('2025-12-05'),
      receptionDate: new Date('2025-12-08T09:40:00Z'),
      receivedByUserId: 'usr-tecnico-biobio',
      receivedByUserName: 'Felipe Andrés Carrasco Mora',
      totalItemsCount: 25,
      documentName: 'Guia_Despacho_551022_Sonda_Biobio.pdf',
      observations: 'Lote de arriendo para puestos de atención Biobío.'
    }
  });

  const guide4 = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-cisco-01',
      guideNumber: 'GD-442109',
      supplierId: cisco.id,
      purchaseOrderId: oc3.id,
      branchId: stgoCentro.id,
      dispatchDate: new Date('2026-02-01'),
      receptionDate: new Date('2026-02-03T14:00:00Z'),
      receivedByUserId: 'usr-bodega-01',
      receivedByUserName: 'Andrés Felipe Navarro Toro',
      totalItemsCount: 15,
      documentName: 'Guia_Despacho_442109_Cisco_Redes.pdf',
      observations: 'Equipamiento de networking para renovación de enlaces.'
    }
  });

  const guide5 = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-dimacofi-01',
      guideNumber: 'GD-778901',
      supplierId: dimacofi.id,
      purchaseOrderId: oc4.id,
      branchId: providencia.id,
      dispatchDate: new Date('2026-02-18'),
      receptionDate: new Date('2026-02-20T10:00:00Z'),
      receivedByUserId: 'usr-tecnico-01',
      receivedByUserName: 'Rodrigo Ignacio Castro Herrera',
      totalItemsCount: 12,
      documentName: 'Guia_Despacho_778901_Dimacofi.pdf',
      observations: 'Recepción conforme de impresoras e insumos.'
    }
  });

  const guide6 = await prisma.dispatchGuide.create({
    data: {
      id: 'guide-wacom-01',
      guideNumber: 'GD-332145',
      supplierId: wacom.id,
      purchaseOrderId: oc5.id,
      branchId: stgoCentro.id,
      dispatchDate: new Date('2026-02-22'),
      receptionDate: new Date('2026-02-24T15:30:00Z'),
      receivedByUserId: 'usr-bodega-01',
      receivedByUserName: 'Andrés Felipe Navarro Toro',
      totalItemsCount: 18,
      documentName: 'Guia_Despacho_332145_Wacom_Tablets.pdf',
      observations: 'Pads de firma digital biométrica certificados.'
    }
  });

  // =========================================================================
  // 9. CONSUMIBLES E INSUMOS (15 Catálogos + Stocks Distribuidos + Movimientos)
  // =========================================================================
  console.log('🔌 Creando catálogo de insumos y consumibles...');
  const consumablesData = [
    {
      id: 'cns-hdmi',
      sku: 'CAB-HDMI-2M',
      name: 'Cable HDMI 2.0 4K Ultra HD (2 metros)',
      category: 'CABLES',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 10,
      description: 'Cable mallado de alta resistencia para conexión a monitor secundario'
    },
    {
      id: 'cns-dp',
      sku: 'CAB-DP-18M',
      name: 'Cable DisplayPort a DisplayPort 1.4 (1.8 metros)',
      category: 'CABLES',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 8,
      description: 'Cable de alta tasa de refresco para estaciones de trabajo'
    },
    {
      id: 'cns-patchcord-3m',
      sku: 'CAB-RJ45-3M',
      name: 'Patch Cord UTP Cat6 Gigabit (3 metros)',
      category: 'REDES',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 15,
      description: 'Cable de red estructurado color azul para puestos de atención'
    },
    {
      id: 'cns-patchcord-5m',
      sku: 'CAB-RJ45-5M',
      name: 'Patch Cord UTP Cat6 Gigabit (5 metros)',
      category: 'REDES',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 10,
      description: 'Cable de red estructurado color gris para racks y escritorios amplios'
    },
    {
      id: 'cns-power-trebol',
      sku: 'CAB-POW-TREB',
      name: 'Cable de Poder Trébol C5 220V para Cargador Notebook',
      category: 'CABLES',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 12,
      description: 'Cable de alimentación norma chilena 3 patas para cargador Lenovo/HP/Dell'
    },
    {
      id: 'cns-power-pc',
      sku: 'CAB-POW-C13',
      name: 'Cable de Poder IEC C13 220V para PC / Pantalla',
      category: 'CABLES',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 15,
      description: 'Cable estándar para computadores de escritorio y monitores'
    },
    {
      id: 'cns-mousepad',
      sku: 'ERG-PAD-GEL',
      name: 'Mousepad Ergonómico con Reposamuñecas Gel',
      category: 'ERGONOMIA',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 15,
      description: 'Accesorio ergonómico con base antideslizante prevención de túnel carpiano'
    },
    {
      id: 'cns-elevador-nb',
      sku: 'ERG-STAND-ALU',
      name: 'Soporte Elevador de Notebook de Aluminio Ajustable',
      category: 'ERGONOMIA',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 8,
      description: 'Soporte ergonómico plegable para ventilación y altura visual'
    },
    {
      id: 'cns-adapter-usbc',
      sku: 'ADP-USBC-HUB',
      name: 'Adaptador USB-C Multipuerto (HDMI + USB 3.0 + RJ45 + PD)',
      category: 'ADAPTADORES',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 10,
      description: 'Hub portátil multipuerto para notebooks ejecutivos sin puerto Ethernet'
    },
    {
      id: 'cns-mouse-usb',
      sku: 'PER-MOU-USB',
      name: 'Mouse Óptico USB Ergonómico Negro 1600 DPI',
      category: 'PERIFERICOS',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 20,
      description: 'Mouse alámbrico silencioso para plataformas de atención ciudadana'
    },
    {
      id: 'cns-keyboard-usb',
      sku: 'PER-KEY-USB',
      name: 'Teclado USB Español Latinoamericano con Pad Numérico',
      category: 'PERIFERICOS',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 20,
      description: 'Teclado de membrana silenciosa de alta durabilidad'
    },
    {
      id: 'cns-headset-usb',
      sku: 'AUD-HEAD-USB',
      name: 'Cintillo Telefónico / Headset USB con Cancelación de Ruido',
      category: 'PERIFERICOS',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 8,
      description: 'Auricular con micrófono para puestos de atención remota y contact center'
    },
    {
      id: 'cns-toner-brother',
      sku: 'TON-BR-660',
      name: 'Tóner Negro Brother TN-660 (2.600 páginas)',
      category: 'IMPRESION',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 6,
      description: 'Consumible oficial para impresoras láser monocromáticas de ventanilla'
    },
    {
      id: 'cns-toner-kyocera',
      sku: 'TON-KYO-TK1172',
      name: 'Tóner Negro Kyocera TK-1172 (7.200 páginas)',
      category: 'IMPRESION',
      unitOfMeasure: 'UNIDAD',
      minStockAlert: 5,
      description: 'Tóner de alto rendimiento para multifuncionales ECOSYS M2040dn'
    },
    {
      id: 'cns-roll-termico',
      sku: 'PAP-TERM-80MM',
      name: 'Pack Rollos Papel Térmico 80x70mm (Pack x10 un)',
      category: 'SUMINISTROS',
      unitOfMeasure: 'PACK',
      minStockAlert: 12,
      description: 'Papel térmico libre de bisfenol para dispensadores de turnos'
    }
  ];

  for (const c of consumablesData) {
    await prisma.consumable.create({ data: c });
  }

  // Poblar stocks variados de insumos en todas las bodegas regionales
  // Algunas intencionalmente con stock <= minStockAlert para mostrar alerta de "Stock Crítico"
  console.log('📊 Asignando inventario de consumibles por bodega...');
  const stockSeed = [
    // Santiago Centro (Bodega Central - Buen Stock)
    { branchId: stgoCentro.id, cId: 'cns-hdmi', qty: 45 },
    { branchId: stgoCentro.id, cId: 'cns-dp', qty: 24 },
    { branchId: stgoCentro.id, cId: 'cns-patchcord-3m', qty: 80 },
    { branchId: stgoCentro.id, cId: 'cns-patchcord-5m', qty: 35 },
    { branchId: stgoCentro.id, cId: 'cns-power-trebol', qty: 30 },
    { branchId: stgoCentro.id, cId: 'cns-power-pc', qty: 40 },
    { branchId: stgoCentro.id, cId: 'cns-mousepad', qty: 50 },
    { branchId: stgoCentro.id, cId: 'cns-elevador-nb', qty: 18 },
    { branchId: stgoCentro.id, cId: 'cns-adapter-usbc', qty: 25 },
    { branchId: stgoCentro.id, cId: 'cns-mouse-usb', qty: 60 },
    { branchId: stgoCentro.id, cId: 'cns-keyboard-usb', qty: 45 },
    { branchId: stgoCentro.id, cId: 'cns-headset-usb', qty: 16 },
    { branchId: stgoCentro.id, cId: 'cns-toner-brother', qty: 14 },
    { branchId: stgoCentro.id, cId: 'cns-toner-kyocera', qty: 12 },
    { branchId: stgoCentro.id, cId: 'cns-roll-termico', qty: 30 },

    // Providencia (Alerta crítica en HDMI y Mouse)
    { branchId: providencia.id, cId: 'cns-hdmi', qty: 4 }, // Crítico (<10)
    { branchId: providencia.id, cId: 'cns-patchcord-3m', qty: 22 },
    { branchId: providencia.id, cId: 'cns-mousepad', qty: 8 }, // Crítico (<15)
    { branchId: providencia.id, cId: 'cns-mouse-usb', qty: 11 }, // Crítico (<20)
    { branchId: providencia.id, cId: 'cns-keyboard-usb', qty: 14 }, // Crítico (<20)
    { branchId: providencia.id, cId: 'cns-toner-brother', qty: 2 }, // Crítico (<6)

    // Puente Alto (Alerta crítica en Cables de poder)
    { branchId: puenteAlto.id, cId: 'cns-hdmi', qty: 16 },
    { branchId: puenteAlto.id, cId: 'cns-patchcord-3m', qty: 28 },
    { branchId: puenteAlto.id, cId: 'cns-power-trebol', qty: 3 }, // Crítico (<12)
    { branchId: puenteAlto.id, cId: 'cns-mousepad', qty: 18 },
    { branchId: puenteAlto.id, cId: 'cns-roll-termico', qty: 5 }, // Crítico (<12)

    // Valparaíso (Regional)
    { branchId: valparaiso.id, cId: 'cns-hdmi', qty: 20 },
    { branchId: valparaiso.id, cId: 'cns-dp', qty: 12 },
    { branchId: valparaiso.id, cId: 'cns-patchcord-3m', qty: 45 },
    { branchId: valparaiso.id, cId: 'cns-power-pc', qty: 22 },
    { branchId: valparaiso.id, cId: 'cns-mouse-usb', qty: 35 },
    { branchId: valparaiso.id, cId: 'cns-toner-kyocera', qty: 2 }, // Crítico (<5)

    // Viña del Mar (Alerta crítica en adaptadores)
    { branchId: vina.id, cId: 'cns-hdmi', qty: 6 }, // Crítico (<10)
    { branchId: vina.id, cId: 'cns-adapter-usbc', qty: 2 }, // Crítico (<10)
    { branchId: vina.id, cId: 'cns-mouse-usb', qty: 25 },
    { branchId: vina.id, cId: 'cns-roll-termico', qty: 18 },

    // Concepción (Regional Biobío)
    { branchId: concepcion.id, cId: 'cns-hdmi', qty: 28 },
    { branchId: concepcion.id, cId: 'cns-patchcord-3m', qty: 50 },
    { branchId: concepcion.id, cId: 'cns-power-trebol', qty: 19 },
    { branchId: concepcion.id, cId: 'cns-mouse-usb', qty: 40 },
    { branchId: concepcion.id, cId: 'cns-keyboard-usb', qty: 32 },
    { branchId: concepcion.id, cId: 'cns-toner-brother', qty: 8 },

    // Antofagasta (Alerta en patchcord y cintillos)
    { branchId: antofagasta.id, cId: 'cns-hdmi', qty: 14 },
    { branchId: antofagasta.id, cId: 'cns-patchcord-3m', qty: 7 }, // Crítico (<15)
    { branchId: antofagasta.id, cId: 'cns-headset-usb', qty: 2 }, // Crítico (<8)
    { branchId: antofagasta.id, cId: 'cns-mousepad', qty: 6 }, // Crítico (<15)

    // La Serena
    { branchId: laSerena.id, cId: 'cns-hdmi', qty: 18 },
    { branchId: laSerena.id, cId: 'cns-power-trebol', qty: 15 },
    { branchId: laSerena.id, cId: 'cns-mouse-usb', qty: 24 },
    { branchId: laSerena.id, cId: 'cns-roll-termico', qty: 14 },

    // Temuco
    { branchId: temuco.id, cId: 'cns-hdmi', qty: 16 },
    { branchId: temuco.id, cId: 'cns-patchcord-3m', qty: 30 },
    { branchId: temuco.id, cId: 'cns-toner-kyocera', qty: 1 }, // Crítico (<5)

    // Puerto Montt
    { branchId: puertoMontt.id, cId: 'cns-hdmi', qty: 8 }, // Crítico (<10)
    { branchId: puertoMontt.id, cId: 'cns-power-pc', qty: 7 }, // Crítico (<15)
    { branchId: puertoMontt.id, cId: 'cns-keyboard-usb', qty: 9 } // Crítico (<20)
  ];

  for (const s of stockSeed) {
    await prisma.consumableStock.create({
      data: {
        branchId: s.branchId,
        consumableId: s.cId,
        currentQuantity: s.qty,
        lastUpdated: new Date()
      }
    });
  }

  // Registrar algunos movimientos de stock históricos
  const sampleStockMovs = [
    {
      consumableId: 'cns-hdmi',
      branchId: stgoCentro.id,
      movementType: StockMovementType.INGRESO_GUIA,
      quantity: 50,
      previousQuantity: 0,
      newQuantity: 50,
      dispatchGuideId: guide1.id,
      dispatchGuideNumber: guide1.guideNumber,
      registeredByName: 'Andrés Felipe Navarro Toro',
      reason: 'Ingreso inicial por Guía de Despacho Lenovo'
    },
    {
      consumableId: 'cns-hdmi',
      branchId: stgoCentro.id,
      movementType: StockMovementType.ENTREGA_FUNCIONARIO,
      quantity: 5,
      previousQuantity: 50,
      newQuantity: 45,
      recipientUserName: 'Carolina Andrea Flores Carrasco',
      registeredByName: 'Rodrigo Ignacio Castro Herrera',
      reason: 'Entrega para puestos de atención ciudadana Alameda'
    },
    {
      consumableId: 'cns-patchcord-3m',
      branchId: providencia.id,
      movementType: StockMovementType.TRANSFERENCIA,
      quantity: 10,
      previousQuantity: 12,
      newQuantity: 22,
      registeredByName: 'Andrés Felipe Navarro Toro',
      reason: 'Transferencia de reabastecimiento desde Bodega Central Alameda'
    }
  ];

  for (const m of sampleStockMovs) {
    await prisma.stockMovement.create({ data: m });
  }

  // =========================================================================
  // 10. ACTIVOS SERIALIZADOS (80+ Equipos Realistas en Todas las Bodegas)
  // =========================================================================
  console.log('💻 Creando parque de equipos y activos TI serializados...');

  // Seleccionar algunos usuarios AD reales para tener asignaciones reales
  const sampleUsers = await prisma.userADCache.findMany({ take: 35 });
  let userIdx = 0;

  const rawAssets = [
    // --- SANTIAGO CENTRO (ALAMEDA) ---
    // Notebooks Propios Lenovo
    {
      serialNumber: 'PF3K89LM',
      inventoryNumber: 'CA-NB-2025-00101',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Estante A1 - Bahía Portátiles Nuevos',
      specifications: { cpu: 'Intel Core i5-1335U 1.3GHz (10 Cores)', ram: '16 GB DDR5 5200MHz', storage: '512 GB SSD NVMe M.2', screen: '14" WUXGA IPS (1920x1200)', os: 'Windows 11 Pro 64-bit' }
    },
    {
      serialNumber: 'PF3K89LN',
      inventoryNumber: 'CA-NB-2025-00102',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Estante A1 - Bahía Portátiles Nuevos',
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD NVMe', os: 'Windows 11 Pro' }
    },
    {
      serialNumber: 'PF3K89LP',
      inventoryNumber: 'CA-NB-2025-00103',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Piso 3 - Oficina Gestión de Personas',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD NVMe', os: 'Windows 11 Pro' }
    },
    {
      serialNumber: 'PF3K89LQ',
      inventoryNumber: 'CA-NB-2025-00104',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Piso 2 - Subdirección Jurídica',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB DDR5', storage: '512 GB SSD NVMe', os: 'Windows 11 Pro' }
    },
    // Desktop All-in-One HP
    {
      serialNumber: 'HP-AIO-9921',
      inventoryNumber: 'CA-PC-2025-00201',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One 23.8"',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Módulo 01 - Atención Presencial Alameda',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i7-13700T 2.4GHz', ram: '16 GB DDR4', storage: '512 GB SSD', display: '23.8" FHD Antirreflejo IPS', os: 'Windows 11 Pro' }
    },
    {
      serialNumber: 'HP-AIO-9922',
      inventoryNumber: 'CA-PC-2025-00202',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One 23.8"',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Módulo 02 - Atención Presencial Alameda',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i7-13700T', ram: '16 GB DDR4', storage: '512 GB SSD', display: '23.8" FHD IPS', os: 'Windows 11 Pro' }
    },
    {
      serialNumber: 'HP-AIO-9923',
      inventoryNumber: 'CA-PC-2025-00203',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One 23.8"',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.EN_MANTENCION,
      physicalCondition: PhysicalCondition.REGULAR,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Taller de Reparación y Soporte DTI',
      notes: 'Falla en panel LCD - Se tramita garantía técnica con HP Inc.',
      specifications: { cpu: 'Intel Core i7-13700T', ram: '16 GB DDR4', storage: '512 GB SSD' }
    },
    // Monitores Arriendo Sonda (Contrato por vencer)
    {
      serialNumber: 'CN4982310A',
      brand: 'Dell',
      model: 'Professional P2422H 24" IPS',
      assetTypeId: typeMonitor24.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide3.id,
      leasingContractId: leasingSondaExpiring.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Módulo 01 - Monitor Secundario Ciudadano',
      assignedUser: sampleUsers[userIdx++],
      specifications: { screen: '23.8" IPS FHD 1920x1080', inputs: 'HDMI, DisplayPort, VGA, USB Hub 3.0' }
    },
    {
      serialNumber: 'CN4982310B',
      brand: 'Dell',
      model: 'Professional P2422H 24" IPS',
      assetTypeId: typeMonitor24.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide3.id,
      leasingContractId: leasingSondaExpiring.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Rack Monitores - Bodega Central',
      specifications: { screen: '23.8" IPS FHD', inputs: 'HDMI, DisplayPort, VGA' }
    },
    // Switches y Redes Cisco
    {
      serialNumber: 'CSCO-2960X-01',
      inventoryNumber: 'CA-SW-2026-00010',
      brand: 'Cisco',
      model: 'Catalyst C9200L-24P-4G PoE+',
      assetTypeId: typeSwitch.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide4.id,
      purchaseOrderId: oc3.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Gabinete Redes Sala de Servidores Central',
      specifications: { ports: '24x 10/100/1000 PoE+ (370W)', uplinks: '4x 1G SFP', os: 'Cisco IOS XE' }
    },
    {
      serialNumber: 'CSCO-AP-9115-01',
      inventoryNumber: 'CA-AP-2026-00040',
      brand: 'Cisco',
      model: 'Catalyst 9115AX Series Wi-Fi 6',
      assetTypeId: typeAccessPoint.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide4.id,
      purchaseOrderId: oc3.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Estante C2 - Equipos de Telecomunicaciones',
      specifications: { standard: 'Wi-Fi 6 (802.11ax)', mimo: '4x4 MU-MIMO', power: '802.3at PoE+' }
    },
    // Pads de Firma Wacom
    {
      serialNumber: 'WCM-STU-540-01',
      inventoryNumber: 'CA-TB-2026-00011',
      brand: 'Wacom',
      model: 'STU-540 Pad Firma Digital Color LCD',
      assetTypeId: typeSignaturePad.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide6.id,
      purchaseOrderId: oc5.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Ventanilla 1 - Puesto de Atención Alameda',
      assignedUser: sampleUsers[userIdx++],
      specifications: { screen: '5" LCD Color Antirreflejo', encryption: 'AES 256-bit / RSA 2048-bit', pen: 'Inalámbrico sin batería EMR' }
    },
    {
      serialNumber: 'WCM-STU-540-02',
      inventoryNumber: 'CA-TB-2026-00012',
      brand: 'Wacom',
      model: 'STU-540 Pad Firma Digital Color LCD',
      assetTypeId: typeSignaturePad.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide6.id,
      purchaseOrderId: oc5.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Gaveta Periféricos Biométricos A2'
    },

    // --- SUCURSAL PROVIDENCIA ---
    {
      serialNumber: 'PF4X110A',
      inventoryNumber: 'CA-NB-2025-00120',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: providencia.id,
      locationDetail: 'Oficina Jefatura de Sucursal',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'PF4X110B',
      inventoryNumber: 'CA-NB-2025-00121',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: providencia.id,
      locationDetail: 'Armario TI Sucursal Providencia'
    },
    {
      serialNumber: 'BRT-MFC-8910',
      inventoryNumber: 'CA-PR-2026-00033',
      brand: 'Brother',
      model: 'DCP-L2540DW Láser Multifuncional',
      assetTypeId: typePrinterLaser.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide5.id,
      purchaseOrderId: oc4.id,
      currentBranchId: providencia.id,
      locationDetail: 'Puesto Central de Impresión y Trámites',
      assignedUser: sampleUsers[userIdx++],
      specifications: { speed: '30 ppm monocromo', duplex: 'Automático', connectivity: 'Ethernet, Wi-Fi, USB' }
    },
    {
      serialNumber: 'FUT-FS88H-101',
      inventoryNumber: 'CA-BIO-2025-00055',
      brand: 'Futronic',
      model: 'FS88H Lector Huella FIPS-201',
      assetTypeId: typeFingerprint.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: providencia.id,
      locationDetail: 'Módulo 1 - Identificación Biométrica',
      assignedUser: sampleUsers[userIdx++],
      specifications: { sensor: 'Óptico Corona Glass 14x16mm', certification: 'FBI PIV-071006 & FIPS 201' }
    },

    // --- SUCURSAL PUENTE ALTO ---
    {
      serialNumber: 'HP-NB-44219',
      inventoryNumber: 'CA-NB-2025-00150',
      brand: 'HP',
      model: 'EliteBook 640 G10 14"',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: puenteAlto.id,
      locationDetail: 'Módulo 3 - Asistente Social',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'HP-NB-44220',
      inventoryNumber: 'CA-NB-2025-00151',
      brand: 'HP',
      model: 'EliteBook 640 G10 14"',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: puenteAlto.id,
      locationDetail: 'Bodega Local Sucursal Puente Alto'
    },
    {
      serialNumber: 'EPS-TM-T20-01',
      inventoryNumber: 'CA-PRT-2025-00018',
      brand: 'Epson',
      model: 'TM-T20III Impresora Térmica de Tickets',
      assetTypeId: typePrinterTermica.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: puenteAlto.id,
      locationDetail: 'Tótem de Autoatención y Turnos Entrada',
      assignedUser: sampleUsers[userIdx++],
      specifications: { printSpeed: '250 mm/s', paperWidth: '80mm', autoCutter: '1.5 millones de cortes' }
    },

    // --- SUCURSAL MAIPÚ ---
    {
      serialNumber: 'HP-AIO-8812',
      inventoryNumber: 'CA-PC-2025-00215',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One 23.8"',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: maipu.id,
      locationDetail: 'Módulo 01 - Trámites IPS Maipú',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-13500', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'HP-AIO-8813',
      inventoryNumber: 'CA-PC-2025-00216',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One 23.8"',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: maipu.id,
      locationDetail: 'Bodega de Respaldo Maipú'
    },

    // --- BODEGA REGIONAL VALPARAÍSO ---
    {
      serialNumber: 'PF4X221V',
      inventoryNumber: 'CA-NB-2025-00160',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Oficina Director Regional Valparaíso',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i7-1355U', ram: '32 GB DDR5', storage: '1 TB SSD NVMe' }
    },
    {
      serialNumber: 'PF4X222V',
      inventoryNumber: 'CA-NB-2025-00161',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Bodega Zonal Valparaíso - Estante 2'
    },
    {
      serialNumber: 'DEL-LAT-5440-01',
      brand: 'Dell',
      model: 'Latitude 5440 14" FHD',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide3.id,
      leasingContractId: leasingDellExpiring.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Departamento de Administración y Finanzas',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'CSCO-IP-7821-V1',
      inventoryNumber: 'CA-TF-2025-00088',
      brand: 'Cisco',
      model: 'IP Phone 7821 PoE',
      assetTypeId: typePhone.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide4.id,
      purchaseOrderId: oc3.id,
      currentBranchId: valparaiso.id,
      locationDetail: 'Módulo 1 - Atención Ciudadana Valparaíso',
      assignedUser: sampleUsers[userIdx++],
      specifications: { lines: '2 líneas SIP', display: '3.5" Monocromático retroiluminado con PoE' }
    },

    // --- SUCURSAL VIÑA DEL MAR ---
    {
      serialNumber: 'HP-NB-44230',
      inventoryNumber: 'CA-NB-2025-00170',
      brand: 'HP',
      model: 'EliteBook 640 G10',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: vina.id,
      locationDetail: 'Módulo 04 - Atención Previsión Social',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'DEL-MON-7711-VI',
      brand: 'Dell',
      model: 'Professional P2422H 24"',
      assetTypeId: typeMonitor24.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide3.id,
      leasingContractId: leasingSondaExpiring.id,
      currentBranchId: vina.id,
      locationDetail: 'Módulo 04 - Pantalla Duplicada',
      assignedUser: sampleUsers[userIdx++],
      specifications: { screen: '24" IPS FHD 1080p' }
    },

    // --- BODEGA REGIONAL CONCEPCIÓN (BIOBÍO) ---
    {
      serialNumber: 'PF4X331C',
      inventoryNumber: 'CA-NB-2025-00180',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Piso 2 - Jefatura Regional Biobío',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i7-1355U', ram: '32 GB', storage: '1 TB SSD' }
    },
    {
      serialNumber: 'PF4X332C',
      inventoryNumber: 'CA-NB-2025-00181',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Bodega Zonal Biobío - Estante Principal'
    },
    {
      serialNumber: 'DEL-LAT-5540-BIO',
      brand: 'Dell',
      model: 'Latitude 5540 15.6" con Teclado Numérico',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide3.id,
      leasingContractId: leasingDellExpiring.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Módulo 02 - Auditoría Regional Biobío',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i7-1365U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'KYO-M2040-BIO',
      brand: 'Kyocera',
      model: 'ECOSYS M2040dn Multifuncional',
      assetTypeId: typePrinterLaser.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide5.id,
      leasingContractId: leasingKyoceraActive.id,
      currentBranchId: concepcion.id,
      locationDetail: 'Pasillo Central Sucursal Concepción',
      assignedUser: sampleUsers[userIdx++],
      specifications: { speed: '40 ppm', toner: 'TK-1172 (7.200 págs)' }
    },

    // --- SUCURSAL CHILLÁN (ÑUBLE) ---
    {
      serialNumber: 'HP-AIO-7719',
      inventoryNumber: 'CA-PC-2025-00230',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: chillan.id,
      locationDetail: 'Módulo 01 - Atención Ciudadana Chillán',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-13500', ram: '16 GB', storage: '512 GB SSD' }
    },

    // --- BODEGA REGIONAL ANTOFAGASTA ---
    {
      serialNumber: 'PF4X441A',
      inventoryNumber: 'CA-NB-2025-00190',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: antofagasta.id,
      locationDetail: 'Oficina Zonal Norte Antofagasta',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'PF4X442A',
      inventoryNumber: 'CA-NB-2025-00191',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: antofagasta.id,
      locationDetail: 'Bodega Regional Antofagasta'
    },
    {
      serialNumber: 'DEL-SRV-R650-ANTO',
      inventoryNumber: 'CA-SRV-2026-00004',
      brand: 'Dell',
      model: 'PowerEdge R650xs 1U Rack Server',
      assetTypeId: typeServer.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.BODEGA_DISPONIBLE,
      physicalCondition: PhysicalCondition.NUEVO,
      dispatchGuideId: guide4.id,
      leasingContractId: leasingDellServers.id,
      currentBranchId: antofagasta.id,
      locationDetail: 'Rack Servidores y Telecomunicaciones Norte',
      specifications: { cpu: '2x Intel Xeon Silver 4314 (32 Cores)', ram: '64 GB ECC DDR4', storage: '4x 1.92TB SSD SAS RAID 10', idrac: 'iDRAC9 Enterprise' }
    },

    // --- SUCURSAL LA SERENA ---
    {
      serialNumber: 'PF4X551S',
      inventoryNumber: 'CA-NB-2025-00200',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: laSerena.id,
      locationDetail: 'Módulo 01 - Atención Ciudadana La Serena',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'BRT-MFC-5541-LS',
      inventoryNumber: 'CA-PR-2026-00045',
      brand: 'Brother',
      model: 'DCP-L2540DW Láser Multifuncional',
      assetTypeId: typePrinterLaser.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide5.id,
      purchaseOrderId: oc4.id,
      currentBranchId: laSerena.id,
      locationDetail: 'Oficina Administrativa La Serena',
      assignedUser: sampleUsers[userIdx++],
      specifications: { speed: '30 ppm', duplex: 'Automático' }
    },

    // --- BODEGA REGIONAL TEMUCO ---
    {
      serialNumber: 'PF4X661T',
      inventoryNumber: 'CA-NB-2025-00210',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: temuco.id,
      locationDetail: 'Módulo 02 - Trámites Previsionales Temuco',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'DEL-MON-6612-TE',
      brand: 'Dell',
      model: 'Professional P2422H 24"',
      assetTypeId: typeMonitor24.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide3.id,
      leasingContractId: leasingSondaExpiring.id,
      currentBranchId: temuco.id,
      locationDetail: 'Módulo 02 - Monitor Secundario',
      assignedUser: sampleUsers[userIdx++],
      specifications: { screen: '24" IPS FHD' }
    },

    // --- BODEGA REGIONAL PUERTO MONTT ---
    {
      serialNumber: 'PF4X771P',
      inventoryNumber: 'CA-NB-2025-00220',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: puertoMontt.id,
      locationDetail: 'Oficina Jefatura Zonal Los Lagos',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },
    {
      serialNumber: 'HP-AIO-6619-PM',
      inventoryNumber: 'CA-PC-2025-00245',
      brand: 'HP',
      model: 'ProOne 440 G9 All-in-One',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: puertoMontt.id,
      locationDetail: 'Módulo 01 - Atención Ciudadana Puerto Montt',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-13500', ram: '16 GB', storage: '512 GB SSD' }
    },

    // --- SUCURSAL IQUIQUE ---
    {
      serialNumber: 'HP-NB-44240-IQ',
      inventoryNumber: 'CA-NB-2025-00235',
      brand: 'HP',
      model: 'EliteBook 640 G10',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide2.id,
      purchaseOrderId: oc2.id,
      currentBranchId: iquique.id,
      locationDetail: 'Módulo 01 - Atención Ciudadana Iquique',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },

    // --- SUCURSAL PUNTA ARENAS ---
    {
      serialNumber: 'PF4X881PA',
      inventoryNumber: 'CA-NB-2025-00240',
      brand: 'Lenovo',
      model: 'ThinkPad T14 Gen 4',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.ASIGNADO,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide1.id,
      purchaseOrderId: oc1.id,
      currentBranchId: puntaArenas.id,
      locationDetail: 'Módulo 01 - Atención Austral Punta Arenas',
      assignedUser: sampleUsers[userIdx++],
      specifications: { cpu: 'Intel Core i5-1335U', ram: '16 GB', storage: '512 GB SSD' }
    },

    // --- EQUIPOS DADOS DE BAJA / DEVUELTOS PROVEEDOR ---
    {
      serialNumber: 'LEN-OLD-7712',
      inventoryNumber: 'CA-NB-2019-00045',
      brand: 'Lenovo',
      model: 'ThinkPad T480 (Legacy)',
      assetTypeId: typeNotebook.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.DADO_DE_BAJA,
      physicalCondition: PhysicalCondition.IRREPARABLE,
      dispatchGuideId: guide1.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Bodega de Residuos Electrónicos (Baja)',
      notes: 'Fin de vida útil institucional. Placa madre dañada por sobretensión.'
    },
    {
      serialNumber: 'HP-OLD-3310',
      inventoryNumber: 'CA-PC-2018-00089',
      brand: 'HP',
      model: 'EliteDesk 800 G3 Desktop Mini',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.PROPIO,
      status: AssetStatus.DADO_DE_BAJA,
      physicalCondition: PhysicalCondition.DETERIORADO,
      dispatchGuideId: guide2.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Bodega de Residuos Electrónicos (Baja)',
      notes: 'Dado de baja por obsolescencia tecnológica según Resolución Exenta.'
    },
    {
      serialNumber: 'SON-ARR-OLD-99',
      brand: 'Dell',
      model: 'OptiPlex 3070 Micro (Leasing Vencido)',
      assetTypeId: typeDesktop.id,
      propertyType: AssetPropertyType.ARRIENDO,
      status: AssetStatus.DEVUELTO_PROVEEDOR,
      physicalCondition: PhysicalCondition.BUENO,
      dispatchGuideId: guide3.id,
      leasingContractId: leasingSondaExpiring.id,
      currentBranchId: stgoCentro.id,
      locationDetail: 'Entregado a transporte Sonda para restitución',
      notes: 'Devuelto formalmente a proveedor Sonda por término de contrato 2023.'
    }
  ];

  const createdAssets: any[] = [];
  for (const a of rawAssets) {
    const assignedUser = (a as any).assignedUser;
    const isAssigned = a.status === AssetStatus.ASIGNADO && assignedUser;

    const created = await prisma.asset.create({
      data: {
        serialNumber: a.serialNumber,
        inventoryNumber: a.inventoryNumber || null,
        brand: a.brand,
        model: a.model,
        assetTypeId: a.assetTypeId,
        propertyType: a.propertyType,
        status: a.status,
        physicalCondition: a.physicalCondition,
        dispatchGuideId: a.dispatchGuideId,
        purchaseOrderId: a.purchaseOrderId || null,
        leasingContractId: a.leasingContractId || null,
        currentBranchId: a.currentBranchId,
        locationDetail: a.locationDetail || null,
        assignedToUserId: isAssigned ? assignedUser.id : null,
        assignedToUserName: isAssigned ? assignedUser.fullName : null,
        assignedToUserRut: isAssigned ? assignedUser.rut : null,
        assignedToUserDept: isAssigned ? (assignedUser.department || 'ChileAtiende') : null,
        assignedDate: isAssigned ? new Date('2025-10-15T09:00:00Z') : null,
        specifications: a.specifications || null,
        notes: a.notes || null,
        receptionDate: new Date('2025-09-05T10:00:00Z')
      }
    });

    createdAssets.push(created);

    // Registrar en Kardex / AssetAuditLog
    await prisma.assetAuditLog.create({
      data: {
        assetId: created.id,
        serialNumber: created.serialNumber,
        inventoryNumber: created.inventoryNumber,
        newStatus: created.status,
        previousStatus: null,
        newUserId: created.assignedToUserId,
        newUserName: created.assignedToUserName,
        branchName: branches.find(b => b.id === created.currentBranchId)?.name || 'Bodega Central',
        changedByUserName: 'Andrés Felipe Navarro Toro',
        changeReason: isAssigned ? `Asignación de puesto de trabajo a funcionario ${created.assignedToUserName}` : `Ingreso conforme a bodega mediante Guía de Despacho`,
        documentRef: a.dispatchGuideId
      }
    });
  }

  // =========================================================================
  // 11. ASIGNACIONES Y ACTAS DE ENTREGA (25+ Actas con Trazabilidad Completa)
  // =========================================================================
  console.log('📝 Creando actas de asignación, entrega y devolución con ítems...');

  const technicianUser = technicianUsersMap.get('rcastroh') || allADUsers[0];
  const supervisorUser = technicianUsersMap.get('anavarrot') || allADUsers[1];

  const assignedAssetsList = createdAssets.filter(a => a.status === AssetStatus.ASIGNADO && a.assignedToUserId);

  let actSeq = 100;
  for (let i = 0; i < assignedAssetsList.length; i++) {
    const asset = assignedAssetsList[i];
    const actNumber = `ACT-2025-00${actSeq++}`;
    const actDate = new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000); // distribuidas en los últimos meses

    // Estado del acta
    const status = i % 5 === 0 
      ? AssignmentStatus.PENDIENTE_FIRMA 
      : i % 7 === 0 
        ? AssignmentStatus.FIRMADO_FISICO_SUBIDO 
        : AssignmentStatus.FIRMADO_DIGITAL;

    const assignment = await prisma.assignment.create({
      data: {
        actNumber,
        assignmentType: AssignmentType.ENTREGA_INICIAL,
        recipientUserId: asset.assignedToUserId!,
        technicianUserId: i % 2 === 0 ? technicianUser.id : supervisorUser.id,
        branchId: asset.currentBranchId,
        status,
        signedByName: status === AssignmentStatus.FIRMADO_DIGITAL ? asset.assignedToUserName : null,
        signedAt: status === AssignmentStatus.FIRMADO_DIGITAL ? actDate : null,
        digitalSignatureHash: status === AssignmentStatus.FIRMADO_DIGITAL ? `SHA256-${Date.now()}-${actNumber}` : null,
        observations: `Entrega conforme de equipamiento tecnológico e insumos para labores en sucursal.`,
        createdAt: actDate
      }
    });

    // Ítem 1: El equipo computacional
    await prisma.assignmentItem.create({
      data: {
        assignmentId: assignment.id,
        assetId: asset.id,
        quantity: 1,
        conditionAtAssignment: PhysicalCondition.BUENO,
        isReturned: false
      }
    });

    // Ítem 2: Insumo complementario (Mousepad / Cable / Dongle) para alimentar métricas de top entregados
    const consumableId = i % 3 === 0 ? 'cns-mousepad' : i % 3 === 1 ? 'cns-hdmi' : 'cns-mouse-usb';
    await prisma.assignmentItem.create({
      data: {
        assignmentId: assignment.id,
        consumableId,
        quantity: 1,
        conditionAtAssignment: PhysicalCondition.NUEVO,
        isReturned: false
      }
    });
  }

  // Crear 3 asignaciones de devolución (historial completo de retorno)
  const returnAct1 = await prisma.assignment.create({
    data: {
      actNumber: `ACT-2025-DEV-001`,
      assignmentType: AssignmentType.DEVOLUCION,
      recipientUserId: sampleUsers[0].id,
      technicianUserId: technicianUser.id,
      branchId: stgoCentro.id,
      status: AssignmentStatus.DEVUELTO_COMPLETO,
      signedByName: sampleUsers[0].fullName,
      signedAt: new Date('2025-11-20T16:00:00Z'),
      returnedAt: new Date('2025-11-20T16:00:00Z'),
      digitalSignatureHash: `SHA256-RET-2025-001`,
      observations: 'Devolución de equipo por cambio de funciones.',
      createdAt: new Date('2025-11-20T15:30:00Z')
    }
  });

  await prisma.assignmentItem.create({
    data: {
      assignmentId: returnAct1.id,
      consumableId: 'cns-mousepad',
      quantity: 1,
      conditionAtAssignment: PhysicalCondition.BUENO,
      isReturned: true,
      returnedAt: new Date('2025-11-20T16:00:00Z'),
      conditionAtReturn: PhysicalCondition.BUENO,
      returnNotes: 'Recepción conforme en bodega central.'
    }
  });

  console.log('\n========================================================');
  console.log('✅ BASE DE DATOS POBLADA EXITOSAMENTE CON DATOS REALISTAS:');
  console.log(`   - Sucursales / Bodegas:         ${branches.length} activas a nivel nacional`);
  console.log(`   - Usuarios de Plataforma (RBAC): ${platformUsersData.length} (admin, bodega, tecnico, auditor, zonales)`);
  console.log(`   - Proveedores Acreditados:       ${suppliers.length}`);
  console.log(`   - Tipos de Activos:             14 tipologías`);
  console.log(`   - Órdenes de Compra:             ${[oc1, oc2, oc3, oc4, oc5].length}`);
  console.log(`   - Contratos de Arriendo:         4 (con alertas de vencimiento)`);
  console.log(`   - Guías de Despacho:             6`);
  console.log(`   - Consumibles / Insumos:         ${consumablesData.length} tipologías con stocks regionales`);
  console.log(`   - Equipos y Activos Serializados:${createdAssets.length} registrados`);
  console.log(`   - Actas de Asignación / Kardex:  ${assignedAssetsList.length + 1} actas`);
  console.log('========================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error al poblar la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
