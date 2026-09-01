import xlsxModule from 'xlsx';
const XLSX = (xlsxModule as any).default || xlsxModule;
import * as path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../src/config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const excelPath = path.resolve(__dirname, '../Inventario_General_TI_optimizado.xlsx');
const workbook = XLSX.readFile(excelPath);
const baseSheet = workbook.Sheets['BASE'];
const baseData = XLSX.utils.sheet_to_json(baseSheet, { defval: '' }) as any[];

async function checkUserMatching() {
  const adUsers = await prisma.userADCache.findMany({
    select: { id: true, fullName: true, samAccountName: true, rut: true, email: true }
  });
  console.log(`Total AD Users in DB: ${adUsers.length}`);

  const normalize = (t: string) => (t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  const userMap = new Map<string, typeof adUsers[0]>();
  for (const u of adUsers) {
    userMap.set(normalize(u.fullName), u);
    const parts = u.fullName.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      userMap.set(normalize(`${parts[0]} ${parts[parts.length - 1]}`), u); // Nombre Apellido
    }
  }

  const assignedRows = baseData.filter(r => r['ASIGNADO A'] && String(r['ASIGNADO A']).trim());
  console.log(`Rows with "ASIGNADO A": ${assignedRows.length}`);

  let matched = 0;
  let unmatched = 0;
  const unmatchedNames = new Set<string>();

  for (const r of assignedRows) {
    const rawName = String(r['ASIGNADO A']).trim();
    const norm = normalize(rawName);

    let found = userMap.get(norm);
    if (!found) {
      // Try partial matching
      const candidates = adUsers.filter(u => {
        const uNorm = normalize(u.fullName);
        const parts = rawName.split(' ').filter(Boolean).map(normalize);
        return parts.every(p => uNorm.includes(p));
      });
      if (candidates.length === 1) {
        found = candidates[0];
      }
    }

    if (found) {
      matched++;
    } else {
      unmatched++;
      unmatchedNames.add(rawName);
    }
  }

  console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
  console.log(`Unmatched distinct names (${unmatchedNames.size}):`, Array.from(unmatchedNames).slice(0, 30));
}

checkUserMatching().finally(() => prisma.$disconnect());
