import { prisma } from '../src/config/db.js';

async function searchUsers() {
  console.log('Searching for Claudia Flores...');
  const claudiaMatches = await prisma.userADCache.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Claudia', mode: 'insensitive' } },
        { fullName: { contains: 'Flores', mode: 'insensitive' } },
        { firstName: { contains: 'Claudia', mode: 'insensitive' } },
        { lastName: { contains: 'Flores', mode: 'insensitive' } },
        { samAccountName: { contains: 'claudia', mode: 'insensitive' } },
        { samAccountName: { contains: 'flores', mode: 'insensitive' } },
        { email: { contains: 'claudia', mode: 'insensitive' } },
        { email: { contains: 'flores', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Found ${claudiaMatches.length} matches for Claudia/Flores:`);
  claudiaMatches.forEach(u => {
    console.log(` - ID: ${u.id} | Name: "${u.fullName}" | Username: "${u.samAccountName}" | Email: "${u.email}" | RUT: "${u.rut}"`);
  });

  console.log('\nSearching for Jose Miguel Ruiz...');
  const joseMatches = await prisma.userADCache.findMany({
    where: {
      OR: [
        { fullName: { contains: 'Jose', mode: 'insensitive' } },
        { fullName: { contains: 'Ruiz', mode: 'insensitive' } },
        { firstName: { contains: 'Jose', mode: 'insensitive' } },
        { lastName: { contains: 'Ruiz', mode: 'insensitive' } },
        { samAccountName: { contains: 'jose', mode: 'insensitive' } },
        { samAccountName: { contains: 'ruiz', mode: 'insensitive' } },
        { email: { contains: 'jose', mode: 'insensitive' } },
        { email: { contains: 'ruiz', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Found ${joseMatches.length} matches for Jose/Ruiz:`);
  joseMatches.forEach(u => {
    console.log(` - ID: ${u.id} | Name: "${u.fullName}" | Username: "${u.samAccountName}" | Email: "${u.email}" | RUT: "${u.rut}"`);
  });
}

searchUsers().finally(() => prisma.$disconnect());
