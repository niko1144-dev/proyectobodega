/**
 * ============================================================================
 * SCRIPT ETL DEFINITIVO: MIGRACIÓN Y CARGA DE INVENTARIO GENERAL TI OPTIMIZADO
 * Archivo: backend/Inventario_General_TI_optimizado.xlsx
 * Base de Datos: PostgreSQL 17 local vía Prisma ORM
 * ============================================================================
 */

import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import { fileURLToPath } from 'url';
import { 
  PrismaClient, 
  AssetPropertyType, 
  AssetStatus, 
  PhysicalCondition, 
  DeviceCategory,
  StockMovementType,
  AssignmentStatus,
  AssignmentType
} from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
  log: ['error']
});

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN Y AYUDA
// ============================================================================

export function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeText(text: string): string {
  return cleanString(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

export function normalizeSerial(val: any): string {
  const cleaned = cleanString(val)
    .replace(/^['"`\s]+|['"`\s]+$/g, '')
    .replace(/^s\/n\s*[:-]?\s*/i, '')
    .toUpperCase();

  const invalidTokens = ['S/N', 'SN', 'S/S', 'SIN SERIE', 'SINSERIE', 'N/A', 'NA', 'NO', '0', '-', '.', 'NONE', 'SD'];
  if (!cleaned || invalidTokens.includes(cleaned) || cleaned.length < 2) {
    return '';
  }

  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ').map(p => p.trim());
    return parts[0];
  }

  return cleaned;
}

export function normalizeInventoryNumber(val: any): string {
  const cleaned = cleanString(val).toUpperCase();
  const invalidTokens = ['S/N', 'S/I', 'SIN INVENTARIO', 'N/A', 'NA', '0', '-', '.', 'SD'];
  if (!cleaned || invalidTokens.includes(cleaned)) {
    return '';
  }
  return cleaned;
}

export function parseExcelDate(val: any): Date {
  if (val === null || val === undefined || val === '') return new Date('2026-08-01');

  if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('/'))) {
    const num = Number(val);
    if (num > 20000 && num < 70000) {
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const date = new Date(ms);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2015 && date.getFullYear() <= 2035) {
        return date;
      }
    }
  }

  const str = cleanString(val);
  if (!str) return new Date('2026-08-01');

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date('2026-08-01');
}

export function extractBrandAndModel(rawCategory: string, rawModel: string, rawType: string): { brand: string; model: string } {
  const combined = `${rawCategory} ${rawModel} ${rawType}`.toUpperCase();

  let brand = 'Genérico';
  if (combined.includes('LENOVO') || combined.includes('THINKPAD') || combined.includes('THINKCENTRE')) brand = 'Lenovo';
  else if (combined.includes('APPLE') || combined.includes('MACBOOK') || combined.includes('IMAC') || combined.includes('IPAD')) brand = 'Apple';
  else if (combined.includes('HP') || combined.includes('HEWLETT') || combined.includes('PROBOOK') || combined.includes('ELITEBOOK')) brand = 'HP';
  else if (combined.includes('DELL') || combined.includes('LATITUDE') || combined.includes('OPTIPLEX')) brand = 'Dell';
  else if (combined.includes('SAMSUNG')) brand = 'Samsung';
  else if (combined.includes('LG')) brand = 'LG';
  else if (combined.includes('VIEWSONIC')) brand = 'ViewSonic';
  else if (combined.includes('BROTHER')) brand = 'Brother';
  else if (combined.includes('CISCO')) brand = 'Cisco';
  else if (combined.includes('KENSINGTON')) brand = 'Kensington';
  else if (combined.includes('SPEKTRA')) brand = 'Spektra';
  else if (combined.includes('IFFALCON') || combined.includes('TCL')) brand = 'iFFALCON';
  else if (combined.includes('JVC')) brand = 'JVC';
  else if (combined.includes('LOGITECH')) brand = 'Logitech';
  else if (combined.includes('GENIUS')) brand = 'Genius';
  else if (combined.includes('KINGSTON')) brand = 'Kingston';
  else if (combined.includes('WESTERN DIGITAL') || combined.includes('WD ')) brand = 'Western Digital';
  else if (combined.includes('SEAGATE')) brand = 'Seagate';
  else if (combined.includes('SANDISK')) brand = 'SanDisk';
  else if (combined.includes('CANON')) brand = 'Canon';
  else if (combined.includes('EPSON')) brand = 'Epson';
  else if (combined.includes('KYOCERA')) brand = 'Kyocera';
  else if (combined.includes('ADAM ELEMENT')) brand = 'Adam Elements';
  else if (combined.includes('D-LINK') || combined.includes('DLINK')) brand = 'D-Link';
  else if (combined.includes('STARTECH')) brand = 'StarTech';
  else if (combined.includes('HYPER')) brand = 'Hyper';
  else if (combined.includes('PLANTRONIC') || combined.includes('POLY')) brand = 'Plantronics';

  let model = cleanString(rawModel) || cleanString(rawCategory) || 'Modelo Estándar';
  
  // Limpiar prefijo de marca redundante si está al inicio
  model = model.replace(new RegExp(`^${brand}\\s*`, 'i'), '').trim();
  if (!model) model = `${brand} Hardware`;

  return { brand, model };
}

