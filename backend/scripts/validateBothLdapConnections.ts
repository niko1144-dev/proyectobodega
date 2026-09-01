import dotenv from 'dotenv';
dotenv.config();

import { Client } from 'ldapts';
import * as net from 'net';
import * as dns from 'dns/promises';

interface DomainTestConfig {
  domainKey: string;
  domainName: string;
  urls: string[];
  bindUser: string;
  bindPass: string;
  baseDN: string;
  timeoutMs: number;
}

// 1. Helper para probar conectividad TCP a nivel de socket
async function testTcpSocket(host: string, port: number, timeoutMs = 3000): Promise<{ reachable: boolean; ip?: string; latencyMs?: number; error?: string }> {
  const start = Date.now();
  let ipResolved: string | undefined;

  try {
    const lookup = await dns.lookup(host);
    ipResolved = lookup.address;
  } catch (err: any) {
    return { reachable: false, error: `Error DNS: ${err.code || err.message}` };
  }

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      if (!isResolved) {
        isResolved = true;
        const latencyMs = Date.now() - start;
        socket.destroy();
        resolve({ reachable: true, ip: ipResolved, latencyMs });
      }
    });

    socket.on('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ reachable: false, ip: ipResolved, error: `Socket Timeout (${timeoutMs}ms)` });
      }
    });

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve({ reachable: false, ip: ipResolved, error: `Socket Error: ${err.message}` });
      }
    });
  });
}

