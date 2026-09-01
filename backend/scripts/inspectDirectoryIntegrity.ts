import { prisma } from '../src/config/db.js';

async function inspectDirectory() {
  const users = await prisma.userADCache.findMany();
  console.log(`Total en userADCache: ${users.length}`);

  let syntheticCount = 0;
  let realCount = 0;

  users.forEach(u => {
    const isSynthetic = u.samAccountName.includes('.mtd') || 
                        u.samAccountName.startsWith('ips_') || 
                        u.adGuid.startsWith('legacy-') || 
                        (u.rut && (u.rut.startsWith('651') || u.rut.startsWith('724') || u.rut.startsWith('8') && u.rut.length > 10));
    if (isSynthetic) {
      syntheticCount++;
    } else {
      realCount++;
    }
  });

  console.log(`Cuentas con datos sintéticos / generados: ${syntheticCount}`);
  console.log(`Cuentas con formato real de Active Directory: ${realCount}`);
}

inspectDirectory().finally(() => prisma.$disconnect());
