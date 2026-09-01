import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Searching for William Franco...');
  
  const byName = await prisma.userADCache.findMany({
    where: {
      OR: [
        { fullName: { contains: 'william franco', mode: 'insensitive' } },
        { firstName: { contains: 'william', mode: 'insensitive' }, lastName: { contains: 'franco', mode: 'insensitive' } }
      ]
    }
  });
  console.log('Exact or very close match:', byName);

  const byFirst = await prisma.userADCache.findMany({
    where: {
      firstName: { contains: 'william', mode: 'insensitive' }
    },
    take: 5
  });
  console.log('Some williams:', byFirst.map(u => u.fullName));

  const byLast = await prisma.userADCache.findMany({
    where: {
      lastName: { contains: 'franco', mode: 'insensitive' }
    },
    take: 5
  });
  console.log('Some francos:', byLast.map(u => u.fullName));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
