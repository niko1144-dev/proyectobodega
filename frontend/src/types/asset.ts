// Tipos y Modelos de Activos, Insumos y Categorías de Hardware

export type AssetPropertyType = 'PROPIO' | 'ARRIENDO';

export type AssetStatus = 
  | 'BODEGA_DISPONIBLE'
  | 'ASIGNADO'
  | 'EN_MANTENCION'
  | 'DADO_DE_BAJA'
  | 'DEVUELTO_PROVEEDOR';

export type PhysicalCondition = 'NUEVO' | 'BUENO' | 'REGULAR' | 'DETERIORADO' | 'IRREPARABLE';

export type DeviceCategory = 'COMPUTO' | 'PANTALLAS' | 'REDES' | 'IMPRESION' | 'PERIFERICOS_BIOMETRIA';

export interface AssetType {
  id: string;
  name: string; // 'Notebook', 'Desktop All-in-One', 'Monitor 24"', 'Impresora Multifuncional', 'Switch 24p', 'Lector Huella'
  category: DeviceCategory;
  requiresInventoryNumber: boolean;
  iconName?: string;
}

export interface Asset {
  id: string;
  serialNumber: string;
  inventoryNumber?: string; // Obligatorio si propertyType === 'PROPIO'
  brand: string;
  model: string;
  assetTypeId: string;
  assetTypeName: string;
  category: DeviceCategory;
  propertyType: AssetPropertyType;
  status: AssetStatus;
  physicalCondition: PhysicalCondition;
  
  // Respaldo Documental de Ingreso
  dispatchGuideId: string;
  dispatchGuideNumber: string;
  purchaseOrderId?: string; // Obligatorio para PROPIO
  purchaseOrderNumber?: string;
  leasingContractId?: string; // Obligatorio para ARRIENDO
  leasingContractNumber?: string;
  supplierName: string;
  contractEndDate?: string; // ISO date string para arriendos
  
  // Ubicación y Custodia
  currentBranchId: string;
  currentBranchName: string;
  locationDetail?: string; // Ej: 'Rack 2, Bodega TI' o 'Módulo 3 - Ventanilla'
  assignedToUserId?: string;
  assignedToUserName?: string;
  assignedToUserRut?: string;
  assignedToUserDept?: string;
  assignedDate?: string;
  
  specifications?: {
    cpu?: string;
    ram?: string;
    storage?: string;
    os?: string;
    screenSize?: string;
    ipAddress?: string;
    macAddress?: string;
  };
  
  qrCodeDataUrl?: string;
  receptionDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Consumable {
  id: string;
  sku: string;
  name: string;
  category: 'CABLES' | 'ADAPTADORES' | 'ERGONOMIA' | 'PERIFERICOS_SIMPLES' | 'TONER_TINTA';
  unitOfMeasure: string;
  minStockAlert: number;
  description?: string;
  imageUrl?: string;
}

export interface ConsumableStock {
  id: string;
  consumableId: string;
  branchId: string;
  branchName: string;
  currentQuantity: number;
  lastUpdated: string;
}

export interface StockMovement {
  id?: string;
  consumableId: string;
  consumableName: string;
  sku: string;
  branchId: string;
  branchName: string;
  movementType: 'INGRESO_GUIA' | 'SALIDA_ASIGNACION' | 'DEVOLUCION_INGRESO' | 'AJUSTE_INVENTARIO' | 'ENTREGA_FUNCIONARIO' | 'MERMA_DANO' | 'TRANSFERENCIA';
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  dispatchGuideNumber?: string;
  assignmentActNumber?: string;
  recipientUserName?: string;
  registeredByUserName?: string;
  performedByUserId?: string;
  performedByUserName?: string;
  reason?: string;
  timestamp?: string;
  createdAt?: string;
}

export interface TimelineEvent {
  id: string;
  type: 'RECEPCION_GUIA' | 'ASIGNACION_ACTA' | 'DEVOLUCION_ACTA' | 'AUDITORIA_KARDEX' | 'MANTENCION';
  title: string;
  timestamp: string;
  category: 'INGRESO' | 'ENTREGA' | 'DEVOLUCION' | 'MANTENCION' | 'ESTADO';
  actor: string;
  assignedTo?: string;
  branchName: string;
  documentRef?: string;
  documentType?: 'GUIA_DESPACHO' | 'ACTA_ASIGNACION' | 'ACTA_DEVOLUCION' | 'LOG_KARDEX';
  details: {
    guideNumber?: string;
    supplierName?: string;
    ocOrContract?: string;
    physicalCondition?: string;
    actNumber?: string;
    assignmentType?: string;
    assignedTo?: string;
    recipientName?: string;
    recipientRut?: string;
    recipientJobTitle?: string;
    recipientDepartment?: string;
    recipientBranch?: string;
    signatureStatus?: string;
    digitalSignatureHash?: string;
    conditionAtReturn?: string;
    returnNotes?: string;
    previousStatus?: string;
    newStatus?: string;
    previousUserName?: string;
    newUserName?: string;
    changeReason?: string;
    observations?: string;
  };
}

export interface AssetAuditLog {
  id: string;
  assetId: string;
  serialNumber: string;
  inventoryNumber?: string;
  timestamp: string;
  previousStatus?: AssetStatus;
  newStatus: AssetStatus;
  previousUserId?: string;
  previousUserName?: string;
  newUserId?: string;
  newUserName?: string;
  branchName: string;
  changedByUserName: string;
  changeReason: string;
  documentRef?: string;
  asset?: Asset;
}

export interface AssetTraceabilityResponse {
  asset: Asset & {
    currentBranchRegion?: string;
    currentBranchAddress?: string;
  };
  timeline: TimelineEvent[];
}
