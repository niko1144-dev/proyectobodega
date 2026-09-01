import { prisma } from '../src/config/db.js';
import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findUsers() {
  console.log('--- BUSCANDO EN BASE DE DATOS POSTGRESQL (users_ad_cache) ---');
  
  // Buscar todas las Claudias
  const claudias = await prisma.userADCache.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Claudia', mode: 'insensitive' } },
        { firstName: { contains: 'Claudia', mode: 'insensitive' } },
        { email: { contains: 'claudia', mode: 'insensitive' } }
      ]
    }
  });
  console.log(`Total usuarios con 'Claudia' en BD: ${claudias.length}`);
  const claudiaFloresDB = claudias.filter(u => u.fullName.toLowerCase().includes('flores') || u.lastName.toLowerCase().includes('flores'));
  console.log('Resultados Claudia + Flores en BD:', claudiaFloresDB);

  // Buscar todos los Ruiz / Miguel / Jose
  const ruizUsers = await prisma.userADCache.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Ruiz', mode: 'insensitive' } },
        { lastName: { contains: 'Ruiz', mode: 'insensitive' } }
      ]
    }
  });
  console.log(`\nTotal usuarios con 'Ruiz' en BD: ${ruizUsers.length}`);
  const joseRuizDB = ruizUsers.filter(u => u.fullName.toLowerCase().includes('jose') || u.fullName.toLowerCase().includes('miguel'));
  console.log('Resultados Jose/Miguel + Ruiz en BD:', joseRuizDB);

  // Buscar en Excel Inventario_General_TI_optimizado.xlsx
  const excelPath = path.resolve(__dirname, '../Inventario_General_TI_optimizado.xlsx');
  const wb = XLSX.readFile(excelPath);
  const baseSheet = wb.Sheets['BASE'];
  const baseRows = XLSX.utils.sheet_to_json(baseSheet, { defval: '' }) as any[];

  console.log('\n--- BUSCANDO EN EXCEL OPTIMIZADO (BASE) ---');
  const claudiaExcel = baseRows.filter(r => String(r['ASIGNADO A'] || '').toLowerCase().includes('claudia') || String(r['OBSERVACIÓN'] || '').toLowerCase().includes('claudia'));
  console.log(`Filas con 'Claudia' en Excel: ${claudiaExcel.length}`);
  claudiaExcel.forEach(r => console.log(` - ID: ${r.ID} | Asignado: "${r['ASIGNADO A']}" | Modelo: "${r.MODELO}" | Obs: "${r['OBSERVACIÓN']}"`));

  const ruizExcel = baseRows.filter(r => String(r['ASIGNADO A'] || '').toLowerCase().includes('ruiz') || String(r['ASIGNADO A'] || '').toLowerCase().includes('miguel'));
  console.log(`\nFilas con 'Ruiz' o 'Miguel' en Excel: ${ruizExcel.length}`);
  ruizExcel.forEach(r => console.log(` - ID: ${r.ID} | Asignado: "${r['ASIGNADO A']}" | Modelo: "${r.MODELO}" | Obs: "${r['OBSERVACIÓN']}"`));
}

findUsers().finally(() => prisma.$disconnect());
