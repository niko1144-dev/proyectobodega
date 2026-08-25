import { Client } from 'ldapts';
import { prisma } from '../config/db.js';

export interface LdapUserEntry {
  adGuid: string;
  samAccountName: string;
  rut: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  phone?: string;
  office?: string;
}

export class LdapService {
  private static getClient(): Client {
    const url = process.env.LDAP_URL || 'ldap://scha01.cha.cl:389';
    return new Client({
      url,
      timeout: 15000,
      connectTimeout: 10000
    });
  }

  /**
   * Prueba de conexión y autenticación (Bind) contra Active Directory (cha.cl)
   */
  public static async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    const isEnabled = process.env.LDAP_ENABLED === 'true';
    if (!isEnabled) {
      return { success: false, message: 'LDAP está deshabilitado en la configuración (.env)' };
    }

    const bindUser = process.env.LDAP_BIND_USER || 'ngalarceg.srv@chileatiende.cl';
    const bindPassword = process.env.LDAP_BIND_PASSWORD || 'cha.2029';
    const url = process.env.LDAP_URL || 'ldap://scha01.cha.cl:389';

    if (!bindPassword) {
      return {
        success: false,
        message: 'Falta la contraseña del usuario de servicio en LDAP_BIND_PASSWORD (.env)'
      };
    }

    const client = this.getClient();
    try {
      await client.bind(bindUser, bindPassword);
      
      const baseDN = process.env.LDAP_BASE_DN || 'DC=cha,DC=cl';
      const { searchEntries } = await client.search(baseDN, {
        scope: 'sub',
        filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(!(sAMAccountName=*$)))',
        sizeLimit: 5,
        attributes: ['sAMAccountName', 'displayName', 'mail', 'title', 'department', 'employeeID', 'telephoneNumber']
      });

      await client.unbind();

