import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.userADCache.findMany();
  console.log(`Total users in UserADCache: ${users.length}`);
  
  const emails = users.map(u => u.email).filter(Boolean);
  const uniqueEmails = new Set(emails);
  console.log(`Unique emails: ${uniqueEmails.size}`);
  
  const samAccountNames = users.map(u => u.samAccountName).filter(Boolean);
  const uniqueSams = new Set(samAccountNames);
  console.log(`Unique samAccountNames: ${uniqueSams.size}`);
  
  const names = users.map(u => u.fullName).filter(Boolean);
  const uniqueNames = new Set(names);
  console.log(`Unique fullNames: ${uniqueNames.size}`);

  const counts: Record<string, number> = {};
  names.forEach(n => {
    if (n) counts[n] = (counts[n] || 0) + 1;
  });

  const duplicates = Object.entries(counts).filter(([_, count]) => count > 1);
  console.log(`Found ${duplicates.length} duplicate fullNames.`);
  if (duplicates.length > 0) {
    console.log('Sample duplicates:', duplicates.slice(0, 5));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
