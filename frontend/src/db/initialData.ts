// Datos iniciales institucionales para ChileAtiende (Seed Data)
import { Branch, Supplier, PurchaseOrder, LeasingContract, DispatchGuide } from '../types/document';
import { AssetType, Asset, Consumable, ConsumableStock, StockMovement, AssetAuditLog } from '../types/asset';
import { ADUser } from '../types/user';
import { Assignment } from '../types/assignment';

export const initialBranches: Branch[] = [
  {
    id: 'branch-santiago-centro',
    code: 'SUC-STGO-CENTRO',
    name: 'Sucursal Santiago Centro (Alameda)',
    region: 'Región Metropolitana',
    commune: 'Santiago',
    address: 'Av. Libertador Bernardo O\'Higgins 1450',
    isActive: true
  },
  {
    id: 'branch-providencia',
    code: 'SUC-PROVIDENCIA',
    name: 'Sucursal Providencia',
    region: 'Región Metropolitana',
    commune: 'Providencia',
    address: 'Av. Providencia 1245',
    isActive: true
  },
  {
    id: 'branch-valparaiso',
    code: 'SUC-VALPARAISO',
    name: 'Sucursal Valparaíso (Plaza Sotomayor)',
    region: 'Región de Valparaíso',
    commune: 'Valparaíso',
    address: 'Av. Brasil 1750',
    isActive: true
  },
  {
    id: 'branch-concepcion',
    code: 'SUC-CONCEPCION',
    name: 'Sucursal Concepción Centro',
    region: 'Región del Biobío',
    commune: 'Concepción',
    address: 'Barros Arana 450',
    isActive: true
  },
  {
    id: 'branch-antofagasta',
    code: 'SUC-ANTOFAGASTA',
    name: 'Sucursal Antofagasta',
    region: 'Región de Antofagasta',
    commune: 'Antofagasta',
    address: 'Sucre 325',
    isActive: true
  },
  {
    id: 'branch-temuco',
    code: 'SUC-TEMUCO',
    name: 'Sucursal Temuco',
    region: 'Región de La Araucanía',
    commune: 'Temuco',
    address: 'Manuel Bulnes 590',
    isActive: true
  }
];

export const initialSuppliers: Supplier[] = [
  {
    id: 'sup-sonda',
    rut: '76.432.109-8',
    businessName: 'Sonda S.A.',
    contactName: 'Marcelo Pardo',
    contactEmail: 'contacto.gob@sonda.com',
    contactPhone: '+56 2 2657 5000',
    isActive: true
  },
  {
    id: 'sup-lenovo',
    rut: '76.890.123-5',
    businessName: 'Lenovo Chile SpA',
    contactName: 'Patricia Morales',
    contactEmail: 'licitaciones@lenovo.com',
    contactPhone: '+56 2 2490 8000',
    isActive: true
  },
  {
    id: 'sup-entel',
    rut: '96.806.000-4',
    businessName: 'Entel Telecomunicaciones Corp',
    contactName: 'Carlos Fuenzalida',
    contactEmail: 'gobierno@entel.cl',
    contactPhone: '+56 2 2360 0123',
    isActive: true
  },
  {
    id: 'sup-hp',
    rut: '76.123.456-7',
    businessName: 'HP Inc Chile SpA',
    contactName: 'Lorena Valdés',
    contactEmail: 'ventas.publico@hp.com',
    contactPhone: '+56 2 2580 4000',
    isActive: true
  }
];

