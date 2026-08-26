import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  UserCheck, 
  Laptop, 
  Cable, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Search,
  Building2,
  FileCheck2,
  Layers,
  Shield,
  Lock,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { storage } from '../../db/storage';
import { Asset, Consumable, ConsumableStock } from '../../types/asset';
import { Assignment, AssignmentItem, AssignmentType } from '../../types/assignment';
import { ADUser } from '../../types/user';
import { Branch } from '../../types/document';
import { SignaturePad } from '../common/SignaturePad';
import { Modal } from '../common/Modal';
import { formatDate, generateSHA256 } from '../../utils/formatters';
import { PDFService } from '../../services/pdfService';
import { ApiClient } from '../../api/client';
import { AssignmentStatusBadge, PropertyBadge } from '../common/Badge';
import { SearchableSelect } from '../common/SearchableSelect';

interface AssignmentsViewProps {
  currentBranchId: string;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ currentBranchId }) => {
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');

  // Maestros
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Bodega de Origen Obligatoria para salida de stock
  const [selectedOriginBranchId, setSelectedOriginBranchId] = useState<string>('');

  // Selector de Funcionarios (Active Directory)
  const [adSearchQuery, setAdSearchQuery] = useState<string>('');
  const [adSearchResults, setAdSearchResults] = useState<ADUser[]>([]);
  const [isSearchingAD, setIsSearchingAD] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<ADUser | null>(null);

  // Selector de Activos Disponibles
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [selectedItemsList, setSelectedItemsList] = useState<AssignmentItem[]>([]);

  // Selector de Consumibles
  const [availableConsumables, setAvailableConsumables] = useState<Consumable[]>([]);
  const [consumableStocks, setConsumableStocks] = useState<ConsumableStock[]>([]);
  const [selectedConsumableId, setSelectedConsumableId] = useState<string>('');
  const [consumableQty, setConsumableQty] = useState<number>(1);

  // Datos Generales
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('ENTREGA_INICIAL');
  const [observations, setObservations] = useState<string>('Entrega de equipamiento para puesto de trabajo en módulo de atención.');

  // Modales y Feedback
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [pendingAssignmentDraft, setPendingAssignmentDraft] = useState<Assignment | null>(null);
  const [completedAssignment, setCompletedAssignment] = useState<Assignment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadData = async () => {
    const [b, asgs, assetsData, cns] = await Promise.all([
      ApiClient.getBranches(),
      ApiClient.getAssignments(),
      ApiClient.getAssets({ status: 'BODEGA_DISPONIBLE' }),
      ApiClient.getConsumables()
    ]);

    setBranches(b);
    setAssignments(asgs);
    setAllAssets(assetsData);
    setAvailableConsumables(cns);

    // Inicializar sucursal de origen si no está seteada
    if (b.length > 0 && !selectedOriginBranchId) {
      const initialBranch = (currentBranchId && currentBranchId !== 'ALL') ? currentBranchId : b[0].id;
      setSelectedOriginBranchId(initialBranch);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('itam_storage_updated', loadData);
    return () => window.removeEventListener('itam_storage_updated', loadData);
  }, [currentBranchId]);

  // Cargar stocks de insumos específicos de la bodega de origen seleccionada
  useEffect(() => {
    if (!selectedOriginBranchId) return;
    const fetchStocks = async () => {
      const stks = await ApiClient.getConsumableStocks(selectedOriginBranchId);
      setConsumableStocks(stks);
    };
    fetchStocks();
  }, [selectedOriginBranchId]);

  // Sincronizar si cambia el selector global de sucursal
  useEffect(() => {
    if (currentBranchId && currentBranchId !== 'ALL' && currentBranchId !== selectedOriginBranchId) {
      handleOriginBranchChange(currentBranchId);
    }
  }, [currentBranchId]);

  // Búsqueda en Active Directory
  useEffect(() => {
    if (!adSearchQuery.trim()) {
      setAdSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearchingAD(true);
      const results = await ApiClient.searchDirectoryUsers(adSearchQuery);
      setAdSearchResults(results);
      setIsSearchingAD(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [adSearchQuery]);

  const originBranchObj = branches.find(b => b.id === selectedOriginBranchId) || branches[0];

  // Activos disponibles estrictamente en la bodega de origen seleccionada
  const availableAssetsInBranch = allAssets.filter(
    a => a.status === 'BODEGA_DISPONIBLE' && a.currentBranchId === selectedOriginBranchId
  );

  const handleOriginBranchChange = (newBranchId: string) => {
    if (selectedItemsList.length > 0 && newBranchId !== selectedOriginBranchId) {
      const confirmChange = window.confirm(
        'Al cambiar la Bodega de Origen se reiniciará la lista de equipos agregados para asegurar que todos los bienes salgan físicamente de la misma bodega. ¿Desea continuar?'
      );
      if (!confirmChange) return;
      setSelectedItemsList([]);
    }
    setSelectedOriginBranchId(newBranchId);
    setSelectedAssetId('');
    setSelectedConsumableId('');
    setErrorMsg(null);
  };

  const handleSelectUser = (user: ADUser) => {
    setSelectedUser(user);
    setAdSearchQuery('');
    setAdSearchResults([]);
    setErrorMsg(null);
  };

  const handleAddAsset = () => {
    setErrorMsg(null);
    if (!selectedOriginBranchId) {
      setErrorMsg('Debe seleccionar obligatoriamente la Bodega de Origen antes de agregar equipos.');
      return;
    }

    if (!selectedAssetId) {
      setErrorMsg('Seleccione un equipo disponible en la lista desplegable antes de agregarlo.');
      return;
    }

    const asset = availableAssetsInBranch.find(a => a.id === selectedAssetId);
    if (!asset) {
      setErrorMsg('El equipo seleccionado no está disponible en la bodega de origen activa.');
      return;
    }

    if (selectedItemsList.some(i => i.assetId === asset.id)) {
      setErrorMsg(`El equipo '${asset.serialNumber}' ya está agregado en la lista actual.`);
      return;
    }

    const newItem: AssignmentItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      assignmentId: '',
      assetId: asset.id,
      serialNumber: asset.serialNumber,
      inventoryNumber: asset.inventoryNumber,
      brand: asset.brand,
      model: asset.model,
      assetTypeName: asset.assetTypeName,
      propertyType: asset.propertyType,
      conditionAtAssignment: asset.physicalCondition,
      quantity: 1,
      isReturned: false
    };

    setSelectedItemsList([...selectedItemsList, newItem]);
    setSelectedAssetId('');
  };

  const handleAddConsumable = () => {
    setErrorMsg(null);
    if (!selectedOriginBranchId) {
      setErrorMsg('Debe seleccionar obligatoriamente la Bodega de Origen antes de agregar insumos.');
      return;
    }

    if (!selectedConsumableId) {
      setErrorMsg('Seleccione un accesorio o insumo de la lista antes de agregarlo.');
      return;
    }

    if (consumableQty <= 0 || isNaN(consumableQty)) {
      setErrorMsg('La cantidad de accesorios debe ser mayor a 0.');
      return;
    }

    const consumable = availableConsumables.find(c => c.id === selectedConsumableId);
    if (!consumable) return;

    const stockItem = consumableStocks.find(s => s.consumableId === consumable.id);
    const availableStock = stockItem ? stockItem.currentQuantity : 0;

    if (availableStock < consumableQty) {
      setErrorMsg(`Stock insuficiente en ${originBranchObj?.name || 'esta bodega'}. Disponible: ${availableStock} unidades.`);
      return;
    }

    const existingIndex = selectedItemsList.findIndex(i => i.consumableId === consumable.id);
    if (existingIndex >= 0) {
      const totalQty = selectedItemsList[existingIndex].quantity + consumableQty;
      if (totalQty > availableStock) {
        setErrorMsg(`La cantidad total (${totalQty}) excede el stock disponible (${availableStock} un.) en ${originBranchObj?.name}.`);
        return;
      }
      const updatedList = [...selectedItemsList];
      updatedList[existingIndex].quantity = totalQty;
      setSelectedItemsList(updatedList);
    } else {
      const newItem: AssignmentItem = {
        id: `item-${Date.now()}-${Math.random()}`,
        assignmentId: '',
        consumableId: consumable.id,
        consumableSku: consumable.sku,
        consumableName: consumable.name,
        quantity: consumableQty,
        conditionAtAssignment: 'NUEVO',
        isReturned: false
      };
      setSelectedItemsList([...selectedItemsList, newItem]);
    }

    setConsumableQty(1);
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItemsList(selectedItemsList.filter(i => i.id !== id));
  };

  const handlePrepareAct = async () => {
    setErrorMsg(null);
    if (!selectedOriginBranchId) {
      setErrorMsg('Debe seleccionar la Bodega de Origen desde la cual saldrán los bienes.');
      return;
    }

    if (!selectedUser) {
      setErrorMsg('Debe seleccionar un funcionario receptor desde el Directorio Activo (Active Directory).');
      return;
    }

    if (selectedItemsList.length === 0) {
      setErrorMsg('Debe agregar al menos un equipo o accesorio a la lista de entrega para generar el acta.');
      return;
    }

    const branchObj = originBranchObj || branches[0];
    const currentUser = storage.getCurrentUser();
    const actNumber = `ACT-${new Date().getFullYear()}-${String(assignments.length + 1).padStart(5, '0')}`;

    const draft: Assignment = {
      id: `asg-${Date.now()}`,
      actNumber,
      assignmentType,
      recipientUserId: selectedUser.id,
      recipientName: selectedUser.fullName,
      recipientRut: selectedUser.rut,
      recipientEmail: selectedUser.email,
      recipientJobTitle: selectedUser.jobTitle,
      recipientDepartment: selectedUser.department,
      recipientBranchName: branchObj.name,
      technicianUserId: currentUser.id,
      technicianName: currentUser.fullName,
      technicianRut: currentUser.rut,
      branchId: branchObj.id,
      branchName: branchObj.name,
      status: 'PENDIENTE_FIRMA',
      items: selectedItemsList,
      observations: observations.trim(),
      createdAt: new Date().toISOString()
    };

    setPendingAssignmentDraft(draft);
    setIsSignatureModalOpen(true);
  };

  const handleSaveSignatureAndComplete = async (signatureDataUrl?: string) => {
    if (!pendingAssignmentDraft) return;

    setIsProcessing(true);
    try {
      const hashPayload = `${pendingAssignmentDraft.actNumber}|${pendingAssignmentDraft.recipientRut}|${pendingAssignmentDraft.createdAt}|${signatureDataUrl ? 'DIGITAL' : 'PHYSICAL'}`;
      const hash = await generateSHA256(hashPayload);

      const payload = {
        ...pendingAssignmentDraft,
        signatureDataUrl: signatureDataUrl || undefined,
        signedByName: pendingAssignmentDraft.recipientName,
        digitalSignatureHash: hash
      };

      const saved = await ApiClient.createAssignment(payload);
      const finalAct = saved.assignment || pendingAssignmentDraft;

      setIsSignatureModalOpen(false);
      setCompletedAssignment(finalAct);
      setSelectedUser(null);
      setSelectedItemsList([]);
      setObservations('');
      loadData();

      // Abrir automáticamente el PDF en el visor nativo / nueva ventana
      try {
        await PDFService.openActPDFInNewWindow(finalAct);
      } catch (pdfErr) {
        console.warn('No se pudo abrir automáticamente la nueva ventana:', pdfErr);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al emitir el acta.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003B70] tracking-tight">Asignaciones & Actas Oficiales TI</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Entrega formal de hardware a funcionarios con validación en Active Directory y deducción exacta de stock por bodega
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
          <button
            onClick={() => { setActiveTab('NEW'); setCompletedAssignment(null); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'NEW' ? 'bg-[#003B70] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nueva Asignación
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'HISTORY' ? 'bg-[#003B70] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historial de Actas ({assignments.length})
          </button>
        </div>
      </div>

      {/* Banner de Éxito */}
      {completedAssignment && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">¡Acta {completedAssignment.actNumber} Emitida Exitosamente!</h3>
              <p className="text-xs text-emerald-700">
                Los activos fueron asignados a <strong>{completedAssignment.recipientName} ({completedAssignment.recipientRut})</strong> y descontados de <strong>{completedAssignment.branchName}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => PDFService.downloadActPDF(completedAssignment)}
              className="gov-btn-primary bg-emerald-700 hover:bg-emerald-800"
            >
              <Download className="w-4 h-4" />
              Descargar Acta Oficial PDF
            </button>
            <button
              onClick={() => setCompletedAssignment(null)}
              className="px-3 py-2 text-xs font-bold text-emerald-800 hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {activeTab === 'NEW' ? (
        <div className="space-y-6">
          {/* 1. Funcionario Active Directory */}
          <div className="gov-card p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-5 h-5 rounded-full bg-[#003B70] text-white flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="text-sm font-bold text-slate-800">Identificación del Funcionario (Active Directory / LDAP)</h3>
            </div>

            {!selectedUser ? (
              <div className="space-y-3">
                <label className="block text-xs text-slate-700 font-bold">
                  Buscar funcionario por RUT, Nombre, Usuario de Red o Correo Institucional:
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={adSearchQuery}
                    onChange={(e) => setAdSearchQuery(e.target.value)}
                    placeholder="Escriba RUT (ej: 15.678...) o Nombre (ej: Carla Morales)..."
                    className="gov-input gov-input-with-icon"
                    autoFocus
                  />
                  {isSearchingAD && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#003B70]">
                      Consultando AD...
                    </span>
                  )}
                </div>

                {adSearchResults.length > 0 && (
                  <div className="border border-slate-200 bg-white rounded-lg overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto shadow-gov-dropdown">
                    {adSearchResults.map(u => (
                      <div
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className="p-3 hover:bg-[#EBF3FA] cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#003B70] text-white flex items-center justify-center font-bold">
                            {u.firstName[0]}{u.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.fullName}</div>
                            <div className="text-[11px] text-slate-500">{u.jobTitle} • {u.department}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-[#003B70]">{u.rut}</span>
                          <div className="text-[10px] text-slate-400">{u.branchName}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#EBF3FA] border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 overflow-hidden">
                <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#003B70] flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0">
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{selectedUser.fullName}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[#ECFDF5] text-[#065F46] font-bold border border-[#A7F3D0] shrink-0">
                        Activo AD
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 truncate">{selectedUser.jobTitle} • {selectedUser.department}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-600 mt-1">
                      <span>RUT: <strong className="text-slate-900 font-mono">{selectedUser.rut}</strong></span>
                      <span>Correo: <strong className="text-slate-900 break-all">{selectedUser.email}</strong></span>
                      <span>Sucursal: <strong className="text-slate-900">{selectedUser.branchName}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="gov-btn-secondary w-full sm:w-auto shrink-0 text-xs py-2"
                >
                  Cambiar Funcionario
                </button>
              </div>
            )}
          </div>

          {/* 2. Selección de Bodega de Origen y Bienes */}
          <div className="gov-card p-4 sm:p-5 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-5 h-5 rounded-full bg-[#003B70] text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <h3 className="text-sm font-bold text-slate-800">Bodega de Origen & Selección de Bienes a Entregar</h3>
            </div>

            {/* Selector Destacado de Bodega de Origen con Búsqueda */}
            <div className="p-4 rounded-xl bg-[#003B70] text-white space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-5 h-5 text-blue-200 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate">Bodega de Origen (Salida y Descuento de Stock) *</span>
                    <span className="text-[11px] text-blue-100 block">Seleccione la bodega física de donde saldrán los equipos e insumos</span>
                  </div>
                </div>

                <div className="w-full sm:w-72 shrink-0">
                  <SearchableSelect
                    value={selectedOriginBranchId}
                    onChange={(val) => handleOriginBranchChange(val)}
                    options={branches.map(b => ({
                      value: b.id,
                      label: b.name,
                      sublabel: `${b.region} • ${b.address}`,
                      badge: b.code
                    }))}
                    placeholder="Seleccione bodega de origen..."
                    searchPlaceholder="Filtrar bodega..."
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-blue-200 border-t border-blue-800/60">
                <span>Bodega activa: <strong className="text-white">{originBranchObj?.name}</strong></span>
                <span>•</span>
                <span>Equipos disponibles: <strong className="text-emerald-300">{availableAssetsInBranch.length} unidades</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Agregar Activo con Buscador */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-[#003B70] font-bold">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4" />
                    <span>Activo Serializado (Disponible en {originBranchObj?.name})</span>
                  </div>
                  <span className="text-[10px] text-slate-500">({availableAssetsInBranch.length} disp.)</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      value={selectedAssetId}
                      onChange={(val) => setSelectedAssetId(val)}
                      disabled={availableAssetsInBranch.length === 0}
                      options={availableAssetsInBranch.map(a => ({
                        value: a.id,
                        label: `${a.brand} ${a.model}`,
                        sublabel: `S/N: ${a.serialNumber} ${a.inventoryNumber ? `• Inv: ${a.inventoryNumber}` : ''}`,
                        badge: a.propertyType
                      }))}
                      placeholder={availableAssetsInBranch.length === 0 ? 'Sin equipos en esta bodega...' : 'Buscar equipo por serie, marca o inventario...'}
                      searchPlaceholder="Filtrar por serie, marca, modelo o inventario..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddAsset}
                    disabled={!selectedAssetId || availableAssetsInBranch.length === 0}
                    className="gov-btn-primary px-3 shrink-0 disabled:opacity-50"
                    title="Agregar equipo a la lista"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {availableAssetsInBranch.length === 0 && (
                  <p className="text-[11px] text-amber-700">
                    ⚠️ No hay equipos disponibles en estado <strong>BODEGA DISPONIBLE</strong> en {originBranchObj?.name}. Realice una recepción o cambie de bodega de origen.
                  </p>
                )}
              </div>

              {/* Agregar Insumo con Buscador */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-700 font-bold">
                  <div className="flex items-center gap-2">
                    <Cable className="w-4 h-4 text-[#003B70]" />
                    <span>Accesorio / Periférico No Inventariable</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Stock por bodega</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      value={selectedConsumableId}
                      onChange={(val) => setSelectedConsumableId(val)}
                      options={availableConsumables.map(c => {
                        const stk = consumableStocks.find(s => s.consumableId === c.id);
                        const qty = stk ? stk.currentQuantity : 0;
                        return {
                          value: c.id,
                          label: c.name,
                          sublabel: `SKU: ${c.sku}`,
                          badge: `${qty} un.`
                        };
                      })}
                      placeholder="Buscar accesorio por nombre o SKU..."
                      searchPlaceholder="Filtrar por nombre o SKU..."
                    />
                  </div>
                  <div className="w-20 shrink-0" title="Cantidad de unidades a descontar">
                    <input
                      type="number"
                      min="1"
                      value={consumableQty}
                      onChange={(e) => setConsumableQty(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-bold text-center focus:outline-none focus:border-[#003B70] focus:ring-1 focus:ring-[#003B70] transition-colors"
                      placeholder="Cant."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddConsumable}
                    disabled={!selectedConsumableId}
                    className="gov-btn-primary px-3 shrink-0 disabled:opacity-50"
                    title="Agregar accesorio a la lista"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Tabla de Ítems */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  Ítems agregados desde <strong className="text-[#003B70] font-bold">{originBranchObj?.name}</strong>: <strong className="text-slate-900">{selectedItemsList.length} elementos</strong>
                </span>
                {selectedItemsList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedItemsList([])}
                    className="text-[#E4002B] hover:underline font-bold text-xs"
                  >
                    Vaciar lista
                  </button>
                )}
              </div>

              {selectedItemsList.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                  No ha agregado equipos ni accesorios a la lista de entrega para esta acta.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 font-bold">Tipo</th>
                        <th className="px-3 py-2 font-bold">Descripción</th>
                        <th className="px-3 py-2 font-bold">N° Serie / Inventario</th>
                        <th className="px-3 py-2 font-bold">Cantidad</th>
                        <th className="px-3 py-2 font-bold">Modalidad</th>
                        <th className="px-3 py-2 text-right font-bold">Quitar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {selectedItemsList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-500">{item.assetId ? 'Activo Serializado' : 'Insumo a Granel'}</td>
                          <td className="px-3 py-2 font-bold text-slate-900">
                            {item.assetId ? `${item.brand} ${item.model}` : item.consumableName}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {item.serialNumber ? (
                              <div className="font-bold text-slate-900">
                                S/N: {item.serialNumber} {item.inventoryNumber && <span className="text-[#003B70]">[{item.inventoryNumber}]</span>}
                              </div>
                            ) : (
                              <span className="text-slate-400">No aplica</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-bold text-emerald-700">{item.quantity} un.</td>
                          <td className="px-3 py-2">
                            {item.propertyType ? <PropertyBadge type={item.propertyType} /> : <span className="text-xs text-slate-500 font-semibold">CONSUMIBLE</span>}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-slate-400 hover:text-[#E4002B] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-2 text-xs">
              <label className="block text-slate-700 font-bold mb-1">Observaciones / Motivo de Entrega</label>
              <textarea
                rows={2}
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observaciones adicionales en el acta..."
                className="gov-input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handlePrepareAct}
              disabled={!selectedUser || selectedItemsList.length === 0}
              className="gov-btn-primary px-6 py-2.5 text-sm font-bold shadow-md disabled:opacity-50"
            >
              <FileCheck2 className="w-5 h-5" />
              Generar Acta desde {originBranchObj?.name} y Proceder a Firma
            </button>
          </div>
        </div>
      ) : (
        /* Historial de Actas */
        <div className="gov-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Historial de Actas de Entrega & Devolución Emitidas</h3>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Folio Acta</th>
                  <th className="px-3 py-2.5 font-bold">Funcionario Receptor</th>
                  <th className="px-3 py-2.5 font-bold">RUT</th>
                  <th className="px-3 py-2.5 font-bold">Bodega de Salida</th>
                  <th className="px-3 py-2.5 font-bold">Equipos Asignados</th>
                  <th className="px-3 py-2.5 font-bold">Estado Firma</th>
                  <th className="px-3 py-2.5 font-bold">Fecha Emisión</th>
                  <th className="px-3 py-2.5 text-right font-bold">Descarga PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {assignments.map(act => (
                  <tr key={act.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono font-bold text-[#003B70]">{act.actNumber}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-900">{act.recipientName}</td>
                    <td className="px-3 py-2.5 font-mono">{act.recipientRut}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800">{act.branchName}</td>
                    <td className="px-3 py-2.5 font-bold">{act.items.length} ítems</td>
                    <td className="px-3 py-2.5"><AssignmentStatusBadge status={act.status} /></td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDate(act.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => PDFService.downloadActPDF(act)}
                        className="gov-btn-secondary py-1 px-2.5 text-[#003B70] font-bold"
                      >
                        <Download className="w-3.5 h-3.5" /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Firma */}
      {isSignatureModalOpen && pendingAssignmentDraft && (
        <Modal
          isOpen={isSignatureModalOpen}
          onClose={() => setIsSignatureModalOpen(false)}
          title={`Firma y Emisión de Acta ${pendingAssignmentDraft.actNumber}`}
          subtitle={`Receptor: ${pendingAssignmentDraft.recipientName} (RUT: ${pendingAssignmentDraft.recipientRut})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Bodega de Salida Confirmada */}
            <div className="p-3 rounded-lg bg-[#EBF3FA] border border-[#BFDBFE] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#003B70]" />
                <div>
                  <span className="text-[10px] text-slate-500 font-medium block">Bodega de Salida de Stock Físico:</span>
                  <span className="text-xs font-bold text-[#003B70]">{pendingAssignmentDraft.branchName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                <Lock className="w-3 h-3" /> Fija en Acta
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">Resumen de Bienes a Entregar:</span>
              <ul className="list-disc list-inside text-slate-700 space-y-1">
                {pendingAssignmentDraft.items.map(item => (
                  <li key={item.id}>
                    <strong>{item.assetId ? `${item.brand} ${item.model}` : item.consumableName}</strong>
                    {item.serialNumber && ` • S/N: ${item.serialNumber}`}
                    {item.inventoryNumber && ` • Inv: ${item.inventoryNumber}`}
                    {item.quantity > 1 && ` • ${item.quantity} unidades`}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <span className="font-bold text-slate-900 text-xs">Firma Digital Manuscrita del Funcionario:</span>
              <SignaturePad
                signerName={pendingAssignmentDraft.recipientName}
                onSave={(dataUrl) => handleSaveSignatureAndComplete(dataUrl)}
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleSaveSignatureAndComplete(undefined)}
                className="text-slate-600 hover:text-slate-900 underline"
              >
                Emitir sin firma digital (Firmar presencialmente en papel)
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => setIsSignatureModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pop Up Modal de Éxito y Visualización Automática del Acta */}
      {completedAssignment && (
        <Modal
          isOpen={true}
          onClose={() => setCompletedAssignment(null)}
          title={`Acta de Entrega ${completedAssignment.actNumber} Emitida`}
          subtitle="Comprobante oficial generado con código QR institucional y firma registrada"
          maxWidth="xl"
        >
          <div className="space-y-5 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3.5">
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-emerald-900">
                  ¡Acta Firmada y Guardada Exitosamente!
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  El documento oficial en PDF se ha abierto automáticamente en una nueva ventana del visualizador predeterminado de tu dispositivo.
                </p>
              </div>
            </div>

            {/* Ficha Resumen */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-[#003B70]">Folio Oficial:</span>
                <span className="font-mono font-extrabold text-slate-900">{completedAssignment.actNumber}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block">Funcionario Receptor:</span>
                  <strong className="text-slate-800">{completedAssignment.recipientName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">RUT:</span>
                  <strong className="font-mono text-slate-800">{completedAssignment.recipientRut}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Bodega de Origen:</span>
                  <strong className="text-slate-800">{completedAssignment.branchName}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Total de Bienes Asignados:</span>
                  <strong className="text-emerald-700 font-bold">{completedAssignment.items.length} ítems entregados</strong>
                </div>
              </div>
            </div>

            {/* Acciones Principales */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => PDFService.openActPDFInNewWindow(completedAssignment)}
                className="w-full sm:flex-1 gov-btn-primary bg-[#003B70] hover:bg-[#002A50] py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-md"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir en Visualizador PDF (Nueva Ventana)</span>
              </button>

              <button
                type="button"
                onClick={() => PDFService.downloadActPDF(completedAssignment)}
                className="w-full sm:w-auto gov-btn-secondary py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Copia PDF</span>
              </button>
            </div>

            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompletedAssignment(null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
              >
                Cerrar y Realizar Nueva Asignación
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
