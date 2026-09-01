import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Sparkles,
  CreditCard,
  User,
  Mail,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { ADUser, IndexedADUser, PlatformUser, PlatformRole } from '../../types/user';
import { Asset } from '../../types/asset';
import { Branch } from '../../types/document';
import { PropertyBadge, StatusBadge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import { ApiClient } from '../../api/client';
import { normalizeText, formatRut } from '../../utils/formatters';

export const DirectoryView: React.FC = () => {
  const [users, setUsers] = useState<IndexedADUser[]>([]);
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [accessFilter, setAccessFilter] = useState<'ALL' | 'AUTHORIZED' | 'PENDING'>('ALL');
  const [domainFilter, setDomainFilter] = useState<'ALL' | 'CHA' | 'IPS'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  // Modales
  const [selectedUserForAssets, setSelectedUserForAssets] = useState<ADUser | null>(null);
  const [authorizingUser, setAuthorizingUser] = useState<ADUser | null>(null);
  const [authRole, setAuthRole] = useState<PlatformRole>('TECNICO_SOPORTE');
  const [authBranchIds, setAuthBranchIds] = useState<string[]>([]);
  const [authPassword, setAuthPassword] = useState<string>('');
  const [showAuthPassword, setShowAuthPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);

  // Modal Registrar Funcionario IPS
  const [isAddIpsModalOpen, setIsAddIpsModalOpen] = useState<boolean>(false);
  const [ipsFullName, setIpsFullName] = useState<string>('');
  const [ipsRut, setIpsRut] = useState<string>('');
  const [ipsUsername, setIpsUsername] = useState<string>('');
  const [ipsJobTitle, setIpsJobTitle] = useState<string>('Funcionario IPS');
  const [ipsDepartment, setIpsDepartment] = useState<string>('Instituto de Previsión Social (IPS)');
  const [ipsBranchId, setIpsBranchId] = useState<string>('');
  const [ipsError, setIpsError] = useState<string | null>(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 24;

  // Mapa de búsqueda O(1) de usuarios de plataforma autorizados
  const platformUserMap = useMemo(() => {
    const map = new Map<string, PlatformUser>();
    platformUsers.forEach(p => {
      if (p.username) map.set(p.username.toLowerCase(), p);
      if (p.email) map.set(p.email.toLowerCase(), p);
      if (p.rut) {
        const cleanRut = p.rut.replace(/[^0-9kK]/g, '').toLowerCase();
        map.set(cleanRut, p);
      }
    });
    return map;
  }, [platformUsers]);

  const getAuthorizedPlatformUser = useCallback((adUser: ADUser): PlatformUser | undefined => {
    if (!adUser) return undefined;
    if (adUser.samAccountName) {
      const byUser = platformUserMap.get(adUser.samAccountName.toLowerCase());
      if (byUser) return byUser;
    }
    if (adUser.email) {
      const byEmail = platformUserMap.get(adUser.email.toLowerCase());
      if (byEmail) return byEmail;
    }
    if (adUser.rut) {
      const cleanRut = adUser.rut.replace(/[^0-9kK]/g, '').toLowerCase();
      const byRut = platformUserMap.get(cleanRut);
      if (byRut) return byRut;
    }
    return undefined;
  }, [platformUserMap]);

  const loadData = async (forceRefresh = false) => {
    try {
      const [indexedUsers, pUsers, b] = await Promise.all([
        ApiClient.getIndexedDirectoryUsers(forceRefresh),
        ApiClient.getPlatformUsers(),
        ApiClient.getBranches()
      ]);
      setUsers(indexedUsers);
      setPlatformUsers(pUsers);
      setBranches(b);
      if (b.length > 0 && authBranchIds.length === 0) {
        setAuthBranchIds([b[0].id]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleStorageUpdate = () => { loadData(); };
    window.addEventListener('itam_storage_updated', handleStorageUpdate);
    return () => window.removeEventListener('itam_storage_updated', handleStorageUpdate);
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

  const handleOpenAuthorizeModal = (adUser: ADUser) => {
    const pUser = getAuthorizedPlatformUser(adUser);
    setAuthorizingUser(adUser);
    setAuthRole(pUser ? pUser.role : 'TECNICO_SOPORTE');
    setAuthBranchIds(pUser && pUser.assignedBranchIds && pUser.assignedBranchIds.length > 0 ? pUser.assignedBranchIds : (branches.length > 0 ? [branches[0].id] : []));
    setAuthPassword(pUser ? '' : 'Ips.2026!');
    setShowAuthPassword(false);
    setAuthError(null);
  };

  const generateRandomPassword = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setAuthPassword(`Itam.${num}!`);
  };

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorizingUser) return;
    setAuthError(null);

    const pUser = getAuthorizedPlatformUser(authorizingUser);
    if (!pUser && (!authPassword || authPassword.trim().length < 4)) {
      setAuthError('Debe ingresar una contraseña personalizada de al menos 4 caracteres para activar la cuenta.');
      return;
    }

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
        password: authPassword.trim() || undefined,
        role: authRole,
        jobTitle: authorizingUser.jobTitle || 'Funcionario ITAM',
        department: authorizingUser.department || 'ChileAtiende / IPS',
        branchId: authBranchIds[0],
        assignedBranchIds: authBranchIds
      });

      setAuthorizingUser(null);
      setFeedbackBanner(`✓ Acceso y contraseña personalizada asignados exitosamente a ${authorizingUser.fullName} (Rol: ${authRole}).`);
      await loadData();
    } catch (err: any) {
      setAuthError(err.message || 'Error al conceder acceso al usuario.');
    }
  };

  const handleCreateIpsUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIpsError(null);
    if (!ipsUsername.trim() || !ipsFullName.trim()) {
      setIpsError('Nombre de usuario y nombre completo son obligatorios.');
      return;
    }
    const cleanSam = ipsUsername.trim().toLowerCase();
    const cleanEmail = cleanSam.includes('@') ? cleanSam : `${cleanSam}@ips.gob.cl`;
    try {
      await ApiClient.createDirectoryUser({
        rut: ipsRut ? formatRut(ipsRut) : `IPS-${cleanSam}`,
        samAccountName: cleanSam,
        fullName: ipsFullName.trim(),
        email: cleanEmail,
        jobTitle: ipsJobTitle.trim() || 'Funcionario IPS',
        department: ipsDepartment.trim() || 'Instituto de Previsión Social (IPS)',
        branchId: ipsBranchId || undefined
      });
      setIsAddIpsModalOpen(false);
      setFeedbackBanner(`✓ Funcionario IPS '${ipsFullName}' registrado en el Directorio exitosamente.`);
      setIpsFullName('');
      setIpsRut('');
      setIpsUsername('');
      await loadData();
    } catch (err: any) {
      setIpsError(err.message || 'Error al registrar funcionario IPS.');
    }
  };

  const filteredUsers = useMemo(() => {
    const trimmed = searchTerm.trim();
    const searchWords = trimmed ? normalizeText(trimmed).split(/\s+/).filter(Boolean) : [];
    const len = users.length;
    const results: IndexedADUser[] = [];

    for (let i = 0; i < len; i++) {
      const u = users[i];

      if (domainFilter === 'CHA' && u._isIps) continue;
      if (domainFilter === 'IPS' && !u._isIps) continue;

      const pUser = getAuthorizedPlatformUser(u);
      if (accessFilter === 'AUTHORIZED' && !pUser) continue;
      if (accessFilter === 'PENDING' && pUser) continue;

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
    }

    return results;
  }, [users, searchTerm, accessFilter, domainFilter, getAuthorizedPlatformUser]);

  // Cálculos de Paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, startIndex, pageSize]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const getUserAssignedAssets = (_userId: string): Asset[] => {
    return [];
  };

  const getRoleBadge = (role: PlatformRole) => {
    switch (role) {
      case 'ADMIN_TI':
        return <span className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 text-[10px] font-extrabold rounded bg-[#003B70] text-white">ADMIN TI</span>;
      case 'ENCARGADO_BODEGA':
        return <span className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 text-[10px] font-extrabold rounded bg-blue-50 text-blue-800 border border-blue-200">JEFE BODEGA</span>;
      case 'TECNICO_SOPORTE':
        return <span className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 text-[10px] font-extrabold rounded bg-emerald-50 text-emerald-800 border border-emerald-200">TÉCNICO SOPORTE</span>;
      case 'AUDITOR_CONSULTOR':
        return <span className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 text-[10px] font-extrabold rounded bg-purple-50 text-purple-800 border border-purple-200">AUDITOR CGR</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#003B70] dark:text-white tracking-tight flex items-center gap-2">
            <Users2 className="w-8 h-8 text-[#003B70] dark:text-[#38BDF8]" />
            <span>Directorio de Funcionarios (Active Directory)</span>
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 font-medium">
            Sincronización dual en vivo: <strong className="text-slate-800 dark:text-white">ChileAtiende (cha.cl)</strong> e <strong className="text-slate-800 dark:text-white">IPS (ips.gob.cl)</strong> • {users.length} funcionarios en catálogo
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setIpsFullName('');
              setIpsRut('');
              setIpsUsername('');
              setIpsJobTitle('Funcionario IPS');
              setIpsDepartment('Instituto de Previsión Social (IPS)');
              setIpsBranchId(branches.length > 0 ? branches[0].id : '');
              setIpsError(null);
              setIsAddIpsModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Registrar Funcionario</span>
          </button>

        </div>
      </div>

      {feedbackBanner && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-200 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{feedbackBanner}</span>
          </div>
          <button onClick={() => setFeedbackBanner(null)} className="text-emerald-300 font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Búsqueda y Filtros de Dominio / Acceso */}
      <div className="gov-card p-4 sm:p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-xl w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Buscar por Nombre, RUT, Usuario, Correo o Departamento..."
            className="gov-input gov-input-with-icon"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
          {/* Filtro de Dominio */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0C1729] border border-slate-200 dark:border-[#1E3352] rounded-lg text-xs font-semibold">
            <button
              onClick={() => { setDomainFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-md transition-all ${domainFilter === 'ALL' ? 'bg-[#003B70] text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Todos Dominios
            </button>
            <button
              onClick={() => { setDomainFilter('CHA'); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-md transition-all ${domainFilter === 'CHA' ? 'bg-[#003B70] text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              ChileAtiende (cha.cl)
            </button>
            <button
              onClick={() => { setDomainFilter('IPS'); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-md transition-all ${domainFilter === 'IPS' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              IPS (ips.gob.cl)
            </button>
          </div>

          {/* Filtros de Acceso */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0C1729] border border-slate-200 dark:border-[#1E3352] rounded-lg text-xs font-semibold">
            <button
              onClick={() => { setAccessFilter('ALL'); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-md transition-all ${accessFilter === 'ALL' ? 'bg-[#003B70] text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Todos ({filteredUsers.length})
            </button>
            <button
              onClick={() => { setAccessFilter('AUTHORIZED'); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-md transition-all ${accessFilter === 'AUTHORIZED' ? 'bg-emerald-700 dark:bg-emerald-900 text-white dark:text-emerald-200 shadow-xs font-bold border border-emerald-600 dark:border-emerald-700/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Con Acceso ({platformUsers.length})
            </button>
            <button
              onClick={() => { setAccessFilter('PENDING'); setCurrentPage(1); }}
              className={`px-2.5 py-1.5 rounded-md transition-all ${accessFilter === 'PENDING' ? 'bg-amber-700 dark:bg-amber-900 text-white dark:text-amber-200 shadow-xs font-bold border border-amber-600 dark:border-amber-700/60' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}
            >
              Sin Acceso
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Funcionarios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {isLoading ? (
          Array.from({ length: 9 }).map((_, idx) => (
            <div key={`skel-${idx}`} className="gov-card p-5 space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-slate-800" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-[#1E3352]/60">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/6" />
              </div>
            </div>
          ))
        ) : paginatedUsers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white dark:bg-[#101C30] rounded-xl border border-slate-200 dark:border-[#1E3352]">
            <Users2 className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-200">No se encontraron funcionarios con el criterio de búsqueda</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Intente buscando por nombre, RUT (ej: 13108837-K) o usuario institucional</p>
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
                className={`gov-card p-5 space-y-4 hover:shadow-gov-card transition-all flex flex-col justify-between border ${pUser ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/40 dark:bg-[#0E261E]/30' : 'border-slate-200 dark:border-[#1E3352]'}`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003B70] to-[#0055A5] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 border border-blue-400/30 dark:border-[#38BDF8]/30">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight truncate">{user.fullName}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{user.jobTitle || 'Funcionario'}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${isIps ? 'bg-blue-50 dark:bg-[#0C2447] text-blue-700 dark:text-[#60A5FA] border-blue-200 dark:border-[#1E4B8A]' : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/60'}`}>
                      {isIps ? 'ips.gob.cl' : 'cha.cl'}
                    </span>
                  </div>


                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-[#1E3352]/60">
                    <div className="flex justify-between">
                      <span className="text-slate-400">RUT:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{user.rut || 'No informado'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Usuario AD:</span>
                      <span className="font-mono text-[#003B70] dark:text-[#38BDF8] font-semibold">{user.samAccountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Correo:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[170px]">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Depto:</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate max-w-[170px]">{user.department || 'Dirección Nacional'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Laptop className="w-4 h-4 text-[#003B70] dark:text-[#38BDF8]" />
                    <span className="text-slate-600 dark:text-slate-300 font-medium">Equipos a cargo:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{assigned.length}</span>
                  </div>
                  {assigned.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedUserForAssets(user)}
                      className="text-[11px] text-[#003B70] dark:text-[#38BDF8] hover:underline font-bold"
                    >
                      Ver ({assigned.length})
                    </button>
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

            {/* Campo de Contraseña Personalizada Asignada por el Mantenedor */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-[#102038] border border-blue-200 dark:border-[#1E3E6B] space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-slate-800 dark:text-white font-bold text-xs">
                  Contraseña Personalizada de Acceso *
                </label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[11px] font-bold text-[#003B70] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generar Clave Aleatoria</span>
                </button>
              </div>

              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <input
                  type={showAuthPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder={authorizingUser && getAuthorizedPlatformUser(authorizingUser) ? "Dejar en blanco para conservar clave actual..." : "Ingrese la contraseña asignada..."}
                  className="gov-input gov-input-with-both-icons font-mono font-medium text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowAuthPassword(!showAuthPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1"
                  title={showAuthPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showAuthPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                Esta clave es la que el funcionario utilizará para iniciar sesión en la plataforma (mayor control institucional).
              </p>
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

      {/* Modal Registrar Funcionario */}
      {isAddIpsModalOpen && (
        <Modal
          isOpen={isAddIpsModalOpen}
          onClose={() => setIsAddIpsModalOpen(false)}
          title="Registrar Funcionario en el Directorio"
          subtitle="Agregue manualmente a un funcionario perteneciente al dominio Instituto de Previsión Social (@ips.gob.cl)"
          maxWidth="lg"
        >
          <form onSubmit={handleCreateIpsUser} className="space-y-4 text-xs">
            {ipsError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{ipsError}</span>
              </div>
            )}

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Este registro quedará sincronizado como funcionario del dominio <strong>IPS (ips.gob.cl)</strong>.</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre de Usuario (sAMAccountName) *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={ipsUsername}
                    onChange={(e) => setIpsUsername(e.target.value)}
                    placeholder="Ej: mrodriguez"
                    className="gov-input gov-input-with-icon font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">RUT Funcionario (Opcional)</label>
                <div className="relative">
                  <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={ipsRut}
                    onChange={(e) => setIpsRut(formatRut(e.target.value))}
                    placeholder="Ej: 14.567.890-1"
                    className="gov-input gov-input-with-icon font-mono font-bold"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  value={ipsFullName}
                  onChange={(e) => setIpsFullName(e.target.value)}
                  placeholder="Ej: Marcela Andrea Rodríguez Muñoz"
                  className="gov-input font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Cargo / Función</label>
                <input
                  type="text"
                  value={ipsJobTitle}
                  onChange={(e) => setIpsJobTitle(e.target.value)}
                  placeholder="Ej: Analista de Operaciones"
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Departamento / División</label>
                <input
                  type="text"
                  value={ipsDepartment}
                  onChange={(e) => setIpsDepartment(e.target.value)}
                  placeholder="Ej: Instituto de Previsión Social (IPS)"
                  className="gov-input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Sucursal / Dirección Asignada</label>
                <select
                  value={ipsBranchId}
                  onChange={(e) => setIpsBranchId(e.target.value)}
                  className="gov-select"
                >
                  <option value="">Seleccione sucursal...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddIpsModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrar en Directorio IPS</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
