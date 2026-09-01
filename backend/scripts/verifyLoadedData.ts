import { prisma } from '../src/config/db.js';

async function verifyLoadedData() {
  const assetCount = await prisma.asset.count();
  const branchCount = await prisma.branch.count();
  const typeCount = await prisma.assetType.count();
  const assignmentCount = await prisma.assignment.count();
  const consumableCount = await prisma.consumable.count();
  const stockCount = await prisma.consumableStock.count();
  const auditLogCount = await prisma.assetAuditLog.count();
  const userCount = await prisma.userADCache.count();
  const platformUsers = await prisma.platformUser.count();

  console.log('--- REPORTE DE VERIFICACIÓN POST-CARGA ---');
  console.log(`Activos en BD: ${assetCount}`);
  console.log(`Bodegas/Sucursales: ${branchCount}`);
  console.log(`Tipologías de Hardware: ${typeCount}`);
  console.log(`Actas de Asignación: ${assignmentCount}`);
  console.log(`Consumibles / Insumos: ${consumableCount}`);
  console.log(`Registros de Stock por Bodega: ${stockCount}`);
  console.log(`Logs de Auditoría: ${auditLogCount}`);
  console.log(`Usuarios en Directorio: ${userCount}`);
  console.log(`Usuarios de Plataforma: ${platformUsers}`);

  // Breakdown by Status
  const statusGroup = await prisma.asset.groupBy({
    by: ['status'],
    _count: { id: true }
  });
  console.log('\nDistribución por Estado:');
  statusGroup.forEach(g => console.log(` - ${g.status}: ${g._count.id}`));

  // Breakdown by Property Type
  const propGroup = await prisma.asset.groupBy({
    by: ['propertyType'],
    _count: { id: true }
  });
  console.log('\nDistribución por Modalidad:');
  propGroup.forEach(g => console.log(` - ${g.propertyType}: ${g._count.id}`));

  // Sample Assets
  const sample = await prisma.asset.findMany({
    take: 3,
    include: { assetType: true, currentBranch: true, assignedToUser: true }
  });
  console.log('\nEjemplos de Activos:');
  sample.forEach(s => {
    console.log(` - Serie: ${s.serialNumber}, Inv: ${s.inventoryNumber || 'N/A'}, Modelo: ${s.brand} ${s.model}, Tipo: ${s.assetType.name}, Estado: ${s.status}, Bodega: ${s.currentBranch.name}, Asignado: ${s.assignedToUserName || 'Bodega'}`);
  });
}

verifyLoadedData().finally(() => prisma.$disconnect());