      return {
        success: true,
        message: `Conexión y autenticación LDAP exitosa con ${url} (Dominio cha.cl)`,
        details: {
          sampleEntriesFound: searchEntries.length,
          sampleUsers: searchEntries.map((e: any) => ({
            username: e.sAMAccountName,
            name: e.displayName,
            email: e.mail,
            rut: e.employeeID,
            title: e.title,
            department: e.department
          }))
        }
      };
    } catch (error: any) {
      try { await client.unbind(); } catch {}
      return {
        success: false,
        message: `Error al autenticar con Active Directory (${url}): ${error.message}`,
        details: error
      };
    }
  }

  /**
   * Búsqueda de funcionarios en Active Directory (cha.cl)
   * @param query Texto de búsqueda (nombre, RUT, correo, usuario).
   * @param isFullSync Si es true, usa paginación LDAP (RFC 2696) para descargar los 2000+ usuarios sin límite de tamaño.
   */
  public static async searchUsersInAD(query: string = '', isFullSync: boolean = false): Promise<LdapUserEntry[]> {
    const bindUser = process.env.LDAP_BIND_USER || 'ngalarceg.srv@chileatiende.cl';
    const bindPassword = process.env.LDAP_BIND_PASSWORD || 'cha.2029';
    const baseDN = process.env.LDAP_BASE_DN || 'DC=cha,DC=cl';

    if (!bindPassword) {
      console.warn('LDAP_BIND_PASSWORD no configurada en .env. Omitiendo búsqueda LDAP en vivo.');
      return [];
    }

    const client = this.getClient();
    try {
      await client.bind(bindUser, bindPassword);

      const cleanQuery = query.trim().replace(/[\\*()\0]/g, '');
      const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
      let filter = '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(!(sAMAccountName=*$)))';

      if (words.length > 0) {
        const wordFilters = words.map(w =>
          `(|(sAMAccountName=*${w}*)(displayName=*${w}*)(givenName=*${w}*)(sn=*${w}*)(mail=*${w}*)(employeeID=*${w}*)(description=*${w}*))`
        ).join('');
        filter = `(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(!(sAMAccountName=*$))${wordFilters})`;
      }

      const searchOptions: any = {
        scope: 'sub',
        filter,
        attributes: [
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
          'telephoneNumber',
          'physicalDeliveryOfficeName'
        ]
      };

      // Si es sincronización completa, habilitar paginación LDAP para traer todos los 2000+ registros
      if (isFullSync || !cleanQuery) {
        searchOptions.paged = { pageSize: 500 };
      } else {
        searchOptions.sizeLimit = 50;
      }

      const { searchEntries } = await client.search(baseDN, searchOptions);
      await client.unbind();

      const results: LdapUserEntry[] = [];
      const seenRuts = new Set<string>();

      for (const entry of searchEntries as any[]) {
        const sam = String(entry.sAMAccountName || '').trim();
        if (!sam || sam.endsWith('$')) continue;

        const fullName = String(entry.displayName || `${entry.givenName || ''} ${entry.sn || ''}`.trim() || sam);
        const email = String(entry.mail || entry.userPrincipalName || `${sam}@chileatiende.cl`);
        
        let rut = String(entry.employeeID || entry.description || '').trim();
        // Validar formato básico de RUT o generar identificador único para evitar colisiones en cuentas especiales
        if (!rut || rut.length < 5 || seenRuts.has(rut)) {
          rut = `CHA-${sam}`;
        }
        seenRuts.add(rut);

        const jobTitle = String(entry.title || 'Funcionario');
        const department = String(entry.department || 'ChileAtiende');
        const phone = entry.telephoneNumber ? String(entry.telephoneNumber) : undefined;
        const office = entry.physicalDeliveryOfficeName ? String(entry.physicalDeliveryOfficeName) : undefined;
        
        let guidStr = '';
        if (Buffer.isBuffer(entry.objectGUID)) {
          guidStr = entry.objectGUID.toString('hex');
        } else {
          guidStr = String(entry.objectGUID || `guid-${sam}`);
        }

        results.push({
          adGuid: guidStr,
          samAccountName: sam,
          rut,
          firstName: String(entry.givenName || fullName.split(' ')[0]),
          lastName: String(entry.sn || fullName.split(' ').slice(1).join(' ')),
          fullName,
          email,
          jobTitle,
          department,
          phone,
          office
        });
      }

      return results;
    } catch (error: any) {
      try { await client.unbind(); } catch {}
      console.error('Error buscando usuarios en Active Directory cha.cl:', error.message);
      return [];
    }
  }

  /**
   * Sincroniza los usuarios de Active Directory directamente a PostgreSQL usando paginación
   */
  public static async syncUsersToCache(query: string = ''): Promise<number> {
    const isFullSync = !query.trim();
    console.log(`⏳ Iniciando ${isFullSync ? 'sincronización COMPLETA (Paginada)' : 'búsqueda en vivo'} desde Active Directory cha.cl...`);

    const ldapUsers = await this.searchUsersInAD(query, isFullSync);
    if (ldapUsers.length === 0) return 0;

    console.log(`📥 Se obtuvieron ${ldapUsers.length} funcionarios desde Active Directory. Procesando guardado en base de datos...`);

    let syncedCount = 0;
    const now = new Date();

    // Procesar en lotes de 50 para alto rendimiento
    const batchSize = 50;
    for (let i = 0; i < ldapUsers.length; i += batchSize) {
      const batch = ldapUsers.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (u) => {
          try {
            await prisma.userADCache.upsert({
              where: { samAccountName: u.samAccountName },
              update: {
                fullName: u.fullName,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                jobTitle: u.jobTitle,
                department: u.department,
                rut: u.rut,
                lastSyncedAt: now,
                isActive: true
              },
              create: {
                adGuid: u.adGuid,
                samAccountName: u.samAccountName,
                rut: u.rut,
                firstName: u.firstName,
                lastName: u.lastName,
                fullName: u.fullName,
                email: u.email,
                jobTitle: u.jobTitle,
                department: u.department,
                lastSyncedAt: now,
                isActive: true
              }
            });
            syncedCount++;
          } catch (err: any) {
            // Si hay colisión de RUT, actualizar con RUT seguro
            try {
              await prisma.userADCache.upsert({
                where: { samAccountName: u.samAccountName },
                update: {
                  fullName: u.fullName,
                  firstName: u.firstName,
                  lastName: u.lastName,
                  email: u.email,
                  jobTitle: u.jobTitle,
                  department: u.department,
                  rut: `CHA-${u.samAccountName}`,
                  lastSyncedAt: now,
                  isActive: true
                },
                create: {
                  adGuid: u.adGuid,
                  samAccountName: u.samAccountName,
                  rut: `CHA-${u.samAccountName}`,
                  firstName: u.firstName,
                  lastName: u.lastName,
                  fullName: u.fullName,
                  email: u.email,
                  jobTitle: u.jobTitle,
                  department: u.department,
                  lastSyncedAt: now,
                  isActive: true
                }
              });
              syncedCount++;
            } catch {}
          }
        })
      );
    }

    console.log(`✅ Sincronización finalizada exitosamente: ${syncedCount} funcionarios guardados en PostgreSQL.`);
    return syncedCount;
  }
}
