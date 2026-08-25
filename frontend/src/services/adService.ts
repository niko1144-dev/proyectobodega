// Servicio de Integración y Consulta con Active Directory / Microsoft Entra ID (LDAP)
import { storage } from '../db/storage';
import { ADUser } from '../types/user';

export class ADService {
  /**
   * Simula consulta en tiempo real vía LDAP / Microsoft Graph API
   */
  public static async searchUsers(query: string): Promise<ADUser[]> {
    // Simular latencia de red de directorio (120ms)
    await new Promise(resolve => setTimeout(resolve, 120));
    return storage.searchADUsers(query);
  }

  /**
   * Obtiene la ficha completa de un funcionario por su RUT o ID
   */
  public static async getUserByRut(rut: string): Promise<ADUser | undefined> {
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    const users = storage.getADUsers();
    return users.find(u => u.rut.replace(/[^0-9kK]/g, '').toUpperCase() === clean);
  }

  /**
   * Simulación de sincronización nocturna / manual con el Controlador de Dominio (DC)
   */
  public static async syncDirectory(): Promise<{ syncedCount: number; timestamp: string }> {
    await new Promise(resolve => setTimeout(resolve, 800));
    const now = new Date().toISOString();
    return {
      syncedCount: storage.getADUsers().length,
      timestamp: now
    };
  }
}
