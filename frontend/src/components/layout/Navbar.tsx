import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  RefreshCw, 
  User, 
  CheckCircle2, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Branch } from '../../types/document';
import { PlatformUser, PlatformRole } from '../../types/user';
import { ApiClient } from '../../api/client';
import { ChileAtiendeLogo } from '../common/ChileAtiendeLogo';
import { SearchableSelect } from '../common/SearchableSelect';
import { ThemeToggle } from '../common/ThemeToggle';

interface NavbarProps {
  currentUser: PlatformUser;
  currentBranchId: string;
  onBranchChange: (branchId: string) => void;
  onGlobalSearch: (term: string) => void;
  onNavigate: (module: string) => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentBranchId,
  onBranchChange,
  onGlobalSearch,
  onNavigate,
  onLogout,
  onToggleMobileMenu,
  isMobileMenuOpen = false
}) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('Hoy, 08:00 AM');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    ApiClient.getBranches().then(b => {
      setBranches(b);
    });
  }, []);

  const handleSyncAD = async () => {
    setIsSyncing(true);
    try {
      const result = await ApiClient.syncDirectory();
      const time = new Date(result.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      setLastSync(`Hoy, ${time}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      onGlobalSearch(searchTerm);
      onNavigate('inventory');
    }
  };

  const getRoleLabel = (role: PlatformRole) => {
    switch (role) {
      case 'ADMIN_TI':
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#003B70] text-white">ADMIN DTI</span>;
      case 'ENCARGADO_BODEGA':
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] border border-blue-200 dark:border-[#1E4B8A]">JEFE BODEGA</span>;
      case 'TECNICO_SOPORTE':
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">TÉCNICO</span>;
      case 'AUDITOR_CONSULTOR':
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700/60">AUDITOR</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-[#080F1D] border-b border-slate-200 dark:border-[#182A44] shadow-xs dark:shadow-md transition-colors duration-200">
      {/* Franja Bicromática Institucional Gobierno de Chile */}
      <div className="gob-flag-bar" />

      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-3">
        {/* Botón Menú Móvil + Logotipo Oficial ChileAtiende */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 -ml-1 text-slate-600 dark:text-slate-400 hover:text-[#003B70] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#122238] rounded-lg lg:hidden transition-colors"
              aria-label="Abrir menú de navegación"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <button 
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 p-1 -ml-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003B70]/20 dark:focus:ring-[#38BDF8]/40 text-left group"
            title="Ir al Inicio / Dashboard"
            aria-label="Ir al Panel de Control Principal"
          >
            <ChileAtiendeLogo size="md" variant="horizontal" />
          </button>
        </div>

        {/* Buscador Global Institucional */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-[#003B70] dark:group-focus-within:text-[#38BDF8] transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° Serie, Inventario, RUT o Funcionario..."
              className="gov-input gov-input-with-icon transition-all duration-200 focus:shadow-md"
            />
          </div>
        </form>

        {/* Acciones, Switch de Tema y Perfil */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Selector de Sucursal con Buscador */}
          <div className="w-48 sm:w-60 hidden sm:block">
            <SearchableSelect
              value={currentBranchId}
              onChange={(val) => onBranchChange(val)}
              options={[
                { value: 'ALL', label: 'Todas las Sucursales', badge: 'Nacional' },
                ...branches.map(b => ({
                  value: b.id,
                  label: b.name,
                  sublabel: `${b.region} • ${b.address}`,
                  badge: b.code
                }))
              ]}
              icon={<Building2 className="w-4 h-4 text-[#003B70] dark:text-[#38BDF8]" />}
              searchPlaceholder="Filtrar sucursal..."
            />
          </div>

          {/* Switch Modo Día / Modo Noche */}
          <ThemeToggle />

          {/* Sincronización Active Directory */}
          <button
            onClick={handleSyncAD}
            disabled={isSyncing}
            title={`Sincronización AD: ${lastSync}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#101C30] hover:bg-slate-50 dark:hover:bg-[#162744] text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-lg border border-slate-300 dark:border-[#1E3352] shadow-xs hover:border-[#003B70] dark:hover:border-[#38BDF8]/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
          >
            <RefreshCw className={`w-4 h-4 text-[#003B70] dark:text-[#38BDF8] transition-transform duration-300 group-hover:rotate-45 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">Active Directory</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 hidden sm:inline" />
          </button>

          {/* Perfil del Funcionario / Técnico */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-[#182A44]">
            <div className="w-9 h-9 rounded-lg bg-[#EBF3FA] dark:bg-[#102444] border border-[#BFDBFE] dark:border-[#1E3D6B] flex items-center justify-center text-[#003B70] dark:text-[#38BDF8] font-bold text-sm shadow-xs transition-transform duration-200 hover:scale-105">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden xl:block text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{currentUser.fullName}</span>
                {getRoleLabel(currentUser.role)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{currentUser.jobTitle || 'Funcionario ITAM'}</p>
            </div>

            {/* Botón Cerrar Sesión */}
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-2 ml-1 text-slate-400 hover:text-[#E4002B] dark:hover:text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
