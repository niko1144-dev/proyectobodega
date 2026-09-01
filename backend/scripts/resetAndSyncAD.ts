import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/config/db.js';
import { LdapSyncService } from '../src/services/ldapSyncService.js';

async function resetAndSyncAD() {
  console.log('========================================================================');
  console.log('⚠️  REINICIO TOTAL Y POBLAMIENTO LIMPIO DESDE ACTIVE DIRECTORY (CHA / IPS)');
  console.log('========================================================================');

  console.log('1. Desvinculando referencias temporales en activos y actas...');
  await prisma.asset.updateMany({
    data: { assignedToUserId: null }
  });
  await prisma.assignment.updateMany({
    data: { recipientUserId: null }
  });

  console.log('2. Vaciando completamente la tabla de caché de usuarios (users_ad_cache)...');
  const deleted = await prisma.userADCache.deleteMany({});
  console.log(`   ✅ Se eliminaron ${deleted.count} registros antiguos / sintéticos.`);

  console.log('\n3. Iniciando sincronización oficial desde servidores Active Directory...');
  const report = await LdapSyncService.syncDualDirectory();

  console.log('\n========================================================================');
  console.log('📊 RESULTADO FINAL DEL POBLAMIENTO DIRECTO:');
  console.log(`  • Estado:                ${report.success ? '✅ EXITOSO' : '⚠️ SIN CONEXIÓN LDAP'}`);
  console.log(`  • Funcionarios CHA:      ${report.chaExtracted}`);
  console.log(`  • Funcionarios IPS:      ${report.ipsExtracted}`);
  console.log(`  • Total en Base de Datos:${await prisma.userADCache.count()}`);
  console.log('========================================================================\n');
}

resetAndSyncAD().finally(() => prisma.$disconnect());