function parseLdapUrl(urlStr: string): { host: string; port: number; isSsl: boolean } {
  try {
    const isSsl = urlStr.startsWith('ldaps://');
    const clean = urlStr.replace(/^ldaps?:\/\//, '');
    const parts = clean.split(':');
    const host = parts[0];
    const port = parts[1] ? parseInt(parts[1], 10) : (isSsl ? 636 : 389);
    return { host, port, isSsl };
  } catch {
    return { host: urlStr, port: 389, isSsl: false };
  }
}

async function validateDomain(config: DomainTestConfig) {
  console.log(`\n========================================================================`);
  console.log(`🔍 VALIDANDO CONEXIÓN A: ${config.domainName} (${config.domainKey})`);
  console.log(`========================================================================`);
  console.log(`👤 Usuario Bind:  ${config.bindUser}`);
  console.log(`🔑 Contraseña:    ${config.bindPass ? '******** (definida)' : '❌ NO DEFINIDA'}`);
  console.log(`📁 Base DN:       ${config.baseDN}`);

  // Paso 1: Pruebas de Socket TCP y DNS
  console.log(`\n📡 [Paso 1: Diagnóstico de Red y Puertos TCP]:`);
  let workingUrl: string | null = null;

  for (const url of config.urls) {
    const { host, port, isSsl } = parseLdapUrl(url);
    process.stdout.write(`   • Probando ${url} (${host}:${port})... `);
    const tcp = await testTcpSocket(host, port, config.timeoutMs);

    if (tcp.reachable) {
      console.log(`✅ CONECTADO (IP: ${tcp.ip}, Latencia: ${tcp.latencyMs}ms)`);
      if (!workingUrl) workingUrl = url;
    } else {
      console.log(`❌ NO DISPONIBLE (${tcp.error || 'Sin respuesta'}${tcp.ip ? ` - IP: ${tcp.ip}` : ''})`);
    }
  }

  // Paso 2: Autenticación LDAP Bind y Búsqueda
  const targetUrl = workingUrl || config.urls[0];
  console.log(`\n🔐 [Paso 2: Autenticación Bind y Consulta LDAP en ${targetUrl}]:`);

  const client = new Client({
    url: targetUrl,
    timeout: config.timeoutMs,
    connectTimeout: config.timeoutMs,
    strictDN: false
  });

  try {
    process.stdout.write(`   • Ejecutando LDAP Bind como ${config.bindUser}... `);
    const bindStart = Date.now();
    await client.bind(config.bindUser, config.bindPass);
    const bindDuration = Date.now() - bindStart;
    console.log(`✅ AUTENTICACIÓN EXITOSA (${bindDuration}ms)`);

    // Paso 3: Búsqueda de prueba de usuarios
    console.log(`\n📋 [Paso 3: Búsqueda de muestra en ${config.baseDN}]:`);
    const searchStart = Date.now();
    const { searchEntries } = await client.search(config.baseDN, {
      scope: 'sub',
      filter: '(&(objectClass=user)(!(sAMAccountName=*$)))',
      sizeLimit: 3,
      attributes: [
        'sAMAccountName',
        'displayName',
        'mail',
        'userPrincipalName',
        'title',
        'department',
        'employeeID',
        'description',
        'userAccountControl'
      ]
    });
    const searchDuration = Date.now() - searchStart;

    console.log(`   ✅ Búsqueda exitosa (${searchDuration}ms). Muestra de ${searchEntries.length} usuarios:`);
    searchEntries.forEach((entry: any, i: number) => {
      const sam = entry.sAMAccountName;
      const name = entry.displayName || '(Sin nombre)';
      const mail = entry.mail || entry.userPrincipalName || '(Sin correo)';
      const rut = entry.employeeID || entry.description || '(No informado)';
      const dept = entry.department || '(No informado)';
      const title = entry.title || '(No informado)';
      console.log(`     [${i + 1}] ${sam} | ${name} | ${mail} | RUT: ${rut} | ${title} - ${dept}`);
    });

    await client.unbind();
    return { success: true, url: targetUrl, sampleCount: searchEntries.length };
  } catch (err: any) {
    try { await client.unbind(); } catch {}
    console.log(`❌ ERROR: ${err.message || err}`);
    return { success: false, url: targetUrl, error: err.message || String(err) };
  }
}

async function main() {
  console.log('========================================================================');
  console.log('🛡️  ITAM CHILEATIENDE - DIAGNÓSTICO INTEGRAL DE CONEXIONES LDAP DUAL');
  console.log('========================================================================');

  const chaUrls = [
    process.env.LDAP_CHA_HOST || process.env.LDAP_CHA_URL || 'ldap://scha01.cha.cl:389',
    process.env.LDAP_CHA_BACKUP_URL || 'ldap://dc02.cha.cl:389',
    'ldap://dc01.cha.cl:389',
    'ldap://dc.cha.cl:389'
  ].filter(Boolean);

  const ipsUrls = [
    process.env.LDAP_IPS_HOST || process.env.LDAP_IPS_URL || 'ldap://dc05.ips.gob.cl:389',
    process.env.LDAP_IPS_BACKUP_URL || 'ldap://dc06.ips.gob.cl:389',
    'ldap://dc01.ips.gob.cl:389',
    'ldap://dc.ips.gob.cl:389'
  ].filter(Boolean);

  // Dominio 1: CHA
  const chaConfig: DomainTestConfig = {
    domainKey: 'cha.cl',
    domainName: 'Active Directory ChileAtiende (CHA)',
    urls: Array.from(new Set(chaUrls)),
    bindUser: process.env.LDAP_CHA_BIND_USER || process.env.LDAP_CHA_BIND_DN || 'ngalarceg.srv@cha.cl',
    bindPass: process.env.LDAP_CHA_BIND_PASS || process.env.LDAP_CHA_BIND_PASSWORD || 'cha.2029',
    baseDN: process.env.LDAP_CHA_BASE_DN || 'DC=cha,DC=cl',
    timeoutMs: parseInt(process.env.LDAP_CHA_TIMEOUT_MS || '5000', 10)
  };

  // Dominio 2: IPS
  const ipsConfig: DomainTestConfig = {
    domainKey: 'ips.gob.cl',
    domainName: 'Active Directory Instituto de Previsión Social (IPS)',
    urls: Array.from(new Set(ipsUrls)),
    bindUser: process.env.LDAP_IPS_BIND_USER || process.env.LDAP_IPS_BIND_DN || 'ngalarceg.srv@ips.gob.cl',
    bindPass: process.env.LDAP_IPS_BIND_PASS || process.env.LDAP_IPS_BIND_PASSWORD || 'cha.2024',
    baseDN: process.env.LDAP_IPS_BASE_DN || 'DC=ips,DC=gob,DC=cl',
    timeoutMs: parseInt(process.env.LDAP_IPS_TIMEOUT_MS || '6000', 10)
  };

  const chaResult = await validateDomain(chaConfig);
  const ipsResult = await validateDomain(ipsConfig);

  console.log(`\n========================================================================`);
  console.log(`📊 RESUMEN EJECUTIVO DE VALIDACIÓN LDAP:`);
  console.log(`========================================================================`);
  console.log(`1. Dominio ChileAtiende (cha.cl): ${chaResult.success ? '✅ OPERATIVO & AUTENTICADO' : '❌ NO ALCANZABLE / ERROR'}`);
  if (!chaResult.success) console.log(`   Motivo: ${chaResult.error}`);
  console.log(`2. Dominio IPS (ips.gob.cl):          ${ipsResult.success ? '✅ OPERATIVO & AUTENTICADO' : '❌ NO ALCANZABLE / ERROR'}`);
  if (!ipsResult.success) console.log(`   Motivo: ${ipsResult.error}`);
  console.log(`========================================================================\n`);
}

main().catch(console.error);
