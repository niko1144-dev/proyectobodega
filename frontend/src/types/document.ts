// Tipos para Sucursales, Proveedores, Órdenes de Compra, Contratos de Arriendo y Guías de Despacho

export interface Branch {
  id: string;
  code: string;
  name: string;
  region: string;
  commune: string;
  address: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  rut: string; // Ej: '76.432.109-8'
  businessName: string; // 'Sonda S.A.', 'Lenovo Chile SpA', 'Entel Corp'
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface PurchaseOrder {
  id: string;
  ocNumber: string; // Ej: '6245-12-LR26' (Formato MercadoPúblico)
  supplierId: string;
  supplierName: string;
  description: string;
  orderDate: string;
  documentUrl?: string; // Archivo PDF cargado
  documentName?: string;
  totalAmountCLP?: number;
  createdAt: string;
}

export interface LeasingContract {
  id: string;
  contractNumber: string; // Ej: 'LIC-ARR-2025-09'
  name: string; // 'Licitación Nacional Arriendo Microinformática 2025-2027'
  supplierId: string;
  supplierName: string;
  startDate: string;
  endDate: string;
  warningDaysThreshold: number; // Por defecto 30/60 días
  documentUrl?: string;
  documentName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DispatchGuide {
  id: string;
  guideNumber: string; // N° Guía SII
  supplierId: string;
  supplierName: string;
  supplierRut: string;
  purchaseOrderId?: string; // Requerido para Activos Propios
  purchaseOrderNumber?: string;
  leasingContractId?: string; // Requerido para Arriendos
  leasingContractNumber?: string;
  dispatchDate: string;
  receptionDate: string;
  documentUrl: string; // URL o Base64 del archivo PDF/Imagen
  documentName: string;
  receivedByUserId: string;
  receivedByUserName: string;
  branchId: string;
  branchName: string;
  totalItemsCount: number;
  observations?: string;
  createdAt: string;
}
