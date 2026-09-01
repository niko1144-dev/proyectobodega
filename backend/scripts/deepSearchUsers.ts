import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseDir = path.resolve(__dirname, '..');

// 1. Search in all xlsx files in backend
const xlsxFiles = fs.readdirSync(baseDir).filter(f => f.endsWith('.xlsx'));
for (const xf of xlsxFiles) {
  const p = path.join(baseDir, xf);
  try {
    const wb = XLSX.readFile(p);
    console.log(`\nSearching in Excel "${xf}" (${wb.SheetNames.length} sheets)...`);
    for (const s of wb.SheetNames) {
      const ws = wb.Sheets[s];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
      rows.forEach((r, idx) => {
        const str = JSON.stringify(r).toLowerCase();
        if (str.includes('ruiz') && (str.includes('jose') || str.includes('miguel'))) {
          console.log(`[${xf} -> Sheet: ${s} -> Row ${idx + 2}]:`, r);
        }
        if (str.includes('claudia') && str.includes('flores')) {
          console.log(`[${xf} -> Sheet: ${s} -> Row ${idx + 2} (Claudia Flores)]:`, r);
        }
      });
    }
  } catch (e: any) {
    console.error(`Error reading ${xf}:`, e.message);
  }
}

// 2. Search in rechazados_inventario.json
const rechazadosPath = path.join(__dirname, 'rechazados_inventario.json');
if (fs.existsSync(rechazadosPath)) {
  const content = fs.readFileSync(rechazadosPath, 'utf8');
  const data = JSON.parse(content);
  console.log(`\nSearching in rechazados_inventario.json (${data.length} records)...`);
  const matches = data.filter((r: any) => {
    const str = JSON.stringify(r).toLowerCase();
    return (str.includes('ruiz') && (str.includes('jose') || str.includes('miguel'))) || (str.includes('claudia') && str.includes('flores'));
  });
  console.log(`Found ${matches.length} matches in rechazados_inventario.json:`, matches);
}
