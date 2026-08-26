/**
 * ============================================================================
 * SCRIPT ETL: MIGRACIÓN, NORMALIZACIÓN Y CONSOLIDACIÓN DE INVENTARIO LEGACY
 * Archivos Origen: backend/INVENTARIO.xlsx e backend/Inventario General TI.xlsx
 * Esquema Destino: PostgreSQL vía Prisma ORM (backend/prisma/schema.prisma)
 * ============================================================================
 */

import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { 
  PrismaClient, 
  AssetPropertyType, 
  AssetStatus, 
  PhysicalCondition, 
  DeviceCategory,
  StockMovementType
} from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
  log: ['error']
});

// ============================================================================
// TIPOS E INTERFACES DEL PROCESO ETL
// ============================================================================

interface RawRecord {
  sourceFile: string;
  sourceSheet: string;
  sourceRowIndex: number;
  data: Record<string, any>;
}

interface NormalizedAssetRecord {
  serialNumber: string;
  inventoryNumber?: string;
  brand: string;
  model: string;
  assetTypeName: string;
  deviceCategory: DeviceCategory;
  propertyType: AssetPropertyType;
  status: AssetStatus;
  physicalCondition: PhysicalCondition;
  branchCode: string;
  locationDetail?: string;
  assignedUserName?: string;
  assignedUserEmail?: string;
  assignedDate?: Date;
  receptionDate: Date;
  purchaseOrderNumber?: string;
  leasingContractNumber?: string;
  specifications: Record<string, any>;
  notes?: string;
  rawHistory: Array<{ file: string; sheet: string; row: number }>;
}

interface NormalizedConsumableRecord {
  name: string;
  sku: string;
  category: string;
  branchCode: string;
  quantity: number;
  notes?: string;
}

interface RejectedRecord {
  sourceFile: string;
  sourceSheet: string;
  rowIndex: number;
  reason: string;
  rawData: Record<string, any>;
}

// ============================================================================
// FUNCIONES HELPER DE LIMPIEZA Y SANEAMIENTO DE DATOS
// ============================================================================

/**
 * Limpia y normaliza cadenas de texto (remueve saltos de línea, espacios duplicados)
 */
export function cleanString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normaliza texto para comparaciones insensibles a mayúsculas y tildes
 */
export function normalizeText(text: string): string {
  return cleanString(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '');
}

/**
 * Limpia y normaliza números de serie de hardware
 */
