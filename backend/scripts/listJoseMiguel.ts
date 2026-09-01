import { prisma } from '../src/config/db.js';

async function listJoseAndMiguel() {
  const users = await prisma.userADCache.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Jose', mode: 'insensitive' } },
        { fullName: { contains: 'Miguel', mode: 'insensitive' } },
        { fullName: { contains: 'Ruiz', mode: 'insensitive' } }
      ]
    },
    select: { fullName: true, samAccountName: true, email: true, rut: true, department: true }
  });

  console.log(`Found ${users.length} users with Jose / Miguel / Ruiz:`);
  users.forEach(u => console.log(` - "${u.fullName}" | ${u.email} | RUT: ${u.rut} | ${u.department}`));
}

listJoseAndMiguel().finally(() => prisma.$disconnect());
