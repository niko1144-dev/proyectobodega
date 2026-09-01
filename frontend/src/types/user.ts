// Tipos para Active Directory y Usuarios de la Plataforma ITAM ChileAtiende

export type PlatformRole = 
  | 'ADMIN_TI' 
  | 'ENCARGADO_BODEGA' 
  | 'TECNICO_SOPORTE' 
  | 'AUDITOR_CONSULTOR';

export type UserRole = PlatformRole | 'SUPER_ADMIN' | 'TECNICO_BODEGA' | 'AUDITOR_JEFATURA' | 'FUNCIONARIO';

export interface PlatformUser {
  id: string;
  rut: string;
  username: string;
  fullName: string;
  email: string;
  role: PlatformRole;
  jobTitle?: string;
  department?: string;
  branchId?: string;
  branchName?: string;
  assignedBranchIds?: string[];
  assignedBranchNames?: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  identifier: string; // Username, RUT o Email
  password: string;
}

export interface ADUser {
  id: string;
  adGuid: string;
  samAccountName: string;
  rut: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  jobTitle: string;
  department: string;
  branchId: string;
  branchName: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  lastSyncedAt: string;
}

export interface IndexedADUser extends ADUser {
  _searchIndex: string;
  _cleanRut: string;
  _isIps: boolean;
}
