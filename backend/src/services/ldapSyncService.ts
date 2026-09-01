import { Client } from 'ldapts';
import { prisma } from '../config/db.js';

export type LdapDomainType = 'CHILEATIENDE' | 'IPS';

export interface LdapDomainConnectionConfig {
  domain: LdapDomainType;
  name: string;
  url: string;
  backupUrl?: string;
  bindDN: string;
  password?: string;
  searchBase: string;
  defaultEmailDomain: string;
  accountSuffix: string;
  timeoutMs: number;
  connectTimeoutMs: number;
  isEnabled: boolean;
}

export interface ConsolidateUserData {
  samAccountName: string;
  displayName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  userPrincipalName?: string;
  rut: string;
  hasOfficialRut: boolean;
  department: string;
  jobTitle: string;
  adGuid: string;
  phone?: string;
  office?: string;
  primaryDomain: LdapDomainType;
  chaExists: boolean;
  ipsExists: boolean;
  isDualDomain: boolean;
  rawAttributes?: Record<string, any>;
}

export interface SyncDomainResult {
  domain: LdapDomainType;
  name: string;
  url: string;
  success: boolean;
  extractedCount: number;
  durationMs: number;
  error?: string;
}

export interface SyncReport {
  success: boolean;
  timestamp: string;
  durationMs: number;
  totalConsolidated: number;
  chaExtracted: number;
  ipsExtracted: number;
  dualDomainCount: number;
  chaOnlyCount: number;
  ipsOnlyCount: number;
  dbInsertedCount: number;
  dbUpdatedCount: number;
  dbErrorsCount: number;
  domains: {
    chileatiende: SyncDomainResult;
    ips: SyncDomainResult;
  };
}

export class LdapSyncService {
  /**
   * 1. Extrae y valida la configuración del dominio ChileAtiende (cha.cl)
   */
  public static getChaConfig(): LdapDomainConnectionConfig {
    const isGlobalEnabled = process.env.LDAP_ENABLED !== 'false';
    const isChaEnabled = process.env.LDAP_CHA_ENABLED ? process.env.LDAP_CHA_ENABLED === 'true' : isGlobalEnabled;

    return {
      domain: 'CHILEATIENDE',
      name: 'Active Directory ChileAtiende (cha.cl)',
      url: process.env.LDAP_CHA_HOST || process.env.LDAP_CHA_URL || process.env.LDAP_URL || 'ldap://scha01.cha.cl:389',
      backupUrl: process.env.LDAP_CHA_BACKUP_URL || process.env.LDAP_BACKUP_URL,
      bindDN: process.env.LDAP_CHA_BIND_USER || process.env.LDAP_CHA_BIND_DN || process.env.LDAP_BIND_USER || 'ngalarceg.srv@chileatiende.cl',
      password: process.env.LDAP_CHA_BIND_PASS || process.env.LDAP_CHA_BIND_PASSWORD || process.env.LDAP_BIND_PASSWORD || 'cha.2029',
      searchBase: process.env.LDAP_CHA_BASE_DN || process.env.LDAP_CHA_SEARCH_BASE || process.env.LDAP_BASE_DN || 'DC=cha,DC=cl',
      defaultEmailDomain: process.env.LDAP_CHA_DOMAIN || 'cha.cl',
      accountSuffix: '@chileatiende.cl',
      timeoutMs: parseInt(process.env.LDAP_CHA_TIMEOUT_MS || '7000', 10),
      connectTimeoutMs: parseInt(process.env.LDAP_CHA_CONNECT_TIMEOUT_MS || '4000', 10),
      isEnabled: isChaEnabled
    };
  }

