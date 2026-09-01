// Datos iniciales institucionales para ChileAtiende (Seed Data Limpio)
import { Branch, Supplier, PurchaseOrder, LeasingContract, DispatchGuide } from '../types/document';
import { AssetType, Asset, Consumable, ConsumableStock, StockMovement, AssetAuditLog } from '../types/asset';
import { ADUser, PlatformUser } from '../types/user';
import { Assignment } from '../types/assignment';

export const initialBranches: Branch[] = [];
export const initialSuppliers: Supplier[] = [];
export const initialPurchaseOrders: PurchaseOrder[] = [];
export const initialLeasingContracts: LeasingContract[] = [];
export const initialDispatchGuides: DispatchGuide[] = [];
export const initialAssetTypes: AssetType[] = [];
export const initialAssets: Asset[] = [];
export const initialConsumables: Consumable[] = [];
export const initialConsumableStocks: ConsumableStock[] = [];
export const initialStockMovements: StockMovement[] = [];
export const initialAssignments: Assignment[] = [];
export const initialAuditLogs: AssetAuditLog[] = [];
export const initialADUsers: ADUser[] = [];

export const initialPlatformUsers: PlatformUser[] = [
  {
    id: 'usr-admin-01',
    rut: '14.238.990-1',
    username: 'admin',
    fullName: 'Administrador ITAM',
    email: 'administrador@chileatiende.cl',
    role: 'ADMIN_TI',
    jobTitle: 'Desarrollo e Implementación DTI',
    department: 'División Tecnologías de la Información',
    branchId: '',
    branchName: 'Sucursal Central',
    assignedBranchIds: [],
    assignedBranchNames: [],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];