export const initialPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'oc-2026-001',
    ocNumber: '6245-12-LR26',
    supplierId: 'sup-lenovo',
    supplierName: 'Lenovo Chile SpA',
    description: 'Adquisición de Equipamiento Portátil y Microinformática DTI - ChileAtiende',
    orderDate: '2026-01-15',
    totalAmountCLP: 45800000,
    documentName: 'OC_6245-12-LR26_ChileCompra.pdf',
    createdAt: '2026-01-15T10:00:00Z'
  },
  {
    id: 'oc-2025-088',
    ocNumber: '6245-88-SE25',
    supplierId: 'sup-hp',
    supplierName: 'HP Inc Chile SpA',
    description: 'Renovación de Puestos de Atención Integral y Pantallas IPS',
    orderDate: '2025-11-20',
    totalAmountCLP: 28500000,
    documentName: 'OC_6245-88-SE25_Equipamiento.pdf',
    createdAt: '2025-11-20T14:30:00Z'
  }
];

export const initialLeasingContracts: LeasingContract[] = [
  {
    id: 'cont-sonda-2024',
    contractNumber: 'LIC-ARR-2024-MICRO',
    name: 'Licitación Nacional de Arriendo Microinformática y Puestos de Atención',
    supplierId: 'sup-sonda',
    supplierName: 'Sonda S.A.',
    startDate: '2024-03-01',
    endDate: '2026-09-15', // Vence en pocos días -> Alerta de Vencimiento
    warningDaysThreshold: 45,
    documentName: 'Contrato_Leasing_Sonda_2024_2026.pdf',
    isActive: true,
    createdAt: '2024-03-01T09:00:00Z'
  },
  {
    id: 'cont-entel-2025',
    contractNumber: 'LIC-ARR-2025-NET',
    name: 'Arriendo de Equipos de Conectividad, Switches y Telefonía IP',
    supplierId: 'sup-entel',
    supplierName: 'Entel Telecomunicaciones Corp',
    startDate: '2025-01-01',
    endDate: '2027-12-31',
    warningDaysThreshold: 60,
    documentName: 'Contrato_Entel_Switches_2025.pdf',
    isActive: true,
    createdAt: '2025-01-01T08:00:00Z'
  }
];

export const initialDispatchGuides: DispatchGuide[] = [
  {
    id: 'guide-2026-001',
    guideNumber: 'GD-88492',
    supplierId: 'sup-lenovo',
    supplierName: 'Lenovo Chile SpA',
    supplierRut: '76.890.123-5',
    purchaseOrderId: 'oc-2026-001',
    purchaseOrderNumber: '6245-12-LR26',
    dispatchDate: '2026-02-10',
    receptionDate: '2026-02-12T11:00:00Z',
    documentUrl: '',
    documentName: 'Guia_Despacho_88492_Lenovo.pdf',
    receivedByUserId: 'usr-andres-navarro',
    receivedByUserName: 'Andrés Felipe Navarro Toro',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    totalItemsCount: 15,
    observations: 'Recepción conforme en bodega central.',
    createdAt: '2026-02-12T11:30:00Z'
  },
  {
    id: 'guide-2026-002',
    guideNumber: 'GD-55102',
    supplierId: 'sup-sonda',
    supplierName: 'Sonda S.A.',
    supplierRut: '76.432.109-8',
    leasingContractId: 'cont-sonda-2024',
    leasingContractNumber: 'LIC-ARR-2024-MICRO',
    dispatchDate: '2026-02-18',
    receptionDate: '2026-02-19T09:45:00Z',
    documentUrl: '',
    documentName: 'Guia_Despacho_55102_Sonda_Leasing.pdf',
    receivedByUserId: 'usr-andres-navarro',
    receivedByUserName: 'Andrés Felipe Navarro Toro',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    totalItemsCount: 10,
    observations: 'Equipos en modalidad de arriendo según contrato vigente.',
    createdAt: '2026-02-19T10:00:00Z'
  }
];

