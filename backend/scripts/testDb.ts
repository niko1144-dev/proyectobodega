import { prisma } from '../src/config/db.js';

async function main() {
  const users = await prisma.userADCache.count();
  const branches = await prisma.branch.count();
  const assets = await prisma.asset.count();
  const consumables = await prisma.consumable.count();
  console.log({ users, branches, assets, consumables });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