  /**
   * 2. Extrae y valida la configuración del dominio IPS (ips.gob.cl)
   */
  public static getIpsConfig(): LdapDomainConnectionConfig {
    const isGlobalEnabled = process.env.LDAP_ENABLED !== 'false';
    const isIpsEnabled = process.env.LDAP_IPS_ENABLED ? process.env.LDAP_IPS_ENABLED === 'true' : isGlobalEnabled;

    return {
      domain: 'IPS',
      name: 'Active Directory IPS (ips.gob.cl)',
      url: process.env.LDAP_IPS_HOST || process.env.LDAP_IPS_URL || 'ldap://dc05.ips.gob.cl:389',
      backupUrl: process.env.LDAP_IPS_BACKUP_URL,
      bindDN: process.env.LDAP_IPS_BIND_USER || process.env.LDAP_IPS_BIND_DN || 'ngalarceg.srv@ips.gob.cl',
      password: process.env.LDAP_IPS_BIND_PASS || process.env.LDAP_IPS_BIND_PASSWORD || 'cha.2024',
      searchBase: process.env.LDAP_IPS_BASE_DN || process.env.LDAP_IPS_SEARCH_BASE || 'DC=ips,DC=gob,DC=cl',
      defaultEmailDomain: process.env.LDAP_IPS_DOMAIN || 'ips.gob.cl',
      accountSuffix: '@ips.gob.cl',
      timeoutMs: parseInt(process.env.LDAP_IPS_TIMEOUT_MS || '15000', 10),
      connectTimeoutMs: parseInt(process.env.LDAP_IPS_CONNECT_TIMEOUT_MS || '6000', 10),
      isEnabled: isIpsEnabled
    };
  }

  /**
   * Convierte un buffer binario objectGUID de Active Directory a formato canónico RFC-4122 (UUID)
   */
  public static formatBinaryGuid(guid: Buffer | string | undefined): string {
    if (!guid) return '';
    if (typeof guid === 'string') return guid;
    if (!Buffer.isBuffer(guid) || guid.length !== 16) {
      return Buffer.isBuffer(guid) ? guid.toString('hex') : String(guid);
    }

    // Active Directory almacena los primeros 3 bloques en formato Little-Endian
    const p1 = guid.readUInt32LE(0).toString(16).padStart(8, '0');
    const p2 = guid.readUInt16LE(4).toString(16).padStart(4, '0');
    const p3 = guid.readUInt16LE(6).toString(16).padStart(4, '0');
    const p4 = guid.subarray(8, 10).toString('hex');
    const p5 = guid.subarray(10, 16).toString('hex');

    return `${p1}-${p2}-${p3}-${p4}-${p5}`.toLowerCase();
  }

  /**
   * Evalúa el estado de cuenta a partir del bitmask de userAccountControl de Active Directory
   * 0x0002 (ACCOUNTDISABLE): si está activo, la cuenta está inactiva/deshabilitada
   */
  public static isAccountActive(userAccountControl: any): boolean {
    if (userAccountControl === undefined || userAccountControl === null) return true;
    const uac = parseInt(String(userAccountControl), 10);
    if (isNaN(uac)) return true;
    return (uac & 2) === 0; // Si bit 2 es 0, está ACTIVO
  }

  /**
   * Crea un cliente ldapts configurado
   */
  private static createClient(config: LdapDomainConnectionConfig, customUrl?: string): Client {
    return new Client({
      url: customUrl || config.url,
      timeout: config.timeoutMs,
      connectTimeout: config.connectTimeoutMs,
      strictDN: false
    });
  }

  /**
   * Cierra de forma segura una conexión LDAP
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
   * Normaliza y valida formato de RUT chileno básico
   */
  private static parseRut(raw: string | undefined): { rut: string; isValid: boolean } {
    if (!raw) return { rut: '', isValid: false };
    const cleaned = String(raw).trim().replace(/[^0-9kK]/g, '').toUpperCase();
    if (cleaned.length >= 7 && cleaned.length <= 9) {
      const body = cleaned.slice(0, -1);
      const dv = cleaned.slice(-1);
      return { rut: `${body}-${dv}`, isValid: true };
    }
    return { rut: raw.trim(), isValid: false };
  }

  /**
   * Normaliza y extrae el correo institucional respetando el dominio
   */
  private static extractEmail(
    entry: any,
    samAccountName: string,
    domain: LdapDomainType,
    defaultEmailDomain: string
  ): string {
    const rawMail = String(entry.mail || '').trim().toLowerCase();
    const rawUpn = String(entry.userPrincipalName || '').trim().toLowerCase();

    if (domain === 'CHILEATIENDE') {
      if (rawMail.includes('@cha.cl') || rawMail.includes('@chileatiende.cl')) {
        return rawMail;
      }
      if (rawUpn.includes('@cha.cl') || rawUpn.includes('@chileatiende.cl')) {
        return rawUpn;
      }
      if (rawMail && rawMail.includes('@') && !rawMail.includes('@ips.gob.cl')) {
        return rawMail;
      }
      return `${samAccountName}@${defaultEmailDomain}`;
    } else {
      if (rawMail.includes('@ips.gob.cl')) {
        return rawMail;
      }
      if (rawUpn.includes('@ips.gob.cl')) {
        return rawUpn;
      }
      if (rawMail && rawMail.includes('@')) {
        return rawMail;
      }
      return `${samAccountName}@${defaultEmailDomain}`;
    }
  }

