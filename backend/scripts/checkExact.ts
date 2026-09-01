import { prisma } from '../src/config/db.js';

async function checkExactUsers() {
  const c = await prisma.userADCache.findMany({
    where: {
      fullName: { contains: 'Claudia Flores', mode: 'insensitive' }
    }
  });
  console.log('Claudia Flores in DB:', c);

  const j = await prisma.userADCache.findMany({
    where: {
      fullName: { contains: 'Jose Miguel Ruiz', mode: 'insensitive' }
    }
  });
  console.log('Jose Miguel Ruiz in DB:', j);
}

checkExactUsers().finally(() => prisma.$disconnect());
