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
  const isAdmin = userRole === 'ADMIN_TI';
  const isAuditor = userRole === 'AUDITOR_CONSULTOR';

  const menuItems = [
    {
      id: 'dashboard' as NavModule,
      label: 'Panel Principal',
      description: 'KPIs, métricas y vencimientos',
      icon: LayoutDashboard,
      badge: pendingExpirationsCount > 0 ? `${pendingExpirationsCount} alertas` : undefined,
      badgeVariant: 'warning',
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
      label: 'Insumos & Periféricos',
      description: 'Control de stock no inventariable',
      icon: Cable,
      badge: criticalStockCount > 0 ? `${criticalStockCount} bajo stock` : undefined,
      badgeVariant: 'danger',
      visible: true
    },
    {
      id: 'assignments' as NavModule,
      label: 'Asignaciones & Actas',
      description: 'Entrega con Active Directory',
      icon: FileCheck2,
      visible: true
    },
    {
      id: 'returns' as NavModule,
      label: 'Devoluciones TI',
      description: 'Reingreso y evaluación de estado',
      icon: RotateCcw,
      visible: !isAuditor
    },
    {
      id: 'directory' as NavModule,
      label: 'Directorio Funcionarios',
      description: 'Sincronización AD / Entra ID',
      icon: Users2,
      visible: true
    },
    {
      id: 'users' as NavModule,
      label: 'Gestión de Usuarios',
      description: 'Mantenedor & Privilegios RBAC',
      icon: ShieldCheck,
      visible: isAdmin
    },
    {
      id: 'settings' as NavModule,
      label: 'Configuración & Datos',
      description: 'Proveedores y parámetros',
      icon: Settings,
      visible: isAdmin
    }
  ].filter(item => item.visible);

  const handleItemClick = (id: NavModule) => {
    onNavigate(id);
    if (onCloseMobile) onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      {/* Lista de Navegación */}
      <div className="p-4 space-y-1.5 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-extrabold tracking-wider text-slate-400 uppercase">
            Módulos del Sistema
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
                  ? 'bg-gradient-to-r from-[#003B70] to-[#0055A5] text-white font-bold border-l-4 border-l-[#38BDF8] shadow-md shadow-[#003B70]/30 translate-x-1'
                  : 'text-slate-300 hover:bg-[#111F36] hover:text-white hover:translate-x-1.5 border-l-4 border-l-transparent hover:border-l-[#38BDF8]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg transition-all duration-200 ease-out shrink-0 ${
                    isActive
                      ? 'bg-[#002A50] text-[#38BDF8] shadow-sm scale-105 border border-[#38BDF8]/40'
                      : 'bg-[#0D1829] text-slate-400 group-hover:text-white group-hover:bg-[#003B70] group-hover:scale-110 group-hover:rotate-3 border border-[#1A2E4C]'
                  }`}
                >
                  <Icon className="w-5 h-5 transition-transform duration-200" />
                </div>
                <div className="min-w-0 truncate">
                  <div className={`text-sm leading-tight truncate font-semibold transition-colors ${isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{item.label}</div>
                  <div className={`text-xs font-normal truncate mt-0.5 transition-colors ${isActive ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-300'}`}>{item.description}</div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 transition-transform duration-200 group-hover:scale-110 ${
                    item.badgeVariant === 'danger'
                      ? 'bg-red-950/80 text-red-300 border border-red-700/60'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-700/60'
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
      <div className="p-4 border-t border-[#16263F] bg-[#060C17]">
        {isAuditor ? (
          <div className="rounded-xl p-3.5 bg-purple-950/50 border border-purple-800/50 shadow-2xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-300">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span>Modo Auditoría</span>
            </div>
            <p className="text-xs text-purple-300/80 mt-1 leading-relaxed">
              Acceso en Solo Lectura habilitado para Contraloría / Jefatura.
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-3.5 bg-[#0D182B] border border-[#1B2F4E] shadow-2xs hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-2 text-sm font-bold text-[#38BDF8]">
              <Laptop className="w-4 h-4 text-[#38BDF8]" />
              <span>Mesa de Ayuda DTI</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Soporte TI: Anexo <strong className="text-slate-200">8700</strong> o soporteti@chileatiende.cl
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg+) */}
      <aside className="hidden lg:flex w-64 bg-[#070D1A] border-r border-[#16263F] flex-col justify-between shrink-0 select-none min-h-[calc(100vh-65px)] shadow-md">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible on < lg when open) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          
          {/* Drawer Panel */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-[#070D1A] border-r border-[#16263F] shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
