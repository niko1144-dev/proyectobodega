import { prisma } from '../src/config/db.js';

async function checkStatus() {
  const ad = await prisma.userADCache.count();
  const pu = await prisma.platformUser.count();
  const br = await prisma.branch.count();
  const ast = await prisma.asset.count();
  const con = await prisma.consumable.count();
  const asg = await prisma.assignment.count();
  const sup = await prisma.supplier.count();
  const po = await prisma.purchaseOrder.count();

  console.log('==============================================');
  console.log('📊 ESTADO ACTUAL DE LA BASE DE DATOS:');
  console.log(`   - Usuarios Active Directory (userADCache): ${ad}`);
  console.log(`   - Usuarios Plataforma (platformUser):      ${pu}`);
  console.log(`   - Bodegas / Sucursales:                    ${br}`);
  console.log(`   - Activos / Equipos serializados:          ${ast}`);
  console.log(`   - Insumos / Consumibles:                   ${con}`);
  console.log(`   - Asignaciones / Actas de Entrega:         ${asg}`);
  console.log(`   - Proveedores:                             ${sup}`);
  console.log(`   - Órdenes de Compra:                       ${po}`);
  console.log('==============================================');
}

checkStatus().finally(() => prisma.$disconnect());
