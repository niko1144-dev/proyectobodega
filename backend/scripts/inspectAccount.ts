import dotenv from 'dotenv';
dotenv.config();

import { Client } from 'ldapts';
import { prisma } from '../src/config/db.js';
import { LdapSyncService } from '../src/services/ldapSyncService.js';
import { LdapService } from '../src/services/ldapService.js';

async function inspect(targetAccount: string) {
  console.log('================================================================');
  console.log(`🔍 DIAGNÓSTICO PROFUNDO DE CUENTA: '${targetAccount}'`);
  console.log('================================================================\n');

  // 1. Verificar en PostgreSQL
  console.log('1️⃣ BUSCANDO EN BASE DE DATOS LOCAL (PostgreSQL):');
  const dbUsers = await prisma.userADCache.findMany({
    where: {
      OR: [
        { samAccountName: { contains: targetAccount, mode: 'insensitive' } },
        { email: { contains: targetAccount, mode: 'insensitive' } },
        { fullName: { contains: targetAccount, mode: 'insensitive' } }
      ]
    }
  });

  if (dbUsers.length > 0) {
    console.log(`✅ Encontrado(s) en PostgreSQL (${dbUsers.length}):`);
    dbUsers.forEach((u, i) => {
      console.log(`  [${i + 1}] samAccountName: ${u.samAccountName} | fullName: ${u.fullName} | email: ${u.email} | rut: ${u.rut} | isActive: ${u.isActive}`);
    });
  } else {
    console.log(`❌ No se encontró '${targetAccount}' en la tabla userADCache.`);
  }

  // 2. Probar mediante LdapService.findUserByUsername
  console.log('\n2️⃣ CONSULTANDO MEDIANTE LdapService.findUserByUsername:');
  try {
    const directUser = await LdapService.findUserByUsername(targetAccount);
    if (directUser) {
      console.log('✅ LdapService encontró el usuario:', JSON.stringify(directUser, null, 2));
    } else {
      console.log(`❌ LdapService.findUserByUsername('${targetAccount}') retornó null.`);
    }
  } catch (err: any) {
    console.error('⚠️ Error en LdapService.findUserByUsername:', err.message);
  }

  // 3. Probar conexión directa a ambos servidores LDAP con múltiples filtros
  const chaConfig = LdapSyncService.getChaConfig();
  const ipsConfig = LdapSyncService.getIpsConfig();

  const testLdapDirect = async (config: any, domainName: string) => {
    console.log(`\n3️⃣ CONSULTANDO DIRECTAMENTE EN ${domainName} (${config.url}):`);
    console.log(`   SearchBase: ${config.searchBase}`);
    console.log(`   BindUser:   ${config.bindDN}`);

    if (!config.password) {
      console.log('   ⚠️ Sin contraseña configurada.');
      return;
    }

    const client = new Client({
      url: config.url,
      timeout: 6000,
      connectTimeout: 4000
    });

    try {
      await client.bind(config.bindDN, config.password);
      console.log('   ✅ Bind exitoso.');

      // Probar múltiples filtros
      const filters = [
        `(&(objectClass=user)(sAMAccountName=${targetAccount}))`,
        `(&(objectClass=user)(sAMAccountName=*${targetAccount}*))`,
        `(&(objectClass=user)(|(mail=*${targetAccount}*)(userPrincipalName=*${targetAccount}*)))`,
        `(&(objectClass=user)(anr=${targetAccount}))`,
        `(sAMAccountName=${targetAccount})`
      ];

      for (const filter of filters) {
        console.log(`\n   🔎 Probando filtro: ${filter}`);
        try {
          const { searchEntries } = await client.search(config.searchBase, {
            scope: 'sub',
            filter,
            attributes: [
              'dn',
              'objectGUID',
              'sAMAccountName',
              'displayName',
              'givenName',
              'sn',
              'mail',
              'userPrincipalName',
              'title',
              'department',
              'description',
              'employeeID',
              'userAccountControl',
              'telephoneNumber',
              'distinguishedName'
            ]
          });

          console.log(`      Resultado: ${searchEntries.length} entrada(s) encontrada(s)`);
          if (searchEntries.length > 0) {
            searchEntries.forEach((entry: any, i: number) => {
              const uac = Number(entry.userAccountControl || 0);
              const isDisabled = (uac & 2) === 2;
              console.log(`      [Entrada ${i + 1}]`);
              console.log(`        DN:                 ${entry.dn}`);
              console.log(`        sAMAccountName:     ${entry.sAMAccountName}`);
              console.log(`        displayName:        ${entry.displayName}`);
              console.log(`        mail:               ${entry.mail}`);
              console.log(`        userPrincipalName:  ${entry.userPrincipalName}`);
              console.log(`        department:         ${entry.department}`);
              console.log(`        title:              ${entry.title}`);
              console.log(`        employeeID:         ${entry.employeeID}`);
              console.log(`        userAccountControl: ${uac} (Deshabilitada: ${isDisabled ? 'SÍ' : 'NO'})`);
            });
            break; // Ya encontramos el usuario
          }
        } catch (searchErr: any) {
          console.error(`      ⚠️ Error en búsqueda: ${searchErr.message}`);
        }
      }

      await client.unbind();
    } catch (bindErr: any) {
      console.error(`   ❌ Error al conectar/bind: ${bindErr.message}`);
      try { await client.unbind(); } catch {}
    }
  };

  await testLdapDirect(chaConfig, 'CHILEATIENDE (cha.cl)');
  await testLdapDirect(ipsConfig, 'IPS (ips.gob.cl)');

  console.log('\n================================================================');
  await prisma.$disconnect();
}

const target = process.argv[2] || 'cfloresc';
inspect(target);