export const initialAssetTypes: AssetType[] = [
  { id: 'type-notebook', name: 'Notebook Corporativo', category: 'COMPUTO', requiresInventoryNumber: true, iconName: 'Laptop' },
  { id: 'type-desktop', name: 'Desktop All-in-One', category: 'COMPUTO', requiresInventoryNumber: true, iconName: 'Monitor' },
  { id: 'type-monitor', name: 'Monitor 24" IPS', category: 'PANTALLAS', requiresInventoryNumber: true, iconName: 'Tv' },
  { id: 'type-printer', name: 'Impresora Multifuncional', category: 'IMPRESION', requiresInventoryNumber: true, iconName: 'Printer' },
  { id: 'type-switch', name: 'Switch 24 Puertos PoE', category: 'REDES', requiresInventoryNumber: true, iconName: 'Network' },
  { id: 'type-biometric', name: 'Lector Biométrico Huella', category: 'PERIFERICOS_BIOMETRIA', requiresInventoryNumber: true, iconName: 'Fingerprint' }
];

import { PlatformUser } from '../types/user';

export const initialPlatformUsers: (PlatformUser & { passwordHash: string })[] = [
  {
    id: 'usr-admin-01',
    rut: '14.238.990-1',
    username: 'admin',
    fullName: 'Patricio Alejandro Silva Valenzuela',
    email: 'patricio.silva@chileatiende.cl',
    passwordHash: 'admin123',
    role: 'ADMIN_TI',
    jobTitle: 'Jefe de Infraestructura & ITAM DTI',
    department: 'División Tecnologías de la Información',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'usr-bodega-01',
    rut: '16.554.821-4',
    username: 'bodega',
    fullName: 'Andrés Felipe Navarro Toro',
    email: 'andres.navarro@chileatiende.cl',
    passwordHash: 'bodega123',
    role: 'ENCARGADO_BODEGA',
    jobTitle: 'Encargado Nacional de Bodega TI',
    department: 'Logística y Activos TI',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'usr-tecnico-01',
    rut: '17.432.890-K',
    username: 'tecnico',
    fullName: 'Rodrigo Ignacio Castro Herrera',
    email: 'rodrigo.castro@chileatiende.cl',
    passwordHash: 'tecnico123',
    role: 'TECNICO_SOPORTE',
    jobTitle: 'Técnico de Soporte en Terreno',
    department: 'Soporte y Atención a Usuarios',
    branchId: 'branch-providencia',
    branchName: 'Sucursal Providencia',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z'
  },
  {
    id: 'usr-auditor-01',
    rut: '13.882.114-7',
    username: 'auditor',
    fullName: 'Marcela Eugenia Soto Benítez',
    email: 'marcela.soto@ips.gob.cl',
    passwordHash: 'auditor123',
    role: 'AUDITOR_CONSULTOR',
    jobTitle: 'Auditora Senior de Control y Gestión',
    department: 'Unidad de Auditoría Interna (UAI - IPS)',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z'
  }
];

