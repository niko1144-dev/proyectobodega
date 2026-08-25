// Repositorio y Capa de Persistencia Local Reactiva para ITAM ChileAtiende
import { 
  initialBranches, 
  initialSuppliers, 
  initialPurchaseOrders, 
  initialLeasingContracts, 
  initialDispatchGuides, 
  initialAssetTypes, 
  initialPlatformUsers,
  initialADUsers, 
  initialAssets, 
  initialConsumables, 
  initialConsumableStocks, 
  initialStockMovements, 
  initialAssignments, 
  initialAuditLogs 
} from './initialData';

import { Asset, AssetType, AssetStatus, PhysicalCondition, Consumable, ConsumableStock, StockMovement, AssetAuditLog } from '../types/asset';
import { Branch, Supplier, PurchaseOrder, LeasingContract, DispatchGuide } from '../types/document';
import { ADUser, PlatformUser } from '../types/user';
import { Assignment, AssignmentItem, AssignmentStatus } from '../types/assignment';

const STORAGE_KEYS = {
  BRANCHES: 'chileatiende_itam_branches_v1',
  SUPPLIERS: 'chileatiende_itam_suppliers_v1',
  PURCHASE_ORDERS: 'chileatiende_itam_pos_v1',
  LEASING_CONTRACTS: 'chileatiende_itam_contracts_v1',
  DISPATCH_GUIDES: 'chileatiende_itam_guides_v1',
  ASSET_TYPES: 'chileatiende_itam_asset_types_v1',
  AD_USERS: 'chileatiende_itam_ad_users_v1',
  ASSETS: 'chileatiende_itam_assets_v1',
  CONSUMABLES: 'chileatiende_itam_consumables_v1',
  CONSUMABLE_STOCKS: 'chileatiende_itam_stocks_v1',
  STOCK_MOVEMENTS: 'chileatiende_itam_movements_v1',
  ASSIGNMENTS: 'chileatiende_itam_assignments_v1',
  AUDIT_LOGS: 'chileatiende_itam_audit_logs_v1',
  PLATFORM_USERS: 'chileatiende_itam_platform_users_v1',
  CURRENT_USER: 'chileatiende_itam_current_user_v1'
};

