import React, { useState, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  Boxes, 
  Cable, 
  History, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Download, 
  Printer, 
  Search, 
  RefreshCw, 
  MapPin, 
  Building2, 
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Package
} from 'lucide-react';
import { Branch } from '../../types/document';
import { Consumable, ConsumableStock } from '../../types/asset';
import { ApiClient } from '../../api/client';
import { PDFService } from '../../services/pdfService';
import { formatDateTime, formatDate, normalizeText } from '../../utils/formatters';

export const TransfersView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ASSETS' | 'CONSUMABLES' | 'HISTORY'>('ASSETS');

  // Maestros
  const [branches, setBranches] = useState<Branch[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [consumableStocks, setConsumableStocks] = useState<ConsumableStock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // --- ESTADO TRASPASO DE ACTIVOS ---
  const [assetSourceBranchId, setAssetSourceBranchId] = useState<string>('');
  const [assetDestBranchId, setAssetDestBranchId] = useState<string>('');
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [assetSearchQuery, setAssetSearchQuery] = useState<string>('');
  const [assetReason, setAssetReason] = useState<string>('Redistribución operativa entre dependencias regionales');
  const [assetDocumentRef, setAssetDocumentRef] = useState<string>(`TRASP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [assetTransferredBy, setAssetTransferredBy] = useState<string>('Encargado DTI');
  const [isTransferringAssets, setIsTransferringAssets] = useState<boolean>(false);
  const [lastAssetTransferResult, setLastAssetTransferResult] = useState<any | null>(null);
  const [assetTransferError, setAssetTransferError] = useState<string | null>(null);

  // --- ESTADO TRASPASO DE INSUMOS ---
  const [consSourceBranchId, setConsSourceBranchId] = useState<string>('');
  const [consDestBranchId, setConsDestBranchId] = useState<string>('');
  const [selectedConsumableId, setSelectedConsumableId] = useState<string>('');
  const [consQuantity, setConsQuantity] = useState<number>(1);
  const [consReason, setConsReason] = useState<string>('Abastecimiento de insumos por requerimiento de sede');
  const [consDocumentRef, setConsDocumentRef] = useState<string>(`TRASP-INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [consTransferredBy, setConsTransferredBy] = useState<string>('Encargado DTI');
  const [isTransferringCons, setIsTransferringCons] = useState<boolean>(false);
  const [lastConsTransferResult, setLastConsTransferResult] = useState<any | null>(null);
  const [consTransferError, setConsTransferError] = useState<string | null>(null);

  // --- HISTORIAL ---
  const [transferHistory, setTransferHistory] = useState<{ assetTransfers: any[]; consumableTransfers: any[] }>({
    assetTransfers: [],
    consumableTransfers: []
  });
  const [historyFilterBranch, setHistoryFilterBranch] = useState<string>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState<string>('');

  // 1. Cargar Maestros Iniciales
  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [bList, cList, sList] = await Promise.all([
        ApiClient.getBranches(),
        ApiClient.getConsumables(),
        ApiClient.getConsumableStocks()
      ]);

      const activeBranches = bList.filter(b => b.isActive !== false);
      setBranches(activeBranches);
      setConsumables(cList);
      setConsumableStocks(sList);

      if (activeBranches.length >= 2) {
        if (!assetSourceBranchId) setAssetSourceBranchId(activeBranches[0].id);
        if (!assetDestBranchId) setAssetDestBranchId(activeBranches[1].id);
        if (!consSourceBranchId) setConsSourceBranchId(activeBranches[0].id);
        if (!consDestBranchId) setConsDestBranchId(activeBranches[1].id);
      } else if (activeBranches.length === 1) {
        setAssetSourceBranchId(activeBranches[0].id);
        setConsSourceBranchId(activeBranches[0].id);
      }

      if (cList.length > 0 && !selectedConsumableId) {
        setSelectedConsumableId(cList[0].id);
      }
    } catch (err: any) {
      console.error('Error al cargar maestros para traspasos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Cargar Activos Disponibles cuando cambia la bodega origen de hardware
  const loadAvailableAssets = async (sourceId: string) => {
    if (!sourceId) {
      setAvailableAssets([]);
      setSelectedAssetIds([]);
      return;
    }
    try {
      const assets = await ApiClient.getAvailableAssetsForTransfer(sourceId);
      setAvailableAssets(assets || []);
      setSelectedAssetIds([]);
    } catch (err) {
      console.error('Error al consultar activos disponibles:', err);
      setAvailableAssets([]);
    }
  };

  // 3. Cargar Historial
  const loadHistory = async () => {
    try {
      const history = await ApiClient.getTransferHistory(historyFilterBranch);
      setTransferHistory(history);
    } catch (err) {
      console.error('Error al cargar historial de traspasos:', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (assetSourceBranchId) {
      loadAvailableAssets(assetSourceBranchId);
    }
  }, [assetSourceBranchId]);

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      loadHistory();
    }
  }, [activeTab, historyFilterBranch]);

  // Manejo de Selección de Activos
  const toggleSelectAsset = (assetId: string) => {
    if (selectedAssetIds.includes(assetId)) {
      setSelectedAssetIds(selectedAssetIds.filter(id => id !== assetId));
    } else {
      setSelectedAssetIds([...selectedAssetIds, assetId]);
    }
  };

  const handleSelectAllFiltered = (filtered: any[]) => {
    const filteredIds = filtered.map(a => a.id);
    const allSelected = filteredIds.every(id => selectedAssetIds.includes(id));
    if (allSelected) {
      setSelectedAssetIds(selectedAssetIds.filter(id => !filteredIds.includes(id)));
    } else {
      const newSelected = Array.from(new Set([...selectedAssetIds, ...filteredIds]));
      setSelectedAssetIds(newSelected);
    }
  };

  // Filtrado de Activos Disponibles
  const filteredAvailableAssets = availableAssets.filter(a => {
    if (!assetSearchQuery.trim()) return true;
    const q = normalizeText(assetSearchQuery);
    return (
      normalizeText(a.serialNumber).includes(q) ||
      (a.inventoryNumber && normalizeText(a.inventoryNumber).includes(q)) ||
      normalizeText(a.brand).includes(q) ||
      normalizeText(a.model).includes(q) ||
      normalizeText(a.assetType?.name || '').includes(q)
    );
  });

  // Stock disponible de insumo seleccionado en la bodega origen
  const sourceConsumableStock = consumableStocks.find(
    s => s.consumableId === selectedConsumableId && s.branchId === consSourceBranchId
  )?.currentQuantity || 0;

  // --- EJECUTAR TRASPASO DE ACTIVOS ---
  const handleExecuteAssetTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetTransferError(null);

    if (selectedAssetIds.length === 0) {
      setAssetTransferError('Debe seleccionar al menos un activo de la lista para traspasar.');
      return;
    }

    if (!assetDestBranchId || assetSourceBranchId === assetDestBranchId) {
      setAssetTransferError('La bodega de destino debe ser diferente a la bodega de origen.');
      return;
    }

    const sourceBranch = branches.find(b => b.id === assetSourceBranchId);
    const destBranch = branches.find(b => b.id === assetDestBranchId);

    if (!confirm(`¿Confirma el traspaso de ${selectedAssetIds.length} activo(s) desde "${sourceBranch?.name}" hacia "${destBranch?.name}"?`)) {
      return;
    }

    setIsTransferringAssets(true);
    try {
      const res = await ApiClient.transferAssets({
        assetIds: selectedAssetIds,
        sourceBranchId: assetSourceBranchId,
        destinationBranchId: assetDestBranchId,
        reason: assetReason.trim(),
        documentRef: assetDocumentRef.trim(),
        transferredByUserName: assetTransferredBy.trim()
      });

      const transferredItems = availableAssets.filter(a => selectedAssetIds.includes(a.id)).map(a => ({
        type: 'ACTIVO' as const,
        identifier: a.serialNumber,
        name: `${a.brand} ${a.model} (${a.assetType?.name || 'Hardware'})`,
        category: a.assetType?.category || 'COMPUTO',
        quantity: 1
      }));

      const transferActData = {
        documentRef: res.documentRef || assetDocumentRef,
        transferDate: new Date().toISOString(),
        sourceBranchName: sourceBranch?.name || 'Bodega Origen',
        destinationBranchName: destBranch?.name || 'Bodega Destino',
        transferredByName: assetTransferredBy,
        reason: assetReason,
        items: transferredItems
      };

      setLastAssetTransferResult(transferActData);
      setFeedbackMsg(`✓ ${res.message || 'Traspaso ejecutado correctamente.'}`);
      
      // Refrescar lista de disponibles
      loadAvailableAssets(assetSourceBranchId);
      setAssetDocumentRef(`TRASP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      window.dispatchEvent(new Event('itam_storage_updated'));
    } catch (err: any) {
      setAssetTransferError(err.message || 'Error al ejecutar traspaso de activos.');
    } finally {
      setIsTransferringAssets(false);
    }
  };

  // --- EJECUTAR TRASPASO DE INSUMOS ---
  const handleExecuteConsumableTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsTransferError(null);

    if (consQuantity <= 0) {
      setConsTransferError('La cantidad a traspasar debe ser mayor a cero.');
      return;
    }

    if (consQuantity > sourceConsumableStock) {
      setConsTransferError(`No hay suficiente stock disponible. Stock actual en origen: ${sourceConsumableStock} unidades.`);
      return;
    }

    if (!consDestBranchId || consSourceBranchId === consDestBranchId) {
      setConsTransferError('La bodega de destino debe ser diferente a la bodega de origen.');
      return;
    }

    const sourceBranch = branches.find(b => b.id === consSourceBranchId);
    const destBranch = branches.find(b => b.id === consDestBranchId);
    const selectedCons = consumables.find(c => c.id === selectedConsumableId);

    if (!confirm(`¿Confirma el traspaso de ${consQuantity} unidades de "${selectedCons?.name}" desde "${sourceBranch?.name}" hacia "${destBranch?.name}"?`)) {
      return;
    }

    setIsTransferringCons(true);
    try {
      const res = await ApiClient.transferConsumables({
        consumableId: selectedConsumableId,
        sourceBranchId: consSourceBranchId,
        destinationBranchId: consDestBranchId,
        quantity: consQuantity,
        reason: consReason.trim(),
        documentRef: consDocumentRef.trim(),
        transferredByUserName: consTransferredBy.trim()
      });

      const transferActData = {
        documentRef: res.documentRef || consDocumentRef,
        transferDate: new Date().toISOString(),
        sourceBranchName: sourceBranch?.name || 'Bodega Origen',
        destinationBranchName: destBranch?.name || 'Bodega Destino',
        transferredByName: consTransferredBy,
        reason: consReason,
        items: [{
          type: 'INSUMO' as const,
          identifier: selectedCons?.sku || 'SKU-001',
          name: selectedCons?.name || 'Insumo TI',
          category: selectedCons?.category || 'Periféricos',
          quantity: consQuantity
        }]
      };

      setLastConsTransferResult(transferActData);
      setFeedbackMsg(`✓ ${res.message || 'Traspaso de insumos ejecutado correctamente.'}`);

      // Refrescar stocks
      const updatedStocks = await ApiClient.getConsumableStocks();
      setConsumableStocks(updatedStocks);
      setConsDocumentRef(`TRASP-INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      window.dispatchEvent(new Event('itam_storage_updated'));
    } catch (err: any) {
      setConsTransferError(err.message || 'Error al ejecutar traspaso de insumos.');
    } finally {
      setIsTransferringCons(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003B70] dark:text-white tracking-tight flex items-center gap-2.5">
            <ArrowLeftRight className="w-6 h-6 text-[#0F69B4] dark:text-[#38BDF8]" />
            Traspasos & Movimientos Inter-Bodegas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 font-medium">
            Traslado y transferencia física/lógica de hardware serializado e insumos entre dependencias del IPS
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadInitialData();
              if (assetSourceBranchId) loadAvailableAssets(assetSourceBranchId);
              if (activeTab === 'HISTORY') loadHistory();
            }}
            className="gov-btn-secondary py-2 text-xs font-bold flex items-center gap-1.5"
            title="Refrescar datos"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{feedbackMsg}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-emerald-800 font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Navegación Tabs */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-[#1E3352]/60">
        <button
          onClick={() => setActiveTab('ASSETS')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'ASSETS'
              ? 'bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:to-[#0055A5] text-white shadow-2xs border border-transparent dark:border-[#38BDF8]/40'
              : 'bg-white dark:bg-[#0C1729] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352] hover:bg-slate-50 dark:hover:bg-[#14233C]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          Traspaso de Activos Serializados
        </button>

        <button
          onClick={() => setActiveTab('CONSUMABLES')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'CONSUMABLES'
              ? 'bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:to-[#0055A5] text-white shadow-2xs border border-transparent dark:border-[#38BDF8]/40'
              : 'bg-white dark:bg-[#0C1729] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352] hover:bg-slate-50 dark:hover:bg-[#14233C]'
          }`}
        >
          <Cable className="w-4 h-4" />
          Traspaso de Insumos & Periféricos
        </button>

        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'HISTORY'
              ? 'bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:to-[#0055A5] text-white shadow-2xs border border-transparent dark:border-[#38BDF8]/40'
              : 'bg-white dark:bg-[#0C1729] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-[#1E3352] hover:bg-slate-50 dark:hover:bg-[#14233C]'
          }`}
        >
          <History className="w-4 h-4" />
          Historial & Kardex de Traspasos
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TRASPASO DE ACTIVOS SERIALIZADOS (HARDWARE) */}
      {/* ========================================================================= */}
      {activeTab === 'ASSETS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel Izquierdo: Configuración del Traspaso */}
          <div className="lg:col-span-1 space-y-4">
            <div className="gov-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-[#003B70] font-bold text-sm border-b border-slate-100 pb-2.5">
                <Building2 className="w-4 h-4 text-[#0F69B4]" />
                <h3>Configuración del Traslado</h3>
              </div>

              {assetTransferError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                  <span>{assetTransferError}</span>
                </div>
              )}

              <form onSubmit={handleExecuteAssetTransfer} className="space-y-3.5 text-xs">
                {/* Bodega Origen */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">1. Bodega de Origen (Emisora) *</label>
                  <select
                    value={assetSourceBranchId}
                    onChange={(e) => setAssetSourceBranchId(e.target.value)}
                    className="gov-input font-semibold"
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Ubicación física actual del equipamiento</p>
                </div>

                {/* Bodega Destino */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">2. Bodega de Destino (Receptora) *</label>
                  <select
                    value={assetDestBranchId}
                    onChange={(e) => setAssetDestBranchId(e.target.value)}
                    className="gov-input font-semibold text-blue-900"
                    required
                  >
                    {branches
                      .filter(b => b.id !== assetSourceBranchId)
                      .map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1">Dependencia que asumirá la nueva custodia</p>
                </div>

                {/* Folio Documento */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">3. N° Folio / Acta de Traspaso *</label>
                  <input
                    type="text"
                    value={assetDocumentRef}
                    onChange={(e) => setAssetDocumentRef(e.target.value.toUpperCase())}
                    className="gov-input font-mono font-bold text-[#003B70]"
                    required
                  />
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">4. Técnico / Encargado Emisor *</label>
                  <input
                    type="text"
                    value={assetTransferredBy}
                    onChange={(e) => setAssetTransferredBy(e.target.value)}
                    className="gov-input"
                    required
                  />
                </div>

                {/* Motivo */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">5. Motivo / Justificación *</label>
                  <textarea
                    value={assetReason}
                    onChange={(e) => setAssetReason(e.target.value)}
                    rows={2}
                    className="gov-input resize-none"
                    placeholder="Ej: Redistribución por requerimiento operativo de atención a usuarios..."
                    required
                  />
                </div>

                {/* Resumen de Selección */}
                <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Equipos Seleccionados:</span>
                    <span className="font-bold text-[#003B70] text-sm">
                      {selectedAssetIds.length} de {availableAssets.length}
                    </span>
                  </div>
                </div>

                {/* Botón de Ejecución */}
                <button
                  type="submit"
                  disabled={isTransferringAssets || selectedAssetIds.length === 0}
                  className="gov-btn-primary w-full justify-center py-2.5 font-bold"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {isTransferringAssets ? 'Procesando Traspaso...' : `Ejecutar Traspaso (${selectedAssetIds.length})`}
                </button>
              </form>
            </div>

            {/* Cuadro de Último Traspaso / Descarga de Acta */}
            {lastAssetTransferResult && (
              <div className="gov-card p-4 bg-emerald-50/70 border-emerald-300 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Traspaso Exitoso: Folio {lastAssetTransferResult.documentRef}</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Se trasladaron {lastAssetTransferResult.items.length} activos desde {lastAssetTransferResult.sourceBranchName} hacia {lastAssetTransferResult.destinationBranchName}.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => PDFService.openTransferActPDFInNewWindow(lastAssetTransferResult)}
                    className="gov-btn-primary w-full text-xs py-1.5 justify-center bg-emerald-700 hover:bg-emerald-800 border-none"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Abrir Acta PDF Oficial
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Panel Derecho: Selección de Activos Disponibles en Bodega */}
          <div className="lg:col-span-2 space-y-4">
            <div className="gov-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-[#003B70]" />
                    Equipos Disponibles en Bodega de Origen
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seleccione los números de serie que serán trasladados hacia la bodega receptora
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAllFiltered(filteredAvailableAssets)}
                    disabled={filteredAvailableAssets.length === 0}
                    className="gov-btn-secondary py-1.5 text-xs font-bold"
                  >
                    {filteredAvailableAssets.length > 0 &&
                    filteredAvailableAssets.every(a => selectedAssetIds.includes(a.id))
                      ? 'Deseleccionar Todos'
                      : 'Seleccionar Todos'}
                  </button>
                </div>
              </div>

              {/* Barra de Búsqueda de Activos */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={assetSearchQuery}
                  onChange={(e) => setAssetSearchQuery(e.target.value)}
                  placeholder="Buscar por N° de Serie, Inventario, Marca, Modelo o Tipo..."
                  className="gov-input gov-input-with-icon text-xs"
                />
              </div>

              {/* Tabla de Selección */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#003B70] text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredAvailableAssets.length > 0 &&
                            filteredAvailableAssets.every(a => selectedAssetIds.includes(a.id))
                          }
                          onChange={() => handleSelectAllFiltered(filteredAvailableAssets)}
                          className="rounded text-[#003B70] focus:ring-0"
                        />
                      </th>
                      <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">N° de Serie / Inventario</th>
                      <th className="px-3.5 py-2.5 font-bold">Equipo & Modelo</th>
                      <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Tipo & Categoría</th>
                      <th className="px-3.5 py-2.5 font-bold whitespace-nowrap">Estado Actual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]/50 bg-white dark:bg-[#101C30] text-slate-700 dark:text-slate-300">
                    {filteredAvailableAssets.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                          No hay equipos disponibles en esta bodega o no coinciden con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredAvailableAssets.map(a => {
                        const isSelected = selectedAssetIds.includes(a.id);
                        return (
                          <tr
                            key={a.id}
                            onClick={() => toggleSelectAsset(a.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50/80 hover:bg-blue-100/70' : 'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-3.5 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectAsset(a.id)}
                                className="rounded text-[#003B70] focus:ring-0"
                              />
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <div className="font-mono font-bold text-[#003B70]">{a.serialNumber}</div>
                              {a.inventoryNumber && (
                                <div className="text-[10px] text-slate-500 font-mono">Inv: {a.inventoryNumber}</div>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <div className="font-bold text-slate-900">{a.brand} {a.model}</div>
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <div className="font-semibold text-slate-700">{a.assetType?.name}</div>
                              <div className="text-[10px] text-slate-400">{a.assetType?.category}</div>
                            </td>
                            <td className="px-3.5 py-2.5 whitespace-nowrap">
                              <span className="inline-flex items-center justify-center whitespace-nowrap px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                {a.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TRASPASO DE INSUMOS & PERIFÉRICOS (STOCK NO INVENTARIABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'CONSUMABLES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="gov-card p-5 space-y-4">
              <div className="flex items-center gap-2 text-[#003B70] font-bold text-sm border-b border-slate-100 pb-2.5">
                <Cable className="w-4 h-4 text-[#0F69B4]" />
                <h3>Configuración de Traspaso de Insumos</h3>
              </div>

              {consTransferError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                  <span>{consTransferError}</span>
                </div>
              )}

              <form onSubmit={handleExecuteConsumableTransfer} className="space-y-3.5 text-xs">
                {/* Bodega Origen */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">1. Bodega de Origen (Emisora) *</label>
                  <select
                    value={consSourceBranchId}
                    onChange={(e) => setConsSourceBranchId(e.target.value)}
                    className="gov-input font-semibold"
                    required
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                    ))}
                  </select>
                </div>

                {/* Bodega Destino */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">2. Bodega de Destino (Receptora) *</label>
                  <select
                    value={consDestBranchId}
                    onChange={(e) => setConsDestBranchId(e.target.value)}
                    className="gov-input font-semibold text-blue-900"
                    required
                  >
                    {branches
                      .filter(b => b.id !== consSourceBranchId)
                      .map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                  </select>
                </div>

                {/* Insumo a Traspasar */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">3. Insumo / Periférico a Traspasar *</label>
                  <select
                    value={selectedConsumableId}
                    onChange={(e) => setSelectedConsumableId(e.target.value)}
                    className="gov-input font-semibold"
                    required
                  >
                    {consumables.map(c => {
                      const stockInOrigin = consumableStocks.find(
                        s => s.consumableId === c.id && s.branchId === consSourceBranchId
                      )?.currentQuantity || 0;
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} (Stock Origen: {stockInOrigin} un.)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Cantidad */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-bold">4. Cantidad a Traspasar *</label>
                    <span className="text-[11px] font-semibold text-[#003B70]">
                      Disponible: {sourceConsumableStock} un.
                    </span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={sourceConsumableStock || 1}
                    value={consQuantity}
                    onChange={(e) => setConsQuantity(parseInt(e.target.value, 10) || 1)}
                    className="gov-input font-bold text-sm"
                    required
                  />
                </div>

                {/* Folio */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">5. N° Folio / Referencia *</label>
                  <input
                    type="text"
                    value={consDocumentRef}
                    onChange={(e) => setConsDocumentRef(e.target.value.toUpperCase())}
                    className="gov-input font-mono font-bold text-[#003B70]"
                    required
                  />
                </div>

                {/* Responsable */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">6. Responsable Emisor *</label>
                  <input
                    type="text"
                    value={consTransferredBy}
                    onChange={(e) => setConsTransferredBy(e.target.value)}
                    className="gov-input"
                    required
                  />
                </div>

                {/* Motivo */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">7. Motivo / Justificación *</label>
                  <textarea
                    value={consReason}
                    onChange={(e) => setConsReason(e.target.value)}
                    rows={2}
                    className="gov-input resize-none"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isTransferringCons || sourceConsumableStock <= 0}
                  className="gov-btn-primary w-full justify-center py-2.5 font-bold"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  {isTransferringCons ? 'Procesando Traspaso...' : `Traspasar ${consQuantity} Unidades`}
                </button>
              </form>
            </div>

            {lastConsTransferResult && (
              <div className="gov-card p-4 bg-emerald-50/70 border-emerald-300 space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Traspaso de Insumos Exitoso</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  Folio {lastConsTransferResult.documentRef} registrado correctamente.
                </p>
                <button
                  onClick={() => PDFService.openTransferActPDFInNewWindow(lastConsTransferResult)}
                  className="gov-btn-primary w-full text-xs py-1.5 justify-center bg-emerald-700 hover:bg-emerald-800 border-none"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Abrir Comprobante PDF
                </button>
              </div>
            )}
          </div>

          {/* Panel Derecho: Stock Actual de Insumos por Bodega */}
          <div className="lg:col-span-2 space-y-4">
            <div className="gov-card p-5 space-y-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4 text-[#003B70]" />
                Balance de Stock de Insumos en Bodega Origen
              </h3>

              <div className="overflow-x-auto rounded-lg border border-slate-200 max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#003B70] text-white sticky top-0 z-10">
                    <tr>
                      <th className="px-3.5 py-2.5 font-bold">SKU</th>
                      <th className="px-3.5 py-2.5 font-bold">Insumo / Descripción</th>
                      <th className="px-3.5 py-2.5 font-bold">Categoría</th>
                      <th className="px-3.5 py-2.5 font-bold text-right">Stock Disponible</th>
                      <th className="px-3.5 py-2.5 font-bold text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]/50 bg-white dark:bg-[#101C30] text-slate-700 dark:text-slate-300">
                    {consumables.map(c => {
                      const stockInOrigin = consumableStocks.find(
                        s => s.consumableId === c.id && s.branchId === consSourceBranchId
                      )?.currentQuantity || 0;

                      return (
                        <tr
                          key={c.id}
                          className={`hover:bg-slate-50 transition-colors ${
                            selectedConsumableId === c.id ? 'bg-blue-50/70 font-semibold' : ''
                          }`}
                        >
                          <td className="px-3.5 py-2.5 font-mono font-bold text-[#003B70]">{c.sku}</td>
                          <td className="px-3.5 py-2.5 font-bold text-slate-900">{c.name}</td>
                          <td className="px-3.5 py-2.5 text-slate-600">{c.category}</td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-sm">
                            <span className={stockInOrigin <= 5 ? 'text-[#E4002B]' : 'text-slate-900'}>
                              {stockInOrigin} un.
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedConsumableId(c.id);
                                setConsQuantity(Math.min(1, stockInOrigin));
                              }}
                              className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-[#003B70] font-bold text-[11px] border border-blue-200"
                            >
                              Seleccionar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORIAL & KARDEX DE TRASPASOS */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORY' && (
        <div className="gov-card p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-[#003B70]" />
                Kardex y Registro de Traspasos Inter-Bodegas
              </h3>
              <p className="text-xs text-slate-500">
                Auditoría completa de movimientos de hardware e insumos realizados en la plataforma
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={historyFilterBranch}
                onChange={(e) => setHistoryFilterBranch(e.target.value)}
                className="gov-input text-xs py-1.5"
              >
                <option value="ALL">Todas las Bodegas</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtabla 1: Traspasos de Activos Serializados */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#003B70] flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5" />
              Traspasos de Hardware Serializado ({transferHistory.assetTransfers.length} registros)
            </h4>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003B70] text-white">
                  <tr>
                    <th className="px-3 py-2 font-bold">Fecha / Hora</th>
                    <th className="px-3 py-2 font-bold">N° Serie</th>
                    <th className="px-3 py-2 font-bold">Equipo</th>
                    <th className="px-3 py-2 font-bold">Bodega Destino</th>
                    <th className="px-3 py-2 font-bold">Responsable</th>
                    <th className="px-3 py-2 font-bold">Motivo & Detalle</th>
                    <th className="px-3 py-2 font-bold">Folio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]/50 bg-white dark:bg-[#101C30] text-slate-700 dark:text-slate-300">
                  {transferHistory.assetTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        No hay registros de traspasos de activos aún.
                      </td>
                    </tr>
                  ) : (
                    transferHistory.assetTransfers.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-500">{formatDateTime(t.timestamp)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-[#003B70]">{t.serialNumber}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{t.brand} {t.model}</td>
                        <td className="px-3 py-2 font-semibold text-blue-900">{t.targetBranch}</td>
                        <td className="px-3 py-2 text-slate-600">{t.registeredBy}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{t.reason}</td>
                        <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-800">{t.documentRef || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Subtabla 2: Traspasos de Insumos a Granel */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-[#003B70] flex items-center gap-1.5">
              <Cable className="w-3.5 h-3.5" />
              Traspasos de Insumos & Periféricos ({transferHistory.consumableTransfers.length} registros)
            </h4>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003B70] text-white">
                  <tr>
                    <th className="px-3 py-2 font-bold">Fecha / Hora</th>
                    <th className="px-3 py-2 font-bold">SKU</th>
                    <th className="px-3 py-2 font-bold">Insumo</th>
                    <th className="px-3 py-2 font-bold">Bodega</th>
                    <th className="px-3 py-2 font-bold text-right">Cantidad</th>
                    <th className="px-3 py-2 font-bold">Responsable</th>
                    <th className="px-3 py-2 font-bold">Motivo</th>
                    <th className="px-3 py-2 font-bold">Folio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]/50 bg-white dark:bg-[#101C30] text-slate-700 dark:text-slate-300">
                  {transferHistory.consumableTransfers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                        No hay registros de traspasos de insumos aún.
                      </td>
                    </tr>
                  ) : (
                    transferHistory.consumableTransfers.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-500">{formatDateTime(m.timestamp)}</td>
                        <td className="px-3 py-2 font-mono font-bold text-[#003B70]">{m.sku}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{m.consumableName}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800">{m.branchName}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">
                          <span className={m.quantity < 0 ? 'text-[#E4002B]' : 'text-emerald-700'}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity} un.
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{m.registeredBy}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{m.reason}</td>
                        <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-800">{m.documentRef || '-'}</td>
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
