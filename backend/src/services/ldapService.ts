import { Client } from 'ldapts';
import { prisma } from '../config/db.js';
import { LdapSyncService, SyncReport } from './ldapSyncService.js';

export type DomainOrigin = 'CHILEATIENDE' | 'IPS';

export interface LDAPDomainConfig {
  domain: DomainOrigin;
  name: string;
  url: string;
  backupUrl?: string;
  bindUser?: string;
  bindPassword?: string;
  baseDN: string;
  accountSuffix: string;
  defaultEmailDomain: string;
  timeoutMs: number;
  connectTimeoutMs: number;
  isEnabled: boolean;
}

export interface LDAPAuthenticatedUser {
  username: string;
  email: string;
  fullName: string;
  firstName: string;
  lastName: string;
  rut: string;
  jobTitle: string;
  department: string;
  phone?: string;
  office?: string;
  adGuid: string;
  domainOrigin: DomainOrigin;
  userPrincipalName?: string;
  distinguishedName?: string;
  rawAttributes?: Record<string, any>;
}

export interface LDAPAuthResult {
  success: boolean;
  message: string;
  user?: LDAPAuthenticatedUser;
  domainOrigin?: DomainOrigin;
  attemptedDomains: Array<{
    domain: DomainOrigin;
    status: 'SUCCESS' | 'USER_NOT_FOUND' | 'INVALID_CREDENTIALS' | 'UNREACHABLE' | 'CONFIG_ERROR' | 'SKIPPED' | 'DISABLED';
    message?: string;
  }>;
}

export interface LDAPDomainTestResult {
  domain: DomainOrigin;
  name: string;
  url: string;
  configured: boolean;
  connected: boolean;
  message: string;
  sampleUsersFound?: number;
  sampleUsers?: Array<{ username: string; name: string; email: string }>;
  error?: string;
}

export class LdapService {
  /**
   * Obtiene la configuración para el dominio ChileAtiende (CHA)
   */
  private static getChaConfig(): LDAPDomainConfig {
    const isGlobalEnabled = process.env.LDAP_ENABLED !== 'false';
    const isChaEnabled = process.env.LDAP_CHA_ENABLED ? process.env.LDAP_CHA_ENABLED === 'true' : isGlobalEnabled;

    return {
      domain: 'CHILEATIENDE',
      name: 'Active Directory ChileAtiende (cha.cl)',
      url: process.env.LDAP_CHA_URL || process.env.LDAP_URL || 'ldap://scha01.cha.cl:389',
      backupUrl: process.env.LDAP_CHA_BACKUP_URL || process.env.LDAP_BACKUP_URL,
      bindUser: process.env.LDAP_CHA_BIND_USER || process.env.LDAP_BIND_USER || 'ngalarceg.srv@chileatiende.cl',
      bindPassword: process.env.LDAP_CHA_BIND_PASSWORD || process.env.LDAP_BIND_PASSWORD || 'cha.2029',
      baseDN: process.env.LDAP_CHA_BASE_DN || process.env.LDAP_BASE_DN || 'DC=cha,DC=cl',
      accountSuffix: '@chileatiende.cl',
      defaultEmailDomain: 'chileatiende.cl',
      timeoutMs: parseInt(process.env.LDAP_CHA_TIMEOUT_MS || '7000', 10),
      connectTimeoutMs: parseInt(process.env.LDAP_CHA_CONNECT_TIMEOUT_MS || '4000', 10),
      isEnabled: isChaEnabled
    };
  }

  /**
   * Obtiene la configuración para el dominio Instituto de Previsión Social (IPS) - Fallback
   */
  private static getIpsConfig(): LDAPDomainConfig {
    const isGlobalEnabled = process.env.LDAP_ENABLED !== 'false';
    const isIpsEnabled = process.env.LDAP_IPS_ENABLED ? process.env.LDAP_IPS_ENABLED === 'true' : isGlobalEnabled;

    return {
      domain: 'IPS',
      name: 'Active Directory IPS (ips.gob.cl)',
      url: process.env.LDAP_IPS_URL || 'ldap://sips01.ips.gob.cl:389',
      backupUrl: process.env.LDAP_IPS_BACKUP_URL,
      bindUser: process.env.LDAP_IPS_BIND_USER || process.env.LDAP_CHA_BIND_USER || process.env.LDAP_BIND_USER,
      bindPassword: process.env.LDAP_IPS_BIND_PASSWORD || process.env.LDAP_CHA_BIND_PASSWORD || process.env.LDAP_BIND_PASSWORD,
      baseDN: process.env.LDAP_IPS_BASE_DN || 'DC=ips,DC=gob,DC=cl',
      accountSuffix: '@ips.gob.cl',
      defaultEmailDomain: 'ips.gob.cl',
      timeoutMs: parseInt(process.env.LDAP_IPS_TIMEOUT_MS || '7000', 10),
      connectTimeoutMs: parseInt(process.env.LDAP_IPS_CONNECT_TIMEOUT_MS || '4000', 10),
      isEnabled: isIpsEnabled
    };
  }

