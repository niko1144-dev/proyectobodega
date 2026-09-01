import { prisma } from '../src/config/db.js';

async function purgeDuplicateUsers() {
  console.log('====================================================');
  console.log('🧹 PURGA Y CONSOLIDACIÓN DE USUARIOS DUPLICADOS');
  console.log('====================================================');

  const beforeCount = await prisma.userADCache.count();
  console.log(`📊 Total inicial en userADCache: ${beforeCount}`);

  // 1. Obtener todos los usuarios con sus conteos de relaciones
  const allUsers = await prisma.userADCache.findMany({
    include: {
      _count: {
        select: {
          assignedAssets: true,
          receivedAssignments: true,
          handledAssignments: true
        }
      }
    }
  });

  // 2. Agrupar por nombre completo normalizado
  const nameGroups = new Map<string, typeof allUsers>();

  allUsers.forEach(u => {
    const key = u.fullName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
    if (!nameGroups.has(key)) nameGroups.set(key, []);
    nameGroups.get(key)!.push(u);
  });

  console.log(`👥 Total de nombres únicos identificados: ${nameGroups.size}`);

  let deletedCount = 0;
  let remappedCount = 0;

  for (const [name, list] of nameGroups.entries()) {
    if (list.length <= 1) continue;

    // Priorizar el mejor registro:
    // 1. Mayor cantidad de relaciones (activos o actas asignadas)
    // 2. Cuentas reales institucionales (sin 'ips_' ni '.mtd' ni 'legacy-')
    // 3. Menor longitud de sAMAccountName (ej: 'fmirandaa' sobre 'ips_fmiranda_713')
    list.sort((a, b) => {
      const aRels = a._count.assignedAssets + a._count.receivedAssignments + a._count.handledAssignments;
      const bRels = b._count.assignedAssets + b._count.receivedAssignments + b._count.handledAssignments;
      if (bRels !== aRels) return bRels - aRels;

      const aIsSynthetic = a.samAccountName.startsWith('ips_') || a.samAccountName.includes('.mtd') || a.adGuid.startsWith('legacy-');
      const bIsSynthetic = b.samAccountName.startsWith('ips_') || b.samAccountName.includes('.mtd') || b.adGuid.startsWith('legacy-');
      if (aIsSynthetic !== bIsSynthetic) return aIsSynthetic ? 1 : -1;

      return a.samAccountName.length - b.samAccountName.length;
    });

    const canonical = list[0];
    const duplicates = list.slice(1);

    for (const dup of duplicates) {
      // Reasignar relaciones si las tiene
      if (dup._count.assignedAssets > 0) {
        await prisma.asset.updateMany({
          where: { assignedToUserId: dup.id },
          data: { assignedToUserId: canonical.id }
        });
        remappedCount += dup._count.assignedAssets;
      }

      if (dup._count.receivedAssignments > 0) {
        await prisma.assignment.updateMany({
          where: { recipientUserId: dup.id },
          data: { recipientUserId: canonical.id }
        });
        remappedCount += dup._count.receivedAssignments;
      }

      if (dup._count.handledAssignments > 0) {
        await prisma.assignment.updateMany({
          where: { technicianUserId: dup.id },
          data: { technicianUserId: canonical.id }
        });
        remappedCount += dup._count.handledAssignments;
      }

      // Eliminar el duplicado
      await prisma.userADCache.delete({
        where: { id: dup.id }
      });
      deletedCount++;
    }
  }

  const afterCount = await prisma.userADCache.count();
  console.log('====================================================');
  console.log(`✅ PURGA COMPLETADA:`);
  console.log(`  • Registros iniciales:    ${beforeCount}`);
  console.log(`  • Duplicados eliminados:  ${deletedCount}`);
  console.log(`  • Relaciones reasignadas: ${remappedCount}`);
  console.log(`  • Total usuarios únicos:  ${afterCount}`);
  console.log('====================================================\n');
}

purgeDuplicateUsers().finally(() => prisma.$disconnect());
