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

const statusCounts: Record<string, number> = {};
const acqCounts: Record<string, number> = {};

baseData.forEach(r => {
  const st = String(r['ESTADO'] || '(VACIO)').trim().toUpperCase();
  const acq = String(r['ADQUISICIÓN'] || '(VACIO)').trim().toUpperCase();

  statusCounts[st] = (statusCounts[st] || 0) + 1;
  acqCounts[acq] = (acqCounts[acq] || 0) + 1;
});

console.log('--- ESTADOS EN BASE ---');
console.log(statusCounts);

console.log('\n--- ADQUISICIÓN EN BASE ---');
console.log(acqCounts);
