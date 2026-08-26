import React, { useState, useEffect } from 'react';
import { 
  Boxes, 
  Laptop, 
  Clock, 
  FileCheck2, 
  ShieldAlert,
  ArrowRight,
  Download,
  PlusCircle,
  Building2,
  TrendingUp,
  PackageCheck,
  Users2,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  Monitor,
  Printer,
  PhoneCall,
  Fingerprint,
  Network,
  Server,
  Activity,
  ChevronRight,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Asset } from '../../types/asset';
import { LeasingContract } from '../../types/document';
import { StatusBadge } from '../common/Badge';
import { formatDate, getDaysUntil } from '../../utils/formatters';
import { ExcelService } from '../../services/excelService';
import { ApiClient } from '../../api/client';

interface DashboardViewProps {
  currentBranchId: string;
  onNavigate: (module: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ currentBranchId, onNavigate }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [contracts, setContracts] = useState<LeasingContract[]>([]);
  const [consumableStocks, setConsumableStocks] = useState<any[]>([]);
  const [consumables, setConsumables] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      let allAssets = await ApiClient.getAssets();
      if (currentBranchId !== 'ALL') {
        allAssets = allAssets.filter(a => a.currentBranchId === currentBranchId);
      }
      setAssets(allAssets);

      const [c, stocks, cns, logs, bList] = await Promise.all([
        ApiClient.getLeasingContracts(),
        ApiClient.getConsumableStocks(currentBranchId === 'ALL' ? undefined : currentBranchId),
        ApiClient.getConsumables(),
        ApiClient.getAuditLogs(6),
        ApiClient.getBranches()
      ]);
      setContracts(c);
      setConsumableStocks(stocks);
      setConsumables(cns);
      setAuditLogs(logs);
      setBranches(bList);
    } catch (e) {
      console.error("Error loading dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentBranchId]);

  // Cálculos de KPIs
  const totalAssets = assets.length;
  const inWarehouseCount = assets.filter(a => a.status === 'BODEGA_DISPONIBLE').length;
  const assignedCount = assets.filter(a => a.status === 'ASIGNADO').length;
  const maintenanceCount = assets.filter(a => a.status === 'EN_MANTENCION').length;
  const ownAssetsCount = assets.filter(a => a.propertyType === 'PROPIO').length;
  const leasingAssetsCount = assets.filter(a => a.propertyType === 'ARRIENDO').length;

  const ownPercentage = totalAssets > 0 ? Math.round((ownAssetsCount / totalAssets) * 100) : 0;
  const warehousePercentage = totalAssets > 0 ? Math.round((inWarehouseCount / totalAssets) * 100) : 0;

  // Distribución por Tipología
  const typesDistribution = assets.reduce((acc, a) => {
    const typeName = a.assetTypeName || 'Otros Dispositivos';
    acc[typeName] = (acc[typeName] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Contratos Próximos a Vencer (<60 días)
  const expiringContracts = contracts
    .map(c => {
      const days = getDaysUntil(c.endDate) ?? 999;
      const linkedAssets = assets.filter(a => a.leasingContractId === c.id).length;
      return { ...c, daysLeft: days, linkedAssetsCount: linkedAssets };
    })
    .filter(c => c.daysLeft >= 0 && c.daysLeft <= 60)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  // Insumos con Stock Crítico
  const criticalStockItems = consumableStocks
    .map(stk => {
      const item = consumables.find(c => c.id === stk.consumableId);
      const br = branches.find(b => b.id === stk.branchId);
      return {
        ...stk,
        consumableName: item ? item.name : 'Insumo',
        sku: item ? item.sku : '-',
        branchName: br ? br.name : 'Sucursal',
        minAlert: item ? item.minStockAlert : 5,
        isCritical: stk.currentQuantity <= (item ? item.minStockAlert : 5)
      };
    })
    .filter(stk => stk.isCritical)
    .slice(0, 5);

  const handleExportExcel = () => {
    ExcelService.exportAssetsToExcel(assets, 'Reporte_General_ITAM_ChileAtiende.xlsx');
  };

  const currentBranchName = currentBranchId === 'ALL'
    ? 'Todas las Sucursales y Bodegas (Nivel Nacional)'
    : branches.find(b => b.id === currentBranchId)?.name || 'Sucursal Seleccionada';

  const todayFormatted = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const capitalizedToday = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  const getHardwareIcon = (typeName: string) => {
    const lower = typeName.toLowerCase();
    if (lower.includes('desktop') || lower.includes('all-in-one') || lower.includes('aio')) return Monitor;
    if (lower.includes('notebook') || lower.includes('laptop')) return Laptop;
    if (lower.includes('monitor') || lower.includes('pantalla')) return Monitor;
    if (lower.includes('impresora') || lower.includes('scanner') || lower.includes('termica')) return Printer;
    if (lower.includes('telefono') || lower.includes('ip') || lower.includes('citofono')) return PhoneCall;
    if (lower.includes('huellero') || lower.includes('biometrico') || lower.includes('cedula')) return Fingerprint;
    if (lower.includes('switch') || lower.includes('router') || lower.includes('red')) return Network;
    if (lower.includes('servidor') || lower.includes('server')) return Server;
    return Boxes;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      
      {/* 1. BANNER EJECUTIVO DE BIENVENIDA & ACCIONES RÁPIDAS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#002244] via-[#003B70] to-[#0A1A30] text-white p-6 sm:p-8 shadow-xl dark:shadow-black/60 border border-[#1E3D6B]">
        {/* Orbes de Iluminación Ambiental */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-[#38BDF8]/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 w-80 h-80 rounded-full bg-[#E4002B]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/95 text-xs font-semibold backdrop-blur-md border border-white/20 shadow-xs">
                <Calendar className="w-3.5 h-3.5 text-[#38BDF8]" />
                {capitalizedToday}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38BDF8]/20 text-[#38BDF8] text-xs font-bold border border-[#38BDF8]/30 backdrop-blur-md">
                <Building2 className="w-3.5 h-3.5" />
                {currentBranchName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Panel de Control ITAM
            </h1>
            <p className="text-xs sm:text-sm text-slate-200/90 max-w-2xl leading-relaxed">
              Monitoreo centralizado del parque informático, trazabilidad de hardware propio y arriendo, stock de insumos y actas institucionales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 shadow-sm transition-all duration-200 active:scale-[0.98] hover:shadow-md"
            >
              <Download className="w-4 h-4 text-[#38BDF8]" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => onNavigate('reception')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#003B70] bg-white hover:bg-slate-100 shadow-md hover:shadow-lg hover:shadow-black/20 transition-all duration-200 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-[#003B70]" />
              <span>Recepción Guía</span>
            </button>

            <button
              onClick={() => onNavigate('assignments')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#E4002B] hover:bg-[#C20024] shadow-md hover:shadow-lg hover:shadow-[#E4002B]/30 border border-red-400/40 transition-all duration-200 active:scale-[0.98]"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Nueva Asignación</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. GRID DE KPIS Y MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Card 1: Total Activos TI */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="gov-card relative p-5 sm:p-6 space-y-4 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group border-t-2 border-t-[#003B70] dark:border-t-[#38BDF8] overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#38BDF8]/5 rounded-full blur-2xl pointer-events-none group-hover:bg-[#38BDF8]/10 transition-colors" />

          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-[#EBF3FA] dark:bg-[#002A50] text-[#003B70] dark:text-[#38BDF8] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs border border-[#BFDBFE] dark:border-[#38BDF8]/40">
              <Boxes className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[#EBF3FA] dark:bg-[#0C2447] text-[#003B70] dark:text-[#60A5FA] font-bold border border-[#BFDBFE] dark:border-[#1E4B8A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#003B70] dark:bg-[#38BDF8]" />
              Total Activos
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {totalAssets}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
              Parque tecnológico registrado
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/80 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between font-semibold">
              <span className="text-[#003B70] dark:text-[#38BDF8]">Propios: {ownAssetsCount} ({ownPercentage}%)</span>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Arriendo: {leasingAssetsCount}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-[#080F1D] rounded-full overflow-hidden flex border border-slate-200 dark:border-[#1E3352]">
              <div style={{ width: `${ownPercentage}%` }} className="bg-gradient-to-r from-[#003B70] to-[#0055A5] dark:from-[#0055A5] dark:to-[#38BDF8] h-full rounded-full" />
              <div style={{ width: `${100 - ownPercentage}%` }} className="bg-amber-500 h-full rounded-full" />
            </div>
          </div>
        </div>

        {/* Card 2: Disponibles en Bodega */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="gov-card relative p-5 sm:p-6 space-y-4 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group border-t-2 border-t-emerald-600 dark:border-t-emerald-400 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors" />

          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-[#063323] text-emerald-700 dark:text-emerald-300 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs border border-emerald-200 dark:border-emerald-500/40">
              <Laptop className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-700/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              En Bodega
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {inWarehouseCount}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
              Listos para entrega y asignación
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/80 flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {warehousePercentage}% disponible
            </span>
            <span className="text-[#003B70] dark:text-[#38BDF8] group-hover:underline transition-colors flex items-center gap-0.5 font-bold">
              Ver lista <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 3: Activos Asignados */}
        <div 
          onClick={() => onNavigate('assignments')}
          className="gov-card relative p-5 sm:p-6 space-y-4 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group border-t-2 border-t-blue-600 dark:border-t-cyan-400 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-cyan-500/10 transition-colors" />

          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-[#0B3047] text-blue-700 dark:text-[#38BDF8] flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs border border-blue-200 dark:border-cyan-500/40">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] font-bold border border-blue-200 dark:border-[#1E4B8A]">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-[#38BDF8]" />
              Operativos
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {assignedCount}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
              Equipos con funcionario a cargo
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
            <span className="text-slate-600 dark:text-slate-300">
              {maintenanceCount > 0 ? `${maintenanceCount} en mantención` : '0 en servicio'}
            </span>
            <span className="text-[#003B70] dark:text-[#38BDF8] group-hover:underline flex items-center gap-0.5 font-bold">
              Actas <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

        {/* Card 4: Contratos de Arriendo & Vencimientos */}
        <div 
          onClick={() => onNavigate('settings')}
          className="gov-card relative p-5 sm:p-6 space-y-4 cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-200 group border-t-2 border-t-amber-500 dark:border-t-amber-400 overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-colors" />

          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs border ${
              expiringContracts.length > 0 
                ? 'bg-amber-50 dark:bg-[#352008] text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/40' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}>
              <Clock className="w-6 h-6" />
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold border ${
              expiringContracts.length > 0 
                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/60' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${expiringContracts.length > 0 ? 'bg-amber-500 animate-ping' : 'bg-slate-400'}`} />
              {expiringContracts.length > 0 ? 'Atención' : 'Al Día'}
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-mono font-black text-slate-900 dark:text-white tracking-tight">
              {expiringContracts.length}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium mt-1">
              {expiringContracts.length > 0 ? 'Arriendos por vencer (<60 días)' : 'Todos los contratos vigentes'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
            <span className={expiringContracts.length > 0 ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-600 dark:text-slate-300'}>
              {contracts.length} contratos totales
            </span>
            <span className="text-[#003B70] dark:text-[#38BDF8] group-hover:underline flex items-center gap-0.5 font-bold">
              Ver contratos <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>

      </div>

      {/* 3. ACCESOS DIRECTOS OPERATIVOS (QUICK TILES) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        <div
          onClick={() => onNavigate('assignments')}
          className="gov-card p-4 flex items-center justify-between gap-3.5 cursor-pointer hover:border-[#003B70] dark:hover:border-[#38BDF8] hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#003B70] to-[#0055A5] text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-[#003B70]/30 border border-[#38BDF8]/30">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#003B70] dark:group-hover:text-[#38BDF8] transition-colors">Asignar Equipos</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">Generar acta oficial</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-[#003B70] dark:group-hover:text-[#38BDF8] group-hover:translate-x-1 transition-all shrink-0" />
        </div>

        <div
          onClick={() => onNavigate('reception')}
          className="gov-card p-4 flex items-center justify-between gap-3.5 cursor-pointer hover:border-emerald-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-700 to-emerald-500 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-emerald-900/30 border border-emerald-400/30">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors">Recepción OC</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">Ingreso de hardware</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 group-hover:translate-x-1 transition-all shrink-0" />
        </div>

        <div
          onClick={() => onNavigate('consumables')}
          className="gov-card p-4 flex items-center justify-between gap-3.5 cursor-pointer hover:border-purple-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-700 to-indigo-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-purple-900/30 border border-purple-400/30">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">Insumos y Stock</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">Bodega de repuestos</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-purple-600 dark:group-hover:text-purple-300 group-hover:translate-x-1 transition-all shrink-0" />
        </div>

        <div
          onClick={() => onNavigate('directory')}
          className="gov-card p-4 flex items-center justify-between gap-3.5 cursor-pointer hover:border-cyan-500 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group relative overflow-hidden"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0055A5] to-cyan-600 text-white flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-md shadow-cyan-900/30 border border-cyan-400/30">
              <Users2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">Directorio AD</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">3400+ Funcionarios</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 group-hover:translate-x-1 transition-all shrink-0" />
        </div>

      </div>

      {/* 4. SECCIÓN CENTRAL: DISTRIBUCIÓN DE HARDWARE & ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribución por Tipo de Hardware */}
        <div className="gov-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#1E3352]/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#EBF3FA] dark:bg-[#002A50] text-[#003B70] dark:text-[#38BDF8] flex items-center justify-center border border-[#BFDBFE] dark:border-[#38BDF8]/40 shadow-xs">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Distribución por Tipo de Hardware</h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Composición del inventario informático</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-[#0C1729] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1E3352]">
              {Object.keys(typesDistribution).length} Tipologías
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {Object.keys(typesDistribution).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No hay activos registrados en esta bodega.</p>
            ) : (
              Object.entries(typesDistribution).map(([typeName, count], idx) => {
                const percentage = Math.round((count / (totalAssets || 1)) * 100);
                const IconComponent = getHardwareIcon(typeName);
                const colorGradients = [
                  'bg-gradient-to-r from-[#003B70] to-[#0055A5] dark:from-[#0055A5] dark:to-[#38BDF8]',
                  'bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-emerald-600 dark:to-emerald-400',
                  'bg-gradient-to-r from-indigo-600 to-blue-400 dark:from-indigo-500 dark:to-cyan-400',
                  'bg-gradient-to-r from-amber-600 to-amber-400 dark:from-amber-500 dark:to-amber-300',
                  'bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-500 dark:to-pink-400',
                  'bg-gradient-to-r from-cyan-600 to-teal-400 dark:from-cyan-500 dark:to-teal-300'
                ];
                const barColor = colorGradients[idx % colorGradients.length];

                return (
                  <div key={typeName} className="space-y-1.5 group">
                    <div className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComponent className="w-4 h-4 text-slate-500 dark:text-[#38BDF8] shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{typeName}</span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 dark:text-white shrink-0 ml-2">
                        {count} un. <span className="text-[#003B70] dark:text-[#38BDF8] font-bold">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-[#080F1D] rounded-full overflow-hidden border border-slate-200 dark:border-[#1E3352]">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500 shadow-xs`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Alertas Críticas: Arriendos y Stock */}
        <div className="gov-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#1E3352]/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/80 text-[#E4002B] dark:text-[#F87171] flex items-center justify-center border border-red-200 dark:border-red-700/60 shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Alertas de Stock & Vencimientos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Notificaciones prioritarias para gestión de bodega</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-[#F87171] border border-red-200 dark:border-red-700/60">
              {expiringContracts.length + criticalStockItems.length} Alertas
            </span>
          </div>

          <div className="space-y-2.5 pt-1 max-h-[340px] overflow-y-auto pr-1">
            {expiringContracts.length === 0 && criticalStockItems.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 dark:text-emerald-400" />
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Inventario y Contratos al Día</p>
                <p className="text-xs text-slate-500">No se detectan alertas críticas de stock ni arriendos próximos a vencer.</p>
              </div>
            ) : (
              <>
                {/* Contratos por vencer */}
                {expiringContracts.map(c => (
                  <div 
                    key={c.id} 
                    onClick={() => onNavigate('settings')}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D182B] hover:bg-slate-100 dark:hover:bg-[#14233C] border border-slate-200 dark:border-[#1E3352] hover:border-amber-500/50 flex items-center justify-between gap-3 text-xs transition-all duration-200 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">{c.contractNumber}</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">({c.supplierName})</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5 font-medium truncate">{c.name}</p>
                      <div className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>Vence: <strong className="text-amber-700 dark:text-amber-300">{formatDate(c.endDate)}</strong></span>
                        <span>•</span>
                        <span>{c.linkedAssetsCount} equipos</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-700/60 shadow-xs inline-block">
                        {c.daysLeft} días
                      </span>
                    </div>
                  </div>
                ))}

                {/* Insumos bajo stock */}
                {criticalStockItems.map((item: any) => (
                  <div 
                    key={item.id} 
                    onClick={() => onNavigate('consumables')}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D182B] hover:bg-slate-100 dark:hover:bg-[#14233C] border border-slate-200 dark:border-[#1E3352] hover:border-red-500/50 flex items-center justify-between gap-3 text-xs transition-all duration-200 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-[#E4002B] dark:group-hover:text-[#F87171] transition-colors truncate">{item.consumableName}</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0C1729] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1E3352] font-semibold shrink-0">
                          {item.sku}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-1 truncate">{item.branchName}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-bold text-[#E4002B] dark:text-[#F87171] text-sm">{item.currentQuantity} un. disp.</div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Mín: {item.minAlert} un.</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

      </div>

      {/* 5. SECCIÓN INFERIOR: HISTORIAL DE TRAZABILIDAD & AUDITORÍA RECIENTE */}
      <div className="gov-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-[#1E3352]/80">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Actividad y Trazabilidad Reciente</h3>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">Registro inmutable de movimientos, asignaciones y cambios de estado</p>
          </div>

          <button
            onClick={() => onNavigate('traceability')}
            className="text-xs sm:text-sm text-[#003B70] dark:text-[#38BDF8] hover:text-[#002A50] dark:hover:text-white font-bold flex items-center gap-1 hover:underline transition-colors"
          >
            Ver Trazabilidad & Kardex Completo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No hay registros recientes de trazabilidad.</p>
          ) : (
            auditLogs.map((log: any) => (
              <div 
                key={log.id} 
                onClick={() => onNavigate('traceability')}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D182B] hover:bg-slate-100 dark:hover:bg-[#14233C] border border-slate-200 dark:border-[#1E3352] hover:border-[#003B70]/40 dark:hover:border-[#38BDF8]/40 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm cursor-pointer group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-3 h-3 rounded-full bg-[#003B70] dark:bg-[#38BDF8] shrink-0 shadow-xs group-hover:scale-125 transition-transform" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span className="group-hover:text-[#003B70] dark:group-hover:text-[#38BDF8] transition-colors">Serie: {log.serialNumber}</span>
                      {log.inventoryNumber && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#EBF3FA] dark:bg-[#0C2447] text-[#003B70] dark:text-[#60A5FA] font-bold border border-[#BFDBFE] dark:border-[#1E4B8A]">
                          Inv: {log.inventoryNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 truncate">{log.changeReason}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1.5 shrink-0">
                  <StatusBadge status={log.newStatus} />
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatDate(log.timestamp)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
