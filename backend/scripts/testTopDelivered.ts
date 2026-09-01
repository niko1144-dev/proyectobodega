import { prisma } from '../src/config/db.js';

async function testTopDelivered() {
  console.log('--- TEST DE CONSULTA TOP 5 PRODUCTOS ENTREGADOS ---');
  
  const assignments = await prisma.assignment.findMany({
    where: {
      status: { not: 'ANULADO' },
      assignmentType: { not: 'DEVOLUCION' }
    },
    include: {
      items: {
        include: {
          asset: { include: { assetType: true } },
          consumable: true
        }
      },
      branch: true,
      recipientUser: true
    }
  });

  console.log(`Total asignaciones encontradas: ${assignments.length}`);
  
  // Simular la agregación
  const productMap = new Map<string, any>();
  let totalDelivered = 0;

  for (const a of assignments) {
    for (const item of a.items) {
      if (item.asset) {
        const name = `${item.asset.brand || ''} ${item.asset.model || ''}`.trim() || item.asset.assetType?.name || 'Equipo TI';
        const key = `HW_${name.toLowerCase()}`;
        const qty = item.quantity || 1;
        totalDelivered += qty;

        const current = productMap.get(key) || { name, category: item.asset.assetType?.name, type: 'HARDWARE', qty: 0, count: 0 };
        current.qty += qty;
        current.count += 1;
        productMap.set(key, current);
      } else if (item.consumable) {
        const name = item.consumable.name;
        const key = `CON_${item.consumable.id}`;
        const qty = item.quantity || 1;
        totalDelivered += qty;

        const current = productMap.get(key) || { name, category: item.consumable.category, type: 'CONSUMABLE', qty: 0, count: 0 };
        current.qty += qty;
        current.count += 1;
        productMap.set(key, current);
      }
    }
  }

  const sorted = Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
  const top5 = sorted.slice(0, 5).map((p, i) => ({
    position: i + 1,
    name: p.name,
    category: p.category,
    type: p.type,
    quantity: p.qty,
    percentage: totalDelivered > 0 ? ((p.qty / totalDelivered) * 100).toFixed(1) + '%' : '0%'
  }));

  console.log('Top 5 calculado:', JSON.stringify(top5, null, 2));
  console.log(`Total unidades entregadas: ${totalDelivered}`);
  console.log('--- TEST EXITOSO ---');
}

testTopDelivered()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
