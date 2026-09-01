import { LdapSyncService, LdapDomainConnectionConfig } from '../src/services/ldapSyncService.js';
import { prisma } from '../src/config/db.js';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 VERIFICACIÓN DE REGLAS DE NEGOCIO - SINCRONIZACIÓN DUAL LDAP');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${testName}`);
      failed++;
    }
  }

  const mockChaConfig: LdapDomainConnectionConfig = {
    domain: 'CHILEATIENDE',
    name: 'Active Directory ChileAtiende (cha.cl)',
    url: 'ldap://mock-scha01.cha.cl:389',
    bindDN: 'srv@cha.cl',
    searchBase: 'DC=cha,DC=cl',
    defaultEmailDomain: 'cha.cl',
    accountSuffix: '@chileatiende.cl',
    timeoutMs: 1000,
    connectTimeoutMs: 1000,
    isEnabled: true
  };

  const mockIpsConfig: LdapDomainConnectionConfig = {
    domain: 'IPS',
    name: 'Active Directory IPS (ips.gob.cl)',
    url: 'ldap://mock-dc05.ips.gob.cl:389',
    bindDN: 'srv@ips.gob.cl',
    searchBase: 'DC=ips,DC=gob,DC=cl',
    defaultEmailDomain: 'ips.gob.cl',
    accountSuffix: '@ips.gob.cl',
    timeoutMs: 1000,
    connectTimeoutMs: 1000,
    isEnabled: true
  };

  // -------------------------------------------------------------
  // ESCENARIO 1: Usuario presente en ambos dominios (Dual-Dominio)
  // -------------------------------------------------------------
  console.log('🔹 Prueba 1: Prevalencia de correo @cha.cl y no sobreescritura desde IPS');
  const chaEntries = [
    {
      sAMAccountName: 'JPEREZ',
      displayName: 'Juan Perez Gonzalez',
      givenName: 'Juan',
      sn: 'Perez',
      mail: 'juan.perez@cha.cl',
      userPrincipalName: 'jperez@chileatiende.cl',
      employeeID: '12345678-9',
      department: 'ChileAtiende',
      title: 'Funcionario'
    }
  ];

  const ipsEntries = [
    {
      sAMAccountName: 'jperez', // Misma cuenta en minúsculas
      displayName: 'Juan Perez Gonzalez (IPS)',
      givenName: 'Juan',
      sn: 'Perez',
      mail: 'juan.perez@ips.gob.cl', // Correo IPS que NO debe reemplazar al de CHA
      userPrincipalName: 'jperez@ips.gob.cl',
      employeeID: '12345678-9',
      department: 'Departamento Beneficios IPS',
      title: 'Analista Previsional Senior'
    }
  ];

  const { consolidatedMap: map1, stats: stats1 } = LdapSyncService.consolidateUsers(
    chaEntries,
    ipsEntries,
    mockChaConfig,
    mockIpsConfig
  );

  assert(map1.size === 1, 'No se duplicó el usuario en el Map (tamaño = 1)');
  const u1 = map1.get('jperez');
  assert(!!u1, 'Usuario encontrado por clave en minúsculas "jperez"');
  assert(u1?.email === 'juan.perez@cha.cl', `El correo prevalece como @cha.cl (actual: ${u1?.email})`);
  assert(u1?.isDualDomain === true, 'Marcado correctamente como isDualDomain = true');
  assert(u1?.chaExists === true && u1?.ipsExists === true, 'chaExists y ipsExists son true');
  assert(stats1.dualCount === 1, 'Contador dualCount es 1');

  // -------------------------------------------------------------
  // ESCENARIO 2: Enriquecimiento de RUT y cargo cuando CHA no tenía RUT
  // -------------------------------------------------------------
  console.log('\n🔹 Prueba 2: Enriquecimiento de datos desde IPS si en CHA faltaban');
  const chaEntriesNoRut = [
    {
      sAMAccountName: 'mrojas',
      displayName: 'Maria Rojas Tapia',
      mail: 'mrojas@cha.cl',
      employeeID: '', // Sin RUT en CHA
      department: 'ChileAtiende'
    }
  ];
  const ipsEntriesWithRut = [
    {
      sAMAccountName: 'MROJAS',
      displayName: 'Maria Rojas Tapia',
      mail: 'mrojas@ips.gob.cl',
      employeeID: '15.678.901-2', // Con RUT en IPS
      department: 'División Canales de Atención',
      title: 'Supervisora de Plataforma'
    }
  ];

  const { consolidatedMap: map2 } = LdapSyncService.consolidateUsers(
    chaEntriesNoRut,
    ipsEntriesWithRut,
    mockChaConfig,
    mockIpsConfig
  );

  const u2 = map2.get('mrojas');
  assert(u2?.email === 'mrojas@cha.cl', 'Correo se mantiene @cha.cl');
  assert(u2?.rut === '15678901-2', `RUT enriquecido correctamente desde IPS (actual: ${u2?.rut})`);
  assert(u2?.hasOfficialRut === true, 'hasOfficialRut es true tras enriquecimiento');
  assert(u2?.jobTitle === 'Supervisora de Plataforma', 'Cargo actualizado desde IPS');

  // -------------------------------------------------------------
  // ESCENARIO 3: Usuario exclusivo de IPS
  // -------------------------------------------------------------
  console.log('\n🔹 Prueba 3: Registro de funcionario exclusivo de IPS con @ips.gob.cl');
  const chaEntriesEmpty: any[] = [];
  const ipsOnlyEntries = [
    {
      sAMAccountName: 'csilva',
      displayName: 'Carlos Silva Morales',
      givenName: 'Carlos',
      sn: 'Silva',
      mail: 'carlos.silva@ips.gob.cl',
      employeeID: '16.789.012-3',
      department: 'Unidad de Auditoría Interna',
      title: 'Auditor de Procesos'
    }
  ];

  const { consolidatedMap: map3, stats: stats3 } = LdapSyncService.consolidateUsers(
    chaEntriesEmpty,
    ipsOnlyEntries,
    mockChaConfig,
    mockIpsConfig
  );

  assert(map3.size === 1, 'Tamaño del mapa = 1');
  const u3 = map3.get('csilva');
  assert(u3?.primaryDomain === 'IPS', 'primaryDomain es IPS');
  assert(u3?.email === 'carlos.silva@ips.gob.cl', `Correo asignado como @ips.gob.cl (actual: ${u3?.email})`);
  assert(u3?.chaExists === false, 'chaExists es false');
  assert(u3?.ipsExists === true, 'ipsExists es true');
  assert(stats3.ipsOnlyCount === 1, 'ipsOnlyCount es 1');

  // -------------------------------------------------------------
  // ESCENARIO 4: Prueba de Persistencia Upsert en PostgreSQL
  // -------------------------------------------------------------
  console.log('\n🔹 Prueba 4: Persistencia y Upsert en PostgreSQL');
  const testConsolidatedList = [u1!, u2!, u3!];
  const persistResult = await LdapSyncService.persistConsolidatedUsers(testConsolidatedList);
  assert(persistResult.errors === 0, `Persistencia completada sin errores (errores: ${persistResult.errors})`);

  // Verificar en BD
  const dbUser1 = await prisma.userADCache.findUnique({ where: { samAccountName: 'jperez' } });
  assert(dbUser1?.email === 'juan.perez@cha.cl', `En BD el correo de jperez es @cha.cl: ${dbUser1?.email}`);

  const dbUser3 = await prisma.userADCache.findUnique({ where: { samAccountName: 'csilva' } });
  assert(dbUser3?.email === 'carlos.silva@ips.gob.cl', `En BD el correo de csilva es @ips.gob.cl: ${dbUser3?.email}`);

  console.log('\n================================================================');
  console.log(`🏁 RESULTADOS: ${passed} pruebas pasadas, ${failed} falladas.`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests()
  .catch((err) => {
    console.error('Error en pruebas:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
