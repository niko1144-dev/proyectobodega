import React, { useState, useEffect } from 'react';
import {
  Search,
  History,
  Laptop,
  Tv,
  Printer,
  Phone,
  Scan,
  Network,
  Cpu,
  HardDrive,
  User,
  Building2,
  Calendar,
  FileText,
  Download,
  Copy,
  Check,
  Clock,
  ArrowRight,
  ShieldCheck,
  Tag,
  AlertCircle,
  QrCode,
  FileCheck,
  RotateCcw,
  Wrench,
  Layers,
  ChevronRight,
  Sparkles,
  Filter,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { ApiClient } from '../../api/client';
import { Asset, AssetTraceabilityResponse, TimelineEvent, AssetAuditLog } from '../../types/asset';
import { Branch } from '../../types/document';
import { formatDate, formatDateTime, normalizeText } from '../../utils/formatters';
import { PropertyBadge, AssignmentStatusBadge } from '../common/Badge';
import { PDFService } from '../../services/pdfService';

interface TraceabilityViewProps {
  currentBranchId: string;
}

export const TraceabilityView: React.FC<TraceabilityViewProps> = ({ currentBranchId }) => {
  const [activeSubTab, setActiveSubTab] = useState<'LIFECYCLE' | 'GLOBAL_KARDEX'>('LIFECYCLE');
  
  // Búsqueda y Datos del Activo Seleccionado
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assetsList, setAssetsList] = useState<Asset[]>([]);
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [selectedAssetTrace, setSelectedAssetTrace] = useState<AssetTraceabilityResponse | null>(null);
  const [isLoadingAsset, setIsLoadingAsset] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedSerie, setCopiedSerie] = useState<boolean>(false);

  // Kardex Global
  const [auditLogs, setAuditLogs] = useState<AssetAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [kardexFilterBranch, setKardexFilterBranch] = useState<string>('ALL');
  const [kardexSearch, setKardexSearch] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [allAssets, allBranches, logs] = await Promise.all([
        ApiClient.getAssets(),
        ApiClient.getBranches(),
        ApiClient.getAuditLogs({ limit: 100 })
      ]);
      setAssetsList(allAssets);
      setBranches(allBranches);
      setAuditLogs(logs);

      // Si hay activos, auto-cargar el primero por defecto para una vista enriquecida
      if (allAssets.length > 0) {
        loadAssetTrace(allAssets[0].serialNumber);
      }
    } catch (err: any) {
      console.error('Error cargando datos iniciales:', err);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const norm = normalizeText(query);
    const matches = assetsList.filter(a => 
      normalizeText(a.serialNumber).includes(norm) ||
      (a.inventoryNumber && normalizeText(a.inventoryNumber).includes(norm)) ||
      normalizeText(a.brand).includes(norm) ||
      normalizeText(a.model).includes(norm) ||
      (a.assignedToUserName && normalizeText(a.assignedToUserName).includes(norm))
    ).slice(0, 8);

    setSearchResults(matches);
  };

  const loadAssetTrace = async (identifier: string) => {
    setIsLoadingAsset(true);
    setErrorMsg(null);
    setSearchResults([]);
    try {
      const res = await ApiClient.getAssetTraceability(identifier);
      setSelectedAssetTrace(res);
      setSearchQuery(res.asset.serialNumber);
      setActiveSubTab('LIFECYCLE');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se encontró el activo con la serie o número ingresado.');
      setSelectedAssetTrace(null);
    } finally {
      setIsLoadingAsset(false);
    }
  };

  const handleCopySerie = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSerie(true);
    setTimeout(() => setCopiedSerie(false), 2000);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'COMPUTO': return <Laptop className="w-5 h-5" />;
      case 'PANTALLAS': return <Tv className="w-5 h-5" />;
      case 'IMPRESION': return <Printer className="w-5 h-5" />;
      case 'PERIFERICOS_BIOMETRIA': return <Scan className="w-5 h-5" />;
      case 'REDES': return <Network className="w-5 h-5" />;
      default: return <Cpu className="w-5 h-5" />;
    }
  };

  const getTimelineEventBadge = (category: string) => {
    switch (category) {
      case 'INGRESO':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" /> };
      case 'ENTREGA':
        return { bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: <FileCheck className="w-4 h-4 text-[#003B70]" /> };
      case 'DEVOLUCION':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: <RotateCcw className="w-4 h-4 text-amber-600" /> };
      case 'MANTENCION':
        return { bg: 'bg-rose-100 text-rose-800 border-rose-300', icon: <Wrench className="w-4 h-4 text-[#E4002B]" /> };
      default:
        return { bg: 'bg-slate-100 text-slate-800 border-slate-300', icon: <Clock className="w-4 h-4 text-slate-500" /> };
    }
  };

  // Filtrado de logs para el Kardex Global
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchBranch = kardexFilterBranch === 'ALL' || log.branchName.toLowerCase().includes(kardexFilterBranch.toLowerCase());
    const norm = normalizeText(kardexSearch);
    const matchSearch = !norm || 
      normalizeText(log.serialNumber).includes(norm) ||
      (log.inventoryNumber && normalizeText(log.inventoryNumber).includes(norm)) ||
      normalizeText(log.changedByUserName).includes(norm) ||
      normalizeText(log.changeReason).includes(norm) ||
      normalizeText(log.branchName).includes(norm);

    return matchBranch && matchSearch;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#003B70] dark:text-white tracking-tight">Trazabilidad & Hoja de Vida TI</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-[#0C2447] text-[#003B70] dark:text-[#60A5FA] font-bold border border-blue-200 dark:border-[#1E4B8A]">
              Kardex Integral
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 font-medium">
            Historial de movimientos, ciclo de vida útil, custodias, actas y recepciones por número de serie
          </p>
        </div>

        {/* Pestañas de Vista */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#0D182B] border border-slate-200 dark:border-[#1E3352] rounded-lg p-1 shadow-2xs">
          <button
            onClick={() => setActiveSubTab('LIFECYCLE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'LIFECYCLE' ? 'bg-[#003B70] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Línea de Tiempo
          </button>
          <button
            onClick={() => setActiveSubTab('GLOBAL_KARDEX')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 ${
              activeSubTab === 'GLOBAL_KARDEX' ? 'bg-[#003B70] text-white shadow-2xs' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Kardex Global ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Buscador Destacado de Series */}
      <div className="gov-card p-4 sm:p-5 bg-gradient-to-r from-[#003B70] to-[#0A4D8C] text-white space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-blue-200 tracking-wider uppercase flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" /> Buscador Universal de Equipamiento
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              Consultar Historial Completo por N° de Serie o Inventario
            </h3>
          </div>

          <div className="text-[11px] text-blue-200 bg-white/10 px-3 py-1 rounded-lg border border-white/15">
            Parque total: <strong className="text-white">{assetsList.length} activos registrados</strong>
          </div>
        </div>

        {/* Input de Búsqueda con Dropdown en Vivo */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  loadAssetTrace(searchQuery.trim());
                }
              }}
              placeholder="Escriba o escanee Número de Serie (ej: PF3K89LM, PF4X221V), N° Inventario (ej: CA-NB-2026-00431) o Modelo..."
              className="w-full pl-10 pr-24 py-3 bg-white text-slate-900 placeholder:text-slate-400 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-inner"
            />
            <button
              type="button"
              onClick={() => searchQuery.trim() && loadAssetTrace(searchQuery.trim())}
              disabled={!searchQuery.trim() || isLoadingAsset}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#003B70] text-white hover:bg-[#002A50] rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {isLoadingAsset ? 'Buscando...' : 'Consultar'}
            </button>
          </div>

          {/* Autocompletado Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 divide-y divide-slate-100 max-h-60 overflow-y-auto">
              {searchResults.map(a => (
                <div
                  key={a.id}
                  onClick={() => loadAssetTrace(a.serialNumber)}
                  className="p-3 hover:bg-[#EBF3FA] cursor-pointer flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-[#003B70]">
                      {getCategoryIcon(a.category)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{a.brand} {a.model}</span>
                        <PropertyBadge type={a.propertyType} />
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Serie: <strong className="font-mono text-slate-700">{a.serialNumber}</strong> • {a.currentBranchName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
                      {a.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Acceso Rápido / Chips de Muestra */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-[11px] text-blue-200 font-medium">Búsquedas rápidas:</span>
          {assetsList.slice(0, 5).map(a => (
            <button
              key={a.id}
              onClick={() => loadAssetTrace(a.serialNumber)}
              className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white text-[11px] font-mono transition-colors border border-white/15"
            >
              {a.serialNumber} ({a.brand})
            </button>
          ))}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-3 animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-[#E4002B] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* VISTA 1: HOJA DE VIDA DEL ACTIVO SELECCIONADO */}
      {activeSubTab === 'LIFECYCLE' && selectedAssetTrace && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Ficha Técnica del Activo */}
          <div className="gov-card p-5 space-y-5 border-l-4 border-l-[#003B70]">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-blue-50 text-[#003B70] shrink-0">
                  {getCategoryIcon(selectedAssetTrace.asset.category)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                      {selectedAssetTrace.asset.brand} {selectedAssetTrace.asset.model}
                    </h2>
                    <PropertyBadge type={selectedAssetTrace.asset.propertyType} />
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-700">
                      {selectedAssetTrace.asset.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {selectedAssetTrace.asset.assetTypeName} • Condición Física: <strong className="text-slate-700">{selectedAssetTrace.asset.physicalCondition}</strong>
                  </p>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => PDFService.generateAssetLifecyclePDF(selectedAssetTrace.asset, selectedAssetTrace.timeline)}
                  className="gov-btn-primary text-xs py-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Hoja de Vida PDF
                </button>
                <button
                  type="button"
                  onClick={() => PDFService.generateAssetStickersPDF([selectedAssetTrace.asset])}
                  className="gov-btn-secondary text-xs py-2"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Etiqueta QR
                </button>
              </div>
            </div>

            {/* Grid de Atributos Clave */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Serie Oficial */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Número de Serie (S/N)</span>
                <div className="flex items-center justify-between">
                  <strong className="font-mono text-sm text-[#003B70]">{selectedAssetTrace.asset.serialNumber}</strong>
                  <button
                    type="button"
                    onClick={() => handleCopySerie(selectedAssetTrace.asset.serialNumber)}
                    className="p-1 text-slate-400 hover:text-[#003B70] rounded transition-colors"
                    title="Copiar Serie"
                  >
                    {copiedSerie ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Ubicación Física */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ubicación / Sucursal Actual</span>
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
                  <strong className="text-slate-800 truncate">{selectedAssetTrace.asset.currentBranchName}</strong>
                </div>
                {selectedAssetTrace.asset.locationDetail && (
                  <span className="text-[11px] text-slate-500 block truncate">{selectedAssetTrace.asset.locationDetail}</span>
                )}
              </div>

              {/* Custodia / Funcionario Asignado */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Custodia & Asignación Actual</span>
                {selectedAssetTrace.asset.assignedToUserName ? (
                  <div>
                    <strong className="text-slate-900 block truncate">{selectedAssetTrace.asset.assignedToUserName}</strong>
                    <span className="text-[11px] text-slate-500 font-mono">{selectedAssetTrace.asset.assignedToUserRut}</span>
                  </div>
                ) : (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> En Bodega TI (Disponible)
                  </span>
                )}
              </div>

              {/* Documento de Respaldo */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documento de Ingreso</span>
                <div className="space-y-0.5">
                  <strong className="text-slate-800 block truncate">Guía {selectedAssetTrace.asset.dispatchGuideNumber}</strong>
                  <span className="text-[11px] text-slate-500 truncate block">Prov: {selectedAssetTrace.asset.supplierName}</span>
                </div>
              </div>
            </div>

            {/* Especificaciones Técnicas (si existen) */}
            {selectedAssetTrace.asset.specifications && Object.keys(selectedAssetTrace.asset.specifications).length > 0 && (
              <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-100 text-xs space-y-2">
                <span className="text-[10px] font-bold text-[#003B70] uppercase tracking-wider block">Especificaciones Técnicas Registradas:</span>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-slate-700">
                  {Object.entries(selectedAssetTrace.asset.specifications).map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-500 capitalize">{k}:</span>
                      <strong className="text-slate-900">{String(v)}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Línea de Tiempo del Ciclo de Vida Útil */}
          <div className="gov-card p-5 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-[#003B70]" />
                <h3 className="text-base font-bold text-slate-900">
                  Línea de Tiempo de Movimientos ({selectedAssetTrace.timeline.length} Registros)
                </h3>
              </div>
              <span className="text-xs text-slate-500">Orden cronológico descendente</span>
            </div>

            {/* Timeline Nodos */}
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {selectedAssetTrace.timeline.map((event, idx) => {
                const badge = getTimelineEventBadge(event.category);
                return (
                  <div key={event.id} className="relative group">
                    {/* Icono del Nodo */}
                    <div className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 bg-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${badge.bg}`}>
                      {badge.icon}
                    </div>

                    {/* Tarjeta del Evento */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#003B70]/30 transition-all space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{event.title}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.bg}`}>
                            {event.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDateTime(event.timestamp)}</span>
                        </div>
                      </div>

                      {/* Detalles del Evento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-200/60">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Sucursal / Bodega:</span>
                          <strong className="text-slate-800">{event.branchName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Responsable / Técnico:</span>
                          <strong className="text-slate-800">{event.actor}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase">Documento Referencia:</span>
                          <strong className="text-[#003B70]">{event.documentRef || 'Sin documento asociado'}</strong>
                        </div>
                      </div>

                      {/* Metadatos Específicos */}
                      {event.details?.recipientName && (
                        <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>Funcionario Receptor: <strong className="text-slate-900">{event.details.recipientName} ({event.details.recipientRut})</strong></span>
                          {event.details.recipientJobTitle && <span>Cargo: <strong className="text-slate-700">{event.details.recipientJobTitle}</strong></span>}
                          {event.details.recipientDepartment && <span>Depto: <strong className="text-slate-700">{event.details.recipientDepartment}</strong></span>}
                          {event.details.signatureStatus && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              {event.details.signatureStatus}
                            </span>
                          )}
                        </div>
                      )}

                      {event.details?.changeReason && (
                        <p className="text-xs text-slate-600 italic">
                          "{event.details.changeReason}"
                        </p>
                      )}

                      {event.details?.observations && !event.details.changeReason && (
                        <p className="text-xs text-slate-600">
                          Obs: {event.details.observations}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: KARDEX GLOBAL DE TODOS LOS MOVIMIENTOS */}
      {activeSubTab === 'GLOBAL_KARDEX' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Filtros del Kardex */}
          <div className="gov-card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full sm:w-auto relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={kardexSearch}
                onChange={(e) => setKardexSearch(e.target.value)}
                placeholder="Filtrar movimientos por Serie, N° Inventario, Responsable o Motivo..."
                className="gov-input pl-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={kardexFilterBranch}
                onChange={(e) => setKardexFilterBranch(e.target.value)}
                className="gov-select text-xs w-full sm:w-56"
              >
                <option value="ALL">Todas las Sucursales</option>
                {branches.map(b => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla Kardex Global */}
          <div className="gov-card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Registro Histórico y Kardex de Auditoría ({filteredAuditLogs.length} eventos)
              </h3>
              <span className="text-xs text-slate-500">Trazabilidad en tiempo real</span>
            </div>

            <div className="overflow-x-auto">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Fecha / Hora</th>
                    <th>N° de Serie / Inv.</th>
                    <th>Equipo</th>
                    <th>Sucursal</th>
                    <th>Estado Resultante</th>
                    <th>Responsable</th>
                    <th>Motivo / Movimiento</th>
                    <th className="text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-500 text-xs">
                        No se encontraron registros de auditoría con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td>
                          <div className="font-mono font-bold text-[#003B70] text-xs">
                            {log.serialNumber}
                          </div>
                          {log.inventoryNumber && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Inv: {log.inventoryNumber}
                            </div>
                          )}
                        </td>
                        <td className="text-xs font-medium text-slate-800">
                          {log.asset ? `${log.asset.brand} ${log.asset.model}` : 'Activo TI'}
                        </td>
                        <td className="text-xs text-slate-600">
                          {log.branchName}
                        </td>
                        <td>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-[#003B70] border border-blue-200">
                            {log.newStatus.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="text-xs text-slate-700">
                          {log.changedByUserName}
                        </td>
                        <td className="text-xs text-slate-600 max-w-xs truncate" title={log.changeReason}>
                          {log.changeReason}
                        </td>
                        <td className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              loadAssetTrace(log.serialNumber);
                              setActiveSubTab('LIFECYCLE');
                            }}
                            className="text-xs font-bold text-[#003B70] hover:underline flex items-center justify-end gap-1 ml-auto"
                          >
                            <span>Ver Hoja de Vida</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
