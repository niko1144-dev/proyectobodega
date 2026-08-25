// Tipos para Asignaciones, Devoluciones y Actas de Entrega / Devolución

import { PhysicalCondition, AssetPropertyType } from './asset';

export type AssignmentType = 'ENTREGA_INICIAL' | 'RENOVACION' | 'TEMPORAL' | 'DEVOLUCION';

export type AssignmentStatus = 
  | 'PENDIENTE_FIRMA'
  | 'FIRMADO_DIGITAL'
  | 'FIRMADO_FISICO_SUBIDO'
  | 'DEVUELTO_COMPLETO'
  | 'DEVUELTO_PARCIAL'
  | 'ANULADO';

export interface AssignmentItem {
  id: string;
  assignmentId: string;
  
  // Si es un Activo Serializado
  assetId?: string;
  serialNumber?: string;
  inventoryNumber?: string;
  brand?: string;
  model?: string;
  assetTypeName?: string;
  propertyType?: AssetPropertyType;
  conditionAtAssignment: PhysicalCondition;
  
  // Si es un Insumo / Accesorio no inventariable
  consumableId?: string;
  consumableSku?: string;
  consumableName?: string;
  quantity: number;
  
  // Devolución
  isReturned: boolean;
  returnedAt?: string;
  conditionAtReturn?: PhysicalCondition;
  returnNotes?: string;
}

export interface Assignment {
  id: string;
  actNumber: string; // Ej: 'ACT-2026-00042'
  assignmentType: AssignmentType;
  
  // Funcionario que recibe
  recipientUserId: string;
  recipientName: string;
  recipientRut: string;
  recipientEmail: string;
  recipientJobTitle: string;
  recipientDepartment: string;
  recipientBranchName: string;
  
  // Técnico responsable
  technicianUserId: string;
  technicianName: string;
  technicianRut: string;
  
  branchId: string;
  branchName: string;
  status: AssignmentStatus;
  
  items: AssignmentItem[];
  
  // Respaldo de Firma y Acta
  actDocumentUrl?: string; // PDF generado
  signatureDataUrl?: string; // Canvas base64 de la firma digital
  signedByName?: string;
  digitalSignatureHash?: string; // SHA-256 de conformidad
  observations?: string;
  
  createdAt: string;
  signedAt?: string;
  returnedAt?: string;
}
