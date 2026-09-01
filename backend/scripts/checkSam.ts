import { prisma } from '../src/config/db.js';

async function checkCfloresc() {
  const u = await prisma.userADCache.findMany({
    where: {
      OR: [
        { samAccountName: { contains: 'cflores', mode: 'insensitive' } },
        { samAccountName: { contains: 'jruiz', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Users with cflores or jruiz samAccountName:', u);
}

checkCfloresc().finally(() => prisma.$disconnect());
