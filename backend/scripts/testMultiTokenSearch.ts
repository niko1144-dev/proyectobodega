import { prisma } from '../src/config/db.js';

async function testSearch(query: string) {
  const words = query.trim().split(/\s+/).filter(w => w.length > 0);
  const where: any = {};
  if (words.length > 0) {
    where.AND = words.map(w => {
      const cleanW = w.toLowerCase();
      const orConditions: any[] = [
        { fullName: { contains: w, mode: 'insensitive' } },
        { firstName: { contains: w, mode: 'insensitive' } },
        { lastName: { contains: w, mode: 'insensitive' } },
        { samAccountName: { contains: cleanW, mode: 'insensitive' } },
        { email: { contains: cleanW, mode: 'insensitive' } },
        { department: { contains: w, mode: 'insensitive' } },
        { jobTitle: { contains: w, mode: 'insensitive' } },
        { rut: { contains: w, mode: 'insensitive' } }
      ];
      const wordDigits = w.replace(/[^0-9kK]/g, '');
      if (wordDigits.length >= 3) {
        orConditions.push({ rut: { contains: wordDigits, mode: 'insensitive' } });
      }
      return { OR: orConditions };
    });
  }

  const results = await prisma.userADCache.findMany({
    where,
    select: { fullName: true, rut: true, samAccountName: true, email: true },
    take: 5
  });

  console.log(`🔎 Búsqueda: "${query}" -> Encontrados: ${results.length}`);
  results.forEach(r => console.log(`   👉 ${r.fullName} | RUT: ${r.rut} | User: ${r.samAccountName} | Email: ${r.email}`));
}

async function run() {
  console.log('🧪 Probando búsquedas multi-término no contiguas:\n');
  await testSearch('carolina flores');
  await testSearch('flores carolina');
  await testSearch('patricio silva');
  await testSearch('patricio valenzuela');
  await testSearch('silva patricio');
  await testSearch('cflores');
}

run().finally(() => prisma.$disconnect());