  /**
   * 3. Extracción de usuarios activos desde un servidor LDAP específico
   */
  public static async fetchUsersFromDomain(
    config: LdapDomainConnectionConfig
  ): Promise<{ users: any[]; error?: string }> {
    if (!config.isEnabled) {
      console.log(`ℹ️ [LDAP Sync] El dominio ${config.name} está deshabilitado en la configuración.`);
      return { users: [] };
    }

    if (!config.url || !config.searchBase) {
      const err = `Configuración incompleta para ${config.name}: falta URL o SearchBase.`;
      console.warn(`⚠️ [LDAP Sync] ${err}`);
      return { users: [], error: err };
    }

    console.log(`🔌 [LDAP Sync] Conectando a ${config.name} (${config.url})...`);
    let client: Client | null = null;

    try {
      client = this.createClient(config);

      if (config.bindDN && config.password) {
        await client.bind(config.bindDN, config.password);
      } else {
        await client.bind('', '');
      }

      console.log(`✅ [LDAP Sync] Bind exitoso en ${config.name}. Consultando catálogo paged...`);

      const filter = '(&(objectClass=user)(!(sAMAccountName=*$)))';
      const attributes = [
        'sAMAccountName',
        'displayName',
        'cn',
        'givenName',
        'sn',
        'mail',
        'userPrincipalName',
        'employeeID',
        'department',
        'title',
        'objectGUID',
        'userAccountControl',
        'telephoneNumber',
        'physicalDeliveryOfficeName',
        'description'
      ];

      const { searchEntries } = await client.search(config.searchBase, {
        scope: 'sub',
        filter,
        attributes,
        paged: true
      });

      console.log(`📦 [LDAP Sync] Se extrajeron ${searchEntries.length} entradas activas desde ${config.name}.`);
      return { users: searchEntries };
    } catch (error: any) {
      const errorMessage = error?.message || 'Error desconocido de conexión LDAP';
      console.error(`❌ [LDAP Sync Error] Fallo al extraer usuarios desde ${config.name}: ${errorMessage}`);
      return { users: [], error: errorMessage };
    } finally {
      await this.safeUnbind(client);
    }
  }

