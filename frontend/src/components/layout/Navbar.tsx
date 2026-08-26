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
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">JEFE BODEGA</span>;
      case 'TECNICO_SOPORTE':
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">TÉCNICO</span>;
      case 'AUDITOR_CONSULTOR':
        return <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">AUDITOR</span>;
      default:
        return null;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#080F1D] border-b border-[#182A44] shadow-md">
      {/* Franja Bicromática Institucional Gobierno de Chile */}
      <div className="gob-flag-bar" />

      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-3">
        {/* Botón Menú Móvil + Logotipo Oficial ChileAtiende */}
        <div className="flex items-center gap-2 sm:gap-3">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="p-2 -ml-1 text-slate-400 hover:text-white hover:bg-[#122238] rounded-lg lg:hidden transition-colors"
              aria-label="Abrir menú de navegación"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <button 
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-3 cursor-pointer select-none hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 p-1 -ml-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/40 text-left group"
            title="Ir al Inicio / Dashboard"
            aria-label="Ir al Panel de Control Principal"
          >
            <ChileAtiendeLogo size="md" variant="horizontal" />
          </button>
        </div>

        {/* Buscador Global Institucional */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
          <div className="relative w-full group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#38BDF8] transition-colors" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° Serie, Inventario, RUT o Funcionario..."
              className="gov-input gov-input-with-icon transition-all duration-200 focus:shadow-md"
            />
          </div>
        </form>

        {/* Acciones y Perfil */}
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
              icon={<Building2 className="w-4 h-4 text-[#38BDF8]" />}
              searchPlaceholder="Filtrar sucursal..."
            />
          </div>

          {/* Sincronización Active Directory */}
          <button
            onClick={handleSyncAD}
            disabled={isSyncing}
            title={`Sincronización AD: ${lastSync}`}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#101C30] hover:bg-[#162744] text-sm font-semibold text-slate-200 rounded-lg border border-[#1E3352] shadow-xs hover:border-[#38BDF8]/50 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group"
          >
            <RefreshCw className={`w-4 h-4 text-[#38BDF8] transition-transform duration-300 group-hover:rotate-45 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden xl:inline">Active Directory</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 hidden sm:inline" />
          </button>

          {/* Perfil del Funcionario / Técnico */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-[#182A44]">
            <div className="w-9 h-9 rounded-lg bg-[#102444] border border-[#1E3D6B] flex items-center justify-center text-[#38BDF8] font-bold text-sm shadow-xs transition-transform duration-200 hover:scale-105">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden xl:block text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-100 leading-tight">{currentUser.fullName}</span>
                {getRoleLabel(currentUser.role)}
              </div>
              <p className="text-xs text-slate-400 font-medium">{currentUser.jobTitle || 'Funcionario ITAM'}</p>
            </div>

            {/* Botón Cerrar Sesión */}
            <button
              onClick={onLogout}
              title="Cerrar Sesión"
              className="p-2 ml-1 text-slate-400 hover:text-[#EF4444] hover:bg-red-950/40 rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