export const initialADUsers: ADUser[] = [
  {
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
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    role: 'TECNICO_BODEGA',
    isActive: true,
    lastSyncedAt: '2026-08-25T08:00:00Z'
  },
  {
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
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    role: 'FUNCIONARIO',
    isActive: true,
    lastSyncedAt: '2026-08-25T08:00:00Z'
  },
  {
    id: 'usr-rodrigo-sepulveda',
    adGuid: 'guid-003',
    samAccountName: 'rsepulveda',
    rut: '12.456.789-K',
    firstName: 'Rodrigo Ignacio',
    lastName: 'Sepúlveda Vera',
    fullName: 'Rodrigo Ignacio Sepúlveda Vera',
    email: 'rodrigo.sepulveda@chileatiende.cl',
    jobTitle: 'Jefe de Sucursal Santiago Centro',
    department: 'Dirección Regional Metropolitana',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    role: 'AUDITOR_JEFATURA',
    isActive: true,
    lastSyncedAt: '2026-08-25T08:00:00Z'
  },
  {
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
    branchId: 'branch-valparaiso',
    branchName: 'Sucursal Valparaíso (Plaza Sotomayor)',
    role: 'FUNCIONARIO',
    isActive: true,
    lastSyncedAt: '2026-08-25T08:00:00Z'
  },
  {
    id: 'usr-matias-gonzalez',
    adGuid: 'guid-005',
    samAccountName: 'mgonzalez',
    rut: '17.234.567-8',
    firstName: 'Matías Alejandro',
    lastName: 'González Riquelme',
    fullName: 'Matías Alejandro González Riquelme',
    email: 'matias.gonzalez@chileatiende.cl',
    jobTitle: 'Especialista de Soporte TI N2',
    department: 'DTI - Soporte Terreno',
    branchId: 'branch-concepcion',
    branchName: 'Sucursal Concepción Centro',
    role: 'TECNICO_BODEGA',
    isActive: true,
    lastSyncedAt: '2026-08-25T08:00:00Z'
  },
  {
    id: 'usr-daniela-castro',
    adGuid: 'guid-006',
    samAccountName: 'dcastro',
    rut: '18.345.678-2',
    firstName: 'Daniela Paz',
    lastName: 'Castro Rojas',
    fullName: 'Daniela Paz Castro Rojas',
    email: 'daniela.castro@chileatiende.cl',
    jobTitle: 'Supervisora Plataforma Web y Canales Digitales',
    department: 'División Canales de Atención',
    branchId: 'branch-providencia',
    branchName: 'Sucursal Providencia',
    role: 'FUNCIONARIO',
    isActive: true,
    lastSyncedAt: '2026-08-25T08:00:00Z'
  }
];

