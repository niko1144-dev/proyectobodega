import { prisma } from '../src/config/db.js';

async function consolidateVariants() {
  const merges = [
    { canonicalSam: 'mpobletec', duplicateSams: ['marcela.poblete.mtd24pg7-0c5k'] },
    { canonicalSam: 'rmackenneys', duplicateSams: ['roy.mackenney.mtd24r0t-p1ij'] },
    { canonicalSam: 'bbrionesv', duplicateSams: ['braulio.briones.mtd24y7i-oqsm', 'braulio.briones.mtd24y8t-9mdr'] },
    { canonicalSam: 'lorena.tortella.mtd24y53-226k', duplicateSams: ['lorena.tortella.mtd24rjx-bbxq'] },
    { canonicalSam: 'ignacio.rojas.m.mtd25eh9-p0oz', duplicateSams: ['ignacio.rojas.m.mtd24qzk-ts45'] },
    { canonicalSam: 'hans.esteban.oe.mtd24sqd-xf4m', duplicateSams: ['hans.esteban.oe.mtd25b99-4vx2'] },
    { canonicalSam: 'rprietob', duplicateSams: ['rodrigo.prieto.mtd25b9n-0c46'] }
  ];

  for (const m of merges) {
    const canonical = await prisma.userADCache.findUnique({ where: { samAccountName: m.canonicalSam } });
    if (!canonical) continue;

    for (const dupSam of m.duplicateSams) {
      const dup = await prisma.userADCache.findUnique({ where: { samAccountName: dupSam } });
      if (!dup) continue;

      // Reasignar activos y actas
      await prisma.asset.updateMany({
        where: { assignedToUserId: dup.id },
        data: { assignedToUserId: canonical.id }
      });
      await prisma.assignment.updateMany({
        where: { recipientUserId: dup.id },
        data: { recipientUserId: canonical.id }
      });
      await prisma.assignment.updateMany({
        where: { technicianUserId: dup.id },
        data: { technicianUserId: canonical.id }
      });

      await prisma.userADCache.delete({ where: { id: dup.id } });
      console.log(`Merged ${dup.fullName} (${dup.samAccountName}) -> ${canonical.fullName} (${canonical.samAccountName})`);
    }
  }

  const finalCount = await prisma.userADCache.count();
  console.log(`Total final de usuarios limpios: ${finalCount}`);
}

consolidateVariants().finally(() => prisma.$disconnect());
