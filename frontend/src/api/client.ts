// Cliente HTTP API REST para conectar el Frontend con el Backend (PostgreSQL + Prisma)
import { storage } from '../db/storage';
import { Asset, AssetType, AssetStatus, Consumable, ConsumableStock, AssetTraceabilityResponse, AssetAuditLog } from '../types/asset';
import { Branch, Supplier, PurchaseOrder, LeasingContract, DispatchGuide } from '../types/document';
import { ADUser, PlatformUser, LoginCredentials } from '../types/user';
import { Assignment } from '../types/assignment';

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
          changedByUserName: currentUser.fullName 
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

  // --- ACTIVE DIRECTORY ---
  public static async searchDirectoryUsers(query?: string): Promise<ADUser[]> {
    try {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      return await fetchJson<ADUser[]>(`/directory/users/search${q}`);
    } catch {
      return storage.searchADUsers(query || '');
    }
  }

  public static async syncDirectory(): Promise<{ success: boolean; syncedCount: number; timestamp: string }> {
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

  // --- MAESTROS ---
  public static async getBranches(): Promise<Branch[]> {
    try {
      return await fetchJson<Branch[]>('/masters/branches');
    } catch {
      return storage.getBranches();
    }
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
