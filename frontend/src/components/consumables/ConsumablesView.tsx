import React, { useState, useEffect } from 'react';
import { 
  Cable, 
  Plus, 
  Minus, 
  AlertTriangle, 
  History, 
  Building2, 
  ArrowDownRight, 
  ArrowUpRight, 
  Search,
  AlertCircle,
  ShieldAlert,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { Consumable, ConsumableStock, StockMovement } from '../../types/asset';
import { Branch } from '../../types/document';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';
import { formatDateTime, normalizeText } from '../../utils/formatters';
import { ApiClient } from '../../api/client';

interface ConsumablesViewProps {
  currentBranchId: string;
}

export const ConsumablesView: React.FC<ConsumablesViewProps> = ({ currentBranchId }) => {
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [stocks, setStocks] = useState<ConsumableStock[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  // Sucursal / Bodega seleccionada obligatoriamente para control de stock
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal Movimiento
  const [isMovementModalOpen, setIsMovementModalOpen] = useState<boolean>(false);
  const [selectedConsumable, setSelectedConsumable] = useState<Consumable | null>(null);
  const [movementType, setMovementType] = useState<'INGRESO_GUIA' | 'ENTREGA_FUNCIONARIO' | 'AJUSTE_INVENTARIO'>('INGRESO_GUIA');
  const [movementQuantity, setMovementQuantity] = useState<number>(1);
  const [movementReason, setMovementReason] = useState<string>('');
  const [recipientName, setRecipientName] = useState<string>('');
  const [modalBranchId, setModalBranchId] = useState<string>('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  const loadData = async () => {
    const b = await ApiClient.getBranches();
    setBranches(b);

    // Determinar sucursal inicial
    let targetBranch = selectedBranchId;
    if (!targetBranch) {
      if (currentBranchId && currentBranchId !== 'ALL') {
        targetBranch = currentBranchId;
      } else if (b.length > 0) {
        targetBranch = b[0].id;
      }
      setSelectedBranchId(targetBranch);
    }

    const [cns, stks] = await Promise.all([
      ApiClient.getConsumables(),
      ApiClient.getConsumableStocks(targetBranch || undefined),
    ]);

    setConsumables(cns);
    setStocks(stks);
    
    // Movimientos
    try {
      const res = await fetch(`/api/v1/consumables/movements${targetBranch ? `?branchId=${targetBranch}` : ''}`);
      if (res.ok) {
        setMovements(await res.json());
      }
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedBranchId]);

  useEffect(() => {
    if (currentBranchId && currentBranchId !== 'ALL') {
      setSelectedBranchId(currentBranchId);
    }
  }, [currentBranchId]);

  const activeBranchObj = branches.find(b => b.id === selectedBranchId);

  const handleOpenMovementModal = (consumable: Consumable, type: 'INGRESO_GUIA' | 'ENTREGA_FUNCIONARIO') => {
    if (!selectedBranchId) {
      alert('Debe seleccionar obligatoriamente una sucursal/bodega antes de modificar el stock.');
      return;
    }
    setSelectedConsumable(consumable);
    setMovementType(type);
    setMovementQuantity(1);
    setMovementReason('');
    setRecipientName('');
    setModalBranchId(selectedBranchId);
    setModalError(null);
    setIsMovementModalOpen(true);
  };

  const handleConfirmMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedConsumable || !modalBranchId) {
      setModalError('Debe existir un insumo y una sucursal/bodega válida seleccionada.');
      return;
    }

    if (movementQuantity <= 0 || isNaN(movementQuantity)) {
      setModalError('La cantidad del movimiento debe ser un número entero mayor a 0.');
      return;
    }

    if (movementType === 'ENTREGA_FUNCIONARIO' && !recipientName.trim()) {
      setModalError('Debe ingresar el nombre o RUT del funcionario que recibe el accesorio.');
      return;
    }

    if (!movementReason.trim()) {
      setModalError('Debe ingresar el motivo o justificación del movimiento.');
      return;
    }

    try {
      await ApiClient.registerStockMovement({
        consumableId: selectedConsumable.id,
        branchId: modalBranchId,
        movementType,
        quantity: movementQuantity,
        reason: movementReason.trim(),
        recipientUserName: recipientName.trim() || undefined
      });

      setIsMovementModalOpen(false);
      setSuccessFeedback(`✓ Movimiento de stock registrado exitosamente en ${activeBranchObj?.name || 'la bodega'}.`);
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Error al registrar el movimiento.');
    }
  };

  const filteredConsumables = consumables.filter(c => {
    if (!searchTerm.trim()) return true;
    const words = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
    const target = normalizeText(`${c.name} ${c.sku} ${c.category}`);
    return words.every(w => target.includes(w));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003B70] tracking-tight">Accesorios & Insumos No Inventariables</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Control de stock cuantitativo por bodega física para cables, adaptadores y periféricos
          </p>
        </div>

        {/* Selector Obligatorio de Sucursal Bodega con Búsqueda */}
        <div className="w-64">
          <SearchableSelect
            value={selectedBranchId}
            onChange={(val) => setSelectedBranchId(val)}
            options={branches.map(b => ({
              value: b.id,
              label: b.name,
              sublabel: `${b.region} • ${b.address}`,
              badge: b.code
            }))}
            placeholder="-- Seleccione Bodega Activa --"
            searchPlaceholder="Filtrar bodega por nombre..."
            icon={<Building2 className="w-4 h-4 text-[#003B70]" />}
          />
        </div>
      </div>

      {successFeedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successFeedback}</span>
          </div>
          <button onClick={() => setSuccessFeedback(null)} className="text-emerald-800 font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      {/* Alerta si no hay bodega seleccionada */}
      {!selectedBranchId ? (
        <div className="p-6 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-4">
          <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-amber-900">Selección de Bodega Obligatoria</h3>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
              Para buscar insumos y registrar entradas o salidas sin alterar inventarios ajenos por error, debe seleccionar la <strong>Sucursal / Bodega física</strong> en el selector superior.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Barra de Búsqueda y Estado de la Bodega */}
          <div className="gov-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar insumo por nombre o SKU en ${activeBranchObj?.name || 'esta bodega'}...`}
                className="gov-input gov-input-with-icon"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Building2 className="w-4 h-4 text-[#003B70]" />
              <span>
                Bodega: <strong className="text-slate-900 font-bold">{activeBranchObj?.name}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Stock: <strong className="text-[#003B70]">{filteredConsumables.length} ítems</strong>
              </span>
            </div>
          </div>

          {/* Grid de Insumos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConsumables.map(consumable => {
              const stockItem = stocks.find(s => s.consumableId === consumable.id);
              const currentQty = stockItem ? stockItem.currentQuantity : 0;
              const isCritical = currentQty <= consumable.minStockAlert;

              return (
                <div
                  key={consumable.id}
                  className={`gov-card p-5 space-y-4 transition-all ${
                    isCritical ? 'border-red-300 bg-red-50/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {consumable.sku}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-2 leading-tight">{consumable.name}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">{consumable.description || 'Accesorio no inventariable'}</p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#EBF3FA] text-[#003B70] border border-[#BFDBFE]">
                      <Cable className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Indicador de Stock en la Bodega Seleccionada */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-2xl font-black ${isCritical ? 'text-[#E4002B]' : 'text-[#003B70]'}`}>
                          {currentQty}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">unidades</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5">
                        {isCritical ? (
                          <span className="text-[#E4002B] font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Stock Crítico (Mín: {consumable.minStockAlert})
                          </span>
                        ) : (
                          <span>Stock adecuado (Mín: {consumable.minStockAlert})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenMovementModal(consumable, 'ENTREGA_FUNCIONARIO')}
                        disabled={currentQty === 0}
                        title={`Registrar Salida de ${consumable.name} en ${activeBranchObj?.name}`}
                        className="gov-btn-secondary p-2 disabled:opacity-40"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenMovementModal(consumable, 'INGRESO_GUIA')}
                        title={`Ingresar Stock de ${consumable.name} a ${activeBranchObj?.name}`}
                        className="gov-btn-primary p-2"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Historial Kardex de la Bodega */}
          <div className="gov-card p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <History className="w-4 h-4 text-[#003B70]" />
              <h3 className="text-sm font-bold text-slate-800">
                Últimos Movimientos de Stock en {activeBranchObj?.name}
              </h3>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003B70] text-white">
                  <tr>
                    <th className="px-3 py-2 font-bold">Tipo</th>
                    <th className="px-3 py-2 font-bold">Accesorio / Insumo</th>
                    <th className="px-3 py-2 font-bold">Cantidad</th>
                    <th className="px-3 py-2 font-bold">Motivo / Destinatario</th>
                    <th className="px-3 py-2 font-bold">Registrado Por</th>
                    <th className="px-3 py-2 font-bold">Fecha / Hora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400">
                        Sin movimientos recientes en {activeBranchObj?.name}.
                      </td>
                    </tr>
                  ) : (
                    movements.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          {m.movementType === 'INGRESO_GUIA' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <ArrowUpRight className="w-3.5 h-3.5" /> Entrada
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[#003B70] font-bold">
                              <ArrowDownRight className="w-3.5 h-3.5" /> Salida
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{m.consumableName}</td>
                        <td className="px-3 py-2 font-bold">{m.quantity} un.</td>
                        <td className="px-3 py-2 text-slate-600">
                          {m.reason}
                          {m.recipientUserName && <span className="text-[#003B70] font-bold"> ({m.recipientUserName})</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{m.registeredByUserName}</td>
                        <td className="px-3 py-2 text-slate-400">{formatDateTime(m.timestamp)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal Movimiento */}
      {selectedConsumable && (
        <Modal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title={movementType === 'INGRESO_GUIA' ? 'Ingreso de Stock de Accesorio' : 'Registro de Entrega / Salida'}
          subtitle={`${selectedConsumable.name} (${selectedConsumable.sku})`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmMovement} className="space-y-4 text-xs">
            {modalError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Bodega Destino Bloqueada / Confirmada */}
            <div className="p-3 rounded-lg bg-[#EBF3FA] border border-[#BFDBFE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#003B70]" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Bodega Física Afectada:</span>
                  <span className="text-xs font-bold text-[#003B70]">{activeBranchObj?.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                <Lock className="w-3 h-3" /> Fija
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Cantidad de Unidades (mayor a 0) *</label>
              <input
                type="number"
                min="1"
                value={movementQuantity}
                onChange={(e) => setMovementQuantity(parseInt(e.target.value, 10) || 1)}
                className="gov-input font-bold"
                required
                autoFocus
              />
            </div>

            {movementType === 'ENTREGA_FUNCIONARIO' && (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nombre o RUT del Funcionario Receptor *</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Ej: Carla Morales (Atención Presencial)"
                  className="gov-input"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Motivo / Justificación del Movimiento *</label>
              <textarea
                rows={2}
                value={movementReason}
                onChange={(e) => setMovementReason(e.target.value)}
                placeholder="Ej: Reposición de puesto módulo 2 / Entrega de cable HDMI..."
                className="gov-input"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsMovementModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="gov-btn-primary"
              >
                Confirmar Movimiento en {activeBranchObj?.name}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
