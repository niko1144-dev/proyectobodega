import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function cleanKey(k: string): string {
  return k.replace(/\s+/g, ' ').trim().toUpperCase();
}

function deepProfile() {
  const files = ['INVENTARIO.xlsx', 'Inventario General TI.xlsx'];

  const serialMap = new Map<string, { files: string[]; sheets: string[]; records: any[] }>();
  const invMap = new Map<string, { files: string[]; sheets: string[]; records: any[] }>();
  const branchOccurrences = new Map<string, number>();
  const typeOccurrences = new Map<string, number>();
  const statusOccurrences = new Map<string, number>();
  const dateSamples: any[] = [];

  let totalRawRows = 0;
  let totalRowsWithSerial = 0;
  let totalRowsWithOnlyInv = 0;
  let totalRowsWithoutIdentifier = 0;

  for (const filename of files) {
    const filePath = path.resolve(__dirname, '..', filename);
    if (!fs.existsSync(filePath)) continue;

    const wb = XLSX.readFile(filePath);

    for (const sheetName of wb.SheetNames) {
      // Ignorar hojas de resumen o metadatos puros si aplica
      if (['Resumen Bodegas', 'Resumen Inventario', 'hoja alex'].includes(sheetName)) continue;

      const ws = wb.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      for (const row of rawRows) {
        totalRawRows++;
        // Normalizar claves del registro
        const normRow: Record<string, any> = {};
        for (const [k, v] of Object.entries(row)) {
          normRow[cleanKey(k)] = typeof v === 'string' ? v.trim() : v;
        }

        // Buscar Serie
        const rawSerial = String(
          normRow['SERIE'] ||
          normRow['SERIE -'] ||
          normRow['SERIES'] ||
          normRow['S/N'] ||
          normRow['SERIAL'] ||
          normRow['SERIAL NUMBER'] ||
          ''
        ).trim();

        // Buscar Inventario
        const rawInv = String(
          normRow['N° DE INVENTARIO'] ||
          normRow['NUMERO DE INVENTARIO'] ||
          normRow['INVENTARIO'] ||
          normRow['CODIGO INVENTARIO'] ||
          ''
        ).trim();

        // Buscar Tipo / Modelo
        const rawType = String(
          normRow['TIPO DE EQUIPOS'] ||
          normRow['TIPO DE EQUIPO'] ||
          normRow['TIPO'] ||
          normRow['MODELO'] ||
          normRow['NOMBRE'] ||
          ''
        ).trim();
        if (rawType) typeOccurrences.set(rawType, (typeOccurrences.get(rawType) || 0) + 1);

        // Buscar Ubicación / Bodega
        const rawBranch = String(
          normRow['UBICACION FINAL'] ||
          normRow['UBICACION'] ||
          normRow['UBICACION ORIGINAL'] ||
          normRow['ESTADO'] || // En varias hojas de Inventario General, Estado dice "BODEGA ALAMEDA"
          normRow['EDIFICIO'] ||
          sheetName
        ).trim();
        if (rawBranch) branchOccurrences.set(rawBranch, (branchOccurrences.get(rawBranch) || 0) + 1);

        // Fechas
        const rawDate = normRow['FECHA DE INGRESO'] || normRow['FECHA DE SALIDA'] || normRow['PRIMERA ENTREGA'] || normRow['ULTIMA MODIFICACION'];
        if (rawDate && dateSamples.length < 20) {
          dateSamples.push({ raw: rawDate, type: typeof rawDate, sheet: sheetName });
        }

        const cleanSerial = rawSerial.replace(/^['"\s]+|['"\s]+$/g, '').toUpperCase();
        const cleanInv = rawInv.replace(/^['"\s]+|['"\s]+$/g, '').toUpperCase();

        if (cleanSerial && cleanSerial !== 'S/S' && cleanSerial !== 'SIN SERIE' && cleanSerial !== '-' && cleanSerial !== '0' && cleanSerial.length > 2) {
          totalRowsWithSerial++;
          if (!serialMap.has(cleanSerial)) {
            serialMap.set(cleanSerial, { files: [filename], sheets: [sheetName], records: [normRow] });
          } else {
            const entry = serialMap.get(cleanSerial)!;
            if (!entry.files.includes(filename)) entry.files.push(filename);
            if (!entry.sheets.includes(sheetName)) entry.sheets.push(sheetName);
            entry.records.push(normRow);
          }
        } else if (cleanInv && cleanInv !== '-' && cleanInv !== '0') {
          totalRowsWithOnlyInv++;
          if (!invMap.has(cleanInv)) {
            invMap.set(cleanInv, { files: [filename], sheets: [sheetName], records: [normRow] });
          } else {
            const entry = invMap.get(cleanInv)!;
            entry.records.push(normRow);
          }
        } else {
          totalRowsWithoutIdentifier++;
        }
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`MÉTRICAS GLOBALES DE PERFILADO`);
  console.log(`======================================================`);
  console.log(`Total filas de datos procesadas: ${totalRawRows}`);
  console.log(`Filas con Número de Serie válido: ${totalRowsWithSerial} (Únicas: ${serialMap.size})`);
  console.log(`Filas sin serie pero con N° Inventario: ${totalRowsWithOnlyInv} (Únicas: ${invMap.size})`);
  console.log(`Filas sin Identificador (insumos/vacías/resúmenes): ${totalRowsWithoutIdentifier}`);

  let duplicateSerialsCount = 0;
  let crossFileDuplicatesCount = 0;
  for (const [serial, data] of serialMap.entries()) {
    if (data.records.length > 1) duplicateSerialsCount++;
    if (data.files.length > 1) crossFileDuplicatesCount++;
  }

  console.log(`Series duplicadas entre hojas/filas: ${duplicateSerialsCount}`);
  console.log(`Series presentes en AMBOS archivos Excel: ${crossFileDuplicatesCount}`);

  console.log(`\n--- MUESTRA DE FORMATOS DE FECHA ENCONTRADOS ---`);
  console.log(dateSamples);

  console.log(`\n--- PRINCIPALES UBICACIONES / BODEGAS DETECTADAS (Top 15) ---`);
  const topBranches = Array.from(branchOccurrences.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.table(topBranches.map(([b, count]) => ({ Ubicacion: b, Registros: count })));

  console.log(`\n--- PRINCIPALES TIPOS / MODELOS DETECTADOS (Top 15) ---`);
  const topTypes = Array.from(typeOccurrences.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.table(topTypes.map(([t, count]) => ({ Tipo_Modelo: t, Registros: count })));
}

deepProfile();
