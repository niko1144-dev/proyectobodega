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

const datesIngreso = baseData.filter(r => r['FECHA INGRESO']).map(r => r['FECHA INGRESO']);
const datesSalida = baseData.filter(r => r['FECHA ENTREGA/SALIDA']).map(r => r['FECHA ENTREGA/SALIDA']);

console.log(`Dates ingreso count: ${datesIngreso.length}, Samples:`, datesIngreso.slice(0, 10));
console.log(`Dates salida count: ${datesSalida.length}, Samples:`, datesSalida.slice(0, 10));
