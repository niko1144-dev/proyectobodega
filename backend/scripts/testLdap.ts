import { Client } from 'ldapts';
import dotenv from 'dotenv';
dotenv.config();

async function testLdap(passwordInput?: string) {
  const url = process.env.LDAP_URL || 'ldap://scha01.cha.cl:389';
  const user = process.env.LDAP_BIND_USER || 'ngalarceg.srv@chileatiende.cl';
  const password = passwordInput || process.env.LDAP_BIND_PASSWORD;
  const baseDN = process.env.LDAP_BASE_DN || 'DC=cha,DC=cl';

  console.log('----------------------------------------------------');
  console.log('🔍 PROBADOR DE CONEXIÓN ACTIVE DIRECTORY / LDAP');
  console.log('----------------------------------------------------');
  console.log(`🌐 Servidor LDAP: ${url}`);
  console.log(`👤 Usuario Bind:  ${user}`);
  console.log(`📁 Base DN:       ${baseDN}`);
  console.log('----------------------------------------------------');

  if (!password) {
    console.error('❌ Error: Debe ingresar la contraseña como argumento o definir LDAP_BIND_PASSWORD en .env');
    console.log('\nUso: npx tsx scripts/testLdap.ts "TuPassword"');
    process.exit(1);
  }

  const client = new Client({
    url,
    timeout: 5000,
    connectTimeout: 5000
  });

  try {
    console.log('⏳ Intentando autenticación (Bind)...');
    await client.bind(user, password);
    console.log('✅ ¡Autenticación (Bind) exitosa contra Active Directory!');

    console.log('⏳ Probando consulta de búsqueda de usuarios...');
    const { searchEntries } = await client.search(baseDN, {
      scope: 'sub',
      filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(!(sAMAccountName=*$)))',
      sizeLimit: 10,
      attributes: ['sAMAccountName', 'displayName', 'mail', 'title', 'department', 'description', 'employeeID']
    });

    console.log(`✅ ¡Búsqueda exitosa! Se obtuvieron ${searchEntries.length} usuarios de muestra:`);
    searchEntries.forEach((entry: any, i: number) => {
      console.log(`\n  [${i + 1}] Funcionario:`);
      console.log(`      Usuario:      ${entry.sAMAccountName}`);
      console.log(`      Nombre:       ${entry.displayName}`);
      console.log(`      Correo:       ${entry.mail}`);
      console.log(`      Cargo:        ${entry.title || '(No definido)'}`);
      console.log(`      Departamento: ${entry.department || '(No definido)'}`);
    });

    await client.unbind();
    console.log('\n🎉 ¡La integración LDAP está lista y funcionando al 100%!');
  } catch (error: any) {
    try { await client.unbind(); } catch {}
    console.error('\n❌ Error al conectar con Active Directory:');
    console.error(error.message);
  }
}

const argPassword = process.argv[2];
testLdap(argPassword);
