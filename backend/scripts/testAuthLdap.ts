import { Client } from 'ldapts';

async function testConnection(host: string, name: string, user: string, pass: string) {
  const url = `ldap://${host}:389`;
  console.log(`Intentando conectar y autenticar en ${name} (${url})...`);
  
  const client = new Client({
    url,
    timeout: 10000,
    connectTimeout: 5000,
  });

  try {
    await client.bind(user, pass);
    console.log(`✅ ¡Conexión y Autenticación EXITOSA a ${name} (${url})!`);
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
  const ipsUser = 'ngalarceg.srv@ips.gob.cl';
  const ipsPass = 'cha.2024';
  
  console.log('\n--- Probando Servidores de IPS (ips.gob.cl) que respondieron TCP ---');
  const ipsServers = [
    { ip: '10.150.150.46', name: 'dc02.ips.gob.cl' },
    { ip: '10.150.150.30', name: 'dc01.ips.gob.cl' },
    { ip: '10.150.150.25', name: 'dc04rd.ips.gob.cl' },
    { ip: '10.150.150.59', name: 'dc03.ips.gob.cl' }
  ];

  for (const server of ipsServers) {
    const success = await testConnection(server.ip, server.name, ipsUser, ipsPass);
    if (success) {
        console.log(`👉 ¡Usa la IP ${server.ip} en tu archivo .env!`);
        break;
    }
  }
}

main().catch(console.error);