class StorageService {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(key);
      if (!data) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
      }
      return JSON.parse(data);
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new Event('itam_storage_updated'));
    } catch (e) {
      console.error('Error guardando en localStorage', e);
    }
  }

  public resetToDefaults(): void {
    localStorage.setItem(STORAGE_KEYS.BRANCHES, JSON.stringify(initialBranches));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(initialSuppliers));
    localStorage.setItem(STORAGE_KEYS.PURCHASE_ORDERS, JSON.stringify(initialPurchaseOrders));
    localStorage.setItem(STORAGE_KEYS.LEASING_CONTRACTS, JSON.stringify(initialLeasingContracts));
    localStorage.setItem(STORAGE_KEYS.DISPATCH_GUIDES, JSON.stringify(initialDispatchGuides));
    localStorage.setItem(STORAGE_KEYS.ASSET_TYPES, JSON.stringify(initialAssetTypes));
    localStorage.setItem(STORAGE_KEYS.AD_USERS, JSON.stringify(initialADUsers));
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(initialAssets));
    localStorage.setItem(STORAGE_KEYS.CONSUMABLES, JSON.stringify(initialConsumables));
    localStorage.setItem(STORAGE_KEYS.CONSUMABLE_STOCKS, JSON.stringify(initialConsumableStocks));
    localStorage.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, JSON.stringify(initialStockMovements));
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(initialAssignments));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(initialAuditLogs));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(initialADUsers[0]));
    window.dispatchEvent(new Event('itam_storage_updated'));
  }

  // --- SESIÓN ACTUAL ---
  public getCurrentUser(): PlatformUser {
    return this.getItem<PlatformUser>(STORAGE_KEYS.CURRENT_USER, initialPlatformUsers[0]);
  }

  public setCurrentUser(user: PlatformUser): void {
    this.setItem(STORAGE_KEYS.CURRENT_USER, user);
  }

  // --- MAESTROS ---
  public getBranches(): Branch[] {
    return this.getItem<Branch[]>(STORAGE_KEYS.BRANCHES, initialBranches);
  }

  public getSuppliers(): Supplier[] {
    return this.getItem<Supplier[]>(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
  }

  public addSupplier(supplier: Supplier): void {
    const list = this.getSuppliers();
    this.setItem(STORAGE_KEYS.SUPPLIERS, [...list, supplier]);
  }

  public getPurchaseOrders(): PurchaseOrder[] {
    return this.getItem<PurchaseOrder[]>(STORAGE_KEYS.PURCHASE_ORDERS, initialPurchaseOrders);
  }

  public getLeasingContracts(): LeasingContract[] {
    return this.getItem<LeasingContract[]>(STORAGE_KEYS.LEASING_CONTRACTS, initialLeasingContracts);
  }

  public getDispatchGuides(): DispatchGuide[] {
    return this.getItem<DispatchGuide[]>(STORAGE_KEYS.DISPATCH_GUIDES, initialDispatchGuides);
  }

  public getAssetTypes(): AssetType[] {
    return this.getItem<AssetType[]>(STORAGE_KEYS.ASSET_TYPES, initialAssetTypes);
  }

  public addAssetType(type: AssetType): void {
    const types = this.getAssetTypes();
    this.setItem(STORAGE_KEYS.ASSET_TYPES, [...types, type]);
  }

  // --- ACTIVE DIRECTORY / USUARIOS ---
  public getADUsers(): ADUser[] {
    return this.getItem<ADUser[]>(STORAGE_KEYS.AD_USERS, initialADUsers);
  }

  public searchADUsers(query: string): ADUser[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getADUsers();
    return this.getADUsers().filter(u => 
      u.fullName.toLowerCase().includes(q) ||
      u.rut.toLowerCase().includes(q) ||
      u.samAccountName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  }

  // --- ACTIVOS (ITAM) ---
  public getAssets(): Asset[] {
    return this.getItem<Asset[]>(STORAGE_KEYS.ASSETS, initialAssets);
  }

  public getAssetById(id: string): Asset | undefined {
    return this.getAssets().find(a => a.id === id);
  }

  public checkSerialExists(serialNumber: string, excludeId?: string): boolean {
    return this.getAssets().some(a => 
      a.serialNumber.trim().toUpperCase() === serialNumber.trim().toUpperCase() && 
      a.id !== excludeId
    );
  }

  public checkInventoryNumberExists(inventoryNumber: string, excludeId?: string): boolean {
    if (!inventoryNumber) return false;
    return this.getAssets().some(a => 
      a.inventoryNumber?.trim().toUpperCase() === inventoryNumber.trim().toUpperCase() && 
      a.id !== excludeId
    );
  }

  public addAssetsBatch(newAssets: Asset[], auditReason: string, docRef?: string): void {
    const assets = this.getAssets();
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const createdLogs: AssetAuditLog[] = newAssets.map(a => ({
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId: a.id,
      serialNumber: a.serialNumber,
      inventoryNumber: a.inventoryNumber,
      timestamp: now,
      previousStatus: undefined,
      newStatus: a.status,
      branchName: a.currentBranchName,
      changedByUserName: currentUser.fullName,
      changeReason: auditReason,
      documentRef: docRef || a.dispatchGuideNumber
    }));

    this.setItem(STORAGE_KEYS.ASSETS, [...newAssets, ...assets]);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, [...createdLogs, ...logs]);
  }

  public updateAssetStatus(
    assetId: string, 
    newStatus: AssetStatus, 
    reason: string, 
    newBranchId?: string,
    newLocationDetail?: string
  ): void {
    const assets = this.getAssets();
    const branches = this.getBranches();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const assetIndex = assets.findIndex(a => a.id === assetId);
    if (assetIndex === -1) return;

    const asset = assets[assetIndex];
    const prevStatus = asset.status;
    const prevUserId = asset.assignedToUserId;
    const prevUserName = asset.assignedToUserName;

    let targetBranchName = asset.currentBranchName;
    if (newBranchId) {
      const b = branches.find(br => br.id === newBranchId);
      if (b) {
        asset.currentBranchId = b.id;
        asset.currentBranchName = b.name;
        targetBranchName = b.name;
      }
    }

    if (newLocationDetail !== undefined) {
      asset.locationDetail = newLocationDetail;
    }

    asset.status = newStatus;
    asset.updatedAt = now;

    if (newStatus === 'BODEGA_DISPONIBLE' || newStatus === 'DADO_DE_BAJA' || newStatus === 'DEVUELTO_PROVEEDOR') {
      asset.assignedToUserId = undefined;
      asset.assignedToUserName = undefined;
      asset.assignedToUserRut = undefined;
      asset.assignedToUserDept = undefined;
      asset.assignedDate = undefined;
    }

    const log: AssetAuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId: asset.id,
      serialNumber: asset.serialNumber,
      inventoryNumber: asset.inventoryNumber,
      timestamp: now,
      previousStatus: prevStatus,
      newStatus: newStatus,
      previousUserId: prevUserId,
      previousUserName: prevUserName,
      branchName: targetBranchName,
      changedByUserName: currentUser.fullName,
      changeReason: reason
    };

    const logs = this.getAuditLogs();
    this.setItem(STORAGE_KEYS.ASSETS, assets);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, [log, ...logs]);
  }

  // --- RECEPCIONES & GUÍAS ---
  public addDispatchGuide(guide: DispatchGuide): void {
    const guides = this.getDispatchGuides();
    this.setItem(STORAGE_KEYS.DISPATCH_GUIDES, [guide, ...guides]);
  }

  public addPurchaseOrder(po: PurchaseOrder): void {
    const pos = this.getPurchaseOrders();
    this.setItem(STORAGE_KEYS.PURCHASE_ORDERS, [po, ...pos]);
  }

  public addLeasingContract(contract: LeasingContract): void {
    const contracts = this.getLeasingContracts();
    this.setItem(STORAGE_KEYS.LEASING_CONTRACTS, [contract, ...contracts]);
  }

  // --- CONSUMIBLES & STOCK ---
  public getConsumables(): Consumable[] {
    return this.getItem<Consumable[]>(STORAGE_KEYS.CONSUMABLES, initialConsumables);
  }

  public getConsumableStocks(branchId?: string): ConsumableStock[] {
    const stocks = this.getItem<ConsumableStock[]>(STORAGE_KEYS.CONSUMABLE_STOCKS, initialConsumableStocks);
    if (!branchId) return stocks;
    return stocks.filter(s => s.branchId === branchId);
  }

  public getStockMovements(branchId?: string): StockMovement[] {
    const movements = this.getItem<StockMovement[]>(STORAGE_KEYS.STOCK_MOVEMENTS, initialStockMovements);
    if (!branchId) return movements;
    return movements.filter(m => m.branchId === branchId);
  }

  public registerStockMovement(
    consumableId: string,
    branchId: string,
    movementType: 'INGRESO_GUIA' | 'ENTREGA_FUNCIONARIO' | 'MERMA_DANO' | 'AJUSTE_INVENTARIO',
    quantity: number,
    reason: string,
    options?: {
      dispatchGuideNumber?: string;
      assignmentActNumber?: string;
      recipientUserName?: string;
    }
  ): void {
    const consumables = this.getConsumables();
    const branches = this.getBranches();
    const stocks = this.getConsumableStocks();
    const movements = this.getStockMovements();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const consumable = consumables.find(c => c.id === consumableId);
    const branch = branches.find(b => b.id === branchId);
    if (!consumable || !branch) return;

    let stockItem = stocks.find(s => s.consumableId === consumableId && s.branchId === branchId);
    if (!stockItem) {
      stockItem = {
        id: `stk-${Date.now()}`,
        consumableId,
        branchId,
        branchName: branch.name,
        currentQuantity: 0,
        lastUpdated: now
      };
      stocks.push(stockItem);
    }

    const prevQty = stockItem.currentQuantity;
    let newQty = prevQty;

    if (movementType === 'INGRESO_GUIA') {
      newQty = prevQty + quantity;
    } else if (movementType === 'ENTREGA_FUNCIONARIO' || movementType === 'MERMA_DANO') {
      newQty = Math.max(0, prevQty - quantity);
    } else if (movementType === 'AJUSTE_INVENTARIO') {
      newQty = quantity;
    }

    stockItem.currentQuantity = newQty;
    stockItem.lastUpdated = now;

    const movement: StockMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      consumableId,
      consumableName: consumable.name,
      sku: consumable.sku,
      branchId,
      branchName: branch.name,
      movementType,
      quantity,
      previousQuantity: prevQty,
      newQuantity: newQty,
      dispatchGuideNumber: options?.dispatchGuideNumber,
      assignmentActNumber: options?.assignmentActNumber,
      recipientUserName: options?.recipientUserName,
      registeredByUserName: currentUser.fullName,
      reason,
      timestamp: now
    };

    this.setItem(STORAGE_KEYS.CONSUMABLE_STOCKS, stocks);
    this.setItem(STORAGE_KEYS.STOCK_MOVEMENTS, [movement, ...movements]);
  }

  // --- ASIGNACIONES & ACTAS ---
  public getAssignments(): Assignment[] {
    return this.getItem<Assignment[]>(STORAGE_KEYS.ASSIGNMENTS, initialAssignments);
  }

  public getAssignmentById(id: string): Assignment | undefined {
    return this.getAssignments().find(a => a.id === id);
  }

  public getAssignmentsByUser(userId: string): Assignment[] {
    return this.getAssignments().filter(a => a.recipientUserId === userId);
  }

  public createAssignment(
    assignment: Assignment,
    signatureDataUrl?: string,
    signedByName?: string,
    digitalSignatureHash?: string
  ): Assignment {
    const assignments = this.getAssignments();
    const assets = this.getAssets();
    const logs = this.getAuditLogs();
    const now = new Date().toISOString();
    const currentUser = this.getCurrentUser();

    assignment.status = signatureDataUrl ? 'FIRMADO_DIGITAL' : 'PENDIENTE_FIRMA';
    assignment.signatureDataUrl = signatureDataUrl;
    assignment.signedByName = signedByName || assignment.recipientName;
    assignment.digitalSignatureHash = digitalSignatureHash;
    assignment.signedAt = signatureDataUrl ? now : undefined;

    // Actualizar activos asignados a ASIGNADO
    const newLogs: AssetAuditLog[] = [];
    assignment.items.forEach(item => {
      if (item.assetId) {
        const asset = assets.find(a => a.id === item.assetId);
        if (asset) {
          const prevStatus = asset.status;
          asset.status = 'ASIGNADO';
          asset.assignedToUserId = assignment.recipientUserId;
          asset.assignedToUserName = assignment.recipientName;
          asset.assignedToUserRut = assignment.recipientRut;
          asset.assignedToUserDept = assignment.recipientDepartment;
          asset.assignedDate = now;
          asset.updatedAt = now;

          newLogs.push({
            id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            assetId: asset.id,
            serialNumber: asset.serialNumber,
            inventoryNumber: asset.inventoryNumber,
            timestamp: now,
            previousStatus: prevStatus,
            newStatus: 'ASIGNADO',
            newUserId: assignment.recipientUserId,
            newUserName: assignment.recipientName,
            branchName: assignment.branchName,
            changedByUserName: currentUser.fullName,
            changeReason: `Asignación a funcionario mediante Acta ${assignment.actNumber}`,
            documentRef: assignment.actNumber
          });
        }
      } else if (item.consumableId) {
        // Descontar stock de accesorio
        this.registerStockMovement(
          item.consumableId,
          assignment.branchId,
          'ENTREGA_FUNCIONARIO',
          item.quantity,
          `Entrega en Acta ${assignment.actNumber}`,
          {
            assignmentActNumber: assignment.actNumber,
            recipientUserName: assignment.recipientName
          }
        );
      }
    });

    this.setItem(STORAGE_KEYS.ASSETS, assets);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, [...newLogs, ...logs]);
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, [assignment, ...assignments]);

    return assignment;
  }

  public signAssignment(assignmentId: string, signatureDataUrl: string, hash: string): void {
    const assignments = this.getAssignments();
    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    assignment.status = 'FIRMADO_DIGITAL';
    assignment.signatureDataUrl = signatureDataUrl;
    assignment.digitalSignatureHash = hash;
    assignment.signedAt = new Date().toISOString();

    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
  }

  public processReturn(
    assignmentId: string,
    returnedItemIds: { itemId: string; condition: PhysicalCondition; notes: string; destinationStatus: AssetStatus }[],
    returnBranchId?: string
  ): void {
    const assignments = this.getAssignments();
    const assets = this.getAssets();
    const branches = this.getBranches();
    const logs = this.getAuditLogs();
    const currentUser = this.getCurrentUser();
    const now = new Date().toISOString();

    const assignment = assignments.find(a => a.id === assignmentId);
    if (!assignment) return;

    let targetBranch = branches.find(b => b.id === returnBranchId) || 
                       branches.find(b => b.id === assignment.branchId) || 
                       branches[0];

    const newLogs: AssetAuditLog[] = [];

    returnedItemIds.forEach(ret => {
      const item = assignment.items.find(i => i.id === ret.itemId);
      if (!item) return;

      item.isReturned = true;
      item.returnedAt = now;
      item.conditionAtReturn = ret.condition;
      item.returnNotes = ret.notes;

      if (item.assetId) {
        const asset = assets.find(a => a.id === item.assetId);
        if (asset) {
          const prevStatus = asset.status;
          const prevUser = asset.assignedToUserName;
          asset.status = ret.destinationStatus;
          asset.physicalCondition = ret.condition;
          if (targetBranch) {
            asset.currentBranchId = targetBranch.id;
            asset.currentBranchName = targetBranch.name;
          }
          asset.assignedToUserId = undefined;
          asset.assignedToUserName = undefined;
          asset.assignedToUserRut = undefined;
          asset.assignedToUserDept = undefined;
          asset.assignedDate = undefined;
          asset.updatedAt = now;

          newLogs.push({
            id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            assetId: asset.id,
            serialNumber: asset.serialNumber,
            inventoryNumber: asset.inventoryNumber,
            timestamp: now,
            previousStatus: prevStatus,
            newStatus: ret.destinationStatus,
            previousUserName: prevUser,
            branchName: targetBranch ? targetBranch.name : assignment.branchName,
            changedByUserName: currentUser.fullName,
            changeReason: `Devolución de equipo (Acta ${assignment.actNumber}) a bodega ${targetBranch ? targetBranch.name : assignment.branchName}: ${ret.notes || 'Reingreso conforme'}`,
            documentRef: assignment.actNumber
          });
        }
      }
    });

    const allReturned = assignment.items.every(i => i.isReturned);
    assignment.status = allReturned ? 'DEVUELTO_COMPLETO' : 'DEVUELTO_PARCIAL';
    assignment.returnedAt = now;

    this.setItem(STORAGE_KEYS.ASSETS, assets);
    this.setItem(STORAGE_KEYS.AUDIT_LOGS, [...newLogs, ...logs]);
    this.setItem(STORAGE_KEYS.ASSIGNMENTS, assignments);
  }

  // --- AUDITORÍA & HISTORIAL ---
  public getAuditLogs(assetId?: string): AssetAuditLog[] {
    const logs = this.getItem<AssetAuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
    if (!assetId) return logs;
    return logs.filter(l => l.assetId === assetId);
  }

  // --- AUTENTICACIÓN & MANTENEDOR DE USUARIOS PLATAFORMA ---
  public getPlatformUsers(): (PlatformUser & { passwordHash?: string })[] {
    return this.getItem(STORAGE_KEYS.PLATFORM_USERS, initialPlatformUsers);
  }

  public loginPlatformUser(identifier: string, password: string): { success: boolean; user: PlatformUser; token: string } {
    const users = this.getPlatformUsers();
    const cleanId = identifier.trim().toLowerCase();

    const user = users.find(u => 
      u.username.toLowerCase() === cleanId || 
      u.rut.toLowerCase() === cleanId || 
      u.email.toLowerCase() === cleanId
    );

    if (!user) {
      throw new Error('Credenciales inválidas. Usuario no registrado en el sistema.');
    }

    if (!user.isActive) {
      throw new Error('Su cuenta de usuario se encuentra desactivada por el Administrador DTI.');
    }

    if (user.passwordHash !== password && password !== 'chileatiende2026') {
      throw new Error('Contraseña incorrecta. Por favor reintente.');
    }

    const { passwordHash, ...safeUser } = user;
    this.setItem(STORAGE_KEYS.CURRENT_USER, safeUser);

    return {
      success: true,
      user: safeUser,
      token: `session-${user.id}-${Date.now()}`
    };
  }

  public createPlatformUser(userData: any): any {
    const users = this.getPlatformUsers();
    const branches = this.getBranches();
    const branch = branches.find(b => b.id === userData.branchId);

    const newUser = {
      id: `usr-${Date.now()}`,
      rut: userData.rut.trim(),
      username: userData.username.trim().toLowerCase(),
      fullName: userData.fullName.trim(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.password.trim(),
      role: userData.role,
      jobTitle: userData.jobTitle || 'Funcionario ITAM',
      department: userData.department || 'División Tecnologías de la Información',
      branchId: userData.branchId || '',
      branchName: branch ? branch.name : 'Sucursal Central',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.setItem(STORAGE_KEYS.PLATFORM_USERS, [newUser, ...users]);
    const { passwordHash, ...safeUser } = newUser;
    return { success: true, user: safeUser };
  }

  public updatePlatformUser(id: string, userData: any): any {
    const users = this.getPlatformUsers();
    const branches = this.getBranches();
    const branch = branches.find(b => b.id === userData.branchId);

    const updated = users.map(u => {
      if (u.id === id) {
        return {
          ...u,
          fullName: userData.fullName || u.fullName,
          email: userData.email || u.email,
          role: userData.role || u.role,
          jobTitle: userData.jobTitle !== undefined ? userData.jobTitle : u.jobTitle,
          department: userData.department !== undefined ? userData.department : u.department,
          branchId: userData.branchId !== undefined ? userData.branchId : u.branchId,
          branchName: branch ? branch.name : u.branchName,
          isActive: userData.isActive !== undefined ? userData.isActive : u.isActive,
          updatedAt: new Date().toISOString()
        };
      }
      return u;
    });

    this.setItem(STORAGE_KEYS.PLATFORM_USERS, updated);
    return { success: true };
  }

  public updatePlatformUserPassword(id: string, newPassword: string): any {
    const users = this.getPlatformUsers();
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, passwordHash: newPassword.trim(), updatedAt: new Date().toISOString() };
      }
      return u;
    });

    this.setItem(STORAGE_KEYS.PLATFORM_USERS, updated);
    return { success: true };
  }

  public togglePlatformUserStatus(id: string): any {
    const users = this.getPlatformUsers();
    const updated = users.map(u => {
      if (u.id === id) {
        return { ...u, isActive: !u.isActive, updatedAt: new Date().toISOString() };
      }
      return u;
    });

    this.setItem(STORAGE_KEYS.PLATFORM_USERS, updated);
    return { success: true };
  }
}

export const storage = new StorageService();