export function resolveCategoryAndAssetType(rawCategory: string, rawModel: string, rawType: string): { typeName: string; category: DeviceCategory; isConsumable: boolean } {
  const combined = `${rawCategory} ${rawModel} ${rawType}`.toUpperCase();

  // 1. Pantallas y Televisores
  if (combined.includes('MONITOR') || combined.includes('PANTALLA')) {
    return { typeName: 'Monitores LED / IPS', category: DeviceCategory.PANTALLAS, isConsumable: false };
  }
  if (combined.includes('TELEVISOR') || combined.includes('SMART TV') || combined.includes('TV ')) {
    return { typeName: 'Smart TVs & Pantallas', category: DeviceCategory.PANTALLAS, isConsumable: false };
  }
  if (combined.includes('PROYECTOR') || combined.includes('TELON')) {
    return { typeName: 'Proyectores Digitales', category: DeviceCategory.PANTALLAS, isConsumable: false };
  }

  // 2. Cómputo (Laptops, All-in-One, Mac, iPad)
  if (combined.includes('MACBOOK') || combined.includes('MAC BOOK') || combined.includes('M1') || combined.includes('M2') || combined.includes('M3') || combined.includes('IMAC')) {
    return { typeName: 'MacBooks Apple', category: DeviceCategory.COMPUTO, isConsumable: false };
  }
  if (combined.includes('IPAD') || combined.includes('TABLET')) {
    return { typeName: 'iPads & Tablets', category: DeviceCategory.COMPUTO, isConsumable: false };
  }
  if (combined.includes('AIO') || combined.includes('ALL IN ONE') || combined.includes('ALL-IN-ONE') || combined.includes('THINKCENTRE') || combined.includes('M70Q') || combined.includes('M90A') || combined.includes('NEO 50')) {
    return { typeName: 'Equipos All-in-One (AIO)', category: DeviceCategory.COMPUTO, isConsumable: false };
  }
  if (combined.includes('NOTEBOOK') || combined.includes('LAPTOP') || combined.includes('THINKPAD') || combined.includes('PROBOOK') || combined.includes('ELITEBOOK') || combined.includes('EQUIPOS WINDOWS')) {
    return { typeName: 'Notebooks Corporativos', category: DeviceCategory.COMPUTO, isConsumable: false };
  }

  // 3. Impresión y Digitalización
  if (combined.includes('IMPRESORA') || combined.includes('ESCANER') || combined.includes('SCANNER') || combined.includes('BROTHER') || combined.includes('EPSON')) {
    return { typeName: 'Impresoras & Escáneres', category: DeviceCategory.IMPRESION, isConsumable: false };
  }

  // 4. Redes y Telecomunicaciones
  if (combined.includes('SWITCH') || combined.includes('ROUTER') || combined.includes('ACCESS POINT') || combined.includes('TELEFONO IP') || combined.includes('CISCO')) {
    return { typeName: 'Equipos de Red & Switches', category: DeviceCategory.REDES, isConsumable: false };
  }

  // 5. Periféricos y Biometría
  if (combined.includes('HUELLERO') || combined.includes('BIOMETR') || combined.includes('U4500')) {
    return { typeName: 'Huelleros & Biometría', category: DeviceCategory.PERIFERICOS_BIOMETRIA, isConsumable: false };
  }
  if (combined.includes('DISCO') || combined.includes('PENDRIVE') || combined.includes('SSD') || combined.includes('NVME')) {
    return { typeName: 'Discos Externos & Almacenamiento', category: DeviceCategory.COMPUTO, isConsumable: false };
  }
  if (combined.includes('TECLADO') || combined.includes('MOUSE')) {
    return { typeName: 'Teclados & Mouse Serializados', category: DeviceCategory.PERIFERICOS_BIOMETRIA, isConsumable: false };
  }
  if (combined.includes('HUB ') || combined.includes('DOCK')) {
    return { typeName: 'Hubs & Docks Serializados', category: DeviceCategory.PERIFERICOS_BIOMETRIA, isConsumable: false };
  }

  // 6. Insumos y accesorios menores
  if (
    combined.includes('CABLE') ||
    combined.includes('ADAPTADOR') ||
    combined.includes('ALZADOR') ||
    combined.includes('AUDIFONO') ||
    combined.includes('CANDADO') ||
    combined.includes('CARCASA') ||
    combined.includes('FUNDA') ||
    combined.includes('CARGADOR') ||
    combined.includes('MOCHILA') ||
    combined.includes('TONER') ||
    combined.includes('TONNER') ||
    combined.includes('INSUMO')
  ) {
    return { typeName: 'Insumos & Periféricos Menores', category: DeviceCategory.PERIFERICOS_BIOMETRIA, isConsumable: true };
  }

  return { typeName: 'Equipamiento TI General', category: DeviceCategory.COMPUTO, isConsumable: false };
}

