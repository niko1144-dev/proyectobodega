// Tipos TypeScript para el módulo de Top 5 Productos Más Entregados y Métricas del Dashboard

export type DateRangePreset = 
  | '7D' 
  | '30D' 
  | 'THIS_MONTH' 
  | '3M' 
  | 'THIS_YEAR' 
  | 'ALL' 
  | 'CUSTOM';

export type DeliveredItemTypeFilter = 'ALL' | 'HARDWARE' | 'CONSUMABLE';

export interface TopDeliveredRecipient {
  recipientName: string;
  recipientRut?: string;
  actNumber: string;
  date: string;
  branchName: string;
}

export interface TopDeliveredProduct {
  position: number;
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  itemType: 'HARDWARE' | 'CONSUMABLE';
  quantity: number;
  percentage: number;
  assignmentCount: number;
  recentRecipients: TopDeliveredRecipient[];
}

export interface TopDeliveredSummary {
  totalDeliveredUnits: number;
  totalAssignments: number;
  uniqueProductsCount: number;
  top1DominancePercentage: number;
  branchName: string;
  dateRange: {
    startDate: string | null;
    endDate: string | null;
    presetLabel?: string;
  };
}

export interface RecentDeliveryRecord {
  actNumber: string;
  date: string;
  recipientName: string;
  recipientRut: string;
  recipientDepartment?: string;
  branchName: string;
  productName: string;
  quantity: number;
  itemType: 'HARDWARE' | 'CONSUMABLE';
}

export interface TopDeliveredResponse {
  items: TopDeliveredProduct[];
  summary: TopDeliveredSummary;
  recentDeliveries: RecentDeliveryRecord[];
}

export interface TopDeliveredFilterParams {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  itemType?: DeliveredItemTypeFilter;
}
