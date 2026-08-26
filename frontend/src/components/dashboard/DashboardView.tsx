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
  CheckCircle2
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('itam_storage_updated', loadData);
    return () => window.removeEventListener('itam_storage_updated', loadData);
  }, [currentBranchId]);

  // Cálculos de Métricas
  const totalAssets = assets.length;
  const ownAssetsCount = assets.filter(a => a.propertyType === 'PROPIO').length;
  const leasingAssetsCount = assets.filter(a => a.propertyType === 'ARRIENDO').length;
  const inWarehouseCount = assets.filter(a => a.status === 'BODEGA_DISPONIBLE').length;
  const assignedCount = assets.filter(a => a.status === 'ASIGNADO').length;
  const maintenanceCount = assets.filter(a => a.status === 'EN_MANTENCION').length;

  const ownPercentage = totalAssets > 0 ? Math.round((ownAssetsCount / totalAssets) * 100) : 0;
  const warehousePercentage = totalAssets > 0 ? Math.round((inWarehouseCount / totalAssets) * 100) : 0;

  // Alertas de Arriendos por Vencer (< 60 días)
  const expiringContracts = contracts.map(c => {
    const daysLeft = getDaysUntil(c.endDate);
    const linkedAssets = assets.filter(a => a.leasingContractId === c.id);
    return { ...c, daysLeft, linkedAssetsCount: linkedAssets.length };
  }).filter(c => c.daysLeft !== null && c.daysLeft <= 60);

  // Alertas de Stock Crítico en Consumibles
  const criticalStockItems = consumableStocks.map(stk => {
    const consumable = consumables.find(c => c.id === stk.consumableId);
    if (!consumable) return null;
    const isCritical = stk.currentQuantity <= consumable.minStockAlert;
    return {
      ...stk,
      consumableName: consumable.name,
      sku: consumable.sku,
      minAlert: consumable.minStockAlert,
      isCritical
    };
  }).filter(item => item && item.isCritical);

  // Distribución por Tipo de Dispositivo
  const typesDistribution = assets.reduce((acc: Record<string, number>, asset) => {
    const type = asset.assetTypeName || 'Otros Equipos';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const currentBranchName = currentBranchId === 'ALL' 
    ? 'Todas las Sucursales y Bodegas (Nivel Nacional)' 
    : (branches.find(b => b.id === currentBranchId)?.name || 'Sucursal Seleccionada');

  const handleExportExcel = () => {
    ExcelService.exportAssetsToExcel(assets);
  };

  const todayFormatted = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  const capitalizedToday = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      
      {/* 1. BANNER EJECUTIVO DE BIENVENIDA & ACCIONES RÁPIDAS */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#003B70] via-[#004A8F] to-[#002A50] text-white p-6 sm:p-8 shadow-gov-card border border-blue-900/30">
        {/* Adorno visual sutil de fondo */}
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 w-60 h-60 rounded-full bg-[#E4002B]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-semibold backdrop-blur-xs border border-white/15">
                <Calendar className="w-3.5 h-3.5 text-blue-200" />
                {capitalizedToday}
              </span>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-400/20 text-blue-100 text-xs font-bold border border-blue-300/20">
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
                {currentBranchName}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Panel de Control ITAM
            </h1>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl leading-relaxed">
              Monitoreo centralizado del parque informático, trazabilidad de hardware propio y arriendo, stock de insumos y actas institucionales.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 shadow-sm transition-all active:scale-[0.98]"
            >
              <Download className="w-4 h-4 text-blue-200" />
              <span>Exportar Excel</span>
            </button>

            <button
              onClick={() => onNavigate('reception')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-[#003B70] bg-white hover:bg-slate-100 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-[#003B70]" />
              <span>Recepción Guía</span>
            </button>

            <button
              onClick={() => onNavigate('assignments')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#E4002B] hover:bg-[#C20024] shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
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
          className="gov-card p-5 sm:p-6 space-y-3 cursor-pointer hover:shadow-gov-card hover:-translate-y-0.5 transition-all group border-l-4 border-l-[#003B70] dark:border-l-[#38BDF8]"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-[#102444] text-[#003B70] dark:text-[#38BDF8] flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs border border-blue-200 dark:border-[#1E3D6B]">
              <Boxes className="w-6 h-6" />
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-[#0C2447] text-[#003B70] dark:text-[#60A5FA] font-bold border border-blue-200 dark:border-[#1E4B8A]">
              Total Activos
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {totalAssets}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Parque tecnológico registrado
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/60 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex justify-between font-semibold">
              <span className="text-[#003B70] dark:text-[#38BDF8]">Propios: {ownAssetsCount} ({ownPercentage}%)</span>
              <span className="text-slate-500 dark:text-slate-400">Arriendo: {leasingAssetsCount}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 dark:bg-[#0C1729] rounded-full overflow-hidden flex">
              <div style={{ width: `${ownPercentage}%` }} className="bg-[#003B70] dark:bg-[#0055A5] h-full" />
              <div style={{ width: `${100 - ownPercentage}%` }} className="bg-amber-500 h-full" />
            </div>
          </div>
        </div>

        {/* Card 2: Disponibles en Bodega */}
        <div 
          onClick={() => onNavigate('inventory')}
          className="gov-card p-5 sm:p-6 space-y-3 cursor-pointer hover:shadow-gov-card hover:-translate-y-0.5 transition-all group border-l-4 border-l-emerald-500"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs border border-emerald-200 dark:border-emerald-700/60">
              <Laptop className="w-6 h-6" />
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-700/60">
              En Bodega
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {inWarehouseCount}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Listos para entrega y asignación
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/60 flex items-center justify-between text-xs font-semibold">
            <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {warehousePercentage}% disponible
            </span>
            <span className="text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors flex items-center gap-0.5">
              Ver lista <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 3: Activos Asignados */}
        <div 
          onClick={() => onNavigate('assignments')}
          className="gov-card p-5 sm:p-6 space-y-3 cursor-pointer hover:shadow-gov-card hover:-translate-y-0.5 transition-all group border-l-4 border-l-blue-500"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-indigo-950/80 text-blue-700 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs border border-blue-200 dark:border-indigo-700/60">
              <FileCheck2 className="w-6 h-6" />
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 dark:bg-indigo-950/80 text-blue-800 dark:text-indigo-300 font-bold border border-blue-200 dark:border-indigo-700/60">
              Operativos
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {assignedCount}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Equipos con funcionario a cargo
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
            <span className="text-slate-500 dark:text-slate-400">
              {maintenanceCount > 0 ? `${maintenanceCount} en mantención técnica` : '0 en servicio técnico'}
            </span>
            <span className="text-[#003B70] dark:text-[#38BDF8] group-hover:underline flex items-center gap-0.5">
              Actas <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

        {/* Card 4: Contratos de Arriendo & Vencimientos */}
        <div 
          onClick={() => onNavigate('settings')}
          className={`gov-card p-5 sm:p-6 space-y-3 cursor-pointer hover:shadow-gov-card hover:-translate-y-0.5 transition-all group border-l-4 ${
            expiringContracts.length > 0 ? 'border-l-amber-500' : 'border-l-slate-400 dark:border-l-slate-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs border ${
              expiringContracts.length > 0 
                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-700/60' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}>
              <Clock className="w-6 h-6" />
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
              expiringContracts.length > 0 
                ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-700/60' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}>
              {expiringContracts.length > 0 ? 'Atención' : 'Al Día'}
            </span>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {expiringContracts.length}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {expiringContracts.length > 0 ? 'Arriendos por vencer (<60 días)' : 'Todos los contratos vigentes'}
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-[#1E3352]/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 font-semibold">
            <span className={expiringContracts.length > 0 ? 'text-amber-700 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'}>
              {contracts.length} contratos totales
            </span>
            <span className="text-[#003B70] dark:text-[#38BDF8] group-hover:underline flex items-center gap-0.5">
              Ver contratos <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>

      </div>

      {/* 3. ACCESOS DIRECTOS OPERATIVOS (QUICK TILES) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        
        <div
          onClick={() => onNavigate('assignments')}
          className="gov-card p-4 flex items-center gap-3 cursor-pointer hover:border-[#003B70] dark:hover:border-[#38BDF8] hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#102444] text-[#003B70] dark:text-[#38BDF8] flex items-center justify-center shrink-0 group-hover:bg-[#003B70] group-hover:text-white transition-colors border border-blue-200 dark:border-[#1E3D6B]">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">Asignar Equipos</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Generar acta oficial</p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('reception')}
          className="gov-card p-4 flex items-center gap-3 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:bg-emerald-700 group-hover:text-white transition-colors border border-emerald-200 dark:border-emerald-700/60">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">Recepción OC</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Ingreso de hardware</p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('consumables')}
          className="gov-card p-4 flex items-center gap-3 cursor-pointer hover:border-purple-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:bg-purple-700 group-hover:text-white transition-colors border border-purple-200 dark:border-purple-700/60">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">Insumos y Stock</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Bodega de repuestos</p>
          </div>
        </div>

        <div
          onClick={() => onNavigate('directory')}
          className="gov-card p-4 flex items-center gap-3 cursor-pointer hover:border-cyan-500 hover:shadow-md transition-all group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-400 flex items-center justify-center shrink-0 group-hover:bg-cyan-700 group-hover:text-white transition-colors border border-cyan-200 dark:border-cyan-700/60">
            <Users2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-white truncate">Directorio AD</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">3400+ Funcionarios</p>
          </div>
        </div>

      </div>

      {/* 4. SECCIÓN CENTRAL: DISTRIBUCIÓN DE HARDWARE & ALERTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Distribución por Tipo de Hardware */}
        <div className="gov-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#1E3352]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-[#102444] text-[#003B70] dark:text-[#38BDF8] flex items-center justify-center border border-blue-200 dark:border-[#1E3D6B]">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Distribución por Tipo de Hardware</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Composición del inventario informático</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-[#0C1729] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352]">
              {Object.keys(typesDistribution).length} Tipologías
            </span>
          </div>

          <div className="space-y-3.5 pt-1">
            {Object.keys(typesDistribution).length === 0 ? (
              <p className="text-sm text-slate-400 py-6 text-center">No hay activos registrados en esta bodega.</p>
            ) : (
              Object.entries(typesDistribution).map(([typeName, count], idx) => {
                const percentage = Math.round((count / (totalAssets || 1)) * 100);
                const colorPalette = [
                  'bg-[#003B70] dark:bg-[#38BDF8]',
                  'bg-emerald-500',
                  'bg-indigo-500',
                  'bg-amber-500',
                  'bg-purple-500',
                  'bg-cyan-500'
                ];
                const barColor = colorPalette[idx % colorPalette.length];

                return (
                  <div key={typeName} className="space-y-1.5">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{typeName}</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{count} un. <span className="text-slate-500 dark:text-slate-400 font-normal">({percentage}%)</span></span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-[#0C1729] rounded-full overflow-hidden border border-slate-200 dark:border-[#1E3352]/40">
                      <div
                        className={`h-full ${barColor} rounded-full transition-all duration-500`}
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
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-[#1E3352]/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/80 text-[#E4002B] dark:text-[#F87171] flex items-center justify-center border border-red-200 dark:border-red-700/60">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Alertas de Stock & Vencimientos</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Notificaciones prioritarias para gestión de bodega</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-[#F87171] border border-red-200 dark:border-red-700/60">
              {expiringContracts.length + criticalStockItems.length} Alertas
            </span>
          </div>

          <div className="space-y-3 pt-1">
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
                  <div key={c.id} className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{c.contractNumber}</span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">({c.supplierName})</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">{c.name}</p>
                      <div className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                        <span>Vence: <strong className="text-amber-800 dark:text-amber-300">{formatDate(c.endDate)}</strong></span>
                        <span>•</span>
                        <span>{c.linkedAssetsCount} equipos asociados</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-300 font-bold border border-amber-300 dark:border-amber-600/70">
                        {c.daysLeft} días
                      </span>
                    </div>
                  </div>
                ))}

                {/* Insumos bajo stock */}
                {criticalStockItems.map((item: any) => (
                  <div key={item.id} className="p-3.5 rounded-xl bg-red-50/70 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{item.consumableName}</span>
                        <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#0C1729] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#1E3352] font-semibold">
                          {item.sku}
                        </span>
                      </div>
                      <p className="text-slate-500 dark:text-slate-400 mt-1">{item.branchName}</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100 dark:border-[#1E3352]/60">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Actividad y Trazabilidad Reciente</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Registro inmutable de movimientos, asignaciones y cambios de estado</p>
          </div>

          <button
            onClick={() => onNavigate('traceability')}
            className="text-xs sm:text-sm text-[#003B70] dark:text-[#38BDF8] hover:text-[#002A50] dark:hover:text-white font-bold flex items-center gap-1 hover:underline"
          >
            Ver Trazabilidad & Kardex Completo <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No hay registros recientes de trazabilidad.</p>
          ) : (
            auditLogs.map((log: any) => (
              <div 
                key={log.id} 
                onClick={() => onNavigate('traceability')}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0D182B] hover:bg-slate-100 dark:hover:bg-[#14233C] border border-slate-200 dark:border-[#1E3352] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#003B70] dark:bg-[#38BDF8] shrink-0 shadow-xs" />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Serie: {log.serialNumber}</span>
                      {log.inventoryNumber && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-100 dark:bg-[#0C2447] text-blue-800 dark:text-[#60A5FA] font-bold border border-blue-200 dark:border-[#1E4B8A]">
                          Inv: {log.inventoryNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{log.changeReason}</p>
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