export function normalizeSerial(val: any): string {
  const cleaned = cleanString(val)
    .replace(/^['"`\s]+|['"`\s]+$/g, '')
    .replace(/^s\/n\s*[:-]?\s*/i, '')
    .toUpperCase();

  const invalidTokens = ['S/N', 'SN', 'S/S', 'SIN SERIE', 'SINSERIE', 'N/A', 'NA', 'NO', '0', '-', '.', 'NONE'];
  if (!cleaned || invalidTokens.includes(cleaned) || cleaned.length < 3) {
    return '';
  }

  // Si la serie contiene un formato compuesto como "MZ02JB3G - 80834", extraer la parte principal
  if (cleaned.includes(' - ')) {
    const parts = cleaned.split(' - ').map(p => p.trim());
    // Retornar la parte que parece ser un número de serie estándar (alfanumérico largo)
    return parts[0];
  }

  return cleaned;
}

/**
 * Normaliza códigos de inventario de ChileAtiende / IPS
 */
export function normalizeInventoryNumber(val: any): string {
  const cleaned = cleanString(val).toUpperCase();
  const invalidTokens = ['S/N', 'S/I', 'SIN INVENTARIO', 'N/A', 'NA', '0', '-', '.'];
  if (!cleaned || invalidTokens.includes(cleaned)) {
    return '';
  }
  return cleaned;
}

/**
 * Parsea fechas de Excel (números seriales) o cadenas de texto en diversos formatos
 */
export function parseExcelDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;

  // 1. Número serial de Excel (ej: 46206)
  if (typeof val === 'number' || (!isNaN(Number(val)) && !String(val).includes('-') && !String(val).includes('/'))) {
    const num = Number(val);
    if (num > 20000 && num < 70000) {
      // Excel epoch base: Jan 1 1900 (con ajuste por leap year bug de Lotus 1-2-3: 25569)
      const ms = Math.round((num - 25569) * 86400 * 1000);
      const date = new Date(ms);
      if (!isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2035) {
        return date;
      }
    }
  }

  // 2. String Date
  const str = cleanString(val);
  if (!str) return null;

  // Formato ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return d;
  }

  // Formato chileno: DD-MM-YYYY o DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Limpia y valida formato de correo electrónico
 */
export function cleanEmail(val: any): string {
  const str = cleanString(val).toLowerCase();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(str) ? str : '';
}

/**
 * Deduce Marca y Modelo a partir de nombres de equipo brutos
 */
export function extractBrandAndModel(rawName: string, rawModel: string, rawType: string): { brand: string; model: string } {
  const combined = `${rawName} ${rawModel} ${rawType}`.toUpperCase();

  let brand = 'GENERICO';
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

  let model = cleanString(rawModel) || cleanString(rawName) || cleanString(rawType) || 'Modelo Estándar';
  
  // Limpiar prefijos de marca redundantes en el modelo
  model = model.replace(new RegExp(`^${brand}\\s*`, 'i'), '').trim();
  if (!model) model = `${brand} Hardware`;

  return { brand, model };
}

/**
 * Resuelve la Categoría y el Tipo de Hardware oficial
 */
export function resolveCategoryAndAssetType(
  rawName: string,
  rawType: string,
  rawModel: string,
  sheetName: string
): { typeName: string; category: DeviceCategory; isConsumable: boolean } {
  const combined = `${sheetName} ${rawType} ${rawName} ${rawModel}`.toUpperCase();

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
  if (combined.includes('AIO') || combined.includes('ALL IN ONE') || combined.includes('ALL-IN-ONE') || combined.includes('THINKCENTRE')) {
    return { typeName: 'Equipos All-in-One (AIO)', category: DeviceCategory.COMPUTO, isConsumable: false };
  }
  if (combined.includes('NOTEBOOK') || combined.includes('LAPTOP') || combined.includes('THINKPAD') || combined.includes('PROBOOK') || combined.includes('ELITEBOOK') || combined.includes('EQUIPO WINDOWS') || combined.includes('EQUIPO')) {
    return { typeName: 'Notebooks Corporativos', category: DeviceCategory.COMPUTO, isConsumable: false };
  }

  // 3. Impresión y Digitalización
  if (combined.includes('IMPRESORA') || combined.includes('ESCANER') || combined.includes('MULTIFUNCIONAL')) {
    return { typeName: 'Impresoras & Escáneres', category: DeviceCategory.IMPRESION, isConsumable: false };
  }

  // 4. Redes y Telecomunicaciones
  if (combined.includes('SWITCH') || combined.includes('ROUTER') || combined.includes('ACCESS POINT') || combined.includes('TELEFONO IP') || combined.includes('CISCO IP')) {
    return { typeName: 'Equipos de Red & Switches', category: DeviceCategory.REDES, isConsumable: false };
  }

  // 5. Periféricos y Biometría
  if (combined.includes('HUELLERO') || combined.includes('BIOMETR')) {
    return { typeName: 'Huelleros & Biometría', category: DeviceCategory.PERIFERICOS_BIOMETRIA, isConsumable: false };
  }
  if (combined.includes('DISCO EXTERNO') || combined.includes('PENDRIVE') || combined.includes('DISCO DURO')) {
    return { typeName: 'Discos Externos & Almacenamiento', category: DeviceCategory.COMPUTO, isConsumable: false };
  }
  if (combined.includes('TECLADO') || combined.includes('MOUSE')) {
    return { typeName: 'Teclados & Mouse Serializados', category: DeviceCategory.PERIFERICOS_BIOMETRIA, isConsumable: false };
  }
  if (combined.includes('HUB ') || combined.includes('DOCK')) {
    return { typeName: 'Hubs & Docks Serializados', category: DeviceCategory.PERIFERICOS_BIOMETRIA, isConsumable: false };
  }

  // 6. Insumos / Consumibles a granel
  if (
    combined.includes('CABLE') ||
    combined.includes('ADAPTADOR') ||
    combined.includes('ALZADOR') ||
    combined.includes('AUDIFONO') ||
    combined.includes('CANDADO') ||
    combined.includes('CARCASA') ||
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

/**
 * Normaliza la bodega / sucursal asignada
 */
export function mapBranchCode(branchRaw: string, sheetName: string): string {
  const combined = `${branchRaw} ${sheetName}`.toUpperCase();

  if (combined.includes('HUERFANOS') || combined.includes('HUÉRFANOS')) return 'BOD-RM-HUE';
  if (combined.includes('CAMINO AGRICOLA') || combined.includes('AGRICOLA') || combined.includes('SAN JOAQUIN')) return 'BOD-RM-AGR';
  if (combined.includes('CALL CENTER') || combined.includes('CONTACT')) return 'BOD-RM-CC';
  if (combined.includes('VALPARAISO') || combined.includes('VIÑA')) return 'BOD-REG-VAL';
  if (combined.includes('CONCEPCION') || combined.includes('BIOBIO') || combined.includes('BIO BIO')) return 'BOD-REG-BIO';
  if (combined.includes('ANTOFAGASTA')) return 'BOD-REG-ANT';
  if (combined.includes('TEMUCO') || combined.includes('ARAUCANIA')) return 'BOD-REG-ARA';
  if (combined.includes('PUERTO MONTT') || combined.includes('LOS LAGOS')) return 'BOD-REG-LOS';
  if (combined.includes('TALCA') || combined.includes('MAULE')) return 'BOD-REG-MAU';
  if (combined.includes('LA SERENA') || combined.includes('COQUIMBO')) return 'BOD-REG-COQ';
  if (combined.includes('RANCAGUA') || combined.includes('O\'HIGGINS')) return 'BOD-REG-OHI';
  if (combined.includes('ARICA')) return 'BOD-REG-ARI';

  // Default: Bodega Central Alameda
  return 'BOD-RM-ALA';
}

// ============================================================================
// PROCESAMIENTO ETL PRINCIPAL
// ============================================================================

async function runETL() {
  const startTime = Date.now();
  console.log('\n🚀 ======================================================');
  console.log('INICIANDO PROCESO ETL DE INVENTARIO LEGACY A PRISMA');
  console.log('======================================================\n');

  // 1. CARGA DE MAESTROS EN BASE DE DATOS
  console.log('📦 Paso 1: Asegurando Maestros de Sucursales, Tipos y Proveedor Base...');
  
  // Proveedor Base de Migración
  const defaultSupplier = await prisma.supplier.upsert({
    where: { rut: '76.123.456-7' },
    update: {},
    create: {
      rut: '76.123.456-7',
      businessName: 'Proveedor Central ChileCompra / Acreditado ITAM',
      contactName: 'Mesa Soporte Proveedores',
      contactEmail: 'proveedores@chileatiende.cl',
      contactPhone: '+56 2 2900 8700'
    }
  });

  // Sucursales Oficiales
  const branchesSeed = [
    { code: 'BOD-RM-ALA', name: 'Bodega Central Alameda (Santiago Centro)', region: 'Región Metropolitana', commune: 'Santiago', address: 'Av. Libertador Bernardo O\'Higgins 1353' },
    { code: 'BOD-RM-HUE', name: 'Bodega Huérfanos (Edificio Central)', region: 'Región Metropolitana', commune: 'Santiago', address: 'Huérfanos 1189' },
    { code: 'BOD-RM-AGR', name: 'Bodega Camino Agrícola (San Joaquín)', region: 'Región Metropolitana', commune: 'San Joaquín', address: 'Av. Vicuña Mackenna 4917' },
    { code: 'BOD-RM-CC', name: 'Bodega Call Center Central', region: 'Región Metropolitana', commune: 'Santiago', address: 'Moneda 1020' },
    { code: 'BOD-REG-VAL', name: 'Bodega Regional Valparaíso', region: 'Región de Valparaíso', commune: 'Valparaíso', address: 'Brasil 1265' },
    { code: 'BOD-REG-BIO', name: 'Bodega Regional Concepción / Biobío', region: 'Región del Biobío', commune: 'Concepción', address: 'Castellón 435' },
    { code: 'BOD-REG-ANT', name: 'Bodega Regional Antofagasta', region: 'Región de Antofagasta', commune: 'Antofagasta', address: 'Sucre 325' },
    { code: 'BOD-REG-ARA', name: 'Bodega Regional Temuco / La Araucanía', region: 'Región de La Araucanía', commune: 'Temuco', address: 'Bulnes 450' },
    { code: 'BOD-REG-LOS', name: 'Bodega Regional Puerto Montt / Los Lagos', region: 'Región de Los Lagos', commune: 'Puerto Montt', address: 'Urmeneta 560' },
    { code: 'BOD-REG-MAU', name: 'Bodega Regional Talca / Maule', region: 'Región del Maule', commune: 'Talca', address: '1 Sur 890' },
    { code: 'BOD-REG-COQ', name: 'Bodega Regional La Serena / Coquimbo', region: 'Región de Coquimbo', commune: 'La Serena', address: 'Francisco de Aguirre 350' },
    { code: 'BOD-REG-OHI', name: 'Bodega Regional Rancagua / O\'Higgins', region: 'Región de O\'Higgins', commune: 'Rancagua', address: 'Campos 240' },
    { code: 'BOD-REG-ARI', name: 'Bodega Regional Arica y Parinacota', region: 'Región de Arica y Parinacota', commune: 'Arica', address: '21 de Mayo 432' }
  ];

  const branchMap = new Map<string, string>(); // code -> branch.id
  for (const b of branchesSeed) {
    const created = await prisma.branch.upsert({
      where: { code: b.code },
      update: { name: b.name, address: b.address },
      create: b
    });
    branchMap.set(b.code, created.id);
  }

  // Guía de Despacho Inicial de Migración
  const defaultGuide = await prisma.dispatchGuide.upsert({
    where: {
      supplierId_guideNumber: {
        supplierId: defaultSupplier.id,
        guideNumber: 'GD-MIGRACION-INVENTARIO-LEGACY'
      }
    },
    update: {},
    create: {
      guideNumber: 'GD-MIGRACION-INVENTARIO-LEGACY',
      supplierId: defaultSupplier.id,
      branchId: branchMap.get('BOD-RM-ALA')!,
      dispatchDate: new Date('2024-01-01'),
      receptionDate: new Date(),
      receivedByUserId: 'usr-admin-dti',
      receivedByUserName: 'Administrador DTI Migración',
      observations: 'Carga masiva y consolidación de planillas Excel legacy'
    }
  });

  // Tipos de Hardware Oficiales
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

  const typeMap = new Map<string, string>(); // name -> assetType.id
  for (const t of assetTypesSeed) {
    const created = await prisma.assetType.upsert({
      where: { name: t.name },
      update: { category: t.category },
      create: t
    });
    typeMap.set(t.name, created.id);
  }

  // Cargar Directorio de Usuarios AD en Memoria para Cruces Rápidos
  console.log('👥 Paso 2: Cargando usuarios del Active Directory para indexación...');
  const adUsers = await prisma.userADCache.findMany({
    select: { id: true, fullName: true, rut: true, email: true, department: true }
  });
  console.log(`✓ ${adUsers.length} usuarios AD listos para asignaciones.`);

  const userByNormalizedName = new Map<string, typeof adUsers[0]>();
  const userByRut = new Map<string, typeof adUsers[0]>();
  const userByEmail = new Map<string, typeof adUsers[0]>();

  for (const u of adUsers) {
    userByNormalizedName.set(normalizeText(u.fullName), u);
    if (u.rut) userByRut.set(u.rut.replace(/[^0-9kK]/g, '').toUpperCase(), u);
    if (u.email) userByEmail.set(u.email.toLowerCase().trim(), u);
  }

  // 2. LECTURA Y CONSOLIDACIÓN DE AMBOS ARCHIVOS EXCEL
  console.log('\n📊 Paso 3: Leyendo y consolidando hojas de ambos Excel...');

  const files = ['INVENTARIO.xlsx', 'Inventario General TI.xlsx'];
  const consolidatedAssets = new Map<string, NormalizedAssetRecord>(); // key: serialNumber
  const consolidatedConsumables = new Map<string, NormalizedConsumableRecord>(); // key: sku_branch
  const rejectedList: RejectedRecord[] = [];

  let totalRawRowsRead = 0;

  for (const filename of files) {
    const filePath = path.resolve(__dirname, '..', filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️ Archivo no encontrado: ${filename}`);
      continue;
    }

    const wb = XLSX.readFile(filePath);
    console.log(`\n  📖 Procesando "${filename}" (${wb.SheetNames.length} hojas)...`);

    for (const sheetName of wb.SheetNames) {
      if (['Resumen Bodegas', 'Resumen Inventario', 'hoja alex'].includes(sheetName)) {
        continue;
      }

      const ws = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      let sheetAssetCount = 0;
      let sheetConsumableCount = 0;
      let sheetRejectedCount = 0;

      rows.forEach((row, idx) => {
        totalRawRowsRead++;
        const rowIndex = idx + 2; // Considerando encabezado en fila 1

        // Normalizar nombres de columnas a mayúsculas sin espacios dobles
        const r: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          const cleanK = k.replace(/\s+/g, ' ').trim().toUpperCase();
          r[cleanK] = typeof v === 'string' ? cleanString(v) : v;
        }

        // Extracción de campos
        const rawSerial = r['SERIE'] || r['SERIE -'] || r['SERIES'] || r['S/N'] || r['SERIAL'] || '';
        const rawInv = r['N° DE INVENTARIO'] || r['NUMERO DE INVENTARIO'] || r['INVENTARIO'] || r['CODIGO INVENTARIO'] || '';
        const rawName = r['NOMBRE'] || r['MODELO'] || r['NOMBRE_1'] || '';
        const rawModel = r['MODELO'] || r['TIPOS DE MODELOS'] || '';
        const rawType = r['TIPO DE EQUIPOS'] || r['TIPO DE EQUIPO'] || r['TIPO'] || r['XXXX'] || '';
        const rawBranch = r['UBICACION FINAL'] || r['UBICACION'] || r['UBICACION ORIGINAL'] || r['ESTADO'] || r['EDIFICIO'] || sheetName;
        const rawUser = r['UBICACION / ASIGNADO A'] || r['USUARIO ASIGNADO'] || r['NOMBRE'] || '';
        const rawEmail = r['CORREO DEL USUARIO'] || '';
        const rawObs = r['OBSERVACION'] || r['OBSERVACION / PREVIA ASIGNACION'] || r['OBSERVACIÓN / DESTINO'] || r['OBSERVACION / PREVIA ASIGNACION'] || '';
        const rawIdCompra = r['ID COMPRAS'] || r['ID COMPRA'] || '';
        const rawOC = r['N° DE OC'] || '';
        const rawDateIn = r['FECHA DE INGRESO'] || r['FECHA DE INGRESO'] || r['PRIMERA ENTREGA'];
        const rawDateOut = r['FECHA DE SALIDA'] || r['FECHA DE SALIDA'] || r['ULTIMA MODIFICACION'];

        const serial = normalizeSerial(rawSerial);
        const invNumber = normalizeInventoryNumber(rawInv);
        const branchCode = mapBranchCode(String(rawBranch), sheetName);
        const { typeName, category, isConsumable } = resolveCategoryAndAssetType(String(rawName), String(rawType), String(rawModel), sheetName);
        const { brand, model } = extractBrandAndModel(String(rawName), String(rawModel), String(rawType));

        // Fechas
        const dateIn = parseExcelDate(rawDateIn) || new Date('2024-01-01');
        const dateOut = parseExcelDate(rawDateOut);

        // Cruce con Usuario AD
        let matchedUser: typeof adUsers[0] | undefined;
        const cleanUserName = cleanString(rawUser);
        const cleanUserEmail = cleanEmail(rawEmail);

        if (cleanUserEmail && userByEmail.has(cleanUserEmail)) {
          matchedUser = userByEmail.get(cleanUserEmail);
        } else if (cleanUserName && cleanUserName.length > 3) {
          const normName = normalizeText(cleanUserName);
          matchedUser = userByNormalizedName.get(normName);
          
          // Búsqueda por subcadena de nombre si no hay match exacto
          if (!matchedUser) {
            for (const [adNorm, u] of userByNormalizedName.entries()) {
              if (adNorm.includes(normName) || normName.includes(adNorm)) {
                matchedUser = u;
                break;
              }
            }
          }
        }

        // Estado del Activo
        let status: AssetStatus = AssetStatus.BODEGA_DISPONIBLE;
        let assignedName: string | undefined = undefined;
        let assignedDept: string | undefined = undefined;

        if (cleanUserName && !['DISPONIBLE', 'BODEGA', 'EN BODEGA', 'LIBRE', 'STOCK', '-'].includes(cleanUserName.toUpperCase())) {
          status = AssetStatus.ASIGNADO;
          assignedName = matchedUser ? matchedUser.fullName : cleanUserName;
          assignedDept = matchedUser?.department || undefined;
        }

        const obsUpper = String(rawObs).toUpperCase();
        if (obsUpper.includes('MANTENCION') || obsUpper.includes('TALLER') || obsUpper.includes('REPARACION')) {
          status = AssetStatus.EN_MANTENCION;
        } else if (obsUpper.includes('BAJA') || obsUpper.includes('DETERIORADO') || obsUpper.includes('MALO') || obsUpper.includes('ROTO')) {
          status = AssetStatus.DADO_DE_BAJA;
        }

        // Tipo de Propiedad (Propio vs Arriendo)
        let propertyType: AssetPropertyType = AssetPropertyType.PROPIO;
        if (
          String(r['COMPRA/ ARREINDO']).toUpperCase().includes('ARRIENDO') ||
          obsUpper.includes('LEASING') ||
          obsUpper.includes('ARRIENDO')
        ) {
          propertyType = AssetPropertyType.ARRIENDO;
        }

        // --- CASO 1: ACTIVO SERIALIZADO VÁLIDO ---
        if (serial) {
          if (!consolidatedAssets.has(serial)) {
            consolidatedAssets.set(serial, {
              serialNumber: serial,
              inventoryNumber: invNumber || undefined,
              brand,
              model,
              assetTypeName: typeName,
              deviceCategory: category,
              propertyType,
              status,
              physicalCondition: PhysicalCondition.BUENO,
              branchCode,
              locationDetail: cleanString(r['UBICACION FINAL'] || r['EDIFICIO'] || r['UBICACION'] || ''),
              assignedUserName: assignedName,
              assignedUserEmail: matchedUser?.email || cleanUserEmail || undefined,
              assignedDate: dateOut || undefined,
              receptionDate: dateIn,
              purchaseOrderNumber: cleanString(rawOC) || (rawIdCompra ? `OC-${rawIdCompra}` : undefined),
              leasingContractNumber: propertyType === AssetPropertyType.ARRIENDO ? 'LICITACION-2024-LEASING' : undefined,
              specifications: {
                mac: cleanString(r['MAC'] || ''),
                idCompra: cleanString(rawIdCompra),
                unidadOperativa: cleanString(r['NÚMERO Y NOMBRE UNIDAD OPERATIVA'] || ''),
                origen: `${filename} -> ${sheetName}`
              },
              notes: cleanString(rawObs) || undefined,
              rawHistory: [{ file: filename, sheet: sheetName, row: rowIndex }]
            });
            sheetAssetCount++;
          } else {
            // Fusión y enriquecimiento con el registro más reciente
            const existing = consolidatedAssets.get(serial)!;
            existing.rawHistory.push({ file: filename, sheet: sheetName, row: rowIndex });
            
            // Priorizar inventario si el previo estaba vacío
            if (!existing.inventoryNumber && invNumber) {
              existing.inventoryNumber = invNumber;
            }
            // Si el nuevo registro tiene usuario y el previo no
            if (status === AssetStatus.ASIGNADO && existing.status === AssetStatus.BODEGA_DISPONIBLE) {
              existing.status = AssetStatus.ASIGNADO;
              existing.assignedUserName = assignedName;
              existing.assignedUserEmail = matchedUser?.email || cleanUserEmail || undefined;
              existing.assignedDate = dateOut || existing.assignedDate;
            }
            // Actualizar ubicación si está más detallada
            if (branchCode !== 'BOD-RM-ALA' && existing.branchCode === 'BOD-RM-ALA') {
              existing.branchCode = branchCode;
            }
          }
        } 
        // --- CASO 2: INVENTARIABLE POR CÓDIGO (SIN SERIE) ---
        else if (invNumber) {
          const syntheticSerial = `INV-SER-${invNumber}`;
          if (!consolidatedAssets.has(syntheticSerial)) {
            consolidatedAssets.set(syntheticSerial, {
              serialNumber: syntheticSerial,
              inventoryNumber: invNumber,
              brand,
              model,
              assetTypeName: typeName,
              deviceCategory: category,
              propertyType,
              status,
              physicalCondition: PhysicalCondition.BUENO,
              branchCode,
              locationDetail: cleanString(r['UBICACION FINAL'] || r['EDIFICIO'] || ''),
              assignedUserName: assignedName,
              assignedDate: dateOut || undefined,
              receptionDate: dateIn,
              specifications: {
                origen: `${filename} -> ${sheetName}`
              },
              notes: cleanString(rawObs) || undefined,
              rawHistory: [{ file: filename, sheet: sheetName, row: rowIndex }]
            });
            sheetAssetCount++;
          }
        }
        // --- CASO 3: CONSUMIBLE / ACCESORIO A GRANEL ---
        else if (isConsumable || cleanString(rawName).length > 2) {
          const consumableName = cleanString(rawName) || cleanString(rawModel) || `${sheetName} Estándar`;
          const sku = `SKU-${normalizeText(consumableName).toUpperCase().slice(0, 20).replace(/\s+/g, '-')}`;
          const consumableKey = `${sku}_${branchCode}`;

          if (!consolidatedConsumables.has(consumableKey)) {
            consolidatedConsumables.set(consumableKey, {
              name: consumableName,
              sku,
              category: sheetName || 'Insumos Generales',
              branchCode,
              quantity: 1,
              notes: cleanString(rawObs) || undefined
            });
          } else {
            const c = consolidatedConsumables.get(consumableKey)!;
            c.quantity += 1;
          }
          sheetConsumableCount++;
        } 
        // --- CASO 4: REGISTRO RECHAZADO (SIN IDENTIFICADOR / VACÍO) ---
        else {
          rejectedList.push({
            sourceFile: filename,
            sourceSheet: sheetName,
            rowIndex,
            reason: 'Fila sin Número de Serie, Código de Inventario ni Nombre de Insumo reconocible',
            rawData: row
          });
          sheetRejectedCount++;
        }
      });

      console.log(`    → [${sheetName}]: ${rows.length} filas | ${sheetAssetCount} Activos | ${sheetConsumableCount} Insumos | ${sheetRejectedCount} Rechazados`);
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`TOTAL CONSOLIDADO:`);
  console.log(`• Activos Serializados Únicos para Insertar/Actualizar: ${consolidatedAssets.size}`);
  console.log(`• Líneas de Stock de Insumos Consolidadas: ${consolidatedConsumables.size}`);
  console.log(`• Registros Descartados / Auditoría: ${rejectedList.length}`);
  console.log('------------------------------------------------------\n');

  // 3. PERSISTENCIA EN BASE DE DATOS (UPSERT CON PRISMA)
  console.log('💾 Paso 4: Persistiendo Activos e Insumos en PostgreSQL con Prisma...');

  let insertedAssets = 0;
  let updatedAssets = 0;
  let errorAssets = 0;

  // Cargar activos en lotes (chunks de 100) para rendimiento y control de errores
  const assetList = Array.from(consolidatedAssets.values());
  const chunkSize = 100;

  // Cargar inventarios y series existentes en la base de datos
  const existingAssetsInDb = await prisma.asset.findMany({
    select: { serialNumber: true, inventoryNumber: true }
  });
  const globallyClaimedInvs = new Map<string, string>(); // invNumber -> serialNumber
  for (const a of existingAssetsInDb) {
    if (a.inventoryNumber) globallyClaimedInvs.set(a.inventoryNumber, a.serialNumber);
  }

  // Pre-procesar unicidad estricta de inventoryNumber entre todos los registros consolidados
  for (const item of consolidatedAssets.values()) {
    if (item.inventoryNumber) {
      let candidate = item.inventoryNumber;
      const ownerSerial = globallyClaimedInvs.get(candidate);
      if (ownerSerial && ownerSerial !== item.serialNumber) {
        item.specifications.originalInventoryNumber = candidate;
        let suffix = 1;
        candidate = `${item.inventoryNumber}-${item.serialNumber.slice(-4)}`;
        while (globallyClaimedInvs.has(candidate) && globallyClaimedInvs.get(candidate) !== item.serialNumber) {
          candidate = `${item.inventoryNumber}-${item.serialNumber.slice(-4)}-${suffix++}`;
        }
        item.inventoryNumber = candidate;
      }
      globallyClaimedInvs.set(item.inventoryNumber, item.serialNumber);
    }
  }

  for (let i = 0; i < assetList.length; i += chunkSize) {
    const chunk = assetList.slice(i, i + chunkSize);
    
    await Promise.all(
      chunk.map(async (item) => {
        try {
          const branchId = branchMap.get(item.branchCode) || branchMap.get('BOD-RM-ALA')!;
          const assetTypeId = typeMap.get(item.assetTypeName) || typeMap.get('Equipamiento TI General')!;

          // Cruce final con UserADCache
          let assignedUserId: string | undefined = undefined;
          if (item.assignedUserName) {
            const match = userByNormalizedName.get(normalizeText(item.assignedUserName));
            if (match) assignedUserId = match.id;
          }

          // Verificar si ya existe por serialNumber
          const existing = await prisma.asset.findUnique({
            where: { serialNumber: item.serialNumber }
          });

          if (existing) {
            await prisma.asset.update({
              where: { serialNumber: item.serialNumber },
              data: {
                inventoryNumber: item.inventoryNumber || existing.inventoryNumber,
                brand: item.brand,
                model: item.model,
                assetTypeId,
                propertyType: item.propertyType,
                status: item.status,
                currentBranchId: branchId,
                locationDetail: item.locationDetail || existing.locationDetail,
                assignedToUserId: assignedUserId || existing.assignedToUserId,
                assignedToUserName: item.assignedUserName || existing.assignedToUserName,
                assignedDate: item.assignedDate || existing.assignedDate,
                specifications: item.specifications,
                notes: item.notes || existing.notes
              }
            });
            updatedAssets++;
          } else {
            await prisma.asset.create({
              data: {
                serialNumber: item.serialNumber,
                inventoryNumber: item.inventoryNumber || undefined,
                brand: item.brand,
                model: item.model,
                assetTypeId,
                propertyType: item.propertyType,
                status: item.status,
                physicalCondition: item.physicalCondition,
                dispatchGuideId: defaultGuide.id,
                currentBranchId: branchId,
                locationDetail: item.locationDetail,
                assignedToUserId: assignedUserId,
                assignedToUserName: item.assignedUserName,
                assignedDate: item.assignedDate,
                receptionDate: item.receptionDate,
                specifications: item.specifications,
                notes: item.notes
              }
            });
            insertedAssets++;
          }
        } catch (err: any) {
          errorAssets++;
          rejectedList.push({
            sourceFile: item.rawHistory[0]?.file || 'Desconocido',
            sourceSheet: item.rawHistory[0]?.sheet || 'Desconocido',
            rowIndex: item.rawHistory[0]?.row || 0,
            reason: `Error de Base de Datos al guardar Activo ${item.serialNumber}: ${err.message}`,
            rawData: item
          });
        }
      })
    );

    const progress = Math.min(i + chunkSize, assetList.length);
    process.stdout.write(`\r  Progreso Activos: ${progress} / ${assetList.length} (${Math.round((progress / assetList.length) * 100)}%)`);
  }
  console.log('\n  ✓ Carga de activos finalizada.');

  // 4. PERSISTENCIA DE CONSUMIBLES E INSUMOS
  console.log('\n📦 Paso 5: Persistiendo Insumos y Actualizando Niveles de Stock...');
  let insertedConsumables = 0;

  for (const c of consolidatedConsumables.values()) {
    try {
      const branchId = branchMap.get(c.branchCode) || branchMap.get('BOD-RM-ALA')!;
      
      const consumable = await prisma.consumable.upsert({
        where: { sku: c.sku },
        update: { name: c.name, category: c.category },
        create: {
          sku: c.sku,
          name: c.name,
          category: c.category,
          unitOfMeasure: 'UNIDAD',
          minStockAlert: 5,
          description: c.notes
        }
      });

      await prisma.consumableStock.upsert({
        where: {
          consumableId_branchId: {
            consumableId: consumable.id,
            branchId
          }
        },
        update: {
          currentQuantity: { increment: c.quantity },
          lastUpdated: new Date()
        },
        create: {
          consumableId: consumable.id,
          branchId,
          currentQuantity: c.quantity,
          lastUpdated: new Date()
        }
      });

      insertedConsumables++;
    } catch (err: any) {
      console.error(`Error al persistir consumible ${c.sku}:`, err.message);
    }
  }
  console.log(`  ✓ ${insertedConsumables} stocks de insumos consolidados.`);

  // 5. EXPORTACIÓN DE RECHAZADOS A JSON PARA AUDITORÍA
  const rejectedPath = path.resolve(__dirname, 'rechazados_inventario.json');
  fs.writeFileSync(rejectedPath, JSON.stringify(rejectedList, null, 2), 'utf-8');
  console.log(`\n📋 Archivo de auditoría generado: ${rejectedPath} (${rejectedList.length} registros)`);

  // 6. INFORME FINAL DE MÉTRICAS
  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n======================================================');
  console.log('🏁 INFORME FINAL DEL PROCESO DE MIGRACIÓN ETL');
  console.log('======================================================');
  console.log(`⏱️  Tiempo Total de Ejecución: ${durationSec} segundos`);
  console.log(`📄 Total Filas Brutas Leídas: ${totalRawRowsRead}`);
  console.log(`✨ Activos Nuevos Creados:     ${insertedAssets}`);
  console.log(`🔄 Activos Existentes Actualizados: ${updatedAssets}`);
  console.log(`❌ Errores en Activos:         ${errorAssets}`);
  console.log(`📦 Líneas de Stock de Insumos:  ${insertedConsumables}`);
  console.log(`⚠️  Registros en Rechazados:    ${rejectedList.length}`);
  console.log('======================================================\n');
}

runETL()
  .catch((e) => {
    console.error('Error fatal durante la ejecución del ETL:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
