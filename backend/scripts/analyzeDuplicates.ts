import { prisma } from '../src/config/db.js';

async function analyzeDuplicates() {
  console.log('====================================================');
  console.log('🔍 ANÁLISIS DE DUPLICADOS EN BASE DE DATOS');
  console.log('====================================================');

  const totalUsers = await prisma.userADCache.count();
  console.log(`Total de registros en userADCache: ${totalUsers}`);

  const allUsers = await prisma.userADCache.findMany({
    select: {
      id: true,
      adGuid: true,
      samAccountName: true,
      rut: true,
      fullName: true,
      email: true,
      department: true,
      domain: true,
      _count: {
        select: {
          assignedAssets: true,
          receivedAssignments: true,
          handledAssignments: true
        }
      }
    }
  });

  // 1. Agrupar por Nombre Completo Normalizado
  const nameMap = new Map<string, typeof allUsers>();
  const emailMap = new Map<string, typeof allUsers>();
  const rutMap = new Map<string, typeof allUsers>();

  allUsers.forEach(u => {
    const normName = u.fullName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normEmail = (u.email || '').trim().toLowerCase();
    const cleanRut = (u.rut || '').trim().replace(/[^0-9kK]/g, '').toUpperCase();

    if (!nameMap.has(normName)) nameMap.set(normName, []);
    nameMap.get(normName)!.push(u);

    if (normEmail) {
      if (!emailMap.has(normEmail)) emailMap.set(normEmail, []);
      emailMap.get(normEmail)!.push(u);
    }

    if (cleanRut && cleanRut.length >= 7) {
      if (!rutMap.has(cleanRut)) rutMap.set(cleanRut, []);
      rutMap.get(cleanRut)!.push(u);
    }
  });

  // Filtrar grupos con > 1 registro
  const duplicateNames = Array.from(nameMap.entries()).filter(([_, list]) => list.length > 1);
  const duplicateEmails = Array.from(emailMap.entries()).filter(([_, list]) => list.length > 1);
  const duplicateRuts = Array.from(rutMap.entries()).filter(([_, list]) => list.length > 1);

  console.log(`\n👥 Nombres repetidos encontrados: ${duplicateNames.length} nombres distintos`);
  let totalExcessByName = 0;
  duplicateNames.sort((a, b) => b[1].length - a[1].length);

  console.log('\nTop 15 nombres con más duplicados:');
  duplicateNames.slice(0, 15).forEach(([name, list]) => {
    totalExcessByName += (list.length - 1);
    const withAssets = list.filter(u => u._count.assignedAssets > 0 || u._count.receivedAssignments > 0).length;
    console.log(` - "${name}": ${list.length} registros (con activos/actas vinculados: ${withAssets})`);
    list.slice(0, 3).forEach(u => {
      console.log(`     * ID: ${u.id} | SAM: ${u.samAccountName} | RUT: ${u.rut} | Email: ${u.email} | Dept: ${u.department}`);
    });
  });

  console.log(`\n📧 Correos repetidos: ${duplicateEmails.length}`);
  duplicateEmails.slice(0, 5).forEach(([email, list]) => {
    console.log(` - "${email}": ${list.length} registros`);
  });

  console.log(`\n🆔 RUTs repetidos: ${duplicateRuts.length}`);
  duplicateRuts.slice(0, 5).forEach(([rut, list]) => {
    console.log(` - "${rut}": ${list.length} registros`);
  });

  console.log('\n====================================================');
  console.log(`Resumen: Hay aproximadamente ${totalExcessByName} registros duplicados sobrantes.`);
  console.log('====================================================\n');
}

analyzeDuplicates().finally(() => prisma.$disconnect());
