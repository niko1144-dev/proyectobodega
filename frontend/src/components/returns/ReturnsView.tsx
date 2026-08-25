import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  CheckSquare, 
  Square,
  AlertCircle,
  Building2,
  Lock
} from 'lucide-react';
import { Assignment } from '../../types/assignment';
import { AssetStatus, PhysicalCondition } from '../../types/asset';
import { Branch } from '../../types/document';
import { PropertyBadge, AssignmentStatusBadge } from '../common/Badge';
import { SearchableSelect } from '../common/SearchableSelect';
import { formatDate, normalizeText } from '../../utils/formatters';
import { ApiClient } from '../../api/client';

export const ReturnsView: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Bodega de Destino del Activo Devuelto
  const [selectedReturnBranchId, setSelectedReturnBranchId] = useState<string>('');

  // Estados de los ítems a devolver
  const [returnItemsState, setReturnItemsState] = useState<Record<string, {
    selected: boolean;
    condition: PhysicalCondition;
    destinationStatus: AssetStatus;
    notes: string;
  }>>({});

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadData = async () => {
    const [active, bList] = await Promise.all([
      ApiClient.getAssignments(),
      ApiClient.getBranches()
    ]);
    setAssignments(active.filter(a => a.status !== 'DEVUELTO_COMPLETO' && a.status !== 'ANULADO'));
    setBranches(bList);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('itam_storage_updated', loadData);
    return () => window.removeEventListener('itam_storage_updated', loadData);
  }, []);

  const handleSelectAssignment = (act: Assignment) => {
    setSelectedAssignment(act);
    setSelectedReturnBranchId(act.branchId || (branches.length > 0 ? branches[0].id : ''));
    setSuccessMsg(null);
    setErrorMsg(null);

    const initialState: Record<string, any> = {};
    act.items.forEach(item => {
      if (!item.isReturned && item.assetId) {
        initialState[item.id] = {
          selected: true,
          condition: item.conditionAtAssignment || 'BUENO',
          destinationStatus: 'BODEGA_DISPONIBLE',
          notes: 'Reingreso conforme a bodega por término de funciones.'
        };
      }
    });
    setReturnItemsState(initialState);
  };

  const handleToggleItem = (itemId: string) => {
    setReturnItemsState(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: !prev[itemId]?.selected
      }
    }));
  };

  const handleUpdateItemField = (itemId: string, field: string, value: any) => {
    setReturnItemsState(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const returnBranchObj = branches.find(b => b.id === selectedReturnBranchId) || branches[0];

  const handleProcessReturn = async () => {
    setErrorMsg(null);
    if (!selectedAssignment) return;

    if (!selectedReturnBranchId) {
      setErrorMsg('Debe seleccionar obligatoriamente la Bodega de Reingreso para los activos devueltos.');
      return;
    }

    const toProcess = Object.entries(returnItemsState)
      .filter(([_, state]) => state.selected)
      .map(([itemId, state]) => ({
        itemId,
        condition: state.condition || 'BUENO',
        destinationStatus: state.destinationStatus || 'BODEGA_DISPONIBLE',
        notes: state.notes.trim() || 'Reingreso conforme a bodega'
      }));

    if (toProcess.length === 0) {
      setErrorMsg('Debe marcar al menos un equipo en las casillas de verificación para procesar la devolución.');
      return;
    }

    setIsProcessing(true);
    try {
      await ApiClient.processReturn(selectedAssignment.id, toProcess, selectedReturnBranchId);
      setSuccessMsg(
        `✓ Se procesó la devolución de ${toProcess.length} equipo(s) con reingreso exitoso a la bodega '${returnBranchObj?.name || 'seleccionada'}'.`
      );
      setSelectedAssignment(null);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la devolución.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredAssignments = assignments.filter(a => {
    if (!searchTerm.trim()) return true;
    const words = normalizeText(searchTerm).split(/\s+/).filter(Boolean);
    const itemsText = a.items.map(i => `${i.serialNumber || ''} ${i.inventoryNumber || ''} ${i.assetTypeName || ''} ${i.model || ''}`).join(' ');
    const target = normalizeText(
      `${a.recipientName} ${a.recipientRut} ${a.actNumber} ${a.branchName || ''} ${itemsText}`
    );
    return words.every(w => target.includes(w));
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div>
        <h1 className="text-2xl font-extrabold text-[#003B70] tracking-tight">Módulo de Devoluciones & Retorno TI</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Recepción y reingreso de equipamiento asignado con evaluación de condición física y reubicación exacta por bodega
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-800 font-bold hover:underline">
            Cerrar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda */}
        <div className="gov-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Actas Activas Pendientes de Devolución</h3>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar funcionario, RUT o N° serie..."
              className="gov-input gov-input-with-icon"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredAssignments.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 text-center">No hay asignaciones pendientes.</p>
            ) : (
              filteredAssignments.map(act => {
                const isSelected = selectedAssignment?.id === act.id;
                const activeEquipment = act.items.filter(i => !i.isReturned && i.assetId);

                return (
                  <div
                    key={act.id}
                    onClick={() => handleSelectAssignment(act)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#EBF3FA] border-[#003B70] text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-[#003B70]">{act.actNumber}</span>
                      <span className="text-[10px] text-slate-400">{formatDate(act.createdAt)}</span>
                    </div>

                    <div className="font-bold text-sm text-slate-900 mt-1">{act.recipientName}</div>
                    <div className="text-[11px] text-slate-500">{act.recipientRut} • {act.recipientBranchName}</div>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-700 font-bold">{activeEquipment.length} equipos activos</span>
                      <AssignmentStatusBadge status={act.status} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha */}
        <div className="gov-card p-5 lg:col-span-2 space-y-4">
          {!selectedAssignment ? (
            <div className="p-16 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
              <RotateCcw className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              Seleccione una asignación de la lista para procesar el retorno de equipamiento.
            </div>
          ) : (
            <div className="space-y-5 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-[#003B70]">Devolución Acta {selectedAssignment.actNumber}</h3>
                  <p className="text-[11px] text-slate-500">Funcionario: <strong>{selectedAssignment.recipientName} ({selectedAssignment.recipientRut})</strong></p>
                </div>
                <button
                  onClick={() => setSelectedAssignment(null)}
                  className="gov-btn-secondary py-1 px-2.5 text-xs"
                >
                  Cerrar
                </button>
              </div>

              {/* Selector Destacado de Bodega de Destino / Reingreso con Búsqueda */}
              <div className="p-4 rounded-xl bg-[#003B70] text-white space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-blue-200 shrink-0" />
                    <div>
                      <span className="font-bold text-sm block">Bodega de Reingreso (Destino Físico del Activo) *</span>
                      <span className="text-[11px] text-blue-100">Seleccione la sucursal/bodega donde se almacenará físicamente el equipo retornado</span>
                    </div>
                  </div>

                  <div className="w-64">
                    <SearchableSelect
                      value={selectedReturnBranchId}
                      onChange={(val) => setSelectedReturnBranchId(val)}
                      options={branches.map(b => ({
                        value: b.id,
                        label: b.name,
                        sublabel: `${b.region} • ${b.address}`,
                        badge: b.code
                      }))}
                      placeholder="Seleccione bodega..."
                      searchPlaceholder="Filtrar bodega..."
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-blue-200 border-t border-blue-800/60">
                  <span>Los activos devueltos quedarán registrados en el inventario de: <strong className="text-white">{returnBranchObj?.name}</strong></span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Lista de Equipos */}
              <div className="space-y-3">
                <span className="font-bold text-slate-800 text-xs block">Seleccione los equipos que están siendo devueltos:</span>

                {selectedAssignment.items.filter(i => i.assetId).map(item => {
                  const state = returnItemsState[item.id];
                  if (item.isReturned) {
                    return (
                      <div key={item.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 opacity-60 flex justify-between items-center">
                        <div>
                          <div className="font-bold text-slate-700">{item.brand} {item.model} (S/N: {item.serialNumber})</div>
                          <div className="text-[10px] text-slate-400">Devuelto el {formatDate(item.returnedAt)}: {item.returnNotes}</div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">YA DEVUELTO</span>
                      </div>
                    );
                  }

                  if (!state) return null;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-xl border transition-all ${
                        state.selected ? 'bg-[#EBF3FA]/50 border-[#003B70]' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleItem(item.id)}
                            className="text-[#003B70]"
                          >
                            {state.selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
                          </button>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{item.brand} {item.model}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              Serie: <strong className="text-slate-900">{item.serialNumber}</strong> {item.inventoryNumber && `• Inv: ${item.inventoryNumber}`}
                            </div>
                          </div>
                        </div>

                        {item.propertyType && <PropertyBadge type={item.propertyType} />}
                      </div>

                      {state.selected && (
                        <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Condición Física de Retorno:</label>
                            <SearchableSelect
                              value={state.condition}
                              onChange={(val) => handleUpdateItemField(item.id, 'condition', val)}
                              options={[
                                { value: 'BUENO', label: 'Bueno (Sin daños)', badge: 'Óptimo' },
                                { value: 'NUEVO', label: 'Como Nuevo', badge: 'Impecable' },
                                { value: 'REGULAR', label: 'Regular (Desgaste estético)', badge: 'Desgaste' },
                                { value: 'DETERIORADO', label: 'Deteriorado (Con fallas)', badge: 'Falla' },
                                { value: 'DANADO', label: 'Dañado / Inoperativo', badge: 'Inoperativo' }
                              ]}
                              placeholder="Condición..."
                              searchPlaceholder="Filtrar condición..."
                            />
                          </div>

                          <div>
                            <label className="block text-slate-700 font-bold mb-1">Destino del Activo en {returnBranchObj?.name}:</label>
                            <SearchableSelect
                              value={state.destinationStatus}
                              onChange={(val) => handleUpdateItemField(item.id, 'destinationStatus', val)}
                              options={[
                                { value: 'BODEGA_DISPONIBLE', label: 'Reingreso a Bodega Disponible', badge: 'Disponible' },
                                { value: 'EN_MANTENCION', label: 'Derivar a Taller / Mantención', badge: 'Soporte' },
                                { value: 'DADO_DE_BAJA', label: 'Dar de Baja Definitiva (CGR)', badge: 'Baja' },
                                { value: 'DEVUELTO_PROVEEDOR', label: 'Devolver a Proveedor (Fin Leasing)', badge: 'Proveedor' }
                              ]}
                              placeholder="Destino..."
                              searchPlaceholder="Filtrar destino..."
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-slate-700 font-bold mb-1">Observaciones de la Devolución:</label>
                            <input
                              type="text"
                              value={state.notes}
                              onChange={(e) => handleUpdateItemField(item.id, 'notes', e.target.value)}
                              placeholder="Ej: Equipo devuelto con cargador original, reingresado a bodega..."
                              className="gov-input"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleProcessReturn}
                  className="gov-btn-primary disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isProcessing ? 'Procesando Reingreso...' : `Confirmar y Reingresar Equipos a ${returnBranchObj?.name}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
