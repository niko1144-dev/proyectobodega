// Servicio de Integración y Consulta con Active Directory / Microsoft Entra ID (LDAP + PostgreSQL)
import { ApiClient } from '../api/client';
import { ADUser } from '../types/user';

export class ADService {
  /**
   * Consulta en tiempo real los funcionarios de Active Directory sincronizados en la base de datos
   */
  public static async searchUsers(query: string = ''): Promise<ADUser[]> {
    try {
      return await ApiClient.searchDirectoryUsers(query);
    } catch {
      return [];
    }
  }

  /**
   * Obtiene la ficha completa de un funcionario por su RUT o ID
   */
  public static async getUserByRut(rut: string): Promise<ADUser | undefined> {
    try {
      const users = await ApiClient.searchDirectoryUsers(rut);
      const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
      return users.find(u => (u.rut || '').replace(/[^0-9kK]/g, '').toUpperCase() === clean);
    } catch {
      return undefined;
    }
  }

  /**
   * Sincronización manual / programada con Active Directory
   */
  public static async syncDirectory(): Promise<{ syncedCount: number; timestamp: string }> {
    return await ApiClient.syncDirectory();
  }
}
