import React, { useState, useEffect } from 'react';
import { 
  Users2, 
  Search, 
  RefreshCw, 
  Building2, 
  Laptop, 
  CheckCircle2, 
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserPlus,
  AlertCircle,
  KeyRound,
  Lock,
  Sparkles
} from 'lucide-react';
import { ADUser, PlatformUser, PlatformRole } from '../../types/user';
import { Asset } from '../../types/asset';
import { Branch } from '../../types/document';
import { PropertyBadge, StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import { ApiClient } from '../../api/client';
import { normalizeText, formatRut } from '../../utils/formatters';

export const DirectoryView: React.FC = () => {
  const [users, setUsers] = useState<ADUser[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accessFilter, setAccessFilter] = useState<'ALL' | 'AUTHORIZED' | 'PENDING'>('ALL');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Modales
  const [selectedUserForAssets, setSelectedUserForAssets] = useState<ADUser | null>(null);
  const [authorizingUser, setAuthorizingUser] = useState<ADUser | null>(null);
  const [authRole, setAuthRole] = useState<PlatformRole>('TECNICO_SOPORTE');
  const [authBranchIds, setAuthBranchIds] = useState<string[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 24;

  const loadData = async () => {
    const [u, pUsers, b, a] = await Promise.all([
      ApiClient.searchDirectoryUsers(),
      ApiClient.getPlatformUsers(),
      ApiClient.getBranches(),
      ApiClient.getAssets()
    ]);
    // Filtrar cuentas de máquina o nombres vacíos
    const validUsers = u.filter(user => user.fullName && user.fullName.trim().length > 1 && !user.samAccountName.endsWith('$'));
    setUsers(validUsers);
    setPlatformUsers(pUsers);
    setBranches(b);
    setAssets(a);
    if (b.length > 0 && authBranchIds.length === 0) {
      setAuthBranchIds([b[0].id]);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('itam_storage_updated', loadData);
    return () => window.removeEventListener('itam_storage_updated', loadData);
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const result = await ApiClient.syncDirectory();
      setFeedbackBanner(`✓ Sincronización exitosa con Active Directory Dual (CHA & IPS). Se actualizaron ${result.syncedCount} funcionarios en la base de datos.`);
      await loadData();
    } catch (err: any) {
      alert(`Error al sincronizar: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getAuthorizedPlatformUser = (adUser: ADUser): PlatformUser | undefined => {
    return platformUsers.find(p => 
      p.username.toLowerCase() === adUser.samAccountName.toLowerCase() ||
      p.email.toLowerCase() === adUser.email.toLowerCase() ||
      (adUser.rut && p.rut === adUser.rut)
    );
  };

  const handleOpenAuthorizeModal = (adUser: ADUser) => {
    setAuthorizingUser(adUser);
    setAuthRole('TECNICO_SOPORTE');
    setAuthBranchIds(branches.length > 0 ? [branches[0].id] : []);
    setAuthError(null);
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorizingUser) return;
    setAuthError(null);

    if (authBranchIds.length === 0) {
      setAuthError('Debe seleccionar al menos una bodega o sucursal autorizada.');
      return;
    }

    const safeRut = authorizingUser.rut && authorizingUser.rut.length >= 6 
      ? formatRut(authorizingUser.rut) 
      : `USR-${authorizingUser.samAccountName.toUpperCase()}`;

    try {
      await ApiClient.createPlatformUser({
        rut: safeRut,
        username: authorizingUser.samAccountName.toLowerCase(),
        fullName: authorizingUser.fullName,
        email: authorizingUser.email.toLowerCase(),
        password: 'AD_AUTHENTICATED',
        role: authRole,
        jobTitle: authorizingUser.jobTitle || 'Funcionario ITAM',
        department: authorizingUser.department || 'ChileAtiende / IPS',
        branchId: authBranchIds[0],
        assignedBranchIds: authBranchIds
      });

      setAuthorizingUser(null);
      setFeedbackBanner(`✓ Acceso concedido exitosamente a ${authorizingUser.fullName} con rol ${authRole} (${authBranchIds.length} bodegas asignadas).`);
      await loadData();
    } catch (err: any) {
      setAuthError(err.message || 'Error al conceder acceso al usuario.');
    }
  };

  const filteredUsers = users.filter(u => {
    const pUser = getAuthorizedPlatformUser(u);
    if (accessFilter === 'AUTHORIZED' && !pUser) return false;
    if (accessFilter === 'PENDING' && pUser) return false;

    if (!searchTerm.trim()) return true;
    const words = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
    const target = normalizeText(
      `${u.fullName} ${u.firstName || ''} ${u.lastName || ''} ${u.rut || ''} ${u.samAccountName} ${u.email} ${u.department || ''} ${u.jobTitle || ''} ${u.branchName || ''} ${pUser?.role || ''}`
    );
    return words.every(w => target.includes(w));
  });

  // Cálculos de Paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + pageSize);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const getUserAssignedAssets = (userId: string) => {
    return assets.filter(a => a.assignedToUserId === userId);
  };

  const getRoleBadge = (role: PlatformRole) => {
    switch (role) {
      case 'ADMIN_TI':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-[#003B70] text-white">ADMIN TI</span>;
      case 'ENCARGADO_BODEGA':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-blue-50 text-blue-800 border border-blue-200">JEFE BODEGA</span>;
      case 'TECNICO_SOPORTE':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">TÉCNICO SOPORTE</span>;
      case 'AUDITOR_CONSULTOR':
        return <span className="px-2 py-0.5 text-[10px] font-extrabold rounded bg-purple-50 text-purple-800 border border-purple-200">AUDITOR CGR</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#003B70] tracking-tight flex items-center gap-2">
            <Users2 className="w-8 h-8 text-[#003B70]" />
            <span>Directorio de Funcionarios (Active Directory)</span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Sincronización dual en vivo: <strong>ChileAtiende (cha.cl)</strong> e <strong>IPS (ips.gob.cl)</strong> • {users.length} funcionarios en catálogo
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="gov-btn-primary"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando directorios...' : 'Sincronizar Active Directory'}</span>
        </button>
      </div>

      {feedbackBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackBanner}</span>
          </div>
          <button onClick={() => setFeedbackBanner(null)} className="text-emerald-800 font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros de Acceso */}
      <div className="gov-card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar por Nombre, RUT, Usuario, Correo o Departamento..."
            className="gov-input gov-input-with-icon"
          />
        </div>

        {/* Filtros de Acceso */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
          <button
            onClick={() => { setAccessFilter('ALL'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md transition-all ${accessFilter === 'ALL' ? 'bg-white text-[#003B70] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Todos ({users.length})
          </button>
          <button
            onClick={() => { setAccessFilter('AUTHORIZED'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md transition-all ${accessFilter === 'AUTHORIZED' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Con Acceso Plataforma ({platformUsers.length})
          </button>
          <button
            onClick={() => { setAccessFilter('PENDING'); setCurrentPage(1); }}
            className={`px-3 py-1.5 rounded-md transition-all ${accessFilter === 'PENDING' ? 'bg-white text-amber-700 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
          >
            Sin Acceso
          </button>
        </div>
      </div>

      {/* Grid de Funcionarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {paginatedUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
            <Users2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-base font-bold text-slate-600">No se encontraron funcionarios con el criterio de búsqueda</p>
            <p className="text-xs text-slate-400 mt-1">Intente buscando por nombre, RUT (ej: 13108837-K) o usuario institucional</p>
          </div>
        ) : (
          paginatedUsers.map(user => {
            const assigned = getUserAssignedAssets(user.id);
            const pUser = getAuthorizedPlatformUser(user);
            const isIps = user.email.toLowerCase().includes('@ips.gob.cl');
            const initials = user.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map(w => w[0])
              .join('')
              .toUpperCase() || 'AD';

            return (
              <div
                key={user.id || user.samAccountName}
                className={`gov-card p-5 space-y-4 hover:shadow-gov-card transition-all flex flex-col justify-between border ${pUser ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#003B70] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{user.fullName}</h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{user.jobTitle || 'Funcionario'}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${isIps ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                      {isIps ? 'ips.gob.cl' : 'cha.cl'}
                    </span>
                  </div>

                  {/* Estado de Acceso a la Plataforma */}
                  <div className="flex items-center justify-between pt-1">
                    {pUser ? (
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        {getRoleBadge(pUser.role)}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Sin acceso a plataforma</span>
                      </span>
                    )}

                    {pUser ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        ✓ Autorizado
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenAuthorizeModal(user)}
                        className="text-[11px] font-bold text-[#003B70] hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 transition-colors flex items-center gap-1"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Autorizar</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div className="flex justify-between">
                      <span className="text-slate-400">RUT:</span>
                      <span className="font-mono font-bold text-slate-800">{user.rut || 'No informado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Usuario AD:</span>
                      <span className="font-mono text-slate-700 font-semibold">{user.samAccountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Correo:</span>
                      <span className="text-slate-700 font-medium truncate max-w-[170px]">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Depto:</span>
                      <span className="text-slate-700 truncate max-w-[170px]">{user.department || 'Dirección Nacional'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Laptop className="w-4 h-4 text-[#003B70]" />
                    <span className="text-slate-600 font-medium">Equipos a cargo:</span>
                    <strong className="text-[#003B70] font-bold">{assigned.length}</strong>
                  </div>

                  {assigned.length > 0 ? (
                    <button
                      onClick={() => setSelectedUserForAssets(user)}
                      className="text-xs text-[#003B70] hover:text-[#002A50] font-bold hover:underline"
                    >
                      Ver Activos ({assigned.length})
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Sin equipos</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Controles de Paginación */}
      {totalPages > 1 && (
        <div className="gov-card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs sm:text-sm text-slate-600">
            Mostrando <strong>{startIndex + 1}</strong> a <strong>{Math.min(startIndex + pageSize, filteredUsers.length)}</strong> de <strong>{filteredUsers.length}</strong> funcionarios
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gov-btn-secondary py-1.5 px-3 text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </button>

            <span className="px-3 py-1 text-xs font-bold text-slate-700">
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gov-btn-secondary py-1.5 px-3 text-xs"
            >
              Siguiente
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL PARA AUTORIZAR ACCESO AL SISTEMA */}
      {authorizingUser && (
        <Modal
          isOpen={!!authorizingUser}
          onClose={() => setAuthorizingUser(null)}
          title={`Autorizar Acceso: ${authorizingUser.fullName}`}
          subtitle={`Usuario: ${authorizingUser.samAccountName} • ${authorizingUser.email}`}
          maxWidth="lg"
        >
          <form onSubmit={handleGrantAccess} className="space-y-4 text-xs">
            {authError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{authError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Nombre Completo:</span>
                <span className="font-bold text-slate-900">{authorizingUser.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">RUT:</span>
                <span className="font-mono font-bold text-slate-900">{authorizingUser.rut || 'No informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Usuario Active Directory:</span>
                <span className="font-mono font-bold text-[#003B70]">{authorizingUser.samAccountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Correo Institucional:</span>
                <span className="font-medium text-slate-800">{authorizingUser.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Cargo / Departamento:</span>
                <span className="text-slate-700">{authorizingUser.jobTitle || 'Funcionario'} ({authorizingUser.department || 'DTI'})</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>La autenticación de contraseña se realizará de forma transparente contra <strong>Active Directory</strong>.</span>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Rol y Nivel de Privilegios a Asignar *</label>
              <SearchableSelect
                value={authRole}
                onChange={(val) => setAuthRole(val as PlatformRole)}
                options={[
                  { value: 'ADMIN_TI', label: 'ADMINISTRADOR DTI', badge: 'Acceso Total' },
                  { value: 'ENCARGADO_BODEGA', label: 'ENCARGADO DE BODEGA', badge: 'Stock y Guías' },
                  { value: 'TECNICO_SOPORTE', label: 'TÉCNICO DE SOPORTE', badge: 'Asignaciones' },
                  { value: 'AUDITOR_CONSULTOR', label: 'AUDITOR / CGR', badge: 'Solo Lectura' }
                ]}
                placeholder="Seleccione rol..."
                searchPlaceholder="Filtrar rol..."
              />
            </div>

            {/* Selector Multi-Bodega */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-slate-700 font-bold">Bodegas / Sucursales Autorizadas (1 o varias) *</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAuthBranchIds(branches.map(b => b.id))}
                    className="text-[11px] text-[#003B70] font-bold hover:underline"
                  >
                    Seleccionar Todas ({branches.length})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => setAuthBranchIds([])}
                    className="text-[11px] text-slate-500 font-semibold hover:underline"
                  >
                    Limpiar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-44 overflow-y-auto">
                {branches.map(b => {
                  const isSelected = authBranchIds.includes(b.id);
                  return (
                    <label
                      key={b.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50/90 border-[#003B70] text-[#003B70] font-bold shadow-xs' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setAuthBranchIds(authBranchIds.filter(id => id !== b.id));
                          } else {
                            setAuthBranchIds([...authBranchIds, b.id]);
                          }
                        }}
                        className="w-4 h-4 rounded text-[#003B70] focus:ring-[#003B70]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs truncate">{b.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{b.region} • {b.code}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {authBranchIds.length === 0 ? (
                  <span className="text-red-500 font-semibold">⚠️ Debe seleccionar al menos una bodega o sucursal.</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">✓ <strong>{authBranchIds.length}</strong> {authBranchIds.length === 1 ? 'bodega seleccionada' : 'bodegas seleccionadas'}</span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAuthorizingUser(null)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gov-btn-primary"
              >
                <UserCheck className="w-4 h-4" />
                <span>Conceder Acceso al Sistema</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal de Equipos Asignados al Funcionario */}
      {selectedUserForAssets && (
        <Modal
          isOpen={!!selectedUserForAssets}
          onClose={() => setSelectedUserForAssets(null)}
          title={`Equipamiento Asignado a ${selectedUserForAssets.fullName}`}
          subtitle={`RUT: ${selectedUserForAssets.rut} • ${selectedUserForAssets.jobTitle} (${selectedUserForAssets.department})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-[#003B70] text-white">
                  <tr>
                    <th className="px-3 py-2.5 font-bold">Dispositivo</th>
                    <th className="px-3 py-2.5 font-bold">N° Serie / Inventario</th>
                    <th className="px-3 py-2.5 font-bold">Modalidad</th>
                    <th className="px-3 py-2.5 font-bold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {getUserAssignedAssets(selectedUserForAssets.id).map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {asset.brand} {asset.model}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-700">
                        <div>{asset.serialNumber}</div>
                        {asset.inventoryNumber && (
                          <div className="text-[10px] text-[#003B70] font-bold">Inv: {asset.inventoryNumber}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <PropertyBadge type={asset.propertyType} />
                      </td>
                      <td className="px-3 py-2.5">
                        <StatusBadge status={asset.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
