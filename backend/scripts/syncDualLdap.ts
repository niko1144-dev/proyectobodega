import dotenv from 'dotenv';
dotenv.config();

import { LdapSyncService } from '../src/services/ldapSyncService.js';
import { prisma } from '../src/config/db.js';

async function main() {
  console.log('================================================================');
  console.log('🏢 ITAM CHILEATIENDE - SINCRONIZADOR DUAL ACTIVE DIRECTORY / LDAP');
  console.log('   Dominios: ChileAtiende (cha.cl) + IPS (ips.gob.cl)');
  console.log('================================================================');

  try {
    const report = await LdapSyncService.syncDualDirectory();

    console.log('\n================================================================');
    console.log('📋 RESUMEN DE RESULTADOS:');
    console.log(`  • Estado General:            ${report.success ? '✅ EXITOSO' : '❌ CON ERRORES'}`);
    console.log(`  • Tiempo de Ejecución:       ${(report.durationMs / 1000).toFixed(2)} segundos`);
    console.log(`  • Total Usuarios Únicos:     ${report.totalConsolidated}`);
    console.log(`  • Extraídos de cha.cl:       ${report.chaExtracted}`);
    console.log(`  • Extraídos de ips.gob.cl:   ${report.ipsExtracted}`);
    console.log(`  • Cuentas Dual-Dominio:      ${report.dualDomainCount} (vinculadas por sAMAccountName, correo @cha.cl preservado)`);
    console.log(`  • Cuentas Solo ChileAtiende: ${report.chaOnlyCount}`);
    console.log(`  • Cuentas Solo IPS:          ${report.ipsOnlyCount} (registradas con @ips.gob.cl)`);
    console.log(`  • Insertados en PostgreSQL:  ${report.dbInsertedCount}`);
    console.log(`  • Actualizados en PostgreSQL:${report.dbUpdatedCount}`);
    console.log(`  • Errores de Persistencia:   ${report.dbErrorsCount}`);
    console.log('================================================================');

    console.log('\n🌐 ESTADO DE CONECTIVIDAD POR DOMINIO:');
    console.log(`  [1] ChileAtiende (${report.domains.chileatiende.url}):`);
    console.log(`      - Conectado: ${report.domains.chileatiende.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`      - Registros: ${report.domains.chileatiende.extractedCount}`);
    if (report.domains.chileatiende.error) {
      console.log(`      - Error:     ${report.domains.chileatiende.error}`);
    }

    console.log(`  [2] IPS (${report.domains.ips.url}):`);
    console.log(`      - Conectado: ${report.domains.ips.success ? '✅ SÍ' : '❌ NO'}`);
    console.log(`      - Registros: ${report.domains.ips.extractedCount}`);
    if (report.domains.ips.error) {
      console.log(`      - Error:     ${report.domains.ips.error}`);
    }
    console.log('================================================================\n');

    const totalInDb = await prisma.userADCache.count();
    console.log(`📦 Total de funcionarios activos en PostgreSQL (userADCache): ${totalInDb}\n`);

  } catch (error: any) {
    console.error('\n❌ Error crítico durante la sincronización dual:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
