import { prisma } from '../src/config/db.js';

function normalizeText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function benchmark() {
  console.log('⚡ Cargando usuarios de base de datos...');
  const users = await prisma.userADCache.findMany();
  console.log(`📊 ${users.length} funcionarios cargados.\n`);

  console.time('pre_indexing_time');
  const indexed = users.map(u => {
    const rawRut = u.rut || '';
    const cleanRut = rawRut.replace(/[^0-9kK]/g, '').toLowerCase();
    const isIps = (u.email || '').toLowerCase().includes('@ips.gob.cl') || (u.department || '').toLowerCase().includes('ips');
    const searchIndex = normalizeText(
      `${u.fullName} ${u.firstName || ''} ${u.lastName || ''} ${rawRut} ${cleanRut} ${u.samAccountName} ${u.email} ${u.department || ''} ${u.jobTitle || ''}`
    );
    return {
      ...u,
      _searchIndex: searchIndex,
      _cleanRut: cleanRut,
      _isIps: isIps
    };
  });
  console.timeEnd('pre_indexing_time');

  // Pruebas de búsquedas con cronómetro en microsegundos
  const queries = [
    'carolina flores',
    'flores carolina',
    '15892',
    'patricio',
    'claudia dinamarca',
    'cflores',
    'chileatiende'
  ];

  console.log('\n🚀 Mididendo tiempo de búsqueda en memoria (3.685 usuarios):');
  for (const q of queries) {
    const start = performance.now();
    const searchWords = normalizeText(q).split(/\s+/).filter(Boolean);
    const results = [];
    for (let i = 0; i < indexed.length; i++) {
      const u = indexed[i];
      let match = true;
      for (let j = 0; j < searchWords.length; j++) {
        const w = searchWords[j];
        const cleanW = w.replace(/[^0-9kK]/g, '').toLowerCase();
        const inRut = cleanW.length >= 3 && u._cleanRut.includes(cleanW);
        if (!inRut && !u._searchIndex.includes(w)) {
          match = false;
          break;
        }
      }
      if (match) results.push(u);
    }
    const end = performance.now();
    const durationMs = (end - start).toFixed(3);
    console.log(`   🔎 Query: "${q}" ➔ ${results.length} coincidencias en ${durationMs} ms`);
  }
}

benchmark().finally(() => prisma.$disconnect());
