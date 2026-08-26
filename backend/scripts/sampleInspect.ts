import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sampleInspect() {
  const wb1 = XLSX.readFile(path.resolve(__dirname, '../INVENTARIO.xlsx'));
  const wb2 = XLSX.readFile(path.resolve(__dirname, '../Inventario General TI.xlsx'));

  console.log('--- MUESTRA ALAMEDA (INVENTARIO.xlsx) ---');
  const alamedaRows = XLSX.utils.sheet_to_json(wb1.Sheets['ALAMEDA'], { defval: '' }).slice(0, 5);
  console.log(JSON.stringify(alamedaRows, null, 2));

  console.log('\n--- MUESTRA EQUIPOS WINDOWS (Inventario General TI.xlsx) ---');
  const winRows = XLSX.utils.sheet_to_json(wb2.Sheets['Equipos Windows'], { defval: '' }).slice(0, 5);
  console.log(JSON.stringify(winRows, null, 2));

  console.log('\n--- MUESTRA EQUIPOS APPLE (Inventario General TI.xlsx) ---');
  const appleRows = XLSX.utils.sheet_to_json(wb2.Sheets['Equipos Apple'], { defval: '' }).slice(0, 5);
  console.log(JSON.stringify(appleRows, null, 2));

  console.log('\n--- MUESTRA MONITORES (Inventario General TI.xlsx) ---');
  const monRows = XLSX.utils.sheet_to_json(wb2.Sheets['Monitores'], { defval: '' }).slice(0, 5);
  console.log(JSON.stringify(monRows, null, 2));
}

sampleInspect();
