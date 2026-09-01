import { prisma } from '../src/config/db.js';

async function inspectNameDuplicates() {
  const allUsers = await prisma.userADCache.findMany();

  const nameGroups = new Map<string, typeof allUsers>();
  allUsers.forEach(u => {
    const key = u.fullName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key)!.push(u);
  });

  const duplicates = Array.from(nameGroups.entries()).filter(([_, list]) => list.length > 1);
  console.log(`\nTotal de grupos con mismo nombre completo: ${duplicates.length}`);

  let totalDuplicateRows = 0;
  duplicates.sort((a, b) => b[1].length - a[1].length);

  duplicates.forEach(([name, list]) => {
    totalDuplicateRows += (list.length - 1);
    console.log(`\nNombre: "${name}" -> ${list.length} copias:`);
    list.forEach(u => {
      console.log(`   ID: ${u.id} | SAM: ${u.samAccountName} | RUT: ${u.rut} | Email: ${u.email} | Domain: ${u.domain}`);
    });
  });

  console.log(`\nTotal de filas sobrantes por nombre repetido: ${totalDuplicateRows}`);
}

inspectNameDuplicates().finally(() => prisma.$disconnect());
