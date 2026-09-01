import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Crown, 
  Medal, 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Laptop, 
  Monitor, 
  Printer, 
  Boxes, 
  Layers, 
  Sparkles, 
  TrendingUp, 
  Users, 
  FileCheck2, 
  ChevronRight, 
  RefreshCw, 
  MousePointer, 
  Network, 
  HardDrive, 
  Server, 
  Info,
  Clock,
  ArrowUpRight,
  Package
} from 'lucide-react';
import { ApiClient } from '../../api/client';
import { PDFService } from '../../services/pdfService';
import { 
  DateRangePreset, 
  DeliveredItemTypeFilter, 
  TopDeliveredResponse, 
  TopDeliveredProduct 
} from '../../types/dashboard';
import { formatDate } from '../../utils/formatters';

interface TopDeliveredCardProps {
  currentBranchId: string;
  currentBranchName?: string;
  onNavigate?: (module: string) => void;
}

export const TopDeliveredCard: React.FC<TopDeliveredCardProps> = ({ 
  currentBranchId, 
  currentBranchName = 'Todas las Sucursales',
  onNavigate 
}) => {
  const [preset, setPreset] = useState<DateRangePreset>('30D');
  const [itemTypeFilter, setItemTypeFilter] = useState<DeliveredItemTypeFilter>('ALL');
  
  // Fechas personalizadas
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  }, []);

  const [customStartDate, setCustomStartDate] = useState<string>(thirtyDaysAgoStr);
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);

  const [data, setData] = useState<TopDeliveredResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Calcular fechas de inicio y fin según el preset seleccionado
  const dateRange = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (preset === 'CUSTOM') {
      return {
        startDate: customStartDate ? `${customStartDate}T00:00:00.000Z` : null,
        endDate: customEndDate ? `${customEndDate}T23:59:59.999Z` : null,
        label: `Personalizado: ${formatDate(customStartDate)} al ${formatDate(customEndDate)}`
      };
    }

    if (preset === '7D') {
      const start = new Date(today);
      start.setDate(start.getDate() - 7);
      return {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        label: `Últimos 7 días (${formatDate(start.toISOString())} - ${formatDate(now.toISOString())})`
      };
    }

    if (preset === '30D') {
      const start = new Date(today);
      start.setDate(start.getDate() - 30);
      return {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        label: `Últimos 30 días (${formatDate(start.toISOString())} - ${formatDate(now.toISOString())})`
      };
    }

    if (preset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        label: `Este Mes (${new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(now)})`
      };
    }

    if (preset === '3M') {
      const start = new Date(today);
      start.setDate(start.getDate() - 90);
      return {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        label: `Últimos 3 meses (${formatDate(start.toISOString())} - ${formatDate(now.toISOString())})`
      };
    }

    if (preset === 'THIS_YEAR') {
      const start = new Date(now.getFullYear(), 0, 1);
      return {
        startDate: start.toISOString(),
        endDate: now.toISOString(),
        label: `Año ${now.getFullYear()} (Ene - ${new Intl.DateTimeFormat('es-CL', { month: 'short' }).format(now)})`
      };
    }

    // ALL (Histórico)
    return {
      startDate: null,
      endDate: null,
      label: 'Todo el Histórico Registrado'
    };
  }, [preset, customStartDate, customEndDate]);

  // Cargar datos
  const loadTopDelivered = async () => {
    try {
      setLoading(true);
      const res = await ApiClient.getTopDeliveredProducts({
        startDate: dateRange.startDate || undefined,
        endDate: dateRange.endDate || undefined,
        branchId: currentBranchId,
        itemType: itemTypeFilter
      });
      setData(res);
    } catch (e) {
      console.error('Error cargando top productos entregados:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopDelivered();
  }, [currentBranchId, dateRange.startDate, dateRange.endDate, itemTypeFilter]);

  // Obtener etiqueta legible del filtro de tipo
  const filterTypeLabel = useMemo(() => {
    if (itemTypeFilter === 'HARDWARE') return 'Solo Equipos TI (Hardware Serializado)';
    if (itemTypeFilter === 'CONSUMABLE') return 'Solo Insumos y Periféricos';
    return 'Todos los Productos (Hardware + Insumos)';
  }, [itemTypeFilter]);

  // Manejar exportación a PDF
  const handleExportPDF = async () => {
    if (!data) return;
    try {
      setExportingPdf(true);
      await PDFService.openTopDeliveredProductsPDFInNewWindow({
        reportData: data,
        periodLabel: dateRange.label,
        filterTypeLabel,
        generatedByName: 'Administrador ITAM ChileAtiende'
      });
    } catch (err) {
      console.error('Error al exportar PDF del top de productos:', err);
    } finally {
      setExportingPdf(false);
    }
  };

  // Icono contextual por nombre o categoría
  const getProductIcon = (item: TopDeliveredProduct) => {
    const text = `${item.name} ${item.category}`.toLowerCase();
    if (text.includes('notebook') || text.includes('laptop')) return Laptop;
    if (text.includes('monitor') || text.includes('pantalla') || text.includes('aio') || text.includes('all-in-one') || text.includes('desktop')) return Monitor;
    if (text.includes('impresora') || text.includes('termica') || text.includes('scanner') || text.includes('laser')) return Printer;
    if (text.includes('mouse') || text.includes('raton') || text.includes('teclado') || text.includes('pad')) return MousePointer;
    if (text.includes('switch') || text.includes('router') || text.includes('cable') || text.includes('patch') || text.includes('red')) return Network;
    if (text.includes('disco') || text.includes('ssd') || text.includes('memoria') || text.includes('ram')) return HardDrive;
    if (text.includes('servidor') || text.includes('server') || text.includes('rack')) return Server;
    if (item.itemType === 'CONSUMABLE') return Layers;
    return Boxes;
  };

  const topItems = data?.items || [];
  const maxQty = topItems.length > 0 ? Math.max(...topItems.map(i => i.quantity), 1) : 1;

  // Estilos y badges para cada posición
  const getRankBadgeStyle = (pos: number) => {
    switch (pos) {
      case 1:
        return {
          badgeBg: 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white shadow-md shadow-amber-500/30 border border-amber-300',
          iconColor: 'text-amber-500',
          borderColor: 'border-amber-400/40 dark:border-amber-500/30',
          highlightBg: 'bg-amber-500/5 dark:bg-amber-500/10',
          barGradient: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400',
          crown: true
        };
      case 2:
        return {
          badgeBg: 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white shadow-md shadow-slate-500/20 border border-slate-200',
          iconColor: 'text-slate-400',
          borderColor: 'border-slate-300/40 dark:border-slate-600/30',
          highlightBg: 'bg-slate-500/5 dark:bg-slate-500/10',
          barGradient: 'bg-gradient-to-r from-slate-400 to-slate-500',
          crown: false
        };
      case 3:
        return {
          badgeBg: 'bg-gradient-to-br from-amber-700 via-amber-800 to-amber-900 text-amber-100 shadow-md shadow-amber-900/20 border border-amber-600',
          iconColor: 'text-amber-700',
          borderColor: 'border-amber-700/40 dark:border-amber-800/30',
          highlightBg: 'bg-amber-800/5 dark:bg-amber-800/10',
          barGradient: 'bg-gradient-to-r from-amber-700 to-amber-800',
          crown: false
        };
      case 4:
        return {
          badgeBg: 'bg-gradient-to-br from-[#003B70] to-[#0055A5] text-white shadow-md shadow-[#003B70]/20 border border-blue-400/30',
          iconColor: 'text-[#003B70] dark:text-[#38BDF8]',
          borderColor: 'border-blue-500/20 dark:border-blue-500/30',
          highlightBg: 'bg-blue-500/5 dark:bg-blue-500/10',
          barGradient: 'bg-gradient-to-r from-[#003B70] to-[#0055A5]',
          crown: false
        };
      default:
        return {
          badgeBg: 'bg-gradient-to-br from-purple-700 to-indigo-800 text-white shadow-md shadow-purple-900/20 border border-purple-400/30',
          iconColor: 'text-purple-600 dark:text-purple-400',
          borderColor: 'border-purple-500/20 dark:border-purple-500/30',
          highlightBg: 'bg-purple-500/5 dark:bg-purple-500/10',
          barGradient: 'bg-gradient-to-r from-purple-700 to-indigo-700',
          crown: false
        };
    }
  };

  return (
    <div className="gov-card p-5 sm:p-7 space-y-6 relative overflow-hidden border-t-4 border-t-[#003B70] dark:border-t-[#38BDF8] shadow-xl">
      
      {/* 1. CABECERA PRINCIPAL: TÍTULO, BADGE DE TIEMPO REAL & BOTÓN EXPORTAR PDF */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3352]/80">
        
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#002244] via-[#003B70] to-[#0A1A30] text-white flex items-center justify-center shadow-lg shadow-[#003B70]/25 border border-[#38BDF8]/30 shrink-0">
            <Trophy className="w-6 h-6 text-[#38BDF8]" />
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Top 5 Productos Más Entregados
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Dinámico
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-300 font-medium">
              Ranking dinámico de asignaciones y entregas a funcionarios con respaldo de actas oficiales
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={loadTopDelivered}
            disabled={loading}
            title="Refrescar estadísticas"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1E3352] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#14233C] transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#003B70] dark:text-[#38BDF8]' : ''}`} />
          </button>

          <button
            onClick={handleExportPDF}
            disabled={exportingPdf || loading || topItems.length === 0}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#003B70] via-[#0055A5] to-[#0A1A30] hover:from-[#002B52] hover:to-[#003B70] shadow-md hover:shadow-lg hover:shadow-[#003B70]/30 border border-[#38BDF8]/40 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportingPdf ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#38BDF8]" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-[#38BDF8]" />
                <span>Exportar PDF Gráfico</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* 2. BARRA DE CONTROL Y FILTROS: PRESETS DE FECHA & SELECTOR DE TIPO */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3352] space-y-3.5">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Presets Rápidos de Fecha */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#003B70] dark:text-[#38BDF8]" />
              Rango:
            </span>

            {[
              { id: '7D', label: '7 Días' },
              { id: '30D', label: '30 Días' },
              { id: 'THIS_MONTH', label: 'Este Mes' },
              { id: '3M', label: '3 Meses' },
              { id: 'THIS_YEAR', label: 'Este Año' },
              { id: 'ALL', label: 'Histórico' },
              { id: 'CUSTOM', label: 'Personalizado...' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id as DateRangePreset)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                  preset === p.id
                    ? 'bg-[#003B70] text-white shadow-xs dark:bg-[#38BDF8] dark:text-slate-950 scale-105'
                    : 'bg-white dark:bg-[#0F1D33] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1A2D4C] border border-slate-200 dark:border-[#1E3352]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Filtro por Tipo de Ítem */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#003B70] dark:text-[#38BDF8]" />
              Tipo:
            </span>

            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'HARDWARE', label: 'Equipos TI' },
              { id: 'CONSUMABLE', label: 'Insumos' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setItemTypeFilter(t.id as DeliveredItemTypeFilter)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-150 ${
                  itemTypeFilter === t.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-[#0F1D33] text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#1A2D4C] border border-slate-200 dark:border-[#1E3352]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

        </div>

        {/* Inputs de Fechas si el usuario selecciona "Personalizado" */}
        {preset === 'CUSTOM' && (
          <div className="pt-3 border-t border-slate-200 dark:border-[#1E3352] flex flex-wrap items-center gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Desde:</label>
              <input
                type="date"
                value={customStartDate}
                max={customEndDate || todayStr}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0F1D33] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003B70] dark:focus:ring-[#38BDF8] outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Hasta:</label>
              <input
                type="date"
                value={customEndDate}
                min={customStartDate}
                max={todayStr}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-slate-300 dark:border-[#1E3352] bg-white dark:bg-[#0F1D33] text-slate-900 dark:text-white focus:ring-2 focus:ring-[#003B70] dark:focus:ring-[#38BDF8] outline-none"
              />
            </div>

            <span className="text-xs text-slate-500 dark:text-slate-400 italic">
              {dateRange.label}
            </span>
          </div>
        )}

      </div>

      {/* 3. CÁPSULAS DE MÉTRICAS CLAVE (KPI RESUMEN) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3352] space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Unidades Entregadas</span>
            <Package className="w-4 h-4 text-[#003B70] dark:text-[#38BDF8]" />
          </div>
          <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
            {loading ? '...' : (data?.summary.totalDeliveredUnits || 0)} <span className="text-xs font-sans text-slate-500 font-bold">un.</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {dateRange.label}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3352] space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Actas Realizadas</span>
            <FileCheck2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
            {loading ? '...' : (data?.summary.totalAssignments || 0)} <span className="text-xs font-sans text-slate-500 font-bold">actas</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            Asignaciones validadas
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3352] space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Producto Líder</span>
            <Crown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white truncate" title={topItems[0]?.name || 'Sin datos'}>
            {loading ? '...' : (topItems[0]?.name || 'Sin registros')}
          </div>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
            {topItems[0] ? `${topItems[0].percentage}% de la demanda` : '0%'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1628] border border-slate-200 dark:border-[#1E3352] space-y-1">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <span>Diversidad de Ítems</span>
            <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
            {loading ? '...' : (data?.summary.uniqueProductsCount || 0)} <span className="text-xs font-sans text-slate-500 font-bold">modelos</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {currentBranchName}
          </p>
        </div>

      </div>

      {/* 4. LISTA PRINCIPAL DEL RANKING TOP 5 & DETALLE */}
      {loading ? (
        <div className="py-12 text-center space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-[#003B70] dark:text-[#38BDF8]" />
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Calculando estadísticas de productos más entregados...
          </p>
        </div>
      ) : topItems.length === 0 ? (
        <div className="py-12 px-4 rounded-2xl bg-slate-50 dark:bg-[#0A1628] border border-dashed border-slate-300 dark:border-[#1E3352] text-center space-y-3">
          <Boxes className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No se registran entregas en este período
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              No se encontraron actas de asignación de equipamiento ni insumos para el rango seleccionado en {currentBranchName}.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => setPreset('ALL')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#003B70] dark:text-[#38BDF8] bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors"
            >
              Ver Histórico Completo
            </button>
            <button
              onClick={() => setPreset('30D')}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-[#0F1D33] border border-slate-200 dark:border-[#1E3352] hover:bg-slate-100 transition-colors"
            >
              Ver Últimos 30 días
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {topItems.map((item) => {
            const style = getRankBadgeStyle(item.position);
            const IconComponent = getProductIcon(item);
            const isExpanded = expandedProductId === item.id;
            const progressPercentage = Math.round((item.quantity / maxQty) * 100);

            return (
              <div
                key={item.id || item.position}
                className={`p-4 rounded-2xl border transition-all duration-200 group ${style.borderColor} ${
                  item.position === 1 
                    ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-500/5 dark:to-transparent shadow-md' 
                    : 'bg-slate-50/70 dark:bg-[#0C192E] hover:bg-slate-100/80 dark:hover:bg-[#11233E]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  
                  {/* Lado Izquierdo: Insignia de Ranking, Icono, Nombre y Categoría */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    
                    {/* Badge de Posición */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${style.badgeBg} relative`}>
                      {style.crown && (
                        <Crown className="w-4 h-4 text-amber-200 absolute -top-2.5 -right-1.5 drop-shadow animate-bounce" />
                      )}
                      <span>#{item.position}</span>
                    </div>

                    {/* Icono del Dispositivo */}
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#080F1D] flex items-center justify-center shrink-0 border border-slate-200 dark:border-[#1E3352] text-slate-700 dark:text-slate-300 group-hover:scale-105 transition-transform shadow-2xs">
                      <IconComponent className="w-5 h-5" />
                    </div>

                    {/* Datos del Producto */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          item.itemType === 'HARDWARE'
                            ? 'bg-blue-50 dark:bg-[#0C2447] text-[#003B70] dark:text-[#60A5FA] border border-[#BFDBFE] dark:border-[#1E4B8A]'
                            : 'bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60'
                        }`}>
                          {item.itemType === 'HARDWARE' ? 'Hardware' : 'Insumo'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">{item.category}</span>
                        <span>•</span>
                        <span>{item.assignmentCount} actas asociadas</span>
                        {item.brand && item.brand !== 'Genérico' && (
                          <>
                            <span>•</span>
                            <span className="text-slate-600 dark:text-slate-300">Marca: {item.brand}</span>
                          </>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Lado Derecho: Contador Numérico, Porcentaje y Botón Expandir */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xl font-mono font-black text-slate-900 dark:text-white flex items-baseline sm:justify-end gap-1">
                        <span>{item.quantity}</span>
                        <span className="text-xs font-sans text-slate-500 font-bold">un.</span>
                      </div>
                      <div className="text-xs font-bold text-[#003B70] dark:text-[#38BDF8]">
                        {item.percentage}% del total
                      </div>
                    </div>

                    {item.recentRecipients && item.recentRecipients.length > 0 && (
                      <button
                        onClick={() => setExpandedProductId(isExpanded ? null : item.id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#1E3352] transition-colors"
                        title={isExpanded ? 'Ocultar entregas' : 'Ver funcionarios receptores'}
                      >
                        <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-[#003B70] dark:text-[#38BDF8]' : ''}`} />
                      </button>
                    )}
                  </div>

                </div>

                {/* Barra de Progreso Visual */}
                <div className="mt-3 space-y-1">
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-[#080F1D] rounded-full overflow-hidden border border-slate-200 dark:border-[#1E3352]">
                    <div
                      className={`h-full ${style.barGradient} rounded-full transition-all duration-700 ease-out shadow-xs`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                {/* Acordeón de Entregas Recientes a Funcionarios */}
                {isExpanded && item.recentRecipients && item.recentRecipients.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-[#1E3352] space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#003B70] dark:text-[#38BDF8]" />
                        Últimos funcionarios receptores de este producto:
                      </span>
                      {onNavigate && (
                        <button
                          onClick={() => onNavigate('assignments')}
                          className="text-[11px] text-[#003B70] dark:text-[#38BDF8] hover:underline flex items-center gap-0.5 font-bold"
                        >
                          Ir a Actas <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {item.recentRecipients.map((rec, idx) => (
                        <div 
                          key={idx}
                          className="p-2 rounded-lg bg-white dark:bg-[#080F1D] border border-slate-200 dark:border-[#1E3352] text-xs space-y-0.5"
                        >
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {rec.recipientName}
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="font-mono">{rec.actNumber}</span>
                            <span>{formatDate(rec.date)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* 5. PIE INFORMATIVO CON ACCESO RÁPIDO A TRAZABILIDAD */}
      <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <Info className="w-3.5 h-3.5 text-[#003B70] dark:text-[#38BDF8] shrink-0" />
          <span>Datos computados a partir de actas firmadas y asignaciones oficiales.</span>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('assignments')}
            className="text-xs font-bold text-[#003B70] dark:text-[#38BDF8] hover:text-[#002A50] dark:hover:text-white flex items-center gap-1 hover:underline transition-colors shrink-0"
          >
            Ver Historial Completo de Asignaciones <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </div>
  );
};
