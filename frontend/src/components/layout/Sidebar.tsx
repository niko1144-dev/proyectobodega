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
  X
} from 'lucide-react';
import { PlatformRole } from '../../types/user';

export type NavModule = 
  | 'dashboard'
  | 'reception'
  | 'inventory'
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
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all duration-150 group ${
                isActive
                  ? 'bg-[#EBF3FA] text-[#003B70] font-bold border-l-4 border-l-[#003B70] shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    isActive
                      ? 'bg-[#003B70] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-500 group-hover:text-slate-800 group-hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 truncate">
                  <div className="text-sm leading-tight truncate">{item.label}</div>
                  <div className="text-xs text-slate-500 font-normal truncate mt-0.5">{item.description}</div>
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-1.5 ${
                    item.badgeVariant === 'danger'
                      ? 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                      : 'bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]'
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
      <div className="p-4 border-t border-slate-200 bg-slate-50/80">
        {isAuditor ? (
          <div className="rounded-xl p-3.5 bg-purple-50 border border-purple-200 shadow-2xs">
            <div className="flex items-center gap-2 text-sm font-bold text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-700" />
              <span>Modo Auditoría</span>
            </div>
            <p className="text-xs text-purple-700 mt-1 leading-relaxed">
              Acceso en Solo Lectura habilitado para Contraloría / Jefatura.
            </p>
          </div>
        ) : (
          <div className="rounded-xl p-3.5 bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2 text-sm font-bold text-[#003B70]">
              <Laptop className="w-4 h-4 text-[#003B70]" />
              <span>Mesa de Ayuda DTI</span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Soporte TI: Anexo <strong>8700</strong> o soporteti@chileatiende.cl
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (visible on lg+) */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col justify-between shrink-0 select-none min-h-[calc(100vh-65px)] shadow-2xs">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer (visible on < lg when open) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          
          {/* Drawer Panel */}
          <aside className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
