import { prisma } from '../src/config/db.js';

async function seedCflores() {
  const branches = await prisma.branch.findMany();
  const defaultBranchId = branches.length > 0 ? branches[0].id : null;

  const user = await prisma.userADCache.upsert({
    where: { samAccountName: 'cfloresc' },
    update: {
      fullName: 'Carolina Andrea Flores Carrasco',
      firstName: 'Carolina',
      lastName: 'Flores Carrasco',
      email: 'carolina.flores@ips.gob.cl',
      rut: '15.892.341-8',
      jobTitle: 'Analista de Operaciones y Servicios IPS',
      department: 'Instituto de Previsión Social (IPS)',
      branchId: defaultBranchId,
      isActive: true,
      lastSyncedAt: new Date()
    },
    create: {
      adGuid: `guid-ips-cfloresc-${Date.now()}`,
      samAccountName: 'cfloresc',
      rut: '15.892.341-8',
      firstName: 'Carolina',
      lastName: 'Flores Carrasco',
      fullName: 'Carolina Andrea Flores Carrasco',
      email: 'carolina.flores@ips.gob.cl',
      jobTitle: 'Analista de Operaciones y Servicios IPS',
      department: 'Instituto de Previsión Social (IPS)',
      branchId: defaultBranchId,
      role: 'FUNCIONARIO',
      isActive: true,
      lastSyncedAt: new Date()
    }
  });

  console.log('✅ Funcionario cfloresc registrado exitosamente en userADCache:', user.fullName);
}

seedCflores()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
