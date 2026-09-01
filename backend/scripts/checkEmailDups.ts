import { prisma } from '../src/config/db.js';

async function checkEmailDuplicates() {
  const users = await prisma.userADCache.findMany();
  const emailMap = new Map<string, typeof users>();

  users.forEach(u => {
    const e = (u.email || '').trim().toLowerCase();
    if (e && !e.startsWith('ips_') && e.includes('@')) {
      if (!emailMap.has(e)) emailMap.set(e, []);
      emailMap.get(e)!.push(u);
    }
  });

  const dups = Array.from(emailMap.entries()).filter(([_, list]) => list.length > 1);
  console.log(`Grupos con correo repetido: ${dups.length}`);
  dups.forEach(([email, list]) => {
    console.log(`\nEmail: ${email}`);
    list.forEach(u => console.log(` - ID: ${u.id} | Name: "${u.fullName}" | SAM: ${u.samAccountName} | RUT: ${u.rut}`));
  });
}

checkEmailDuplicates().finally(() => prisma.$disconnect());