export const initialAssets: Asset[] = [
  // 1. Activo Propio (ChileAtiende) - Asignado a Carla Morales
  {
    id: 'ast-001',
    serialNumber: 'PF3K89LM',
    inventoryNumber: 'CA-NB-2026-00431',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 4',
    assetTypeId: 'type-notebook',
    assetTypeName: 'Notebook Corporativo',
    category: 'COMPUTO',
    propertyType: 'PROPIO',
    status: 'ASIGNADO',
    physicalCondition: 'BUENO',
    dispatchGuideId: 'guide-2026-001',
    dispatchGuideNumber: 'GD-88492',
    purchaseOrderId: 'oc-2026-001',
    purchaseOrderNumber: '6245-12-LR26',
    supplierName: 'Lenovo Chile SpA',
    currentBranchId: 'branch-santiago-centro',
    currentBranchName: 'Sucursal Santiago Centro (Alameda)',
    locationDetail: 'Módulo 4 - Atención Presencial',
    assignedToUserId: 'usr-carla-morales',
    assignedToUserName: 'Carla Andrea Morales Soto',
    assignedToUserRut: '15.678.432-1',
    assignedToUserDept: 'Atención Ciudadana y Sucursales',
    assignedDate: '2026-02-15T14:00:00Z',
    specifications: {
      cpu: 'Intel Core i5-1335U',
      ram: '16 GB DDR5',
      storage: '512 GB NVMe SSD',
      os: 'Windows 11 Enterprise'
    },
    receptionDate: '2026-02-12T11:00:00Z',
    createdAt: '2026-02-12T11:30:00Z',
    updatedAt: '2026-02-15T14:00:00Z'
  },
  // 2. Activo Propio - En Bodega Disponible
  {
    id: 'ast-002',
    serialNumber: 'PF3K89LN',
    inventoryNumber: 'CA-NB-2026-00432',
    brand: 'Lenovo',
    model: 'ThinkPad T14 Gen 4',
    assetTypeId: 'type-notebook',
    assetTypeName: 'Notebook Corporativo',
    category: 'COMPUTO',
    propertyType: 'PROPIO',
    status: 'BODEGA_DISPONIBLE',
    physicalCondition: 'NUEVO',
    dispatchGuideId: 'guide-2026-001',
    dispatchGuideNumber: 'GD-88492',
    purchaseOrderId: 'oc-2026-001',
    purchaseOrderNumber: '6245-12-LR26',
    supplierName: 'Lenovo Chile SpA',
    currentBranchId: 'branch-santiago-centro',
    currentBranchName: 'Sucursal Santiago Centro (Alameda)',
    locationDetail: 'Estante 2 - Bodega TI Piso 2',
    specifications: {
      cpu: 'Intel Core i5-1335U',
      ram: '16 GB DDR5',
      storage: '512 GB NVMe SSD',
      os: 'Windows 11 Enterprise'
    },
    receptionDate: '2026-02-12T11:00:00Z',
    createdAt: '2026-02-12T11:30:00Z',
    updatedAt: '2026-02-12T11:30:00Z'
  },
  // 3. Activo Propio - En Mantención
  {
    id: 'ast-003',
    serialNumber: '5CD1298XYZ',
    inventoryNumber: 'CA-DT-2025-00118',
    brand: 'HP',
    model: 'ProOne 440 G9 All-in-One',
    assetTypeId: 'type-desktop',
    assetTypeName: 'Desktop All-in-One',
    category: 'COMPUTO',
    propertyType: 'PROPIO',
    status: 'EN_MANTENCION',
    physicalCondition: 'REGULAR',
    dispatchGuideId: 'guide-2026-001',
    dispatchGuideNumber: 'GD-88492',
    purchaseOrderId: 'oc-2025-088',
    purchaseOrderNumber: '6245-88-SE25',
    supplierName: 'HP Inc Chile SpA',
    currentBranchId: 'branch-santiago-centro',
    currentBranchName: 'Sucursal Santiago Centro (Alameda)',
    locationDetail: 'Taller Técnico DTI - Cambio de Disco',
    specifications: {
      cpu: 'Intel Core i7-12700',
      ram: '16 GB',
      storage: '512 GB SSD'
    },
    receptionDate: '2025-11-25T10:00:00Z',
    createdAt: '2025-11-25T10:00:00Z',
    updatedAt: '2026-02-10T16:00:00Z'
  },
  // 4. Activo en Arriendo (Leasing Sonda) - Asignado a Carla Morales (Próximo a Vencer)
  {
    id: 'ast-004',
    serialNumber: 'CN4982310A',
    brand: 'Dell',
    model: 'Professional P2422H 24"',
    assetTypeId: 'type-monitor',
    assetTypeName: 'Monitor 24" IPS',
    category: 'PANTALLAS',
    propertyType: 'ARRIENDO',
    status: 'ASIGNADO',
    physicalCondition: 'BUENO',
    dispatchGuideId: 'guide-2026-002',
    dispatchGuideNumber: 'GD-55102',
    leasingContractId: 'cont-sonda-2024',
    leasingContractNumber: 'LIC-ARR-2024-MICRO',
    supplierName: 'Sonda S.A.',
    contractEndDate: '2026-09-15', // Vencimiento próximo
    currentBranchId: 'branch-santiago-centro',
    currentBranchName: 'Sucursal Santiago Centro (Alameda)',
    locationDetail: 'Módulo 4 - Puesto Atención',
    assignedToUserId: 'usr-carla-morales',
    assignedToUserName: 'Carla Andrea Morales Soto',
    assignedToUserRut: '15.678.432-1',
    assignedDate: '2026-02-15T14:00:00Z',
    receptionDate: '2026-02-19T09:45:00Z',
    createdAt: '2026-02-19T10:00:00Z',
    updatedAt: '2026-02-15T14:00:00Z'
  },
  // 5. Activo en Arriendo - En Bodega
  {
    id: 'ast-005',
    serialNumber: 'CN4982310B',
    brand: 'Dell',
    model: 'Professional P2422H 24"',
    assetTypeId: 'type-monitor',
    assetTypeName: 'Monitor 24" IPS',
    category: 'PANTALLAS',
    propertyType: 'ARRIENDO',
    status: 'BODEGA_DISPONIBLE',
    physicalCondition: 'BUENO',
    dispatchGuideId: 'guide-2026-002',
    dispatchGuideNumber: 'GD-55102',
    leasingContractId: 'cont-sonda-2024',
    leasingContractNumber: 'LIC-ARR-2024-MICRO',
    supplierName: 'Sonda S.A.',
    contractEndDate: '2026-09-15',
    currentBranchId: 'branch-santiago-centro',
    currentBranchName: 'Sucursal Santiago Centro (Alameda)',
    locationDetail: 'Rack Monitores - Bodega TI',
    receptionDate: '2026-02-19T09:45:00Z',
    createdAt: '2026-02-19T10:00:00Z',
    updatedAt: '2026-02-19T10:00:00Z'
  },
  // 6. Activo en Valparaíso - Asignado a Francisca Valenzuela
  {
    id: 'ast-006',
    serialNumber: 'PF9901KA',
    inventoryNumber: 'CA-NB-2026-00388',
    brand: 'Lenovo',
    model: 'ThinkPad L14 Gen 4',
    assetTypeId: 'type-notebook',
    assetTypeName: 'Notebook Corporativo',
    category: 'COMPUTO',
    propertyType: 'PROPIO',
    status: 'ASIGNADO',
    physicalCondition: 'BUENO',
    dispatchGuideId: 'guide-2026-001',
    dispatchGuideNumber: 'GD-88492',
    purchaseOrderId: 'oc-2026-001',
    purchaseOrderNumber: '6245-12-LR26',
    supplierName: 'Lenovo Chile SpA',
    currentBranchId: 'branch-valparaiso',
    currentBranchName: 'Sucursal Valparaíso (Plaza Sotomayor)',
    locationDetail: 'Módulo Atención Social',
    assignedToUserId: 'usr-francisca-valenzuela',
    assignedToUserName: 'Francisca Javiera Valenzuela Díaz',
    assignedToUserRut: '16.789.012-3',
    assignedDate: '2026-02-20T10:00:00Z',
    receptionDate: '2026-02-12T11:00:00Z',
    createdAt: '2026-02-12T11:30:00Z',
    updatedAt: '2026-02-20T10:00:00Z'
  }
];

