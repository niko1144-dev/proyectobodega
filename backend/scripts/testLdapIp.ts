import { Client } from 'ldapts';

async function testConnection(host: string, port: number = 389) {
  const url = `ldap://${host}:${port}`;
  console.log(`Intentando conectar a ${url}...`);
  
  const client = new Client({
    url,
    timeout: 5000,
    connectTimeout: 5000,
  });

  try {
    // Intentar un bind anónimo o bind específico si se tienen credenciales
    // Aquí solo probamos si el puerto está abierto y responde
    await client.bind('', '');
    console.log(`✅ Conexión exitosa a ${url}`);
  } catch (error: any) {
    console.error(`❌ Falló la conexión a ${url}: ${error.message}`);
  } finally {
    if (client.isConnected) {
      await client.unbind();
    }
  }
}

async function main() {
  await testConnection('10.88.0.5'); // dc05
  await testConnection('10.150.240.37'); // scha02
}

main().catch(console.error);
