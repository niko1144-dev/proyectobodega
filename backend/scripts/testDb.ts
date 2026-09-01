import { prisma } from '../src/config/db.js';

async function main() {
  const totalUsers = await prisma.userADCache.count();
  const chaEmails = await prisma.userADCache.count({ where: { email: { contains: 'chileatiende.cl' } } });
  const ipsEmails = await prisma.userADCache.count({ where: { email: { contains: 'ips.gob.cl' } } });
  const sampleUsers = await prisma.userADCache.findMany({ take: 5, select: { samAccountName: true, email: true, fullName: true, rut: true } });
  console.log({ totalUsers, chaEmails, ipsEmails, sampleUsers });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