export const initialConsumables: Consumable[] = [
  {
    id: 'cns-hdmi',
    sku: 'CAB-HDMI-2M',
    name: 'Cable HDMI 2.0 Ultra HD (2 metros)',
    category: 'CABLES',
    unitOfMeasure: 'UNIDAD',
    minStockAlert: 10,
    description: 'Cable reforzado trenzado para puestos de doble pantalla'
  },
  {
    id: 'cns-power-c',
    sku: 'CAB-POW-SCHUKO',
    name: 'Cable de Poder Tipo Schuko / C13 (1.8m)',
    category: 'CABLES',
    unitOfMeasure: 'UNIDAD',
    minStockAlert: 15,
    description: 'Cable de alimentación para CPU, monitores e impresoras'
  },
  {
    id: 'cns-mousepad',
    sku: 'ERG-PAD-GEL',
    name: 'Mousepad Ergonómico con Reposamuñecas Gel',
    category: 'ERGONOMIA',
    unitOfMeasure: 'UNIDAD',
    minStockAlert: 15,
    description: 'Accesorio ergonómico con logo ChileAtiende'
  },
  {
    id: 'cns-dp-hdmi',
    sku: 'ADP-DP-HDMI',
    name: 'Adaptador DisplayPort Macho a HDMI Hembra 4K',
    category: 'ADAPTADORES',
    unitOfMeasure: 'UNIDAD',
    minStockAlert: 8,
    description: 'Para conexión de segundo monitor en desktops corporativos'
  },
  {
    id: 'cns-patchcord',
    sku: 'RED-CAT6-3M',
    name: 'Patchcord de Red UTP Cat6 Azul (3 metros)',
    category: 'CABLES',
    unitOfMeasure: 'UNIDAD',
    minStockAlert: 20,
    description: 'Conectividad a rosetas de datos en módulos de atención'
  },
  {
    id: 'cns-keyboard-gen',
    sku: 'PRF-KEY-USB',
    name: 'Teclado USB Estándar Español Chile',
    category: 'PERIFERICOS_SIMPLES',
    unitOfMeasure: 'UNIDAD',
    minStockAlert: 10,
    description: 'Teclado numérico estándar no serializado'
  }
];

