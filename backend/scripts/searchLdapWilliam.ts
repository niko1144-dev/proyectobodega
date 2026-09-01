import 'dotenv/config';
import { Client } from 'ldapts';

async function searchLdap(url: string, baseDN: string, bindDN: string, bindPass: string) {
  const client = new Client({
    url,
    timeout: 10000,
    connectTimeout: 5000,
  });

  try {
    await client.bind(bindDN, bindPass);
    console.log(`Connected to ${url}`);

    const filter = '(&(objectClass=user)(|(displayName=*william franco*)(givenName=*william*)(sn=*franco*)))';
    const { searchEntries } = await client.search(baseDN, {
      scope: 'sub',
      filter,
      attributes: ['sAMAccountName', 'displayName', 'givenName', 'sn', 'mail', 'userAccountControl']
    });

    console.log(`Found ${searchEntries.length} users matching william or franco:`);
    searchEntries.forEach(entry => {
      console.log(` - ${entry.sAMAccountName}: ${entry.displayName} (${entry.mail}) [UAC: ${entry.userAccountControl}]`);
    });

  } catch (error) {
    console.error(`Error connecting to ${url}:`, error);
  } finally {
    if (client.isConnected) {
      await client.unbind();
    }
  }
}

async function main() {
  console.log('Searching CHA...');
  await searchLdap(
    process.env.LDAP_CHA_URL || 'ldap://scha01.cha.cl:389',
    process.env.LDAP_CHA_BASE_DN || 'DC=cha,DC=cl',
    process.env.LDAP_CHA_BIND_USER || 'ngalarceg.srv@chileatiende.cl',
    process.env.LDAP_CHA_BIND_PASSWORD || 'cha.2029'
  );

  console.log('\nSearching IPS...');
  await searchLdap(
    process.env.LDAP_IPS_URL || 'ldap://dc05.ips.gob.cl:389',
    process.env.LDAP_IPS_BASE_DN || 'DC=ips,DC=gob,DC=cl',
    process.env.LDAP_IPS_BIND_USER || 'ngalarceg.srv@ips.gob.cl',
    process.env.LDAP_IPS_BIND_PASSWORD || 'cha.2024'
  );
}

main().catch(console.error);
