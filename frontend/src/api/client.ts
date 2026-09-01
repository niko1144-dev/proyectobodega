// Cliente HTTP API REST para conectar el Frontend con el Backend (PostgreSQL + Prisma)
import { storage } from '../db/storage';
import { Asset, AssetType, AssetStatus, Consumable, ConsumableStock, AssetTraceabilityResponse, AssetAuditLog } from '../types/asset';
import { Branch, Supplier, PurchaseOrder, LeasingContract, DispatchGuide } from '../types/document';
import { ADUser, IndexedADUser, PlatformUser, LoginCredentials } from '../types/user';
import { Assignment } from '../types/assignment';
import { TopDeliveredResponse, TopDeliveredFilterParams } from '../types/dashboard';
import { normalizeText } from '../utils/formatters';

const API_BASE_URL = '/api/v1';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers
    },
    ...options
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP Error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}

export class ApiClient {
  // --- AUTENTICACIÓN ---
  public static async login(credentials: LoginCredentials): Promise<{ success: boolean; user: PlatformUser; token: string }> {
    try {
      return await fetchJson('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
    } catch (error) {
      // Fallback a almacenamiento local si backend no está disponible
      return storage.loginPlatformUser(credentials.identifier, credentials.password);
    }
  }

  public static async logout(): Promise<void> {
    try {
      await fetchJson('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
  }

  public static async changeMyPassword(params: { userId: string; currentPassword: string; newPassword: string }): Promise<{ success: boolean; message: string }> {
    try {
      return await fetchJson('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    } catch (err: any) {
      const currentUser = storage.getCurrentUser();
      if (currentUser && currentUser.id === params.userId) {
        return storage.updatePlatformUserPassword(params.userId, params.newPassword);
      }
      throw err;
    }
  }

  public static async requestPasswordReset(identifier: string): Promise<{ success: boolean; message: string; emailMasked?: string }> {
    return await fetchJson('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  }

  public static async verifyResetToken(token: string): Promise<{ valid: boolean; fullName?: string; username?: string; email?: string; error?: string }> {
    return await fetchJson(`/auth/verify-reset-token?token=${encodeURIComponent(token)}`);
  }

  public static async resetPasswordWithToken(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    return await fetchJson('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword })
    });
  }

  // --- MANTENEDOR DE USUARIOS DE PLATAFORMA ---
  public static async getPlatformUsers(params?: { role?: string; branchId?: string; search?: string }): Promise<PlatformUser[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.role && params.role !== 'ALL') searchParams.append('role', params.role);
      if (params?.branchId && params.branchId !== 'ALL') searchParams.append('branchId', params.branchId);
      if (params?.search) searchParams.append('search', params.search);

      const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await fetchJson<PlatformUser[]>(`/users${query}`);
    } catch {
      return storage.getPlatformUsers();
    }
  }

  public static async createPlatformUser(userData: any): Promise<any> {
    try {
      return await fetchJson('/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch (error) {
      return storage.createPlatformUser(userData);
    }
  }

  public static async updatePlatformUser(id: string, userData: any): Promise<any> {
    try {
      return await fetchJson(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
      });
    } catch (error) {
      return storage.updatePlatformUser(id, userData);
    }
  }

  public static async updatePlatformUserPassword(id: string, newPassword: string): Promise<any> {
    try {
      return await fetchJson(`/users/${id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ newPassword })
      });
    } catch (error) {
      return storage.updatePlatformUserPassword(id, newPassword);
    }
  }

  public static async togglePlatformUserStatus(id: string): Promise<any> {
    try {
      return await fetchJson(`/users/${id}/toggle-status`, {
        method: 'PATCH'
      });
    } catch (error) {
      return storage.togglePlatformUserStatus(id);
    }
  }

  public static async deletePlatformUser(id: string): Promise<any> {
    try {
      return await fetchJson(`/users/${id}`, {
        method: 'DELETE'
      });
    } catch (error: any) {
      throw new Error(error.message || 'Error al eliminar usuario');
    }
  }

  // --- DASHBOARD ---
  public static async getDashboardMetrics(branchId?: string): Promise<any> {
    try {
      const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
      return await fetchJson(`/dashboard/metrics${query}`);
    } catch {
      const allAssets = storage.getAssets();
      const assets = branchId && branchId !== 'ALL' ? allAssets.filter(a => a.currentBranchId === branchId) : allAssets;
      return {
        totalAssets: assets.length,
        ownAssets: assets.filter(a => a.propertyType === 'PROPIO').length,
        leasingAssets: assets.filter(a => a.propertyType === 'ARRIENDO').length,
        inWarehouse: assets.filter(a => a.status === 'BODEGA_DISPONIBLE').length,
        assigned: assets.filter(a => a.status === 'ASIGNADO').length,
        inMaintenance: assets.filter(a => a.status === 'EN_MANTENCION').length,
        expiringContracts: [],
        criticalStocks: [],
        recentAuditLogs: storage.getAuditLogs().slice(0, 8)
      };
    }
  }

  public static async getTopDeliveredProducts(params?: TopDeliveredFilterParams): Promise<TopDeliveredResponse> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.append('startDate', params.startDate);
      if (params?.endDate) searchParams.append('endDate', params.endDate);
      if (params?.branchId && params.branchId !== 'ALL') searchParams.append('branchId', params.branchId);
      if (params?.itemType && params.itemType !== 'ALL') searchParams.append('itemType', params.itemType);

      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await fetchJson<TopDeliveredResponse>(`/dashboard/top-delivered${queryString}`);
    } catch (err) {
      console.warn('Error fetching top-delivered from API, calculating locally:', err);
      const assignments = storage.getAssignments();
      const branches = storage.getBranches();

      const start = params?.startDate ? new Date(params.startDate) : null;
      const end = params?.endDate ? new Date(params.endDate) : null;
      if (end && params?.endDate?.length === 10) {
        end.setHours(23, 59, 59, 999);
      }

      const filteredAssignments = assignments.filter(a => {
        if (a.status === 'ANULADO' || a.assignmentType === 'DEVOLUCION') return false;
        if (params?.branchId && params.branchId !== 'ALL' && a.branchId !== params.branchId) return false;
        const created = new Date(a.createdAt);
        if (start && created < start) return false;
        if (end && created > end) return false;
        return true;
      });

      const productMap = new Map<string, any>();
      let totalDeliveredUnits = 0;
      const recentDeliveries: any[] = [];
      const requestedType = params?.itemType || 'ALL';

      for (const a of filteredAssignments) {
        for (const item of a.items) {
          if (item.assetId || item.serialNumber || item.brand) {
            if (requestedType === 'CONSUMABLE') continue;
            const productName = item.brand ? `${item.brand} ${item.model || ''}`.trim() : (item.assetTypeName || 'Equipo TI');
            const key = `HW_${productName.toLowerCase()}`;
            const qty = item.quantity || 1;
            totalDeliveredUnits += qty;

            const existing = productMap.get(key);
            if (!existing) {
              productMap.set(key, {
                id: item.assetId || key,
                name: productName,
                brand: item.brand || 'Genérico',
                model: item.model || '',
                category: item.assetTypeName || 'Cómputo',
                itemType: 'HARDWARE',
                quantity: qty,
                assignmentCount: 1,
                recentRecipients: [{
                  recipientName: a.recipientName,
                  recipientRut: a.recipientRut,
                  actNumber: a.actNumber,
                  date: a.createdAt,
                  branchName: a.branchName
                }]
              });
            } else {
              existing.quantity += qty;
              existing.assignmentCount += 1;
              if (existing.recentRecipients.length < 5) {
                existing.recentRecipients.push({
                  recipientName: a.recipientName,
                  recipientRut: a.recipientRut,
                  actNumber: a.actNumber,
                  date: a.createdAt,
                  branchName: a.branchName
                });
              }
            }

            if (recentDeliveries.length < 15) {
              recentDeliveries.push({
                actNumber: a.actNumber,
                date: a.createdAt,
                recipientName: a.recipientName,
                recipientRut: a.recipientRut,
                recipientDepartment: a.recipientDepartment,
                branchName: a.branchName,
                productName,
                quantity: qty,
                itemType: 'HARDWARE'
              });
            }
          } else if (item.consumableId || item.consumableName) {
            if (requestedType === 'HARDWARE') continue;
            const productName = item.consumableName || 'Insumo / Periférico';
            const key = `CON_${item.consumableId || productName.toLowerCase()}`;
            const qty = item.quantity || 1;
            totalDeliveredUnits += qty;

            const existing = productMap.get(key);
            if (!existing) {
              productMap.set(key, {
                id: item.consumableId || key,
                name: productName,
                brand: 'Insumo',
                model: item.consumableSku || '-',
                category: 'Insumos y Periféricos',
                itemType: 'CONSUMABLE',
                quantity: qty,
                assignmentCount: 1,
                recentRecipients: [{
                  recipientName: a.recipientName,
                  recipientRut: a.recipientRut,
                  actNumber: a.actNumber,
                  date: a.createdAt,
                  branchName: a.branchName
                }]
              });
            } else {
              existing.quantity += qty;
              existing.assignmentCount += 1;
              if (existing.recentRecipients.length < 5) {
                existing.recentRecipients.push({
                  recipientName: a.recipientName,
                  recipientRut: a.recipientRut,
                  actNumber: a.actNumber,
                  date: a.createdAt,
                  branchName: a.branchName
                });
              }
            }

            if (recentDeliveries.length < 15) {
              recentDeliveries.push({
                actNumber: a.actNumber,
                date: a.createdAt,
                recipientName: a.recipientName,
                recipientRut: a.recipientRut,
                recipientDepartment: a.recipientDepartment,
                branchName: a.branchName,
                productName,
                quantity: qty,
                itemType: 'CONSUMABLE'
              });
            }
          }
        }
      }

      const sorted = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);
      const top5 = sorted.slice(0, 5).map((p, idx) => ({
        position: idx + 1,
        id: p.id,
        name: p.name,
        brand: p.brand,
        model: p.model,
        category: p.category,
        itemType: p.itemType,
        quantity: p.quantity,
        percentage: totalDeliveredUnits > 0 ? Number(((p.quantity / totalDeliveredUnits) * 100).toFixed(1)) : 0,
        assignmentCount: p.assignmentCount,
        recentRecipients: p.recentRecipients
      }));

      const brName = params?.branchId && params.branchId !== 'ALL'
        ? branches.find(b => b.id === params.branchId)?.name || 'Sucursal Seleccionada'
        : 'Todas las Sucursales (Nivel Nacional)';

      return {
        items: top5,
        summary: {
          totalDeliveredUnits,
          totalAssignments: filteredAssignments.length,
          uniqueProductsCount: productMap.size,
          top1DominancePercentage: top5.length > 0 ? top5[0].percentage : 0,
          branchName: brName,
          dateRange: {
            startDate: params?.startDate || null,
            endDate: params?.endDate || null
          }
        },
        recentDeliveries
      };
    }
  }

  // --- ACTIVOS ---
  public static async getAssets(params?: { propertyType?: string; status?: string; branchId?: string; search?: string }): Promise<Asset[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.propertyType && params.propertyType !== 'ALL') searchParams.append('propertyType', params.propertyType);
      if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
      if (params?.branchId && params.branchId !== 'ALL') searchParams.append('branchId', params.branchId);
      if (params?.search) searchParams.append('search', params.search);

      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await fetchJson<Asset[]>(`/assets${queryString}`);
    } catch {
      return storage.getAssets();
    }
  }

  public static async getAssetTraceability(identifier: string): Promise<AssetTraceabilityResponse> {
    return await fetchJson<AssetTraceabilityResponse>(`/assets/${encodeURIComponent(identifier)}/traceability`);
  }

  public static async getAuditLogs(params?: { limit?: number; branchName?: string; search?: string } | number): Promise<AssetAuditLog[]> {
    try {
      const searchParams = new URLSearchParams();
      if (typeof params === 'number') {
        searchParams.append('limit', String(params));
      } else if (params) {
        if (params.limit) searchParams.append('limit', String(params.limit));
        if (params.branchName && params.branchName !== 'ALL') searchParams.append('branchName', params.branchName);
        if (params.search) searchParams.append('search', params.search);
      }

      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      return await fetchJson<AssetAuditLog[]>(`/assets/audit-logs${queryString}`);
    } catch {
      return [];
    }
  }

  public static async updateAssetStatus(assetId: string, data: { newStatus: AssetStatus; reason: string; newBranchId?: string }): Promise<any> {
    try {
      return await fetchJson(`/assets/${assetId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    } catch {
      storage.updateAssetStatus(assetId, data.newStatus, data.reason, data.newBranchId);
      return { success: true };
    }
  }

  public static async updateAsset(assetId: string, data: any): Promise<any> {
    return await fetchJson(`/assets/${assetId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // --- RESERVAS MULTISESIÓN ---
  public static async reserveItem(itemType: 'ASSET' | 'CONSUMABLE', itemId: string, quantity: number, userId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/assignments/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemType, itemId, quantity, userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al reservar ítem');
    return data;
  }

  public static async unreserveItem(itemType: 'ASSET' | 'CONSUMABLE', itemId: string, userId: string): Promise<any> {
    return await fetchJson(`/assignments/unreserve`, {
      method: 'POST',
      body: JSON.stringify({ itemType, itemId, userId })
    });
  }

  // --- RECEPCIÓN Y GUÍAS ---
  public static async getDispatchGuides(): Promise<DispatchGuide[]> {
    try {
      return await fetchJson<DispatchGuide[]>('/receptions/dispatch-guides');
    } catch {
      return storage.getDispatchGuides();
    }
  }

  public static async registerReception(payload: any): Promise<any> {
    try {
      return await fetchJson('/receptions/dispatch-guide', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch {
      return { success: true };
    }
  }

  // --- ASIGNACIONES & ACTAS ---
  public static async getAssignments(): Promise<Assignment[]> {
    try {
      return await fetchJson<Assignment[]>('/assignments');
    } catch {
      return storage.getAssignments();
    }
  }

  public static async createAssignment(payload: any): Promise<any> {
    try {
      const res = await fetchJson<any>('/assignments', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      // Sincronizar almacenamiento local para consistencia
      storage.createAssignment(payload, payload.signatureDataUrl, payload.signedByName, payload.digitalSignatureHash);
      window.dispatchEvent(new Event('itam_storage_updated'));
      return res;
    } catch (err) {
      console.error('Error al guardar asignación en backend, guardando en storage local:', err);
      const local = storage.createAssignment(payload, payload.signatureDataUrl, payload.signedByName, payload.digitalSignatureHash);
      window.dispatchEvent(new Event('itam_storage_updated'));
      return { success: true, assignment: local };
    }
  }

  public static async processReturn(assignmentId: string, returnedItems: any[], returnBranchId?: string): Promise<any> {
    try {
      const currentUser = storage.getCurrentUser();
      const res = await fetchJson(`/assignments/${assignmentId}/return`, {
        method: 'POST',
        body: JSON.stringify({ 
          returnedItems, 
          returnBranchId, 
          changedByUserName: currentUser?.fullName || 'Técnico Bodega'
        })
      });
      storage.processReturn(assignmentId, returnedItems, returnBranchId);
      window.dispatchEvent(new Event('itam_storage_updated'));
      return res;
    } catch (err) {
      console.error('Error al procesar retorno en backend, actualizando localmente:', err);
      storage.processReturn(assignmentId, returnedItems, returnBranchId);
      window.dispatchEvent(new Event('itam_storage_updated'));
      return { success: true };
    }
  }

  public static async resendAssignmentEmail(assignmentId: string, params?: { targetEmail?: string; pdfBase64?: string }): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      return await fetchJson(`/assignments/${assignmentId}/send-email`, {
        method: 'POST',
        body: JSON.stringify(params || {})
      });
    } catch (err: any) {
      throw new Error(err.message || 'Error al reenviar acta por correo.');
    }
  }

  public static async testEmailRelay(targetEmail?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      return await fetchJson('/assignments/test-email', {
        method: 'POST',
        body: JSON.stringify({ targetEmail })
      });
    } catch (err: any) {
      throw new Error(err.message || 'Error al probar conexión con el relay SMTP.');
    }
  }

  // --- ACTIVE DIRECTORY (CON ÍNDICE EN MEMORIA ULTRARRÁPIDO < 1ms) ---
  private static directoryIndexCache: IndexedADUser[] | null = null;

  public static invalidateDirectoryCache(): void {
    ApiClient.directoryIndexCache = null;
  }

  public static async getIndexedDirectoryUsers(forceRefresh = false): Promise<IndexedADUser[]> {
    if (!forceRefresh && ApiClient.directoryIndexCache && ApiClient.directoryIndexCache.length > 0) {
      return ApiClient.directoryIndexCache;
    }

    const rawUsers = await ApiClient.searchDirectoryUsers();
    const validUsers = rawUsers.filter(u => u.fullName && u.fullName.trim().length > 1 && !u.samAccountName.endsWith('$'));
    
    const indexed: IndexedADUser[] = validUsers.map(u => {
      const rawRut = u.rut || '';
      const cleanRut = rawRut.replace(/[^0-9kK]/g, '').toLowerCase();
      const isIps = (u.email || '').toLowerCase().includes('@ips.gob.cl') || (u.department || '').toLowerCase().includes('ips');
      const searchIndex = normalizeText(
        `${u.fullName} ${u.firstName || ''} ${u.lastName || ''} ${rawRut} ${cleanRut} ${u.samAccountName} ${u.email} ${u.department || ''} ${u.jobTitle || ''} ${u.branchName || ''}`
      );
      return {
        ...u,
        _searchIndex: searchIndex,
        _cleanRut: cleanRut,
        _isIps: isIps
      };
    });

    ApiClient.directoryIndexCache = indexed;
    return indexed;
  }

  public static filterIndexedUsers(
    users: IndexedADUser[],
    query: string,
    domainFilter: 'ALL' | 'CHA' | 'IPS' = 'ALL',
    limit?: number
  ): IndexedADUser[] {
    const trimmed = query.trim();
    const searchWords = trimmed ? normalizeText(trimmed).split(/\s+/).filter(Boolean) : [];

    const results: IndexedADUser[] = [];
    const len = users.length;

    for (let i = 0; i < len; i++) {
      const u = users[i];
      if (domainFilter === 'CHA' && u._isIps) continue;
      if (domainFilter === 'IPS' && !u._isIps) continue;

      if (searchWords.length > 0) {
        let match = true;
        for (let j = 0; j < searchWords.length; j++) {
          const w = searchWords[j];
          const cleanW = w.replace(/[^0-9kK]/g, '').toLowerCase();
          const inRut = cleanW.length >= 3 && u._cleanRut.includes(cleanW);
          if (!inRut && !u._searchIndex.includes(w)) {
            match = false;
            break;
          }
        }
        if (!match) continue;
      }

      results.push(u);
      if (limit && results.length >= limit) break;
    }

    return results;
  }

  public static async searchDirectoryUsers(query?: string): Promise<ADUser[]> {
    try {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      return await fetchJson<ADUser[]>(`/directory/users/search${q}`);
    } catch {
      return storage.searchADUsers(query || '');
    }
  }

  public static async createDirectoryUser(userData: Partial<ADUser>): Promise<any> {
    ApiClient.invalidateDirectoryCache();
    try {
      return await fetchJson('/directory/users', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
    } catch {
      return { success: true };
    }
  }

  public static async syncDirectory(): Promise<{ success: boolean; syncedCount: number; timestamp: string }> {
    ApiClient.invalidateDirectoryCache();
    try {
      return await fetchJson('/directory/sync', { method: 'POST' });
    } catch {
      return { success: true, syncedCount: storage.getADUsers().length, timestamp: new Date().toISOString() };
    }
  }

  // --- CONSUMIBLES ---
  public static async getConsumables(): Promise<Consumable[]> {
    try {
      return await fetchJson<Consumable[]>('/consumables');
    } catch {
      return storage.getConsumables();
    }
  }

  public static async getConsumableStocks(branchId?: string): Promise<ConsumableStock[]> {
    try {
      const query = branchId && branchId !== 'ALL' ? `?branchId=${branchId}` : '';
      return await fetchJson<ConsumableStock[]>(`/consumables/stocks${query}`);
    } catch {
      return storage.getConsumableStocks(branchId);
    }
  }

  public static async registerStockMovement(payload: any): Promise<any> {
    try {
      return await fetchJson('/consumables/movements', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch {
      storage.registerStockMovement(payload.consumableId, payload.branchId, payload.movementType, payload.quantity, payload.reason);
      return { success: true };
    }
  }

  // --- TRASPASOS ENTRE BODEGAS ---
  public static async transferAssets(payload: {
    assetIds: string[];
    sourceBranchId: string;
    destinationBranchId: string;
    reason: string;
    documentRef?: string;
    transferredByUserName?: string;
  }): Promise<{ success: boolean; message: string; transferredCount: number; documentRef: string }> {
    return await fetchJson('/transfers/assets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public static async transferConsumables(payload: {
    consumableId: string;
    sourceBranchId: string;
    destinationBranchId: string;
    quantity: number;
    reason: string;
    documentRef?: string;
    transferredByUserName?: string;
  }): Promise<{ success: boolean; message: string; transferredQuantity: number; documentRef: string }> {
    return await fetchJson('/transfers/consumables', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public static async getAvailableAssetsForTransfer(branchId: string): Promise<any[]> {
    return await fetchJson(`/transfers/available-assets?branchId=${encodeURIComponent(branchId)}`);
  }

  public static async getTransferHistory(branchId?: string): Promise<{
    assetTransfers: any[];
    consumableTransfers: any[];
  }> {
    const q = branchId && branchId !== 'ALL' ? `?branchId=${encodeURIComponent(branchId)}` : '';
    return await fetchJson(`/transfers/history${q}`);
  }

  // --- MAESTROS ---
  public static async getBranches(includeInactive = false): Promise<Branch[]> {
    try {
      const q = includeInactive ? '?includeInactive=true' : '';
      return await fetchJson<Branch[]>(`/masters/branches${q}`);
    } catch {
      return storage.getBranches();
    }
  }

  public static async createBranch(data: { code: string; name: string; region: string; commune: string; address?: string; isActive?: boolean }): Promise<Branch> {
    try {
      const res = await fetchJson<{ success: boolean; branch: Branch }>('/masters/branches', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.branch;
    } catch (error: any) {
      const newBranch: Branch = {
        id: `branch-${Date.now()}`,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        region: data.region.trim(),
        commune: data.commune.trim(),
        address: (data.address || '').trim() || 'Dirección no informada',
        isActive: data.isActive !== undefined ? data.isActive : true
      };
      return newBranch;
    }
  }

  public static async updateBranch(id: string, data: Partial<Branch>): Promise<Branch> {
    try {
      const res = await fetchJson<{ success: boolean; branch: Branch }>(`/masters/branches/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.branch;
    } catch (error: any) {
      throw error;
    }
  }

  public static async deleteBranch(id: string): Promise<any> {
    return await fetchJson(`/masters/branches/${id}`, { method: 'DELETE' });
  }

  public static async getSuppliers(): Promise<Supplier[]> {
    try {
      return await fetchJson<Supplier[]>('/masters/suppliers');
    } catch {
      return storage.getSuppliers();
    }
  }

  public static async createSupplier(data: { rut: string; businessName: string; contactName?: string; contactEmail?: string; contactPhone?: string }): Promise<Supplier> {
    try {
      const res = await fetchJson<{ success: boolean; supplier: Supplier }>('/masters/suppliers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.supplier;
    } catch (error: any) {
      const newSupplier: Supplier = {
        id: `sup-${Date.now()}`,
        rut: data.rut.trim(),
        businessName: data.businessName.trim(),
        contactName: data.contactName?.trim(),
        contactEmail: data.contactEmail?.trim(),
        contactPhone: data.contactPhone?.trim(),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      storage.addSupplier(newSupplier);
      return newSupplier;
    }
  }

  public static async getPurchaseOrders(): Promise<PurchaseOrder[]> {
    try {
      return await fetchJson<PurchaseOrder[]>('/masters/purchase-orders');
    } catch {
      return storage.getPurchaseOrders();
    }
  }

  public static async createPurchaseOrder(data: { ocNumber: string; supplierId: string; description: string; orderDate?: string; totalAmountCLP?: number; documentName?: string }): Promise<PurchaseOrder> {
    try {
      const res = await fetchJson<{ success: boolean; purchaseOrder: PurchaseOrder }>('/masters/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.purchaseOrder;
    } catch (error: any) {
      const suppliers = storage.getSuppliers();
      const sup = suppliers.find(s => s.id === data.supplierId);
      const newPO: PurchaseOrder = {
        id: `po-${Date.now()}`,
        ocNumber: data.ocNumber.trim(),
        supplierId: data.supplierId,
        supplierName: sup ? sup.businessName : 'Proveedor',
        description: data.description.trim(),
        orderDate: data.orderDate || new Date().toISOString(),
        totalAmountCLP: data.totalAmountCLP,
        documentName: data.documentName,
        createdAt: new Date().toISOString()
      };
      storage.addPurchaseOrder(newPO);
      return newPO;
    }
  }

  public static async getLeasingContracts(): Promise<LeasingContract[]> {
    try {
      return await fetchJson<LeasingContract[]>('/masters/leasing-contracts');
    } catch {
      return storage.getLeasingContracts();
    }
  }

  public static async createLeasingContract(data: { contractNumber: string; name: string; supplierId: string; startDate: string; endDate: string; warningDaysThreshold?: number; documentName?: string }): Promise<LeasingContract> {
    try {
      const res = await fetchJson<{ success: boolean; leasingContract: LeasingContract }>('/masters/leasing-contracts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.leasingContract;
    } catch (error: any) {
      const suppliers = storage.getSuppliers();
      const sup = suppliers.find(s => s.id === data.supplierId);
      const newContract: LeasingContract = {
        id: `contract-${Date.now()}`,
        contractNumber: data.contractNumber.trim(),
        name: data.name.trim(),
        supplierId: data.supplierId,
        supplierName: sup ? sup.businessName : 'Proveedor Leasing',
        startDate: data.startDate,
        endDate: data.endDate,
        warningDaysThreshold: data.warningDaysThreshold || 30,
        documentName: data.documentName,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      storage.addLeasingContract(newContract);
      return newContract;
    }
  }

  // --- TIPOS DE HARDWARE ---
  public static async getAssetTypes(): Promise<AssetType[]> {
    try {
      return await fetchJson<AssetType[]>('/masters/asset-types');
    } catch {
      return storage.getAssetTypes();
    }
  }

  public static async createAssetType(data: { name: string; category: string; requiresInventoryNumber?: boolean; iconName?: string }): Promise<AssetType> {
    try {
      const res = await fetchJson<{ success: boolean; assetType: AssetType }>('/masters/asset-types', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.assetType;
    } catch (error: any) {
      // Fallback a almacenamiento local
      const newType: AssetType = {
        id: `type-${Date.now()}`,
        name: data.name.trim(),
        category: data.category as any,
        requiresInventoryNumber: data.requiresInventoryNumber ?? true,
        iconName: data.iconName || 'Laptop'
      };
      storage.addAssetType(newType);
      return newType;
    }
  }
}
