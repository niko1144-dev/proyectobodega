import dotenv from 'dotenv';
dotenv.config();

import { LdapSyncService } from '../src/services/ldapSyncService.js';
import { prisma } from '../src/config/db.js';

async function main() {
  console.log('================================================================');
  console.log('🧹 ITAM CHILEATIENDE - LIMPIEZA Y SINCRONIZACIÓN AD / LDAP');
  console.log('================================================================');

  try {
    console.log('Eliminando datos temporales dependientes (AssignmentItems, Assignments)...');
    await prisma.assignmentItem.deleteMany({});
    await prisma.assignment.deleteMany({});
    
    console.log('Eliminando todos los registros actuales de usuarios en la base de datos (UserADCache)...');
    const deleteResult = await prisma.userADCache.deleteMany({});
    console.log(`✅ Se eliminaron ${deleteResult.count} registros antiguos.`);
    console.log('\nIniciando sincronización desde Active Directory...\n');

    const report = await LdapSyncService.syncDualDirectory();

    console.log('\n================================================================');
    console.log('📋 RESUMEN DE RESULTADOS DE SINCRONIZACIÓN:');
    console.log(`  • Estado General:            ${report.success ? '✅ EXITOSO' : '❌ CON ERRORES'}`);
    console.log(`  • Tiempo de Ejecución:       ${(report.durationMs / 1000).toFixed(2)} segundos`);
    console.log(`  • Total Usuarios Únicos:     ${report.totalConsolidated}`);
    console.log(`  • Insertados en PostgreSQL:  ${report.dbInsertedCount}`);
    console.log('================================================================');

  } catch (error: any) {
    console.error('\n❌ Error crítico durante el proceso:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
