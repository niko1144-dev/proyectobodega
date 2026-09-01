import { prisma } from '../src/config/db.js';

async function purgeDatabase() {
  console.log('🧹 Iniciando vaciado de base de datos PostgreSQL...');
  console.log('🔒 Preservando:');
  console.log('   - Cuenta de Administrador de Plataforma (admin / admin123)');
  console.log('   - Lista de usuarios de Active Directory (userADCache)\n');

  // 1. Desvincular bodegas en usuarios antes de eliminar bodegas
  console.log('1️⃣ Desvinculando referencias de bodegas en usuarios...');
  await prisma.userADCache.updateMany({
    data: { branchId: null }
  });
  await prisma.platformUser.updateMany({
    data: { branchId: null, assignedBranchIds: [] }
  });

  // 2. Eliminar historial, actas y asignaciones
  console.log('2️⃣ Eliminando logs de auditoría, items de asignación y actas...');
  const auditLogs = await prisma.assetAuditLog.deleteMany();
  const assignItems = await prisma.assignmentItem.deleteMany();
  const assignments = await prisma.assignment.deleteMany();

  // 3. Eliminar movimientos de inventario y consumibles
  console.log('3️⃣ Eliminando movimientos de stock y consumibles...');
  const stockMovs = await prisma.stockMovement.deleteMany();
  const consumableStocks = await prisma.consumableStock.deleteMany();
  const consumables = await prisma.consumable.deleteMany();

  // 4. Eliminar activos TI serializados
  console.log('4️⃣ Eliminando equipos y activos TI serializados...');
  const assets = await prisma.asset.deleteMany();

  // 5. Eliminar guías de despacho, órdenes de compra y contratos de arriendo
  console.log('5️⃣ Eliminando guías de despacho, órdenes de compra y contratos...');
  const dispatchGuides = await prisma.dispatchGuide.deleteMany();
  const purchaseOrders = await prisma.purchaseOrder.deleteMany();
  const leasingContracts = await prisma.leasingContract.deleteMany();

  // 6. Eliminar tipos de activo, proveedores y bodegas/sucursales
  console.log('6️⃣ Eliminando tipologías de activo, proveedores y bodegas...');
  const assetTypes = await prisma.assetType.deleteMany();
  const suppliers = await prisma.supplier.deleteMany();
  const branches = await prisma.branch.deleteMany();

  // 7. Limpiar usuarios de plataforma dejando únicamente la cuenta admin
  console.log('7️⃣ Depurando usuarios de plataforma (preservando únicamente a admin)...');
  await prisma.platformUser.deleteMany({
    where: {
      username: { not: 'admin' }
    }
  });

  // Asegurar que admin existe con privilegios totales
  await prisma.platformUser.upsert({
    where: { username: 'admin' },
    update: {
      rut: '14.238.990-1',
      fullName: 'Patricio Alejandro Silva Valenzuela',
      email: 'patricio.silva@chileatiende.cl',
      passwordHash: 'admin123',
      role: 'ADMIN_TI',
      jobTitle: 'Jefe de Infraestructura & ITAM DTI',
      department: 'División Tecnologías de la Información',
      branchId: null,
      assignedBranchIds: [],
      isActive: true
    },
    create: {
      id: 'usr-admin-01',
      rut: '14.238.990-1',
      username: 'admin',
      fullName: 'Patricio Alejandro Silva Valenzuela',
      email: 'patricio.silva@chileatiende.cl',
      passwordHash: 'admin123',
      role: 'ADMIN_TI',
      jobTitle: 'Jefe de Infraestructura & ITAM DTI',
      department: 'División Tecnologías de la Información',
      branchId: null,
      assignedBranchIds: [],
      isActive: true
    }
  });

  // 8. Resumen de verificación
  const remainingADUsers = await prisma.userADCache.count();
  const remainingPlatformUsers = await prisma.platformUser.count();
  const remainingBranches = await prisma.branch.count();
  const remainingAssets = await prisma.asset.count();
  const remainingConsumables = await prisma.consumable.count();
  const remainingAssignments = await prisma.assignment.count();

  console.log('\n========================================================');
  console.log('✅ BASE DE DATOS PURGADA EXITOSAMENTE:');
  console.log(`   - Usuarios Active Directory conservados: ${remainingADUsers}`);
  console.log(`   - Usuarios de Plataforma: ${remainingPlatformUsers} (Cuenta 'admin' activa)`);
  console.log(`   - Bodegas / Sucursales restantes: ${remainingBranches}`);
  console.log(`   - Activos / Equipos restantes: ${remainingAssets}`);
  console.log(`   - Consumibles / Insumos restantes: ${remainingConsumables}`);
  console.log(`   - Asignaciones / Actas restantes: ${remainingAssignments}`);
  console.log('========================================================\n');
}

purgeDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