  /**
   * Crea un cliente ldapts con timeouts configurados
   */
  private static createClient(config: LDAPDomainConfig, customUrl?: string): Client {
    return new Client({
      url: customUrl || config.url,
      timeout: config.timeoutMs,
      connectTimeout: config.connectTimeoutMs,
      strictDN: false
    });
  }

  /**
   * Cierra de forma segura una conexión LDAP sin arrojar excepciones
   */
  private static async safeUnbind(client?: Client | null): Promise<void> {
    if (!client) return;
    try {
      if (client.isConnected) {
        await client.unbind();
      }
    } catch {
      // Ignorar errores al cerrar socket ya finalizado
    }
  }

  /**
   * Sanitiza entradas para prevenir inyecciones LDAP (RFC 4515)
   */
  private static sanitizeLdapFilter(input: string): string {
    return input.replace(/[\\*()\0/]/g, '');
  }

  /**
   * Transforma una entrada bruta de LDAP en un objeto estandarizado LDAPAuthenticatedUser
   */
  private static parseLdapEntry(entry: any, domain: DomainOrigin, fallbackEmailDomain: string): LDAPAuthenticatedUser {
    const sam = String(entry.sAMAccountName || '').trim();
    const givenName = String(entry.givenName || '').trim();
    const sn = String(entry.sn || '').trim();
    
    let fullName = String(entry.displayName || '').trim();
    if (!fullName) {
      fullName = givenName && sn ? `${givenName} ${sn}` : sam;
    }

    // Regla de Negocio: En CHA el correo institucional es prioritariamente @chileatiende.cl
    let email = String(entry.mail || entry.userPrincipalName || '').trim();
    if (!email || !email.includes('@')) {
      email = `${sam}@${fallbackEmailDomain}`;
    }

    let rut = String(entry.employeeID || entry.description || '').trim();
    if (!rut || rut.length < 5) {
      rut = `${domain === 'CHILEATIENDE' ? 'CHA' : 'IPS'}-${sam}`;
    }

    let guidStr = '';
    if (Buffer.isBuffer(entry.objectGUID)) {
      guidStr = entry.objectGUID.toString('hex');
    } else {
      guidStr = String(entry.objectGUID || `guid-${sam}`);
    }

    return {
      username: sam,
      email,
      fullName,
      firstName: givenName || fullName.split(' ')[0] || sam,
      lastName: sn || fullName.split(' ').slice(1).join(' ') || '',
      rut,
      jobTitle: String(entry.title || 'Funcionario'),
      department: String(entry.department || (domain === 'CHILEATIENDE' ? 'ChileAtiende' : 'Instituto de Previsión Social (IPS)')),
      phone: entry.telephoneNumber ? String(entry.telephoneNumber).trim() : undefined,
      office: entry.physicalDeliveryOfficeName ? String(entry.physicalDeliveryOfficeName).trim() : undefined,
      adGuid: guidStr,
      domainOrigin: domain,
      userPrincipalName: entry.userPrincipalName ? String(entry.userPrincipalName).trim() : undefined,
      distinguishedName: entry.dn ? String(entry.dn) : undefined,
      rawAttributes: {
        sAMAccountName: entry.sAMAccountName,
        mail: entry.mail,
        userPrincipalName: entry.userPrincipalName,
        displayName: entry.displayName,
        title: entry.title,
        department: entry.department,
        employeeID: entry.employeeID
      }
    };
  }

