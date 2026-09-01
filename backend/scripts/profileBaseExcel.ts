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

console.log(`Total rows in BASE: ${baseData.length}`);

// Profile columns
const categories = new Set<string>();
const types = new Set<string>();
const statuses = new Set<string>();
const locations = new Set<string>();
const acquisitions = new Set<string>();
const buildings = new Set<string>();

let withSerial = 0;
let withoutSerial = 0;
let withInventory = 0;
let withAssignedUser = 0;

baseData.forEach((row, i) => {
  if (row['CATEGORÍA']) categories.add(String(row['CATEGORÍA']).trim());
  if (row['TIPO']) types.add(String(row['TIPO']).trim());
  if (row['ESTADO']) statuses.add(String(row['ESTADO']).trim());
  if (row['UBICACIÓN FÍSICA']) locations.add(String(row['UBICACIÓN FÍSICA']).trim());
  if (row['ADQUISICIÓN']) acquisitions.add(String(row['ADQUISICIÓN']).trim());
  if (row['EDIFICIO']) buildings.add(String(row['EDIFICIO']).trim());

  if (row['N° SERIE'] && String(row['N° SERIE']).trim()) withSerial++;
  else withoutSerial++;

  if (row['N° INVENTARIO'] && String(row['N° INVENTARIO']).trim()) withInventory++;
  if (row['ASIGNADO A'] && String(row['ASIGNADO A']).trim()) withAssignedUser++;
});

console.log('\n--- PROFILING SUMMARY ---');
console.log('Categories:', Array.from(categories));
console.log('Types:', Array.from(types));
console.log('Statuses:', Array.from(statuses));
console.log('Acquisitions:', Array.from(acquisitions));
console.log('Locations (Ubicación Física):', Array.from(locations));
console.log('Buildings (Edificio):', Array.from(buildings));
console.log(`\nWith Serial: ${withSerial}, Without Serial: ${withoutSerial}`);
console.log(`With Inventory Number: ${withInventory}`);
console.log(`With Assigned User: ${withAssignedUser}`);

// Sample 5 rows with serial and 5 rows without serial
console.log('\n--- SAMPLES WITH SERIAL ---');
console.log(baseData.filter(r => r['N° SERIE'] && String(r['N° SERIE']).trim()).slice(0, 5));

console.log('\n--- SAMPLES WITHOUT SERIAL ---');
console.log(baseData.filter(r => !r['N° SERIE'] || !String(r['N° SERIE']).trim()).slice(0, 5));