export const initialConsumableStocks: ConsumableStock[] = [
  { id: 'stk-1', consumableId: 'cns-hdmi', branchId: 'branch-santiago-centro', branchName: 'Sucursal Santiago Centro (Alameda)', currentQuantity: 4, lastUpdated: '2026-08-25T10:00:00Z' }, // Alerta crítica (<10)
  { id: 'stk-2', consumableId: 'cns-power-c', branchId: 'branch-santiago-centro', branchName: 'Sucursal Santiago Centro (Alameda)', currentQuantity: 28, lastUpdated: '2026-08-25T10:00:00Z' },
  { id: 'stk-3', consumableId: 'cns-mousepad', branchId: 'branch-santiago-centro', branchName: 'Sucursal Santiago Centro (Alameda)', currentQuantity: 6, lastUpdated: '2026-08-25T10:00:00Z' }, // Alerta crítica (<15)
  { id: 'stk-4', consumableId: 'cns-dp-hdmi', branchId: 'branch-santiago-centro', branchName: 'Sucursal Santiago Centro (Alameda)', currentQuantity: 14, lastUpdated: '2026-08-25T10:00:00Z' },
  { id: 'stk-5', consumableId: 'cns-patchcord', branchId: 'branch-santiago-centro', branchName: 'Sucursal Santiago Centro (Alameda)', currentQuantity: 42, lastUpdated: '2026-08-25T10:00:00Z' },
  { id: 'stk-6', consumableId: 'cns-keyboard-gen', branchId: 'branch-santiago-centro', branchName: 'Sucursal Santiago Centro (Alameda)', currentQuantity: 3, lastUpdated: '2026-08-25T10:00:00Z' } // Alerta crítica (<10)
];

export const initialStockMovements: StockMovement[] = [
  {
    id: 'mov-001',
    consumableId: 'cns-hdmi',
    consumableName: 'Cable HDMI 2.0 Ultra HD (2 metros)',
    sku: 'CAB-HDMI-2M',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    movementType: 'INGRESO_GUIA',
    quantity: 20,
    previousQuantity: 0,
    newQuantity: 20,
    dispatchGuideNumber: 'GD-88492',
    registeredByUserName: 'Andrés Felipe Navarro Toro',
    reason: 'Ingreso inicial por reposición de insumos',
    timestamp: '2026-02-12T12:00:00Z'
  },
  {
    id: 'mov-002',
    consumableId: 'cns-hdmi',
    consumableName: 'Cable HDMI 2.0 Ultra HD (2 metros)',
    sku: 'CAB-HDMI-2M',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    movementType: 'ENTREGA_FUNCIONARIO',
    quantity: 1,
    previousQuantity: 20,
    newQuantity: 19,
    assignmentActNumber: 'ACT-2026-00042',
    recipientUserName: 'Carla Andrea Morales Soto',
    registeredByUserName: 'Andrés Felipe Navarro Toro',
    reason: 'Asignación de puesto de trabajo',
    timestamp: '2026-02-15T14:00:00Z'
  }
];