  /**
   * Busca un usuario por sAMAccountName, correo o UPN en un dominio específico
   */
  private static async findUserInDomain(
    config: LDAPDomainConfig,
    identifier: string
  ): Promise<{ user: LDAPAuthenticatedUser; entry: any; dn: string } | null> {
    if (!config.isEnabled || !config.url) {
      return null;
    }

    const cleanId = this.sanitizeLdapFilter(identifier.trim());
    if (!cleanId) return null;

    let client: Client | null = null;
    try {
      client = this.createClient(config);

      // Bind con credenciales del Service Account
      if (config.bindUser && config.bindPassword) {
        await client.bind(config.bindUser, config.bindPassword);
      } else {
        // Intento de bind anónimo si no hay service account configurada
        await client.bind('', '');
      }

      // Filtro para resolver por sAMAccountName, UPN o Mail
      const filter = `(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(|(sAMAccountName=${cleanId})(userPrincipalName=${cleanId})(userPrincipalName=${cleanId}${config.accountSuffix})(mail=${cleanId})))`;

      const { searchEntries } = await client.search(config.baseDN, {
        scope: 'sub',
        filter,
        sizeLimit: 1,
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
          'telephoneNumber',
          'physicalDeliveryOfficeName'
        ]
      });

      if (!searchEntries || searchEntries.length === 0) {
        return null;
      }

      const entry = searchEntries[0];
      const dn = String((entry as any).dn || entry.dn);
      const user = this.parseLdapEntry(entry, config.domain, config.defaultEmailDomain);

      return { user, entry, dn };
    } catch (error: any) {
      console.warn(`[LDAP] Advertencia al buscar '${cleanId}' en ${config.name}: ${error.message}`);
      return null;
    } finally {
      await this.safeUnbind(client);
    }
  }

  /**
   * Intenta autenticar (Bind) directamente las credenciales de un usuario contra un dominio
   */
  private static async bindUserCredentials(
    config: LDAPDomainConfig,
    userDNOrUPN: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    let client: Client | null = null;
    try {
      client = this.createClient(config);
      await client.bind(userDNOrUPN, password);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de autenticación' };
    } finally {
      await this.safeUnbind(client);
    }
  }

  // =========================================================================
  // MÉTODOS PÚBLICOS DEL SERVICIO
  // =========================================================================

  /**
   * 1. Búsqueda de Usuario por Username con Cascada (CHA -> IPS)
   * Regla de Precedencia:
   * - Consulta SIEMPRE primero en ChileAtiende (CHA).
   * - Si existe en CHA, retorna inmediatamente el perfil y correo oficial de CHA.
   * - Si NO existe en CHA (o falla la red), consulta como fallback en IPS.
   */
  public static async findUserByUsername(username: string): Promise<LDAPAuthenticatedUser | null> {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) return null;

    const chaConfig = this.getChaConfig();
    const ipsConfig = this.getIpsConfig();

    // 1. Prioridad: ChileAtiende (CHA)
    try {
      const chaResult = await this.findUserInDomain(chaConfig, cleanUsername);
      if (chaResult) {
        return chaResult.user;
      }
    } catch (err: any) {
      console.warn(`[LDAP Cascading] Error al consultar en ChileAtiende: ${err.message}. Intentando fallback IPS...`);
    }

    // 2. Fallback: IPS
    try {
      const ipsResult = await this.findUserInDomain(ipsConfig, cleanUsername);
      if (ipsResult) {
        return ipsResult.user;
      }
    } catch (err: any) {
      console.warn(`[LDAP Cascading] Error al consultar en IPS fallback: ${err.message}`);
    }

    return null;
  }

  /**
   * 2. Autenticación de Usuario con Cascada y Fallback (CHA -> IPS)
   * Regla de Precedencia:
   * - Intenta autenticar primero contra Active Directory ChileAtiende (CHA).
   * - Si el usuario pertenece a CHA, valida su contraseña. Si es correcta, extrae datos de CHA.
   * - Si el usuario NO existe en CHA (o el servidor CHA no está disponible), intenta automáticamente en IPS.
   * - Retorna objeto unificado y normalizado.
   */
  public static async authenticateUser(username: string, password: string): Promise<LDAPAuthResult> {
    const cleanId = username.trim();
    if (!cleanId || !password) {
      return {
        success: false,
        message: 'Debe ingresar nombre de usuario y contraseña.',
        attemptedDomains: []
      };
    }

    const chaConfig = this.getChaConfig();
    const ipsConfig = this.getIpsConfig();
    const attempts: LDAPAuthResult['attemptedDomains'] = [];

    // -------------------------------------------------------------
    // FASE 1: CHILEATIENDE (CHA) - PRIORIDAD 1
    // -------------------------------------------------------------
    let chaFound: { user: LDAPAuthenticatedUser; entry: any; dn: string } | null = null;
    let chaError: string | null = null;

    if (chaConfig.isEnabled) {
      try {
        chaFound = await this.findUserInDomain(chaConfig, cleanId);
      } catch (err: any) {
        chaError = err.message;
      }

      if (chaFound) {
        // Usuario localizado en ChileAtiende. Validar contraseña con Direct Bind.
        const authTarget = chaFound.user.userPrincipalName || chaFound.dn || `${chaFound.user.username}${chaConfig.accountSuffix}`;
        const bindResult = await this.bindUserCredentials(chaConfig, authTarget, password);

        if (bindResult.success) {
          attempts.push({ domain: 'CHILEATIENDE', status: 'SUCCESS' });
          return {
            success: true,
            message: `Autenticación exitosa en Active Directory ChileAtiende para '${chaFound.user.fullName}'`,
            user: chaFound.user,
            domainOrigin: 'CHILEATIENDE',
            attemptedDomains: attempts
          };
        } else {
          // Credenciales incorrectas en el directorio donde el usuario reside
          attempts.push({ domain: 'CHILEATIENDE', status: 'INVALID_CREDENTIALS', message: bindResult.error });
          return {
            success: false,
            message: 'Contraseña incorrecta en el dominio ChileAtiende.',
            domainOrigin: 'CHILEATIENDE',
            attemptedDomains: attempts
          };
        }
      } else {
        attempts.push({
          domain: 'CHILEATIENDE',
          status: chaError ? 'UNREACHABLE' : 'USER_NOT_FOUND',
          message: chaError || 'Usuario no encontrado en ChileAtiende'
        });
      }
    } else {
      attempts.push({ domain: 'CHILEATIENDE', status: 'DISABLED', message: 'Dominio CHA deshabilitado' });
    }

    // -------------------------------------------------------------
    // FASE 2: INSTITUTO DE PREVISIÓN SOCIAL (IPS) - FALLBACK
    // -------------------------------------------------------------
    let ipsFound: { user: LDAPAuthenticatedUser; entry: any; dn: string } | null = null;
    let ipsError: string | null = null;

    if (ipsConfig.isEnabled) {
      try {
        ipsFound = await this.findUserInDomain(ipsConfig, cleanId);
      } catch (err: any) {
        ipsError = err.message;
      }

      if (ipsFound) {
        // Usuario localizado en IPS. Validar contraseña con Direct Bind.
        const authTarget = ipsFound.user.userPrincipalName || ipsFound.dn || `${ipsFound.user.username}${ipsConfig.accountSuffix}`;
        const bindResult = await this.bindUserCredentials(ipsConfig, authTarget, password);

        if (bindResult.success) {
          attempts.push({ domain: 'IPS', status: 'SUCCESS' });
          return {
            success: true,
            message: `Autenticación exitosa en Active Directory IPS para '${ipsFound.user.fullName}'`,
            user: ipsFound.user,
            domainOrigin: 'IPS',
            attemptedDomains: attempts
          };
        } else {
          attempts.push({ domain: 'IPS', status: 'INVALID_CREDENTIALS', message: bindResult.error });
          return {
            success: false,
            message: 'Contraseña incorrecta en el dominio IPS.',
            domainOrigin: 'IPS',
            attemptedDomains: attempts
          };
        }
      } else {
        attempts.push({
          domain: 'IPS',
          status: ipsError ? 'UNREACHABLE' : 'USER_NOT_FOUND',
          message: ipsError || 'Usuario no encontrado en IPS'
        });
      }
    } else {
      attempts.push({ domain: 'IPS', status: 'DISABLED', message: 'Dominio IPS deshabilitado' });
    }

    return {
      success: false,
      message: 'El usuario no fue encontrado en los directorios activos institucionales (ChileAtiende / IPS).',
      attemptedDomains: attempts
    };
  }

  /**
   * 3. Búsqueda y Coincidencia de Usuarios en Vivo (Ambos Dominios)
   */
  public static async searchUsersInAD(query: string = '', isFullSync: boolean = false): Promise<LDAPAuthenticatedUser[]> {
    const cleanQuery = query.trim().replace(/[\\*()\0]/g, '');
    const chaConfig = this.getChaConfig();
    const ipsConfig = this.getIpsConfig();

    const results: LDAPAuthenticatedUser[] = [];
    const seenUsernames = new Set<string>();

    // 1. Buscar primero en ChileAtiende (Prioridad)
    if (chaConfig.isEnabled && chaConfig.bindPassword) {
      let client: Client | null = null;
      try {
        client = this.createClient(chaConfig);
        await client.bind(chaConfig.bindUser || '', chaConfig.bindPassword);

        const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
        let filter = '(&(objectClass=user)(objectCategory=person)(!(sAMAccountName=*$)))';

        if (words.length > 0) {
          const wordFilters = words.map(w =>
            `(|(sAMAccountName=*${w}*)(displayName=*${w}*)(givenName=*${w}*)(sn=*${w}*)(mail=*${w}*)(employeeID=*${w}*)(description=*${w}*))`
          ).join('');
          filter = `(&(objectClass=user)(objectCategory=person)(!(sAMAccountName=*$))${wordFilters})`;
        }

        const searchOptions: any = {
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
            'telephoneNumber',
            'physicalDeliveryOfficeName'
          ],
          paged: true
        };

        const { searchEntries } = await client.search(chaConfig.baseDN, searchOptions);
        for (const entry of searchEntries as any[]) {
          const user = this.parseLdapEntry(entry, 'CHILEATIENDE', chaConfig.defaultEmailDomain);
          if (!seenUsernames.has(user.username.toLowerCase())) {
            seenUsernames.add(user.username.toLowerCase());
            results.push(user);
          }
        }
      } catch (err: any) {
        console.warn(`[LDAP Search] Advertencia en búsqueda ChileAtiende: ${err.message}`);
      } finally {
        await this.safeUnbind(client);
      }
    }

    // 2. Buscar en IPS (Fallback)
    if (ipsConfig.isEnabled && ipsConfig.bindPassword && ipsConfig.url) {
      let client: Client | null = null;
      try {
        client = this.createClient(ipsConfig);
        await client.bind(ipsConfig.bindUser || '', ipsConfig.bindPassword);

        const words = cleanQuery.split(/\s+/).filter(w => w.length > 0);
        let filter = '(&(objectClass=user)(objectCategory=person)(!(sAMAccountName=*$)))';

        if (words.length > 0) {
          const wordFilters = words.map(w =>
            `(|(sAMAccountName=*${w}*)(displayName=*${w}*)(givenName=*${w}*)(sn=*${w}*)(mail=*${w}*)(employeeID=*${w}*)(description=*${w}*))`
          ).join('');
          filter = `(&(objectClass=user)(objectCategory=person)(!(sAMAccountName=*$))${wordFilters})`;
        }

        const searchOptions: any = {
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
            'telephoneNumber',
            'physicalDeliveryOfficeName'
          ],
          paged: true
        };

        const { searchEntries } = await client.search(ipsConfig.baseDN, searchOptions);
        for (const entry of searchEntries as any[]) {
          const user = this.parseLdapEntry(entry, 'IPS', ipsConfig.defaultEmailDomain);
          if (!seenUsernames.has(user.username.toLowerCase())) {
            seenUsernames.add(user.username.toLowerCase());
            results.push(user);
          }
        }
      } catch (err: any) {
        console.warn(`[LDAP Search] Advertencia en búsqueda IPS: ${err.message}`);
      } finally {
        await this.safeUnbind(client);
      }
    }

    return results;
  }

  /**
   * 4. Diagnóstico y Prueba de Conectividad Multi-Dominio (CHA e IPS)
   */
  public static async testConnection(): Promise<{
    overallSuccess: boolean;
    message: string;
    domains: {
      chileatiende: LDAPDomainTestResult;
      ips: LDAPDomainTestResult;
    };
  }> {
    const chaConfig = this.getChaConfig();
    const ipsConfig = this.getIpsConfig();

    const testSingleDomain = async (config: LDAPDomainConfig): Promise<LDAPDomainTestResult> => {
      if (!config.isEnabled) {
        return {
          domain: config.domain,
          name: config.name,
          url: config.url,
          configured: false,
          connected: false,
          message: 'Dominio deshabilitado en configuración (.env)'
        };
      }

      if (!config.bindPassword) {
        return {
          domain: config.domain,
          name: config.name,
          url: config.url,
          configured: false,
          connected: false,
          message: 'Falta configurar credenciales (bindPassword)'
        };
      }

      let client: Client | null = null;
      try {
        client = this.createClient(config);
        await client.bind(config.bindUser || '', config.bindPassword);

        const { searchEntries } = await client.search(config.baseDN, {
          scope: 'sub',
          filter: '(&(objectClass=user)(objectCategory=person)(!(userAccountControl:1.2.840.113556.1.4.803:=2))(!(sAMAccountName=*$)))',
          sizeLimit: 5,
          attributes: ['sAMAccountName', 'displayName', 'mail', 'title', 'department', 'employeeID']
        });

        return {
          domain: config.domain,
          name: config.name,
          url: config.url,
          configured: true,
          connected: true,
          message: `Conexión y autenticación exitosa con ${config.url} (${config.baseDN})`,
          sampleUsersFound: searchEntries.length,
          sampleUsers: searchEntries.map((e: any) => ({
            username: String(e.sAMAccountName || ''),
            name: String(e.displayName || ''),
            email: String(e.mail || `${e.sAMAccountName}@${config.defaultEmailDomain}`)
          }))
        };
      } catch (err: any) {
        return {
          domain: config.domain,
          name: config.name,
          url: config.url,
          configured: true,
          connected: false,
          message: `Error al conectar con ${config.name}: ${err.message}`,
          error: err.message
        };
      } finally {
        await this.safeUnbind(client);
      }
    };

    const [chaRes, ipsRes] = await Promise.all([
      testSingleDomain(chaConfig),
      testSingleDomain(ipsConfig)
    ]);

    const overallSuccess = chaRes.connected || ipsRes.connected;

    return {
      overallSuccess,
      message: overallSuccess
        ? 'Al menos uno de los dominios institucionales de Active Directory se encuentra operativo.'
        : 'No fue posible conectar con ninguno de los directorios LDAP configurados.',
      domains: {
        chileatiende: chaRes,
        ips: ipsRes
      }
    };
  }

  /**
   * 5. Sincronización de Usuarios hacia la Base de Datos PostgreSQL
   * Si es sincronización completa sin query, utiliza LdapSyncService con consolidación dual y precedencia.
   */
  public static async syncUsersToCache(query: string = ''): Promise<number> {
    const isFullSync = !query.trim();

    if (isFullSync) {
      const report = await LdapSyncService.syncDualDirectory();
      return report.totalConsolidated;
    }

    console.log(`⏳ [LDAP Search Sync] Búsqueda en vivo y sincronización para '${query}'...`);
    const users = await this.searchUsersInAD(query, false);
    if (users.length === 0) return 0;

    let syncedCount = 0;
    const now = new Date();
    const batchSize = 50;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (u) => {
          const safeRut = (u.rut && u.rut.length >= 6 && !u.rut.startsWith('CHA-') && !u.rut.startsWith('IPS-'))
            ? u.rut
            : `${u.domainOrigin === 'CHILEATIENDE' ? 'CHA' : 'IPS'}-${u.username}`;

          try {
            await prisma.userADCache.upsert({
              where: { samAccountName: u.username },
              update: {
                fullName: u.fullName,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                jobTitle: u.jobTitle,
                department: u.department,
                rut: safeRut,
                lastSyncedAt: now,
                isActive: true
              },
              create: {
                adGuid: u.adGuid,
                samAccountName: u.username,
                rut: safeRut,
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
            try {
              const fallbackRut = `${u.domainOrigin === 'CHILEATIENDE' ? 'CHA' : 'IPS'}-${u.username}-${Math.floor(100 + Math.random() * 900)}`;
              await prisma.userADCache.upsert({
                where: { samAccountName: u.username },
                update: {
                  fullName: u.fullName,
                  firstName: u.firstName,
                  lastName: u.lastName,
                  email: u.email,
                  jobTitle: u.jobTitle,
                  department: u.department,
                  rut: fallbackRut,
                  lastSyncedAt: now,
                  isActive: true
                },
                create: {
                  adGuid: u.adGuid,
                  samAccountName: u.username,
                  rut: fallbackRut,
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

    console.log(`✅ [LDAP Sync] Sincronización finalizada: ${syncedCount} funcionarios actualizados en PostgreSQL.`);
    return syncedCount;
  }

  /**
   * 6. Ejecuta sincronización dual completa (cha.cl e ips.gob.cl) con reporte estructurado
   */
  public static async syncDualDirectory(): Promise<SyncReport> {
    return await LdapSyncService.syncDualDirectory();
  }
}

export { LdapSyncService };

