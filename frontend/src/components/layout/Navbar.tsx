import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Search, 
  RefreshCw, 
  User, 
  CheckCircle2, 
  LogOut,
  Menu,
  X,
  KeyRound,
  ChevronDown,
  ShieldCheck,
  Building,
  Mail,
  Lock
} from 'lucide-react';
import { Branch } from '../../types/document';
import { PlatformUser, PlatformRole } from '../../types/user';
import { ApiClient } from '../../api/client';
import { ChileAtiendeLogo } from '../common/ChileAtiendeLogo';
import { SearchableSelect } from '../common/SearchableSelect';
import { ThemeToggle } from '../common/ThemeToggle';
import { useTheme } from '../../context/ThemeContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';

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
  const { isDark } = useTheme();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSync, setLastSync] = useState<string>('Hoy, 08:00 AM');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState<boolean>(false);

  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ApiClient.getBranches().then(b => {
      setBranches(b);
    });
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        return <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'bg-[#0C2447] text-[#60A5FA] border border-[#1E4B8A]' : 'bg-blue-100 text-blue-800 border border-blue-200'}`}>JEFE BODEGA</span>;
      case 'TECNICO_SOPORTE':
        return <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/60' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>TÉCNICO</span>;
      case 'AUDITOR_CONSULTOR':
        return <span className={`text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60' : 'bg-purple-100 text-purple-800 border border-purple-200'}`}>AUDITOR</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <header className={`sticky top-0 z-40 w-full ${isDark ? 'bg-[#080F1D] border-[#182A44]' : 'bg-white border-slate-200'} border-b shadow-xs transition-colors duration-200`}>
        {/* Franja Bicromática Institucional Gobierno de Chile */}
        <div className="gob-flag-bar" />

        <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 gap-3">
          {/* Botón Menú Móvil + Logotipo Oficial ChileAtiende */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className={`p-2 -ml-1 ${isDark ? 'text-slate-400 hover:text-white hover:bg-[#122238]' : 'text-slate-600 hover:text-[#003B70] hover:bg-slate-100'} rounded-lg lg:hidden transition-colors`}
                aria-label="Abrir menú de navegación"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <button 
              type="button"
              onClick={() => onNavigate('dashboard')}
              className={`flex items-center gap-3 cursor-pointer select-none hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 p-1 -ml-1 rounded-xl focus:outline-none focus:ring-2 ${isDark ? 'focus:ring-[#38BDF8]/40' : 'focus:ring-[#003B70]/20'} text-left group`}
              title="Ir al Inicio / Dashboard"
              aria-label="Ir al Panel de Control Principal"
            >
              <ChileAtiendeLogo size="md" variant="horizontal" />
            </button>
          </div>

          {/* Buscador Global Institucional */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center flex-1 max-w-md mx-4 lg:mx-8">
            <div className="relative w-full group">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500 group-focus-within:text-[#38BDF8]' : 'text-slate-400 group-focus-within:text-[#003B70]'} transition-colors`} />
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
                icon={<Building2 className={`w-4 h-4 ${isDark ? 'text-[#38BDF8]' : 'text-[#003B70]'}`} />}
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
              className={`flex items-center gap-1.5 px-3 py-2 ${isDark ? 'bg-[#101C30] hover:bg-[#162744] text-slate-200 border-[#1E3352] hover:border-[#38BDF8]/50' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-[#003B70]'} text-sm font-semibold rounded-lg border shadow-xs hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 group`}
            >
              <RefreshCw className={`w-4 h-4 ${isDark ? 'text-[#38BDF8]' : 'text-[#003B70]'} transition-transform duration-300 group-hover:rotate-45 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xl:inline">Active Directory</span>
              <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'} hidden sm:inline`} />
            </button>

            {/* Perfil del Funcionario / Menú Desplegable con Cambio de Clave */}
            <div ref={profileRef} className="relative">
              
              <div className={`flex items-center gap-2 pl-2 sm:pl-3 border-l ${isDark ? 'border-[#182A44]' : 'border-slate-200'}`}>
                
                {/* Botón Principal del Perfil (Abre Popover / Dropdown) */}
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className={`flex items-center gap-2.5 p-1.5 rounded-xl transition-all duration-200 ${
                    isProfileMenuOpen 
                      ? (isDark ? 'bg-[#122238] ring-2 ring-[#38BDF8]/40' : 'bg-slate-100 ring-2 ring-[#003B70]/20') 
                      : (isDark ? 'hover:bg-[#101C30]' : 'hover:bg-slate-50')
                  }`}
                  title="Opciones de mi cuenta"
                >
                  <div className={`w-9 h-9 rounded-lg ${isDark ? 'bg-[#102444] border-[#1E3D6B] text-[#38BDF8]' : 'bg-[#EBF3FA] border-[#BFDBFE] text-[#003B70]'} border flex items-center justify-center font-bold text-sm shadow-xs shrink-0`}>
                    <User className="w-4 h-4" />
                  </div>
                  
                  <div className="hidden xl:block text-left">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-800'} leading-tight`}>
                        {currentUser.fullName}
                      </span>
                      {getRoleLabel(currentUser.role)}
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180 text-[#003B70] dark:text-[#38BDF8]' : ''}`} />
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'} font-medium truncate max-w-[180px]`}>
                      {currentUser.jobTitle || 'Funcionario ITAM'}
                    </p>
                  </div>
                </button>

                {/* Botón Rápido Directo: Cambiar Contraseña */}
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  title="Cambiar Mi Contraseña"
                  className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 border ${
                    isDark 
                      ? 'bg-[#101C30] hover:bg-[#1A2D4C] text-[#38BDF8] border-[#1E3352] hover:border-[#38BDF8]/50' 
                      : 'bg-[#EBF3FA] hover:bg-[#D8E8F8] text-[#003B70] border-[#BFDBFE] hover:border-[#003B70]'
                  }`}
                  aria-label="Cambiar contraseña"
                >
                  <KeyRound className="w-4 h-4" />
                </button>

                {/* Botón Rápido: Cerrar Sesión */}
                <button
                  type="button"
                  onClick={onLogout}
                  title="Cerrar Sesión"
                  className={`p-2 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
                    isDark 
                      ? 'text-slate-400 hover:text-[#EF4444] hover:bg-red-950/40' 
                      : 'text-slate-400 hover:text-[#E4002B] hover:bg-red-50'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                </button>

              </div>

              {/* Menú Desplegable Flotante del Usuario */}
              {isProfileMenuOpen && (
                <div className={`absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl shadow-2xl border z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
                  isDark ? 'bg-[#0E1A2E] border-[#1E3352] text-white shadow-black/80' : 'bg-white border-slate-200 text-slate-900 shadow-slate-900/20'
                }`}>
                  {/* Franja Superior Bicromática */}
                  <div className="gob-flag-bar" />

                  {/* Cabecera del Usuario */}
                  <div className={`p-4 border-b ${isDark ? 'bg-[#080F1D] border-[#1E3352]' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-sm shrink-0 ${
                        isDark ? 'bg-[#102444] text-[#38BDF8] border border-[#1E3D6B]' : 'bg-[#EBF3FA] text-[#003B70] border border-[#BFDBFE]'
                      }`}>
                        <User className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{currentUser.fullName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">@{currentUser.username} • {currentUser.rut}</div>
                        <div className="mt-1">{getRoleLabel(currentUser.role)}</div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-[#1E3352] text-xs space-y-1 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{currentUser.email}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Building className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{currentUser.branchName || 'Sucursal Central'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Opciones del Menú */}
                  <div className="p-2 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left group ${
                        isDark 
                          ? 'hover:bg-[#14233C] text-slate-200 hover:text-white' 
                          : 'hover:bg-[#EBF3FA] text-slate-700 hover:text-[#003B70]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                        isDark ? 'bg-[#101C30] text-[#38BDF8]' : 'bg-white text-[#003B70] shadow-xs'
                      }`}>
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <div>
                        <div>Cambiar Mi Contraseña</div>
                        <p className="text-[11px] font-normal text-slate-500 dark:text-slate-400">Actualizar clave de acceso personal</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onLogout();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 group`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-900/40 transition-transform group-hover:scale-110">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div>
                        <div>Cerrar Sesión</div>
                        <p className="text-[11px] font-normal text-red-500/80 dark:text-red-400/80">Salir de la plataforma ITAM</p>
                      </div>
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* Modal de Cambio de Contraseña Personal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        currentUser={currentUser}
      />
    </>
  );
};