export function mapBranchCode(locationRaw: string, buildingRaw: string): string {
  const combined = `${locationRaw} ${buildingRaw}`.toUpperCase();

  if (combined.includes('HUERFANOS') || combined.includes('HUÉRFANOS')) return 'BOD-RM-HUE';
  if (combined.includes('SANTO DOMINGO') || combined.includes('SANTO DOMIMGO') || combined.includes('SANTO DOMIGO')) return 'BOD-RM-STD';
  if (combined.includes('AGRICOLA') || combined.includes('AGRÍCOLA') || combined.includes('SAN JOAQUIN')) return 'BOD-RM-AGR';
  if (combined.includes('CALL CENTER') || combined.includes('LETELIER')) return 'BOD-RM-CC';
  if (combined.includes('LAS CONDES')) return 'BOD-RM-LCO';
  if (combined.includes('VALPARAISO') || combined.includes('VALPARAÍSO') || combined.includes('VIÑA')) return 'BOD-REG-VAL';
  if (combined.includes('CONCEPCION') || combined.includes('CONCEPCIÓN') || combined.includes('BIOBIO') || combined.includes('BIO BIO') || combined.includes('ARAUCO')) return 'BOD-REG-BIO';
  if (combined.includes('CHILLAN') || combined.includes('CHILLÁN') || combined.includes('NUBLE') || combined.includes('ÑUBLE') || combined.includes('QUIRIHUE')) return 'BOD-REG-NUB';
  if (combined.includes('VALDIVIA') || combined.includes('LOS RIOS') || combined.includes('LOS RÍOS')) return 'BOD-REG-RIV';
  if (combined.includes('PUERTO MONTT') || combined.includes('LOS LAGOS')) return 'BOD-REG-LOS';
  if (combined.includes('TEMUCO') || combined.includes('ARAUCANIA') || combined.includes('ARAUCANÍA')) return 'BOD-REG-ARA';
  if (combined.includes('ANTOFAGASTA')) return 'BOD-REG-ANT';
  if (combined.includes('LA SERENA') || combined.includes('COQUIMBO')) return 'BOD-REG-COQ';
  if (combined.includes('TALCA') || combined.includes('MAULE')) return 'BOD-REG-MAU';
  if (combined.includes('RANCAGUA') || combined.includes('O\'HIGGINS') || combined.includes('OHIGGINS')) return 'BOD-REG-OHI';
  if (combined.includes('ARICA')) return 'BOD-REG-ARI';
  if (combined.includes('PUNTA ARENAS') || combined.includes('MAGALLANES')) return 'BOD-REG-MAG';

  return 'BOD-RM-ALA'; // Default Central Alameda
}

// ============================================================================
// PROCESO ETL PRINCIPAL
// ============================================================================