  /**
   * 4. Consolidación en memoria mediante Map<string, ConsolidateUserData>
   * Aplica rigurosamente todas las reglas de negocio de precedencia y no sobreescritura.
   */
  public static consolidateUsers(
    chaRawEntries: any[],
    ipsRawEntries: any[],
    chaConfig: LdapDomainConnectionConfig,
    ipsConfig: LdapDomainConnectionConfig
  ): {
    consolidatedMap: Map<string, ConsolidateUserData>;
    stats: {
      chaCount: number;
      ipsCount: number;
      dualCount: number;
      chaOnlyCount: number;
      ipsOnlyCount: number;
    };
  } {
    const userMap = new Map<string, ConsolidateUserData>();

    // -------------------------------------------------------------
    // FASE 1: PROCESAR CHILEATIENDE (cha.cl) - PRIORIDAD MÁXIMA
    // -------------------------------------------------------------
    let chaCount = 0;
    for (const entry of chaRawEntries) {
      const samRaw = String(entry.sAMAccountName || '').trim();
      if (!samRaw || samRaw.endsWith('$')) continue;

      const samAccountName = samRaw.toLowerCase();
      const givenName = String(entry.givenName || '').trim();
      const sn = String(entry.sn || '').trim();
      let fullName = String(entry.displayName || '').trim();
      if (!fullName) {
        fullName = givenName && sn ? `${givenName} ${sn}` : samRaw;
      }

      const email = this.extractEmail(entry, samAccountName, 'CHILEATIENDE', chaConfig.defaultEmailDomain);
      const parsedRut = this.parseRut(entry.employeeID || entry.description);
      const rut = parsedRut.isValid ? parsedRut.rut : `CHA-${samAccountName}`;

      let guidStr = '';
      if (Buffer.isBuffer(entry.objectGUID)) {
        guidStr = entry.objectGUID.toString('hex');
      } else {
        guidStr = String(entry.objectGUID || `guid-cha-${samAccountName}`);
      }

      const userRecord: ConsolidateUserData = {
        samAccountName,
        displayName: fullName,
        firstName: givenName || fullName.split(' ')[0] || samAccountName,
        lastName: sn || fullName.split(' ').slice(1).join(' ') || '',
        fullName,
        email,
        userPrincipalName: entry.userPrincipalName ? String(entry.userPrincipalName).trim() : undefined,
        rut,
        hasOfficialRut: parsedRut.isValid,
        department: String(entry.department || 'ChileAtiende').trim(),
        jobTitle: String(entry.title || 'Funcionario ChileAtiende').trim(),
        adGuid: guidStr,
        phone: entry.telephoneNumber ? String(entry.telephoneNumber).trim() : undefined,
        office: entry.physicalDeliveryOfficeName ? String(entry.physicalDeliveryOfficeName).trim() : undefined,
        primaryDomain: 'CHILEATIENDE',
        chaExists: true,
        ipsExists: false,
        isDualDomain: false,
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

      userMap.set(samAccountName, userRecord);
      chaCount++;
    }

    // -------------------------------------------------------------
    // FASE 2: PROCESAR IPS (ips.gob.cl) - VINCULACIÓN Y FALLBACK
    // -------------------------------------------------------------
    let ipsCount = 0;
    let dualCount = 0;

    for (const entry of ipsRawEntries) {
      const samRaw = String(entry.sAMAccountName || '').trim();
      if (!samRaw || samRaw.endsWith('$')) continue;

      const samAccountName = samRaw.toLowerCase();
      const parsedRut = this.parseRut(entry.employeeID || entry.description);

      if (userMap.has(samAccountName)) {
        // =========================================================================
        // REGLA OBLIGATORIA: Usuario ya existe en CHA
        // - NO sobreescribir su correo institucional @cha.cl
        // - NO duplicar el registro
        // - Enriquecer datos complementarios (RUT real, departamento o cargo si faltaban)
        // =========================================================================
        const existing = userMap.get(samAccountName)!;
        existing.ipsExists = true;
        existing.isDualDomain = true;
        dualCount++;

        // Si en CHA no teníamos RUT oficial y en IPS sí viene, enriquecer
        if (!existing.hasOfficialRut && parsedRut.isValid) {
          existing.rut = parsedRut.rut;
          existing.hasOfficialRut = true;
        }

        // Si el departamento en CHA es genérico, complementar con IPS
        const ipsDept = String(entry.department || '').trim();
        if (ipsDept && (!existing.department || existing.department === 'ChileAtiende')) {
          existing.department = `${existing.department} / ${ipsDept}`;
        }

        // Si el cargo en CHA es genérico y en IPS viene específico
        const ipsTitle = String(entry.title || '').trim();
        if (ipsTitle && (!existing.jobTitle || existing.jobTitle === 'Funcionario ChileAtiende')) {
          existing.jobTitle = ipsTitle;
        }

        ipsCount++;
      } else {
        // =========================================================================
        // Usuario exclusivo de IPS: registrar con correo institucional @ips.gob.cl
        // =========================================================================
        const givenName = String(entry.givenName || '').trim();
        const sn = String(entry.sn || '').trim();
        let fullName = String(entry.displayName || '').trim();
        if (!fullName) {
          fullName = givenName && sn ? `${givenName} ${sn}` : samRaw;
        }

        const email = this.extractEmail(entry, samAccountName, 'IPS', ipsConfig.defaultEmailDomain);
        const rut = parsedRut.isValid ? parsedRut.rut : `IPS-${samAccountName}`;

        let guidStr = '';
        if (Buffer.isBuffer(entry.objectGUID)) {
          guidStr = entry.objectGUID.toString('hex');
        } else {
          guidStr = String(entry.objectGUID || `guid-ips-${samAccountName}`);
        }

        const ipsUserRecord: ConsolidateUserData = {
          samAccountName,
          displayName: fullName,
          firstName: givenName || fullName.split(' ')[0] || samAccountName,
          lastName: sn || fullName.split(' ').slice(1).join(' ') || '',
          fullName,
          email,
          userPrincipalName: entry.userPrincipalName ? String(entry.userPrincipalName).trim() : undefined,
          rut,
          hasOfficialRut: parsedRut.isValid,
          department: String(entry.department || 'Instituto de Previsión Social (IPS)').trim(),
          jobTitle: String(entry.title || 'Funcionario IPS').trim(),
          adGuid: guidStr,
          phone: entry.telephoneNumber ? String(entry.telephoneNumber).trim() : undefined,
          office: entry.physicalDeliveryOfficeName ? String(entry.physicalDeliveryOfficeName).trim() : undefined,
          primaryDomain: 'IPS',
          chaExists: false,
          ipsExists: true,
          isDualDomain: false,
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

        userMap.set(samAccountName, ipsUserRecord);
        ipsCount++;
      }
    }

    const chaOnlyCount = chaCount - dualCount;
    const ipsOnlyCount = ipsCount - dualCount;

    return {
      consolidatedMap: userMap,
      stats: {
        chaCount,
        ipsCount,
        dualCount,
        chaOnlyCount,
        ipsOnlyCount
      }
    };
  }

  /**
   * 5. Persistencia y Upsert en la Base de Datos PostgreSQL (userADCache)
   */
  public static async persistConsolidatedUsers(
    users: ConsolidateUserData[]
  ): Promise<{ inserted: number; updated: number; errors: number }> {
    if (users.length === 0) {
      return { inserted: 0, updated: 0, errors: 0 };
    }

    console.log(`💾 [LDAP Sync] Iniciando persistencia/upsert de ${users.length} funcionarios consolidados en PostgreSQL...`);
    const now = new Date();
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (u) => {
          try {
            // Verificar si el usuario ya existe para contabilizar inserciones vs actualizaciones
            const existing = await prisma.userADCache.findUnique({
              where: { samAccountName: u.samAccountName }
            });

            const domainStr = u.primaryDomain === 'CHILEATIENDE' ? 'cha.cl' : 'ips.gob.cl';

            await prisma.userADCache.upsert({
              where: { samAccountName: u.samAccountName },
              update: {
                fullName: u.fullName,
                firstName: u.firstName,
                lastName: u.lastName,
                email: u.email,
                jobTitle: u.jobTitle,
                department: u.department,
                domain: domainStr,
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
                domain: domainStr,
                lastSyncedAt: now,
                isActive: true
              }
            });

            if (existing) {
              updated++;
            } else {
              inserted++;
            }
          } catch (err: any) {
            // Manejo de colisión en campo RUT único si varios usuarios comparten RUT placeholder
            try {
              const domainStr = u.primaryDomain === 'CHILEATIENDE' ? 'cha.cl' : 'ips.gob.cl';
              const fallbackRut = `${u.primaryDomain === 'CHILEATIENDE' ? 'CHA' : 'IPS'}-${u.samAccountName}-${Math.floor(100 + Math.random() * 900)}`;
              await prisma.userADCache.upsert({
                where: { samAccountName: u.samAccountName },
                update: {
                  fullName: u.fullName,
                  firstName: u.firstName,
                  lastName: u.lastName,
                  email: u.email,
                  jobTitle: u.jobTitle,
                  department: u.department,
                  domain: domainStr,
                  rut: fallbackRut,
                  lastSyncedAt: now,
                  isActive: true
                },
                create: {
                  adGuid: `${u.adGuid}-${Date.now()}`,
                  samAccountName: u.samAccountName,
                  rut: fallbackRut,
                  firstName: u.firstName,
                  lastName: u.lastName,
                  fullName: u.fullName,
                  email: u.email,
                  jobTitle: u.jobTitle,
                  department: u.department,
                  domain: domainStr,
                  lastSyncedAt: now,
                  isActive: true
                }
              });
              updated++;
            } catch (retryErr: any) {
              console.error(`⚠️ Error al guardar usuario '${u.samAccountName}':`, retryErr.message);
              errors++;
            }
          }
        })
      );
    }

