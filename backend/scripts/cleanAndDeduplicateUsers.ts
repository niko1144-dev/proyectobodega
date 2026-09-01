import { prisma } from '../src/config/db.js';

async function cleanAndDeduplicateUsers() {
  console.log('====================================================');
  console.log('🧹 PROCESO DE DEDUPLICACIÓN Y LIMPIEZA DE USUARIOS');
  console.log('====================================================');

  const beforeCount = await prisma.userADCache.count();
  console.log(`📊 Total inicial de registros en userADCache: ${beforeCount}`);

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

  // 2. Agrupar por clave canónica normalizada
  // Usamos el nombre completo normalizado o el RUT limpio
  const groups = new Map<string, typeof allUsers>();

  allUsers.forEach(u => {
    const normName = u.fullName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ');
    const cleanRut = (u.rut || '').trim().replace(/[^0-9kK]/g, '').toUpperCase();

    // Si tiene RUT real de 8 o 9 dígitos usamos el RUT, sino el nombre completo
    const key = (cleanRut.length >= 7 && !cleanRut.startsWith('CHA') && !cleanRut.startsWith('IPS') && !cleanRut.startsWith('USR'))
      ? `RUT:${cleanRut}`
      : `NAME:${normName}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  });

  console.log(`👥 Total de usuarios únicos identificados: ${groups.size}`);

  let deletedCount = 0;
  let remappedRelationsCount = 0;

  for (const [key, userList] of groups.entries()) {
    if (userList.length <= 1) continue;

    // Ordenar para elegir el mejor registro canónico (el que tenga relaciones o correo real)
    userList.sort((a, b) => {
      const aRelations = a._count.assignedAssets + a._count.receivedAssignments + a._count.handledAssignments;
      const bRelations = b._count.assignedAssets + b._count.receivedAssignments + b._count.handledAssignments;
      if (bRelations !== aRelations) return bRelations - aRelations;

      // Preferir cuentas sin prefijo ips_ o guid temporal
      const aIsSynthetic = a.samAccountName.startsWith('ips_') || a.samAccountName.includes('.mtd');
      const bIsSynthetic = b.samAccountName.startsWith('ips_') || b.samAccountName.includes('.mtd');
      if (aIsSynthetic !== bIsSynthetic) return aIsSynthetic ? 1 : -1;

      // Preferir cuentas con correo institucional más completo
      return (b.email || '').length - (a.email || '').length;
    });

    const canonicalUser = userList[0];
    const duplicates = userList.slice(1);

    for (const dup of duplicates) {
      // Si el duplicado tiene activos o actas asignados, reasignar al canónico
      if (dup._count.assignedAssets > 0) {
        await prisma.asset.updateMany({
          where: { assignedToUserId: dup.id },
          data: { assignedToUserId: canonicalUser.id }
        });
        remappedRelationsCount += dup._count.assignedAssets;
      }

      if (dup._count.receivedAssignments > 0) {
        await prisma.assignment.updateMany({
          where: { recipientUserId: dup.id },
          data: { recipientUserId: canonicalUser.id }
        });
        remappedRelationsCount += dup._count.receivedAssignments;
      }

      if (dup._count.handledAssignments > 0) {
        await prisma.assignment.updateMany({
          where: { technicianUserId: dup.id },
          data: { technicianUserId: canonicalUser.id }
        });
        remappedRelationsCount += dup._count.handledAssignments;
      }

      // Eliminar el duplicado sobrante
      await prisma.userADCache.delete({
        where: { id: dup.id }
      });
      deletedCount++;
    }
  }

  const afterCount = await prisma.userADCache.count();
  console.log('====================================================');
  console.log(`✅ LIMPIEZA FINALIZADA EXITOSAMENTE:`);
  console.log(`  • Registros iniciales:      ${beforeCount}`);
  console.log(`  • Registros eliminados:     ${deletedCount}`);
  console.log(`  • Relaciones reasignadas:   ${remappedRelationsCount}`);
  console.log(`  • Registros finales únicos: ${afterCount}`);
  console.log('====================================================\n');
}

cleanAndDeduplicateUsers().finally(() => prisma.$disconnect());