export const initialAssignments: Assignment[] = [
  {
    id: 'asg-001',
    actNumber: 'ACT-2026-00042',
    assignmentType: 'ENTREGA_INICIAL',
    recipientUserId: 'usr-carla-morales',
    recipientName: 'Carla Andrea Morales Soto',
    recipientRut: '15.678.432-1',
    recipientEmail: 'carla.morales@chileatiende.cl',
    recipientJobTitle: 'Ejecutiva de Atención Integral',
    recipientDepartment: 'Atención Ciudadana y Sucursales',
    recipientBranchName: 'Sucursal Santiago Centro (Alameda)',
    technicianUserId: 'usr-andres-navarro',
    technicianName: 'Andrés Felipe Navarro Toro',
    technicianRut: '14.890.321-4',
    branchId: 'branch-santiago-centro',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    status: 'FIRMADO_DIGITAL',
    items: [
      {
        id: 'asg-item-1',
        assignmentId: 'asg-001',
        assetId: 'ast-001',
        serialNumber: 'PF3K89LM',
        inventoryNumber: 'CA-NB-2026-00431',
        brand: 'Lenovo',
        model: 'ThinkPad T14 Gen 4',
        assetTypeName: 'Notebook Corporativo',
        propertyType: 'PROPIO',
        conditionAtAssignment: 'BUENO',
        quantity: 1,
        isReturned: false
      },
      {
        id: 'asg-item-2',
        assignmentId: 'asg-001',
        assetId: 'ast-004',
        serialNumber: 'CN4982310A',
        brand: 'Dell',
        model: 'Professional P2422H 24"',
        assetTypeName: 'Monitor 24" IPS',
        propertyType: 'ARRIENDO',
        conditionAtAssignment: 'BUENO',
        quantity: 1,
        isReturned: false
      },
      {
        id: 'asg-item-3',
        assignmentId: 'asg-001',
        consumableId: 'cns-hdmi',
        consumableSku: 'CAB-HDMI-2M',
        consumableName: 'Cable HDMI 2.0 Ultra HD (2 metros)',
        quantity: 1,
        conditionAtAssignment: 'BUENO',
        isReturned: false
      },
      {
        id: 'asg-item-4',
        assignmentId: 'asg-001',
        consumableId: 'cns-mousepad',
        consumableSku: 'ERG-PAD-GEL',
        consumableName: 'Mousepad Ergonómico con Reposamuñecas Gel',
        quantity: 1,
        conditionAtAssignment: 'BUENO',
        isReturned: false
      }
    ],
    signedByName: 'Carla Andrea Morales Soto',
    digitalSignatureHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    observations: 'Entrega conforme de equipamiento para módulo presencial.',
    createdAt: '2026-02-15T13:45:00Z',
    signedAt: '2026-02-15T14:05:00Z'
  }
];

export const initialAuditLogs: AssetAuditLog[] = [
  {
    id: 'aud-001',
    assetId: 'ast-001',
    serialNumber: 'PF3K89LM',
    inventoryNumber: 'CA-NB-2026-00431',
    timestamp: '2026-02-12T11:30:00Z',
    previousStatus: undefined,
    newStatus: 'BODEGA_DISPONIBLE',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    changedByUserName: 'Andrés Felipe Navarro Toro',
    changeReason: 'Ingreso inicial a bodega con Guía GD-88492 y OC 6245-12-LR26',
    documentRef: 'GD-88492'
  },
  {
    id: 'aud-002',
    assetId: 'ast-001',
    serialNumber: 'PF3K89LM',
    inventoryNumber: 'CA-NB-2026-00431',
    timestamp: '2026-02-15T14:05:00Z',
    previousStatus: 'BODEGA_DISPONIBLE',
    newStatus: 'ASIGNADO',
    newUserId: 'usr-carla-morales',
    newUserName: 'Carla Andrea Morales Soto',
    branchName: 'Sucursal Santiago Centro (Alameda)',
    changedByUserName: 'Andrés Felipe Navarro Toro',
    changeReason: 'Asignación mediante Acta de Entrega ACT-2026-00042',
    documentRef: 'ACT-2026-00042'
  }
];