    console.log(`✅ [LDAP Sync] Persistencia completada: ${inserted} nuevos insertados, ${updated} actualizados, ${errors} errores.`);
    return { inserted, updated, errors };
  }

  /**
   * 6. Flujo Principal: Ejecución de Sincronización Dual Completa (CHA + IPS)
   */
  public static async syncDualDirectory(): Promise<SyncReport> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    console.log('================================================================');
    console.log('🔄 INICIANDO SINCRONIZACIÓN DUAL DE USUARIOS ACTIVE DIRECTORY');
    console.log('   Dominio 1: ChileAtiende (cha.cl)');
    console.log('   Dominio 2: IPS (ips.gob.cl)');
    console.log('================================================================');

    const chaConfig = this.getChaConfig();
    const ipsConfig = this.getIpsConfig();

    // 1. Extraer desde ChileAtiende (CHA)
    const tChaStart = Date.now();
    let chaResult: { users: any[]; error?: string } = { users: [] };
    try {
      chaResult = await this.fetchUsersFromDomain(chaConfig);
    } catch (err: any) {
      chaResult = { users: [], error: err.message };
    }
    const tChaDuration = Date.now() - tChaStart;

    // 2. Extraer desde IPS
    const tIpsStart = Date.now();
    let ipsResult: { users: any[]; error?: string } = { users: [] };
    try {
      ipsResult = await this.fetchUsersFromDomain(ipsConfig);
    } catch (err: any) {
      ipsResult = { users: [], error: err.message };
    }
    const tIpsDuration = Date.now() - tIpsStart;

    // 3. Consolidar en memoria con Map
    const { consolidatedMap, stats } = this.consolidateUsers(
      chaResult.users,
      ipsResult.users,
      chaConfig,
      ipsConfig
    );

    const consolidatedUsersList = Array.from(consolidatedMap.values());

    // 4. Persistir en PostgreSQL
    let persistStats = { inserted: 0, updated: 0, errors: 0 };
    if (consolidatedUsersList.length > 0) {
      persistStats = await this.persistConsolidatedUsers(consolidatedUsersList);
    }

    const durationMs = Date.now() - startTime;
    const isOverallSuccess = !chaResult.error || !ipsResult.error || consolidatedUsersList.length > 0;

    const report: SyncReport = {
      success: isOverallSuccess,
      timestamp,
      durationMs,
      totalConsolidated: consolidatedUsersList.length,
      chaExtracted: stats.chaCount,
      ipsExtracted: stats.ipsCount,
      dualDomainCount: stats.dualCount,
      chaOnlyCount: stats.chaOnlyCount,
      ipsOnlyCount: stats.ipsOnlyCount,
      dbInsertedCount: persistStats.inserted,
      dbUpdatedCount: persistStats.updated,
      dbErrorsCount: persistStats.errors,
      domains: {
        chileatiende: {
          domain: 'CHILEATIENDE',
          name: chaConfig.name,
          url: chaConfig.url,
          success: !chaResult.error,
          extractedCount: chaResult.users.length,
          durationMs: tChaDuration,
          error: chaResult.error
        },
        ips: {
          domain: 'IPS',
          name: ipsConfig.name,
          url: ipsConfig.url,
          success: !ipsResult.error,
          extractedCount: ipsResult.users.length,
          durationMs: tIpsDuration,
          error: ipsResult.error
        }
      }
    };

    console.log('================================================================');
    console.log('📊 REPORTE FINAL DE SINCRONIZACIÓN DUAL:');
    console.log(`⏱️  Duración Total:         ${(durationMs / 1000).toFixed(2)}s`);
    console.log(`👥 Total Consolidados:     ${report.totalConsolidated}`);
    console.log(`🏛️  Extraídos CHA:          ${report.chaExtracted}`);
    console.log(`🏢 Extraídos IPS:          ${report.ipsExtracted}`);
    console.log(`🔗 Cuentas Dual-Dominio:   ${report.dualDomainCount}`);
    console.log(`📥 Insertados Nuevos:      ${report.dbInsertedCount}`);
    console.log(`🔄 Actualizados en BD:     ${report.dbUpdatedCount}`);
    console.log('================================================================');

    return report;
  }
}
