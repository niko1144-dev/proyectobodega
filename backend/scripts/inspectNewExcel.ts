import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../Inventario_General_TI_optimizado.xlsx');

console.log('Reading:', excelPath);
const workbook = XLSX.readFile(excelPath);
console.log('Sheet Names:', workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  console.log(`\n--- Sheet: "${sheetName}" (${jsonData.length} rows) ---`);
  if (jsonData.length > 0) {
    console.log('Headers (Row 0):', jsonData[0]);
    if (jsonData.length > 1) {
      console.log('Row 1 (Sample):', jsonData[1]);
    }
    if (jsonData.length > 2) {
      console.log('Row 2 (Sample):', jsonData[2]);
    }
  }
}