async function main() {
  const startTime = Date.now();
  console.log('\n🚀 ========================================================================');
  console.log('ETL: VACIADO DE DATOS TEMPORALES Y CARGA DE INVENTARIO TI OPTIMIZADO');
  console.log('========================================================================\n');

  // 1. VACIADO DE TABLAS TEMPORALES
  console.log('🧹 Paso 1: Purgando datos temporales de la base de datos...');
  
  await prisma.userADCache.updateMany({ data: { branchId: null } });
  await prisma.platformUser.updateMany({ data: { branchId: null, assignedBranchIds: [] } });

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

  // Asegurar cuenta admin
  await prisma.platformUser.deleteMany({ where: { username: { not: 'admin' } } });
  await prisma.platformUser.upsert({
    where: { username: 'admin' },
    update: {
      rut: '14.238.990-1',
      fullName: 'Patricio Alejandro Silva Valenzuela',
      email: 'patricio.silva@chileatiende.cl',
      passwordHash: 'admin123',
      role: 'ADMIN_TI',
      jobTitle: 'Jefe de Infraestructura & ITAM DTI',
      department: 'División Tecnologías de la Información',
      branchId: null,
      assignedBranchIds: [],
      isActive: true
    },
    create: {
      id: 'usr-admin-01',
      rut: '14.238.990-1',
      username: 'admin',
      fullName: 'Patricio Alejandro Silva Valenzuela',
      email: 'patricio.silva@chileatiende.cl',
      passwordHash: 'admin123',
      role: 'ADMIN_TI',
      jobTitle: 'Jefe de Infraestructura & ITAM DTI',
      department: 'División Tecnologías de la Información',
      branchId: null,
      assignedBranchIds: [],
      isActive: true
    }
  });

  console.log('✓ Base de datos purgada. Cuenta admin asegurada.');

  // 2. CREACIÓN DE SUCURSALES / BODEGAS OFICIALES
  console.log('🏢 Paso 2: Creando catálogo oficial de bodegas y sucursales...');
  const branchesSeed = [
    { code: 'BOD-RM-ALA', name: 'Bodega Central Alameda (Santiago Centro)', region: 'Región Metropolitana', commune: 'Santiago', address: 'Av. Libertador Bernardo O\'Higgins 1353' },
    { code: 'BOD-RM-HUE', name: 'Bodega Huérfanos (Edificio Central)', region: 'Región Metropolitana', commune: 'Santiago', address: 'Huérfanos 1189' },
    { code: 'BOD-RM-STD', name: 'Bodega Santo Domingo (Pisos 2 al 9)', region: 'Región Metropolitana', commune: 'Santiago', address: 'Santo Domingo 1160' },
    { code: 'BOD-RM-AGR', name: 'Bodega Camino Agrícola (San Joaquín)', region: 'Región Metropolitana', commune: 'San Joaquín', address: 'Av. Vicuña Mackenna 4917' },
    { code: 'BOD-RM-CC', name: 'Bodega Call Center Central (Valentín Letelier)', region: 'Región Metropolitana', commune: 'Santiago', address: 'Valentín Letelier 1376' },
    { code: 'BOD-RM-LCO', name: 'Sucursal Las Condes', region: 'Región Metropolitana', commune: 'Las Condes', address: 'Av. Apoquindo 4501' },
    { code: 'BOD-REG-VAL', name: 'Bodega Regional Valparaíso / Viña', region: 'Región de Valparaíso', commune: 'Valparaíso', address: 'Brasil 1265' },
    { code: 'BOD-REG-BIO', name: 'Bodega Regional Concepción / Biobío', region: 'Región del Biobío', commune: 'Concepción', address: 'Castellón 435' },
    { code: 'BOD-REG-NUB', name: 'Bodega Regional Chillán / Ñuble', region: 'Región de Ñuble', commune: 'Chillán', address: '18 de Septiembre 580' },
    { code: 'BOD-REG-RIV', name: 'Bodega Regional Valdivia / Los Ríos', region: 'Región de Los Ríos', commune: 'Valdivia', address: 'Camilo Henríquez 650' },
    { code: 'BOD-REG-LOS', name: 'Bodega Regional Puerto Montt / Los Lagos', region: 'Región de Los Lagos', commune: 'Puerto Montt', address: 'Urmeneta 560' },
    { code: 'BOD-REG-ARA', name: 'Bodega Regional Temuco / Araucanía', region: 'Región de La Araucanía', commune: 'Temuco', address: 'Bulnes 450' },
    { code: 'BOD-REG-ANT', name: 'Bodega Regional Antofagasta', region: 'Región de Antofagasta', commune: 'Antofagasta', address: 'Sucre 325' },
    { code: 'BOD-REG-COQ', name: 'Bodega Regional La Serena / Coquimbo', region: 'Región de Coquimbo', commune: 'La Serena', address: 'Francisco de Aguirre 350' },
    { code: 'BOD-REG-MAU', name: 'Bodega Regional Talca / Maule', region: 'Región del Maule', commune: 'Talca', address: '1 Sur 890' },
    { code: 'BOD-REG-OHI', name: 'Bodega Regional Rancagua / O\'Higgins', region: 'Región de O\'Higgins', commune: 'Rancagua', address: 'Campos 240' },
    { code: 'BOD-REG-ARI', name: 'Bodega Regional Arica y Parinacota', region: 'Región de Arica y Parinacota', commune: 'Arica', address: '21 de Mayo 432' },
    { code: 'BOD-REG-MAG', name: 'Bodega Regional Punta Arenas / Magallanes', region: 'Región de Magallanes', commune: 'Punta Arenas', address: 'Bories 901' }
  ];

  const branchMap = new Map<string, typeof branchesSeed[0] & { id: string }>();
  for (const b of branchesSeed) {
    const created = await prisma.branch.create({ data: b });
    branchMap.set(b.code, created);
  }
  console.log(`✓ ${branchMap.size} sucursales/bodegas creadas.`);

  // 3. CREACIÓN DE TIPOS DE HARDWARE
  console.log('🏷️ Paso 3: Creando tipos y categorías de hardware...');
  const assetTypesSeed = [
    { name: 'Notebooks Corporativos', category: DeviceCategory.COMPUTO, requiresInventoryNumber: true, iconName: 'Laptop' },
    { name: 'Equipos All-in-One (AIO)', category: DeviceCategory.COMPUTO, requiresInventoryNumber: true, iconName: 'Monitor' },
    { name: 'iPads & Tablets', category: DeviceCategory.COMPUTO, requiresInventoryNumber: true, iconName: 'Tablet' },
    { name: 'MacBooks Apple', category: DeviceCategory.COMPUTO, requiresInventoryNumber: true, iconName: 'Laptop' },
    { name: 'Monitores LED / IPS', category: DeviceCategory.PANTALLAS, requiresInventoryNumber: true, iconName: 'Monitor' },
    { name: 'Smart TVs & Pantallas', category: DeviceCategory.PANTALLAS, requiresInventoryNumber: true, iconName: 'Tv' },
    { name: 'Proyectores Digitales', category: DeviceCategory.PANTALLAS, requiresInventoryNumber: true, iconName: 'Projector' },
    { name: 'Impresoras & Escáneres', category: DeviceCategory.IMPRESION, requiresInventoryNumber: true, iconName: 'Printer' },
    { name: 'Equipos de Red & Switches', category: DeviceCategory.REDES, requiresInventoryNumber: true, iconName: 'Network' },
    { name: 'Huelleros & Biometría', category: DeviceCategory.PERIFERICOS_BIOMETRIA, requiresInventoryNumber: true, iconName: 'Fingerprint' },
    { name: 'Discos Externos & Almacenamiento', category: DeviceCategory.COMPUTO, requiresInventoryNumber: true, iconName: 'HardDrive' },
    { name: 'Teclados & Mouse Serializados', category: DeviceCategory.PERIFERICOS_BIOMETRIA, requiresInventoryNumber: false, iconName: 'Keyboard' },
    { name: 'Hubs & Docks Serializados', category: DeviceCategory.PERIFERICOS_BIOMETRIA, requiresInventoryNumber: false, iconName: 'Layers' },
    { name: 'Insumos & Periféricos Menores', category: DeviceCategory.PERIFERICOS_BIOMETRIA, requiresInventoryNumber: false, iconName: 'Cable' },
    { name: 'Equipamiento TI General', category: DeviceCategory.COMPUTO, requiresInventoryNumber: false, iconName: 'Box' }
  ];

  const typeMap = new Map<string, string>(); // name -> id
  for (const t of assetTypesSeed) {
    const created = await prisma.assetType.create({ data: t });
    typeMap.set(t.name, created.id);
  }
  console.log(`✓ ${typeMap.size} tipos de hardware registrados.`);

  // 4. PROVEEDORES, CONTRATOS, OC Y GUÍAS DE DESPACHO
  console.log('📑 Paso 4: Creando proveedores, órdenes de compra y licitaciones de respaldo...');
  
  const supplierSeed = [
    { rut: '76.123.456-7', businessName: 'Proveedor Central Convenio Marco ChileCompra', contactName: 'Mesa Convenio Marco', contactEmail: 'convenios@chileatiende.cl' },
    { rut: '96.556.780-K', businessName: 'Lenovo Chile S.A.', contactName: 'Ejecutivo Cuentas Gobierno', contactEmail: 'ventasgob@lenovo.cl' },
    { rut: '77.234.567-8', businessName: 'Apple Chile Comercializadora Ltda.', contactName: 'Canal Empresas & Gobierno', contactEmail: 'gobierno@apple.cl' },
    { rut: '76.890.123-4', businessName: 'Sonda S.A. (Licitación Arriendo TI)', contactName: 'Administrador de Contrato', contactEmail: 'itam.sonda@sonda.com' },
    { rut: '76.345.678-9', businessName: 'Insumos Tecnológicos del Sur Ltda.', contactName: 'Despachos Regionales', contactEmail: 'contacto@insumossur.cl' }
  ];

  const supplierMap = new Map<string, string>();
  for (const s of supplierSeed) {
    const created = await prisma.supplier.create({ data: s });
    supplierMap.set(s.businessName, created.id);
  }

  // Orden de Compra Estándar
  const mainPO = await prisma.purchaseOrder.create({
    data: {
      ocNumber: 'OC-2026-CHILECOMPRA-DTI',
      supplierId: supplierMap.get('Proveedor Central Convenio Marco ChileCompra')!,
      description: 'Adquisición y reposición anual de equipamiento TI e infraestructura de cómputo para oficinas IPS y ChileAtiende',
      orderDate: new Date('2026-01-15'),
      totalAmountCLP: 185000000
    }
  });

  // Contrato de Arriendo TI
  const mainLeasing = await prisma.leasingContract.create({
    data: {
      contractNumber: 'LIC-2024-ARRIENDO-SONDA-48M',
      name: 'Licitación Pública Arriendo de Parque Informático y Soporte On-Site DTI (48 Meses)',
      supplierId: supplierMap.get('Sonda S.A. (Licitación Arriendo TI)')!,
      startDate: new Date('2024-03-01'),
      endDate: new Date('2028-03-01'),
      warningDaysThreshold: 60
    }
  });

  // Guía de Despacho Oficial de Carga Inicial
  const mainGuide = await prisma.dispatchGuide.create({
    data: {
      guideNumber: 'GD-INVENTARIO-TI-OPTIMIZADO-2026',
      supplierId: supplierMap.get('Proveedor Central Convenio Marco ChileCompra')!,
      purchaseOrderId: mainPO.id,
      leasingContractId: mainLeasing.id,
      branchId: branchMap.get('BOD-RM-ALA')!.id,
      dispatchDate: new Date('2026-08-01'),
      receptionDate: new Date('2026-08-27'),
      receivedByUserId: 'usr-admin-01',
      receivedByUserName: 'Patricio Alejandro Silva Valenzuela',
      totalItemsCount: 2495,
      observations: 'Carga masiva consolidada desde Inventario_General_TI_optimizado.xlsx'
    }
  });

  console.log('✓ Documentos de respaldo e ingreso vinculados.');

  // 5. INDEXACIÓN DE FUNCIONARIOS ACTIVE DIRECTORY
  console.log('👥 Paso 5: Indexando catálogo de funcionarios Active Directory...');
  const adUsers = await prisma.userADCache.findMany({
    select: { id: true, fullName: true, samAccountName: true, rut: true, email: true, department: true }
  });
  console.log(`✓ ${adUsers.length} funcionarios cargados desde la base de datos.`);

  const userByNormalizedName = new Map<string, typeof adUsers[0]>();
  for (const u of adUsers) {
    userByNormalizedName.set(normalizeText(u.fullName), u);
    const parts = u.fullName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      userByNormalizedName.set(normalizeText(`${parts[0]} ${parts[parts.length - 1]}`), u);
      userByNormalizedName.set(normalizeText(`${parts[0]} ${parts[1]}`), u);
    }
  }

  // Helper para buscar o crear funcionario legacy
  async function resolveOrRegisterUser(rawName: string, building: string, branchName: string): Promise<typeof adUsers[0]> {
    const norm = normalizeText(rawName);
    let found = userByNormalizedName.get(norm);

    if (!found) {
      // Búsqueda por inclusión de tokens
      const tokens = rawName.split(' ').filter(Boolean).map(normalizeText);
      const candidates = adUsers.filter(u => {
        const uNorm = normalizeText(u.fullName);
        return tokens.every(t => uNorm.includes(t));
      });
      if (candidates.length === 1) {
        found = candidates[0];
      }
    }

    if (found) return found;

    // Si no existe en el AD actual, crear registro histórico para mantener 100% integridad relacional
    const uniqueSuffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const baseAccount = norm.replace(/[^a-z0-9]/g, '.').slice(0, 15) || 'legacy.user';
    const cleanUserStr = `${baseAccount}.${uniqueSuffix}`;
    const fakeEmail = `${baseAccount}@chileatiende.cl`;
    const randomRutNum = Math.floor(10000000 + Math.random() * 89999999);
    const fakeRut = `${randomRutNum}-${Math.floor(Math.random() * 9)}`;

    const newUser = await prisma.userADCache.create({
      data: {
        adGuid: `legacy-guid-${uniqueSuffix}`,
        samAccountName: cleanUserStr,
        rut: fakeRut,
        firstName: rawName.split(' ')[0] || 'Funcionario',
        lastName: rawName.split(' ').slice(1).join(' ') || 'ChileAtiende',
        fullName: cleanString(rawName),
        email: fakeEmail,
        jobTitle: 'Funcionario Receptor Asignado',
        department: building || branchName || 'Dirección Nacional',
        role: 'FUNCIONARIO',
        isActive: true
      }
    });

    userByNormalizedName.set(norm, newUser);
    return newUser;
  }

  // 6. LECTURA Y PROCESAMIENTO DE LA HOJA BASE
  const excelPath = path.resolve(__dirname, '../Inventario_General_TI_optimizado.xlsx');
  console.log(`\n📊 Paso 6: Leyendo archivo maestro: ${excelPath}`);
  
  const workbook = XLSX.readFile(excelPath);
  const baseSheet = workbook.Sheets['BASE'];
  if (!baseSheet) {
    throw new Error('No se encontró la hoja BASE en el archivo Excel.');
  }

  const rows = XLSX.utils.sheet_to_json(baseSheet, { defval: '' }) as any[];
  console.log(`✓ Total de registros en hoja BASE: ${rows.length}`);

  const usedSerials = new Set<string>();
  const usedInvs = new Set<string>();
  const consumableAggregator = new Map<string, { name: string; sku: string; category: string; branchCounts: Map<string, number> }>();

  let assetsCreated = 0;
  let assignmentsCreated = 0;

  console.log('🔄 Procesando registros e insertando en PostgreSQL...');

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rawId = cleanString(row['ID']) || `TI-${String(i + 1).padStart(4, '0')}`;
    const rawCategory = cleanString(row['CATEGORÍA']) || 'EQUIPAMIENTO';
    const rawModel = cleanString(row['MODELO']) || 'Modelo Estándar';
    const rawType = cleanString(row['TIPO']) || 'EQUIPO';
    const rawSerial = cleanString(row['N° SERIE']);
    const rawInv = cleanString(row['N° INVENTARIO']);
    const rawAcq = cleanString(row['ADQUISICIÓN']).toUpperCase();
    const rawStatus = cleanString(row['ESTADO']).toUpperCase();
    const rawLocation = cleanString(row['UBICACIÓN FÍSICA']);
    const rawAssignedTo = cleanString(row['ASIGNADO A']);
    const rawBuilding = cleanString(row['EDIFICIO']);
    const rawUnit = cleanString(row['UNIDAD OPERATIVA']);
    const rawObs = cleanString(row['OBSERVACIÓN']);
    const rawAlert = cleanString(row['ALERTA']);
    const dateIngreso = parseExcelDate(row['FECHA INGRESO']);
    const dateSalida = parseExcelDate(row['FECHA ENTREGA/SALIDA']);

    // 1. Marca y Modelo
    const { brand, model } = extractBrandAndModel(rawCategory, rawModel, rawType);

    // 2. Tipo y Categoría
    const { typeName, category, isConsumable } = resolveCategoryAndAssetType(rawCategory, rawModel, rawType);
    const assetTypeId = typeMap.get(typeName) || typeMap.get('Equipamiento TI General')!;

    // 3. Número de Serie Único
    let cleanSerial = normalizeSerial(rawSerial);
    if (!cleanSerial || usedSerials.has(cleanSerial)) {
      cleanSerial = cleanSerial ? `${cleanSerial}-${rawId}` : `SN-${rawId}`;
    }
    usedSerials.add(cleanSerial);

    // 4. Número de Inventario Único
    let cleanInv: string | null = normalizeInventoryNumber(rawInv) || null;
    if (cleanInv && usedInvs.has(cleanInv)) {
      cleanInv = `${cleanInv}-${rawId}`;
    }
    if (cleanInv) usedInvs.add(cleanInv);

    // 5. Estado Operativo
    let status: AssetStatus = AssetStatus.BODEGA_DISPONIBLE;
    if (rawStatus === 'ASIGNADO' || rawStatus === 'PRESTADO' || rawAssignedTo) {
      status = AssetStatus.ASIGNADO;
    } else if (rawStatus === 'DE BAJA') {
      status = AssetStatus.DADO_DE_BAJA;
    } else if (rawStatus === 'MANTENCIÓN' || rawStatus === 'MANTENCION') {
      status = AssetStatus.EN_MANTENCION;
    } else if (rawStatus === 'DEVUELTO') {
      status = AssetStatus.DEVUELTO_PROVEEDOR;
    }

    // 6. Propiedad (Propio vs Arriendo)
    let propertyType: AssetPropertyType = AssetPropertyType.PROPIO;
    if (rawAcq === 'ARRIENDO' || rawModel.toUpperCase().includes('ARRIENDO') || (!cleanInv && (brand === 'Lenovo' || brand === 'HP') && rawType === 'EQUIPO')) {
      propertyType = AssetPropertyType.ARRIENDO;
    }

    // 7. Sucursal / Bodega
    const branchCode = mapBranchCode(rawLocation, rawBuilding);
    const branchObj = branchMap.get(branchCode) || branchMap.get('BOD-RM-ALA')!;

    // 8. Funcionario Asignado
    let assignedUser: any = null;
    if (status === AssetStatus.ASIGNADO && rawAssignedTo) {
      assignedUser = await resolveOrRegisterUser(rawAssignedTo, rawBuilding, branchObj.name);
    }

    // 9. Notas y Especificaciones
    const locationDetail = [rawLocation, rawBuilding, rawUnit].filter(Boolean).join(' • ');
    const noteParts = [
      rawObs ? `Obs: ${rawObs}` : '',
      rawAlert ? `Alerta: ${rawAlert}` : '',
      `Ref Origen: ${rawId} (${row['ORIGEN (archivo anterior)'] || 'BASE'})`
    ].filter(Boolean).join(' | ');

    const specs: Record<string, any> = {
      categoriaExcel: rawCategory,
      tipoOriginal: rawType,
      codigoRefExcel: rawId
    };
    if (row['ID COMPRAS']) specs.idCompras = row['ID COMPRAS'];
    if (row['N° OC']) specs.ordenCompra = row['N° OC'];

    // 10. Inserción del Activo
    const createdAsset = await prisma.asset.create({
      data: {
        id: `ast-${rawId.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        serialNumber: cleanSerial,
        inventoryNumber: cleanInv,
        brand,
        model,
        assetTypeId,
        propertyType,
        status,
        physicalCondition: rawStatus === 'DE BAJA' ? PhysicalCondition.DETERIORADO : PhysicalCondition.BUENO,
        dispatchGuideId: mainGuide.id,
        purchaseOrderId: propertyType === AssetPropertyType.PROPIO ? mainPO.id : null,
        leasingContractId: propertyType === AssetPropertyType.ARRIENDO ? mainLeasing.id : null,
        currentBranchId: branchObj.id,
        locationDetail: locationDetail || undefined,
        assignedToUserId: assignedUser?.id || null,
        assignedToUserName: assignedUser?.fullName || (rawAssignedTo || null),
        assignedToUserRut: assignedUser?.rut || null,
        assignedToUserDept: assignedUser?.department || (rawBuilding || null),
        assignedDate: status === AssetStatus.ASIGNADO ? dateSalida : null,
        receptionDate: dateIngreso,
        specifications: specs,
        notes: noteParts || null
      }
    });
    assetsCreated++;

    // 11. Generación de Acta de Asignación si el bien está asignado
    if (status === AssetStatus.ASIGNADO && assignedUser) {
      const actNumber = `ACT-2026-${String(assignmentsCreated + 1).padStart(5, '0')}`;
      
      const assignment = await prisma.assignment.create({
        data: {
          actNumber,
          assignmentType: AssignmentType.ENTREGA_INICIAL,
          recipientUserId: assignedUser.id,
          technicianUserId: 'usr-admin-01',
          branchId: branchObj.id,
          status: AssignmentStatus.FIRMADO_DIGITAL,
          observations: `Entrega histórica de equipamiento migrado desde inventario central (${rawId}). Ubicación: ${locationDetail || branchObj.name}.`,
          createdAt: dateSalida,
          signedAt: dateSalida,
          signedByName: assignedUser.fullName,
          digitalSignatureHash: `SHA256-LEGACY-MIGRATION-${actNumber}-${assignedUser.rut}`
        }
      });

      await prisma.assignmentItem.create({
        data: {
          assignmentId: assignment.id,
          assetId: createdAsset.id,
          quantity: 1,
          conditionAtAssignment: PhysicalCondition.BUENO,
          isReturned: false
        }
      });

      // Log de Auditoría para Trazabilidad
      await prisma.assetAuditLog.create({
        data: {
          assetId: createdAsset.id,
          serialNumber: createdAsset.serialNumber,
          inventoryNumber: createdAsset.inventoryNumber,
          previousStatus: AssetStatus.BODEGA_DISPONIBLE,
          newStatus: AssetStatus.ASIGNADO,
          newUserId: assignedUser.id,
          newUserName: assignedUser.fullName,
          branchName: branchObj.name,
          changedByUserName: 'Administrador DTI (Migración Oficial)',
          changeReason: `Asignación formal de equipamiento a funcionario (${actNumber}).`,
          documentRef: actNumber,
          timestamp: dateSalida
        }
      });

      assignmentsCreated++;
    } else {
      // Log de Ingreso a Bodega
      await prisma.assetAuditLog.create({
        data: {
          assetId: createdAsset.id,
          serialNumber: createdAsset.serialNumber,
          inventoryNumber: createdAsset.inventoryNumber,
          previousStatus: null,
          newStatus: status,
          branchName: branchObj.name,
          changedByUserName: 'Sistema ITAM Migración',
          changeReason: `Ingreso inicial y registro en inventario oficial vía Guía ${mainGuide.guideNumber}`,
          documentRef: mainGuide.guideNumber,
          timestamp: dateIngreso
        }
      });
    }

    // 12. Consolidación de Consumibles e Insumos para Stock por Bodega
    if (isConsumable || rawType === 'ACCESORIO' || rawType === 'INSUMO') {
      const skuKey = `SKU-${rawCategory.toUpperCase().replace(/\s+/g, '-').slice(0, 8)}-${normalizeText(model).toUpperCase().replace(/\s+/g, '-').slice(0, 12)}`;
      
      if (!consumableAggregator.has(skuKey)) {
        consumableAggregator.set(skuKey, {
          name: `${rawCategory}: ${model}`,
          sku: skuKey,
          category: rawCategory,
          branchCounts: new Map<string, number>()
        });
      }

      const item = consumableAggregator.get(skuKey)!;
      const currentBranchCount = item.branchCounts.get(branchObj.id) || 0;
      // Si está disponible en bodega, suma al stock disponible
      if (status === AssetStatus.BODEGA_DISPONIBLE) {
        item.branchCounts.set(branchObj.id, currentBranchCount + 1);
      }
    }

    if ((i + 1) % 500 === 0 || i === rows.length - 1) {
      console.log(`   Procesados ${i + 1} de ${rows.length} registros...`);
    }
  }

  // 7. CREACIÓN DE CATÁLOGO Y STOCKS DE CONSUMIBLES
  console.log('\n📦 Paso 7: Creando catálogo y stocks de insumos/accesorios por bodega...');
  let totalConsumableTypes = 0;
  let totalStockEntries = 0;

  for (const [sku, cData] of consumableAggregator.entries()) {
    const consumable = await prisma.consumable.create({
      data: {
        sku: cData.sku,
        name: cData.name,
        category: cData.category,
        unitOfMeasure: 'UNIDAD',
        minStockAlert: 5,
        description: `Insumo/Accesorio consolidado desde inventario general (${cData.category})`
      }
    });
    totalConsumableTypes++;

    for (const [branchId, qty] of cData.branchCounts.entries()) {
      if (qty > 0) {
        await prisma.consumableStock.create({
          data: {
            consumableId: consumable.id,
            branchId,
            currentQuantity: qty,
            lastUpdated: new Date()
          }
        });

        await prisma.stockMovement.create({
          data: {
            consumableId: consumable.id,
            branchId,
            movementType: StockMovementType.INGRESO_GUIA,
            quantity: qty,
            previousQuantity: 0,
            newQuantity: qty,
            dispatchGuideId: mainGuide.id,
            dispatchGuideNumber: mainGuide.guideNumber,
            registeredByName: 'Administrador DTI (Migración Oficial)',
            reason: 'Carga inicial de stock físico desde inventario general'
          }
        });
        totalStockEntries++;
      }
    }
  }

  const finalAssetCount = await prisma.asset.count();
  const finalAssignmentCount = await prisma.assignment.count();
  const finalConsumableCount = await prisma.consumable.count();
  const finalStocksCount = await prisma.consumableStock.count();
  const finalLogsCount = await prisma.assetAuditLog.count();

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n========================================================================');
  console.log('🎉 MIGRACIÓN Y CARGA DE INVENTARIO FINALIZADA CON ÉXITO:');
  console.log(`   ⏱️  Tiempo de ejecución: ${durationSec} segundos`);
  console.log(`   💻 Total Activos TI registrados en PostgreSQL: ${finalAssetCount}`);
  console.log(`   📜 Actas Oficiales generadas y firmadas: ${finalAssignmentCount}`);
  console.log(`   🔌 Tipos de Insumos/Accesorios catalogados: ${finalConsumableCount}`);
  console.log(`   🏬 Entradas de Stock por Bodega creadas: ${finalStocksCount}`);
  console.log(`   🔍 Logs de Auditoría & Trazabilidad registrados: ${finalLogsCount}`);
  console.log('========================================================================\n');
}

main()
  .catch(err => {
    console.error('❌ Error durante la migración:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
