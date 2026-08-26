import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Printer, 
  QrCode, 
  Eye, 
  Wrench, 
  History, 
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import { storage } from '../../db/storage';
import { Asset, AssetStatus, AssetType } from '../../types/asset';
import { Branch } from '../../types/document';
import { PropertyBadge, StatusBadge } from '../common/Badge';
import { QRViewerModal } from '../common/QRViewerModal';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import { ExcelService } from '../../services/excelService';
import { PDFService } from '../../services/pdfService';
import { formatDate, formatDateTime, normalizeText } from '../../utils/formatters';
import { ApiClient } from '../../api/client';

interface InventoryViewProps {
  currentBranchId: string;
  initialSearchQuery?: string;
  onNavigateToAssign?: (assetId: string) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  currentBranchId,
  initialSearchQuery = '',
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchQuery);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedTypeId, setSelectedTypeId] = useState<string>('ALL');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>(currentBranchId);

  // Selección múltiple para impresión masiva
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Modales
  const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<Asset | null>(null);
  const [statusChangeModalAsset, setStatusChangeModalAsset] = useState<Asset | null>(null);
  const [newStatusChoice, setNewStatusChoice] = useState<AssetStatus>('EN_MANTENCION');
  const [statusChangeReason, setStatusChangeReason] = useState<string>('');

  const loadData = async () => {
    const [allAssets, b, types] = await Promise.all([
      ApiClient.getAssets(),
      ApiClient.getBranches(),
      ApiClient.getBranches().then(() => storage.getAssetTypes())
    ]);
    setAssets(allAssets);
    setBranches(b);
    setAssetTypes(types);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('itam_storage_updated', loadData);
    return () => window.removeEventListener('itam_storage_updated', loadData);
  }, []);

  useEffect(() => {
    if (initialSearchQuery) {
      setSearchTerm(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    setSelectedBranchFilter(currentBranchId);
  }, [currentBranchId]);

  // Filtrado de Activos (Insensible a Acentos y Mayúsculas)
  const filteredAssets = assets.filter(a => {
    if (searchTerm.trim()) {
      const words = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
      const target = normalizeText(
        `${a.serialNumber} ${a.inventoryNumber || ''} ${a.brand} ${a.model} ${a.assignedToUserName || ''} ${a.assignedToUserRut || ''} ${a.supplierName || ''} ${a.assetTypeName || ''} ${a.currentBranchName || ''}`
      );
      if (!words.every(w => target.includes(w))) {
        return false;
      }
    }

    if (selectedPropertyType !== 'ALL' && a.propertyType !== selectedPropertyType) return false;
    if (selectedStatus !== 'ALL' && a.status !== selectedStatus) return false;
    if (selectedTypeId !== 'ALL' && a.assetTypeId !== selectedTypeId) return false;
    if (selectedBranchFilter !== 'ALL' && a.currentBranchId !== selectedBranchFilter) return false;

    return true;
  });

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.size === filteredAssets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(filteredAssets.map(a => a.id)));
    }
  };

  const handleExport = () => {
    ExcelService.exportAssetsToExcel(filteredAssets);
  };

  const handlePrintSelected = () => {
    const toPrint = assets.filter(a => selectedAssetIds.has(a.id));
    if (toPrint.length === 0) return;
    PDFService.generateAssetStickersPDF(toPrint);
  };

  const [statusModalError, setStatusModalError] = useState<string | null>(null);

  const handleConfirmStatusChange = async () => {
    if (!statusChangeModalAsset) return;
    setStatusModalError(null);

    if (!statusChangeReason.trim()) {
      setStatusModalError('Debe ingresar un motivo o justificación para el cambio de estado (requerido por auditoría).');
      return;
    }

    try {
      await ApiClient.updateAssetStatus(statusChangeModalAsset.id, {
        newStatus: newStatusChoice,
        reason: statusChangeReason.trim()
      });
      setStatusChangeModalAsset(null);
      setStatusChangeReason('');
      loadData();
    } catch (err: any) {
      setStatusModalError(err.message || 'Error al cambiar el estado del activo.');
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003B70] dark:text-white tracking-tight">Inventario de Activos (ITAM)</h1>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 font-medium">
            Parque tecnológico institucional: <strong className="text-slate-800 dark:text-white">{filteredAssets.length} activos visibles</strong> de {assets.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedAssetIds.size > 0 && (
            <button
              onClick={handlePrintSelected}
              className="gov-btn-primary"
            >
              <Printer className="w-4 h-4" />
              Imprimir Etiquetas ({selectedAssetIds.size})
            </button>
          )}

          <button
            onClick={handleExport}
            className="gov-btn-secondary"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            Exportar a Excel
          </button>
        </div>
      </div>

      {/* Barra de Filtros Rápidos */}
      <div className="gov-card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Búsqueda */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° Serie, Inventario, Funcionario, Marca..."
              className="gov-input gov-input-with-icon"
            />
          </div>

          {/* Modalidad: Propio vs Arriendo con Búsqueda */}
          <div>
            <SearchableSelect
              value={selectedPropertyType}
              onChange={(val) => setSelectedPropertyType(val)}
              options={[
                { value: 'ALL', label: 'Modalidad: Todas', badge: 'Total' },
                { value: 'PROPIO', label: 'Solo Propios (ChileAtiende)', badge: 'Propio' },
                { value: 'ARRIENDO', label: 'Solo Arriendos (Leasing)', badge: 'Leasing' }
              ]}
              placeholder="Filtrar modalidad..."
              searchPlaceholder="Filtrar..."
            />
          </div>

          {/* Estado con Búsqueda */}
          <div>
            <SearchableSelect
              value={selectedStatus}
              onChange={(val) => setSelectedStatus(val)}
              options={[
                { value: 'ALL', label: 'Estado: Todos' },
                { value: 'BODEGA_DISPONIBLE', label: 'Bodega Disponible', badge: 'Disponible' },
                { value: 'ASIGNADO', label: 'Asignado a Funcionario', badge: 'Asignado' },
                { value: 'EN_MANTENCION', label: 'En Mantención', badge: 'Taller' },
                { value: 'DADO_DE_BAJA', label: 'Dado de Baja', badge: 'Baja' },
                { value: 'DEVUELTO_PROVEEDOR', label: 'Devuelto a Proveedor', badge: 'Devuelto' }
              ]}
              placeholder="Filtrar estado..."
              searchPlaceholder="Filtrar..."
            />
          </div>

          {/* Tipo de Hardware con Búsqueda */}
          <div>
            <SearchableSelect
              value={selectedTypeId}
              onChange={(val) => setSelectedTypeId(val)}
              options={[
                { value: 'ALL', label: 'Tipo: Todos' },
                ...assetTypes.map(t => ({
                  value: t.id,
                  label: t.name,
                  badge: t.category
                }))
              ]}
              placeholder="Filtrar tipo..."
              searchPlaceholder="Filtrar tipo..."
            />
          </div>
        </div>
      </div>

      {/* Tabla de Activos */}
      <div className="gov-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#003B70] dark:bg-gradient-to-r dark:from-[#002D57] dark:to-[#003B70] text-white select-none border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th className="px-4 py-3.5 w-10">
                  <button onClick={handleSelectAll} className="text-white hover:opacity-80">
                    {selectedAssetIds.size === filteredAssets.length && filteredAssets.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-white" />
                    ) : (
                      <Square className="w-4 h-4 text-white/70" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3.5 font-bold">Identificadores</th>
                <th className="px-4 py-3.5 font-bold">Dispositivo / Modelo</th>
                <th className="px-4 py-3.5 font-bold">Modalidad</th>
                <th className="px-4 py-3.5 font-bold">Estado Operativo</th>
                <th className="px-4 py-3.5 font-bold">Custodia / Ubicación</th>
                <th className="px-4 py-3.5 font-bold">Respaldo Ingreso</th>
                <th className="px-4 py-3.5 text-right font-bold">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]/50 bg-white dark:bg-[#101C30] text-slate-700 dark:text-slate-300">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No se encontraron activos con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => {
                  const isSelected = selectedAssetIds.has(asset.id);
                  return (
                    <tr 
                      key={asset.id} 
                      className={`hover:bg-slate-50 dark:hover:bg-[#162744] transition-colors ${isSelected ? 'bg-blue-50/60 dark:bg-blue-900/30' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3">
                        <button onClick={() => handleToggleSelect(asset.id)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#003B70] dark:text-[#38BDF8]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Identificadores */}
                      <td className="px-4 py-3 font-mono">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{asset.serialNumber}</div>
                        {asset.inventoryNumber ? (
                          <div className="text-xs font-bold text-[#003B70] dark:text-[#38BDF8] mt-0.5">
                            Inv: {asset.inventoryNumber}
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 mt-0.5">Sin Inv. (Arriendo)</div>
                        )}
                      </td>

                      {/* Dispositivo / Modelo */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{asset.brand} {asset.model}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{asset.assetTypeName}</div>
                      </td>

                      {/* Modalidad */}
                      <td className="px-4 py-3">
                        <PropertyBadge type={asset.propertyType} />
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-3">
                        <StatusBadge status={asset.status} />
                      </td>

                      {/* Custodia */}
                      <td className="px-4 py-3">
                        {asset.assignedToUserName ? (
                          <div>
                            <div className="font-bold text-[#003B70] dark:text-[#38BDF8] text-sm">{asset.assignedToUserName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{asset.currentBranchName}</div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-700 dark:text-slate-300 font-medium text-sm">{asset.currentBranchName}</span>
                            <div className="text-xs text-slate-400">{asset.locationDetail || 'Bodega'}</div>
                          </div>
                        )}
                      </td>

                      {/* Respaldo Documental */}
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        <div>Guía: <strong className="text-slate-700 dark:text-slate-200">{asset.dispatchGuideNumber}</strong></div>
                        {asset.purchaseOrderNumber && <div>OC: {asset.purchaseOrderNumber}</div>}
                        {asset.leasingContractNumber && (
                          <div className="text-blue-700 dark:text-[#60A5FA] font-mono text-xs font-semibold">
                            {asset.leasingContractNumber}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedAssetForQR(asset)}
                            title="Ver Código QR / Etiqueta"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#003B70] dark:hover:text-[#38BDF8] hover:bg-slate-100 dark:hover:bg-[#162744] rounded-lg transition-colors"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setSelectedAssetForDetail(asset)}
                            title="Ver Ficha y Kardex"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#162744] rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => { setStatusChangeModalAsset(asset); setNewStatusChoice(asset.status); }}
                            title="Cambiar Estado / Mantención"
                            className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-[#162744] rounded-lg transition-colors"
                          >
                            <Wrench className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal QR */}
      <QRViewerModal
        asset={selectedAssetForQR}
        isOpen={!!selectedAssetForQR}
        onClose={() => setSelectedAssetForQR(null)}
      />

      {/* Modal Ficha Detallada */}
      {selectedAssetForDetail && (
        <Modal
          isOpen={!!selectedAssetForDetail}
          onClose={() => setSelectedAssetForDetail(null)}
          title="Ficha Técnica & Trazabilidad del Activo"
          subtitle={`${selectedAssetForDetail.brand} ${selectedAssetForDetail.model} (S/N: ${selectedAssetForDetail.serialNumber})`}
          maxWidth="4xl"
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0D182B] border border-slate-200 dark:border-[#1E3352] space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#38BDF8] uppercase">Identificadores</span>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">N° de Serie:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white text-sm">{selectedAssetForDetail.serialNumber}</p>
                </div>
                {selectedAssetForDetail.inventoryNumber && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">N° Inventario Institucional:</span>
                    <p className="font-mono font-bold text-[#003B70] dark:text-[#38BDF8]">{selectedAssetForDetail.inventoryNumber}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Modalidad:</span>
                  <div className="mt-1"><PropertyBadge type={selectedAssetForDetail.propertyType} /></div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0D182B] border border-slate-200 dark:border-[#1E3352] space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#38BDF8] uppercase">Estado & Ubicación</span>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Estado Operativo:</span>
                  <div className="mt-1"><StatusBadge status={selectedAssetForDetail.status} /></div>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Sucursal Actual:</span>
                  <p className="text-slate-800 dark:text-white font-semibold">{selectedAssetForDetail.currentBranchName}</p>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Custodio Actual:</span>
                  <p className="text-[#003B70] dark:text-[#38BDF8] font-bold">{selectedAssetForDetail.assignedToUserName || 'En Bodega TI'}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#0D182B] border border-slate-200 dark:border-[#1E3352] space-y-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-[#38BDF8] uppercase">Documentos de Ingreso</span>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">Guía de Despacho:</span>
                  <p className="font-mono font-bold text-slate-900 dark:text-white">{selectedAssetForDetail.dispatchGuideNumber}</p>
                </div>
                {selectedAssetForDetail.purchaseOrderNumber && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Orden de Compra:</span>
                    <p className="font-mono text-[#003B70] dark:text-[#38BDF8] font-bold">{selectedAssetForDetail.purchaseOrderNumber}</p>
                  </div>
                )}
                {selectedAssetForDetail.leasingContractNumber && (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">Contrato Arriendo:</span>
                    <p className="font-mono text-purple-700 dark:text-purple-300 font-bold">{selectedAssetForDetail.leasingContractNumber}</p>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Vence: {formatDate(selectedAssetForDetail.contractEndDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Kardex de Auditoría */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-[#003B70] dark:text-[#38BDF8]" />
                <span className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">Historial de Trazabilidad & Movimientos (Kardex)</span>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {storage.getAuditLogs(selectedAssetForDetail.id).map(log => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0D182B] border border-slate-200 dark:border-[#1E3352] flex justify-between items-center text-[11px]">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{log.changeReason}</p>
                      <span className="text-slate-500 dark:text-slate-400">Por: {log.changedByUserName} • {log.branchName}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <StatusBadge status={log.newStatus} />
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{formatDateTime(log.timestamp)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-[#1E3352]">
              <button
                onClick={() => PDFService.generateAssetStickersPDF([selectedAssetForDetail])}
                className="gov-btn-secondary"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Etiqueta QR
              </button>
              <button
                onClick={() => setSelectedAssetForDetail(null)}
                className="gov-btn-primary"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Cambiar Estado */}
      {statusChangeModalAsset && (
        <Modal
          isOpen={!!statusChangeModalAsset}
          onClose={() => setStatusChangeModalAsset(null)}
          title="Modificar Estado del Activo"
          subtitle={`Serie: ${statusChangeModalAsset.serialNumber} • ${statusChangeModalAsset.brand} ${statusChangeModalAsset.model}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            {statusModalError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{statusModalError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nuevo Estado Operativo *</label>
              <SearchableSelect
                value={newStatusChoice}
                onChange={(val) => setNewStatusChoice(val as AssetStatus)}
                options={[
                  { value: 'BODEGA_DISPONIBLE', label: 'Bodega Disponible (Listo para entrega)', badge: 'Disponible' },
                  { value: 'EN_MANTENCION', label: 'En Mantención / Taller Técnico', badge: 'Soporte' },
                  { value: 'DADO_DE_BAJA', label: 'Dado de Baja Técnica / Obsoleto', badge: 'Baja' },
                  { value: 'DEVUELTO_PROVEEDOR', label: 'Devuelto a Proveedor (Fin de Arriendo)', badge: 'Proveedor' }
                ]}
                placeholder="Seleccione nuevo estado..."
                searchPlaceholder="Filtrar estado..."
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Motivo / Justificación de Auditoría *</label>
              <textarea
                rows={3}
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder="Ej: Falla de pantalla. Se deriva a servicio técnico de proveedor..."
                className="gov-input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                onClick={() => setStatusChangeModalAsset(null)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmStatusChange}
                className="gov-btn-primary"
              >
                Confirmar Cambio de Estado
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
