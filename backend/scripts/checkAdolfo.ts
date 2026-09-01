import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Buscando a Adolfo ---');
  
  // Buscar en UserADCache
  const adUsers = await prisma.userADCache.findMany({
    where: { fullName: { contains: 'adolfo', mode: 'insensitive' } }
  });
  console.log(`Usuarios en UserADCache (Directorio) que coinciden con Adolfo: ${adUsers.length}`);
  adUsers.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.fullName}`));

  // Buscar en PlatformUser
  const pUsers = await prisma.platformUser.findMany({
    where: { fullName: { contains: 'adolfo', mode: 'insensitive' } }
  });
  console.log(`\nUsuarios en PlatformUser que coinciden con Adolfo: ${pUsers.length}`);
  pUsers.forEach(u => console.log(` - ID: ${u.id}, Name: ${u.fullName}`));

  // Buscar asignaciones
  const assignments = await prisma.assignment.findMany({
    include: {
      recipientUser: true,
      items: {
        include: {
          asset: true
        }
      }
    }
  });
  console.log(`\nTotal Asignaciones en BD: ${assignments.length}`);
  assignments.forEach(a => {
    console.log(` - Acta: ${a.actNumber}, Recipient: ${a.recipientUser?.fullName} (ID: ${a.recipientUserId})`);
    a.items.forEach(i => console.log(`   * Item: Asset ID ${i.assetId} - Consumable ID ${i.consumableId} - Returned? ${i.isReturned}`));
  });

}

main().catch(console.error).finally(() => prisma.$disconnect());
