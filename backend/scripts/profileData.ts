import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function profileAll() {
  const files = ['INVENTARIO.xlsx', 'Inventario General TI.xlsx'];
  const summary: any = {};

  for (const filename of files) {
    const filePath = path.resolve(__dirname, '..', filename);
    if (!fs.existsSync(filePath)) continue;

    const wb = XLSX.readFile(filePath);
    summary[filename] = {};

    console.log(`\n======================================================`);
    console.log(`RESUMEN DE HOJAS EN: ${filename}`);
    console.log(`======================================================`);

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
      summary[filename][sheetName] = {
        totalRows: rows.length,
        rawRowsCount: rawRows.length,
        columns: cols,
        sampleRow: rows.length > 0 ? rows[0] : null
      };

      console.log(`📄 [${sheetName}]: ${rows.length} filas. Columnas (${cols.length}): ${cols.join(' | ')}`);
    }
  }

  fs.writeFileSync(
    path.resolve(__dirname, 'data_profiling_summary.json'),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );
  console.log('\n✅ Resumen guardado en backend/scripts/data_profiling_summary.json');
}

profileAll();
