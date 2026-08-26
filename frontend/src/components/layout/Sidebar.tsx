import React from 'react';
import { 
  LayoutDashboard, 
  PackagePlus, 
  Boxes, 
  Cable, 
  FileCheck2, 
  RotateCcw, 
  Users2, 
  Settings, 
  ShieldCheck, 
  Laptop,
  History,
  ArrowLeftRight,
  X
} from 'lucide-react';
import { PlatformRole } from '../../types/user';
import { useTheme } from '../../context/ThemeContext';

export type NavModule = 
  | 'dashboard'
  | 'reception'
  | 'inventory'
  | 'transfers'
  | 'traceability'
  | 'consumables'
  | 'assignments'
  | 'returns'
  | 'directory'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeModule: NavModule;
  onNavigate: (module: NavModule) => void;
  userRole?: PlatformRole;
  pendingExpirationsCount?: number;
  criticalStockCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  onNavigate,
  userRole = 'TECNICO_SOPORTE',
  pendingExpirationsCount = 0,
  criticalStockCount = 0,
  isOpenMobile = false,
  onCloseMobile
}) => {
  const { isDark } = useTheme();
  const isAuditor = userRole === 'AUDITOR_CONSULTOR';

  const menuItems: {
    id: NavModule;
    label: string;
    description: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeVariant?: 'danger' | 'warning' | 'info';
    visible: boolean;
  }[] = [
    {
      id: 'dashboard' as NavModule,
      label: 'Panel Principal',
      description: 'KPIs, métricas & stock',
      icon: LayoutDashboard,
      badge: pendingExpirationsCount > 0 ? `${pendingExpirationsCount} alertas` : undefined,
      badgeVariant: 'warning' as const,
      visible: true
    },
    {
      id: 'reception' as NavModule,
      label: 'Recepción e Ingreso',
      description: 'Guías de Despacho, OC y Arriendos',
      icon: PackagePlus,
      visible: !isAuditor
    },
    {
      id: 'inventory' as NavModule,
      label: 'Inventario de Activos',
      description: 'Parque de hardware registrado',
      icon: Boxes,
      visible: true
    },
    {
      id: 'transfers' as NavModule,
      label: 'Traspasos de Bodega',
      description: 'Movimiento de hardware e insumos',
      icon: ArrowLeftRight,
      visible: !isAuditor
    },
    {
      id: 'traceability' as NavModule,
      label: 'Trazabilidad & Vida Útil',
      description: 'Historial y Kardex por Serie',
      icon: History,
      visible: true
    },
    {
      id: 'consumables' as NavModule,
      label: 'Insumos y Accesorios',
      description: 'Control de periféricos y stock',
      icon: Cable,
      badge: criticalStockCount > 0 ? `${criticalStockCount} bajo stock` : undefined,
      badgeVariant: 'danger' as const,
      visible: true
    },
    {
      id: 'assignments' as NavModule,
      label: 'Asignaciones & Actas',
      description: 'Entrega con Active Directory y Firma',
      icon: FileCheck2,
      visible: !isAuditor
    },
    {
      id: 'returns' as NavModule,
      label: 'Devoluciones TI',
      description: 'Reingreso y evaluación técnica',
      icon: RotateCcw,
      visible: !isAuditor
    },
    {
      id: 'directory' as NavModule,
      label: 'Directorio Funcionarios',
      description: 'Sincronización AD / Entrega Equipos',
      icon: Users2,
      visible: true
    },
    {
      id: 'users' as NavModule,
      label: 'Gestión de Usuarios',
      description: 'Mantenedor & Privilegios RBAC',
      icon: ShieldCheck,
      visible: userRole === 'ADMIN_TI'
    },
    {
      id: 'settings' as NavModule,
      label: 'Configuración & Datos',
      description: 'Proveedores y parámetros globales',
      icon: Settings,
      visible: !isAuditor
    }
  ].filter(item => item.visible);

  const handleItemClick = (mod: NavModule) => {
    onNavigate(mod);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const sidebarContent = (
    <div className="flex-1 flex flex-col justify-between overflow-y-auto">
      {/* Lista de Navegación */}
      <div className="p-3.5 space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>
            {isAuditor ? 'Módulos de Auditoría' : 'Módulos del Sistema'}
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all duration-200 ease-out group relative overflow-hidden ${
                isActive
                  ? isDark
                    ? 'bg-gradient-to-r from-[#003B70] to-[#0055A5] text-white font-bold border-l-4 border-l-[#38BDF8] shadow-md shadow-[#003B70]/30 translate-x-1'
                    : 'bg-gradient-to-r from-[#EBF3FA] to-white text-[#003B70] font-bold border-l-4 border-l-[#003B70] shadow-xs translate-x-1'
                  : isDark
                  ? 'text-slate-300 hover:bg-[#111F36] hover:text-white hover:translate-x-1.5 border-l-4 border-l-transparent hover:border-l-[#38BDF8]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-[#003B70] hover:translate-x-1.5 border-l-4 border-l-transparent hover:border-l-[#003B70]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg transition-all duration-200 ease-out shrink-0 ${
                    isActive
                      ? isDark
                        ? 'bg-[#002A50] text-[#38BDF8] shadow-sm scale-105 border border-[#38BDF8]/40'
                        : 'bg-[#003B70] text-white shadow-sm scale-105'
                      : isDark
                      ? 'bg-[#0D1829] text-slate-400 group-hover:text-white group-hover:bg-[#003B70] group-hover:scale-110 group-hover:rotate-3 border border-[#1A2E4C]'
                      : 'bg-slate-100 text-slate-500 group-hover:text-white group-hover:bg-[#003B70] group-hover:scale-110 group-hover:rotate-3 border border-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform duration-200" />
                </div>
                <div className="min-w-0 truncate">
                  <div className={`text-sm leading-tight truncate font-semibold transition-colors ${
                    isActive ? (isDark ? 'text-white' : 'text-[#003B70]') : (isDark ? 'text-slate-200 group-hover:text-white' : 'text-slate-700 group-hover:text-[#003B70]')
                  }`}>
                    {item.label}
                  </div>
                  <div className={`text-xs font-normal truncate mt-0.5 transition-colors ${
                    isActive ? (isDark ? 'text-blue-100' : 'text-blue-700') : (isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-600')
                  }`}>
                    {item.description}
                  </div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 transition-transform duration-200 group-hover:scale-110 ${
                    item.badgeVariant === 'danger'
                      ? isDark
                        ? 'bg-red-950/80 text-red-300 border border-red-700/60'
                        : 'bg-red-50 text-red-700 border border-red-200'
                      : isDark
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pie del Sidebar Institucional */}
      <div className={`p-4 border-t ${isDark ? 'border-[#16263F] bg-[#060C17]' : 'border-slate-200 bg-slate-50/80'}`}>
        {isAuditor ? (
          <div className={`rounded-xl p-3.5 ${isDark ? 'bg-purple-950/50 border-purple-800/50' : 'bg-purple-50 border-purple-200'} border shadow-2xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200`}>
            <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-purple-300' : 'text-purple-900'}`}>
              <ShieldCheck className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-700'}`} />
              <span>Modo Auditoría</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-purple-300/80' : 'text-purple-700'} mt-1 leading-relaxed`}>
              Acceso en Solo Lectura habilitado para Contraloría / Jefatura.
            </p>
          </div>
        ) : (
          <div className={`rounded-xl p-3.5 ${isDark ? 'bg-[#0D182B] border-[#1B2F4E]' : 'bg-white border-slate-200'} border shadow-2xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200`}>
            <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-[#38BDF8]' : 'text-[#003B70]'}`}>
              <Laptop className={`w-4 h-4 ${isDark ? 'text-[#38BDF8]' : 'text-[#003B70]'}`} />
              <span>Mesa de Ayuda DTI</span>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-1 leading-relaxed`}>
              Soporte TI: Anexo <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>8700</strong> o soporteti@chileatiende.cl
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg+) */}
      <aside className={`hidden lg:flex w-64 ${isDark ? 'bg-[#070D1A] border-[#16263F]' : 'bg-white border-slate-200'} border-r flex-col justify-between shrink-0 select-none min-h-[calc(100vh-65px)] shadow-2xs dark:shadow-md transition-colors duration-200`}>
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible on < lg when open) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className={`fixed inset-0 ${isDark ? 'bg-black/70' : 'bg-slate-900/60'} backdrop-blur-xs transition-opacity animate-in fade-in`}
            onClick={onCloseMobile}
          />
          
          {/* Drawer Panel */}
          <div className={`relative flex-1 flex flex-col max-w-xs w-full ${isDark ? 'bg-[#070D1A] border-[#16263F]' : 'bg-white border-slate-200'} border-r shadow-2xl animate-in slide-in-from-left duration-200 z-10`}>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
