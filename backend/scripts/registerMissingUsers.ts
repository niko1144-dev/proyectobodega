import { prisma } from '../src/config/db.js';

async function updateUsers() {
  // 1. Limpiar y normalizar registro de Claudia Flores Cuevas
  const claudia = await prisma.userADCache.findFirst({
    where: { fullName: 'Claudia Flores Cuevas' }
  });

  if (claudia) {
    await prisma.userADCache.update({
      where: { id: claudia.id },
      data: {
        email: 'claudia.flores@chileatiende.cl',
        samAccountName: 'cflorescu'
      }
    });
    console.log('✅ Actualizado registro de Claudia Flores Cuevas: email -> claudia.flores@chileatiende.cl, sam -> cflorescu');
  }

  // 2. Comprobar o crear Jose Miguel Ruiz
  const jose = await prisma.userADCache.findFirst({
    where: { fullName: { contains: 'Jose Miguel Ruiz', mode: 'insensitive' } }
  });

  if (!jose) {
    const newJose = await prisma.userADCache.create({
      data: {
        adGuid: `guid-cha-jmruizm-${Date.now()}`,
        samAccountName: 'jmruizm',
        rut: '12.845.621-3',
        firstName: 'José Miguel',
        lastName: 'Ruiz Morales',
        fullName: 'José Miguel Ruiz Morales',
        email: 'jose.ruiz@chileatiende.cl',
        jobTitle: 'Profesional TI / Funcionario Asignable',
        department: 'División de Tecnologías de la Información (DTI)',
        domain: 'cha.cl',
        role: 'FUNCIONARIO',
        isActive: true,
        lastSyncedAt: new Date()
      }
    });
    console.log('✅ Creado registro para José Miguel Ruiz Morales:', newJose.fullName, newJose.email, newJose.rut);
  }
}

updateUsers().finally(() => prisma.$disconnect());
