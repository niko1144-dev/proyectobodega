import { Client } from 'ldapts';

async function testConnection(host: string, name: string, port: number = 389) {
  const url = `ldap://${host}:${port}`;
  console.log(`Intentando conectar a ${name} (${url})...`);
  
  const client = new Client({
    url,
    timeout: 3000,
    connectTimeout: 3000,
  });

  try {
    await client.bind('', '');
    console.log(`✅ ¡Conexión EXITOSA a ${name} (${url})!`);
    return true;
  } catch (error: any) {
    console.log(`❌ Falló la conexión a ${name} (${url}): ${error.message}`);
    return false;
  } finally {
    if (client.isConnected) {
      await client.unbind();
    }
  }
}

async function main() {
  console.log('--- Probando Servidores de ChileAtiende (cha.cl) ---');
  await testConnection('10.101.188.30', 'scha01.cha.cl');
  await testConnection('10.101.188.31', 'dc02.cha.cl');

  console.log('\n--- Probando Servidores de IPS (ips.gob.cl) ---');
  const ipsServers = [
    { ip: '10.150.233.46', name: 'dc04.ips.gob.cl' },
    { ip: '10.150.150.46', name: 'dc02.ips.gob.cl' },
    { ip: '10.128.3.2',    name: 'dc06.ips.gob.cl' },
    { ip: '10.150.150.30', name: 'dc01.ips.gob.cl' },
    { ip: '10.150.150.25', name: 'dc04rd.ips.gob.cl' },
    { ip: '10.150.150.59', name: 'dc03.ips.gob.cl' },
    { ip: '10.88.0.5',     name: 'dc05.ips.gob.cl' }
  ];

  for (const server of ipsServers) {
    const success = await testConnection(server.ip, server.name);
    // if (success) break; // Si queremos detenernos al encontrar uno que funcione
  }
}

main().catch(console.error);
