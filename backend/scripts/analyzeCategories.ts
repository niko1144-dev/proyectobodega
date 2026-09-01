import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../Inventario_General_TI_optimizado.xlsx');
const workbook = XLSX.readFile(excelPath);
const baseSheet = workbook.Sheets['BASE'];
const baseData = XLSX.utils.sheet_to_json(baseSheet, { defval: '' }) as any[];

const catSummary: Record<string, { total: number; withSerial: number; withoutSerial: number; types: Set<string>; sampleModels: Set<string> }> = {};

baseData.forEach(r => {
  const cat = String(r['CATEGORÍA'] || 'SIN_CATEGORIA').trim().toUpperCase();
  const type = String(r['TIPO'] || 'SIN_TIPO').trim().toUpperCase();
  const model = String(r['MODELO'] || '').trim();
  const hasSerial = Boolean(r['N° SERIE'] && String(r['N° SERIE']).trim());

  if (!catSummary[cat]) {
    catSummary[cat] = { total: 0, withSerial: 0, withoutSerial: 0, types: new Set(), sampleModels: new Set() };
  }
  catSummary[cat].total++;
  if (hasSerial) catSummary[cat].withSerial++;
  else catSummary[cat].withoutSerial++;
  catSummary[cat].types.add(type);
  if (catSummary[cat].sampleModels.size < 4 && model) {
    catSummary[cat].sampleModels.add(model);
  }
});

console.log('--- CATEGORY BREAKDOWN ---');
for (const [cat, info] of Object.entries(catSummary)) {
  console.log(`\n${cat}: ${info.total} total (${info.withSerial} with serial, ${info.withoutSerial} without serial)`);
  console.log(`   Types:`, Array.from(info.types));
  console.log(`   Sample Models:`, Array.from(info.sampleModels));
}
