import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  Mail,
  Send,
  CheckCheck,
  X,
  User,
  Sparkles,
  Filter,
  RefreshCw
} from 'lucide-react';
import { storage } from '../../db/storage';
import { Asset, Consumable, ConsumableStock } from '../../types/asset';
import { Assignment, AssignmentItem, AssignmentType } from '../../types/assignment';
import { ADUser, IndexedADUser } from '../../types/user';
import { Branch } from '../../types/document';
import { SignaturePad } from '../common/SignaturePad';
import { Modal } from '../common/Modal';
import { formatDate, generateSHA256, validateEmail, normalizeText } from '../../utils/formatters';
import { PDFService } from '../../services/pdfService';
import { ApiClient } from '../../api/client';
import { AssignmentStatusBadge, PropertyBadge } from '../common/Badge';
import { SearchableSelect } from '../common/SearchableSelect';
import { useTheme } from '../../context/ThemeContext';

interface AssignmentsViewProps {
  currentBranchId: string;
}

export const AssignmentsView: React.FC<AssignmentsViewProps> = ({ currentBranchId }) => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');

  // Maestros
  const [branches, setBranches] = useState<Branch[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  // Bodega de Origen Obligatoria para salida de stock
  const [selectedOriginBranchId, setSelectedOriginBranchId] = useState<string>('');

  // Selector de Funcionarios (Active Directory / Local)
  const [adSearchQuery, setAdSearchQuery] = useState<string>('');
  const [adSearchResults, setAdSearchResults] = useState<IndexedADUser[]>([]);
  const [allDirectoryUsers, setAllDirectoryUsers] = useState<IndexedADUser[]>([]);
  const [userDomainFilter, setUserDomainFilter] = useState<'ALL' | 'CHA' | 'IPS'>('ALL');
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
  const [receiptEmailInput, setReceiptEmailInput] = useState<string>('');
  const [shouldSendEmail, setShouldSendEmail] = useState<boolean>(true);
  const [isResendingEmailId, setIsResendingEmailId] = useState<string | null>(null);
  const [emailNotification, setEmailNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [signatureModalError, setSignatureModalError] = useState<string | null>(null);
  const [completedAssignment, setCompletedAssignment] = useState<Assignment | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleResendEmail = async (act: Assignment) => {
    setEmailNotification(null);
    setIsResendingEmailId(act.id);
    try {
      let pdfBase64: string | undefined = undefined;
      try {
        const pdfDoc = await PDFService.generateAssignmentActPDF(act);
        pdfBase64 = pdfDoc.output('datauristring');
      } catch (e) {
        console.warn('Error al generar PDF para reenvío:', e);
      }

      await ApiClient.resendAssignmentEmail(act.id, {
        targetEmail: act.recipientEmail,
        pdfBase64
      });

      setEmailNotification({
        type: 'success',
        message: `Acta ${act.actNumber} enviada exitosamente por correo a ${act.recipientEmail || 'funcionario'} vía relaycha.cha.cl.`
      });
      setTimeout(() => setEmailNotification(null), 5000);
    } catch (err: any) {
      setEmailNotification({
        type: 'error',
        message: `Error al reenviar acta por correo: ${err.message}`
      });
    } finally {
      setIsResendingEmailId(null);
    }
  };

  const loadData = async () => {
    const [b, asgs, assetsData, cns, dirUsers] = await Promise.all([
      ApiClient.getBranches(),
      ApiClient.getAssignments(),
      ApiClient.getAssets({ status: 'BODEGA_DISPONIBLE' }),
      ApiClient.getConsumables(),
      ApiClient.getIndexedDirectoryUsers()
    ]);

    setBranches(b);
    setAssignments(asgs);
    setAllAssets(assetsData);
    setAvailableConsumables(cns);
    setAllDirectoryUsers(dirUsers);

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

  // Limpieza de reservas al desmontar el componente si no se ha guardado el acta
  const itemsRef = useRef(selectedItemsList);
  useEffect(() => {
    itemsRef.current = selectedItemsList;
  }, [selectedItemsList]);

  useEffect(() => {
    return () => {
      const currentUser = storage.getCurrentUser();
      if (currentUser && itemsRef.current.length > 0) {
        itemsRef.current.forEach(item => {
          if (item.assetId) {
            ApiClient.unreserveItem('ASSET', item.assetId, currentUser.id).catch(() => {});
          } else if (item.consumableId) {
            ApiClient.unreserveItem('CONSUMABLE', item.consumableId, currentUser.id).catch(() => {});
          }
        });
      }
    };
  }, []);

  // Búsqueda instantánea multi-criterio en catálogo local de funcionarios (< 0.05ms)
  useEffect(() => {
    if (!adSearchQuery.trim()) {
      setAdSearchResults([]);
      return;
    }

    const results = ApiClient.filterIndexedUsers(allDirectoryUsers, adSearchQuery, userDomainFilter, 25);
    setAdSearchResults(results);
  }, [adSearchQuery, userDomainFilter, allDirectoryUsers]);

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

  const handleAddAsset = async () => {
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

    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;

    try {
      await ApiClient.reserveItem('ASSET', asset.id, 1, currentUser.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Este equipo ya se encuentra reservado por otro usuario.');
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

  const handleAddConsumable = async () => {
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

    const currentUser = storage.getCurrentUser();
    if (!currentUser) return;

    const existingIndex = selectedItemsList.findIndex(i => i.consumableId === consumable.id);
    const qtyToReserve = existingIndex >= 0 ? (selectedItemsList[existingIndex].quantity + consumableQty) : consumableQty;

    if (qtyToReserve > availableStock) {
      setErrorMsg(`La cantidad total (${qtyToReserve}) excede el stock disponible (${availableStock} un.) en ${originBranchObj?.name}.`);
      return;
    }

    try {
      await ApiClient.reserveItem('CONSUMABLE', consumable.id, qtyToReserve, currentUser.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Este insumo ya se encuentra reservado por otro usuario.');
      return;
    }

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

  const handleRemoveItem = async (id: string) => {
    const itemToRemove = selectedItemsList.find(i => i.id === id);
    if (itemToRemove) {
      const currentUser = storage.getCurrentUser();
      if (currentUser) {
        if (itemToRemove.assetId) {
          await ApiClient.unreserveItem('ASSET', itemToRemove.assetId, currentUser.id).catch(() => {});
        } else if (itemToRemove.consumableId) {
          await ApiClient.unreserveItem('CONSUMABLE', itemToRemove.consumableId, currentUser.id).catch(() => {});
        }
      }
    }
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
      technicianUserId: currentUser?.id || 'usr-admin',
      technicianName: currentUser?.fullName || 'Administrador TI',
      technicianRut: currentUser?.rut || '',
      branchId: branchObj.id,
      branchName: branchObj.name,
      status: 'PENDIENTE_FIRMA',
      items: selectedItemsList,
      observations: observations.trim(),
      createdAt: new Date().toISOString()
    };

    setPendingAssignmentDraft(draft);
    setReceiptEmailInput(selectedUser.email || '');
    setSignatureModalError(null);
    setIsSignatureModalOpen(true);
  };

  const handleSaveSignatureAndComplete = async (signatureDataUrl?: string) => {
    if (!pendingAssignmentDraft) return;

    const targetEmail = receiptEmailInput.trim();
    if (shouldSendEmail && (!targetEmail || !validateEmail(targetEmail))) {
      setSignatureModalError('Debe ingresar un correo electrónico válido para el envío del comprobante.');
      return;
    }

    setIsProcessing(true);
    setSignatureModalError(null);
    try {
      const hashPayload = `${pendingAssignmentDraft.actNumber}|${pendingAssignmentDraft.recipientRut}|${pendingAssignmentDraft.createdAt}|${signatureDataUrl ? 'DIGITAL' : 'PHYSICAL'}`;
      const hash = await generateSHA256(hashPayload);

      const payload = {
        ...pendingAssignmentDraft,
        recipientEmail: targetEmail,
        signatureDataUrl: signatureDataUrl || undefined,
        signedByName: pendingAssignmentDraft.recipientName,
        digitalSignatureHash: hash
      };

      // Generar documento PDF para adjuntar directamente al correo
      let pdfBase64: string | undefined = undefined;
      try {
        const pdfDoc = await PDFService.generateAssignmentActPDF(payload);
        pdfBase64 = pdfDoc.output('datauristring');
      } catch (pdfErr) {
        console.warn('No se pudo generar base64 previo del PDF:', pdfErr);
      }

      const saved = await ApiClient.createAssignment({
        ...payload,
        actDocumentPdfBase64: pdfBase64,
        sendEmail: shouldSendEmail
      });
      const finalAct = saved.assignment || { ...payload, status: 'FIRMADO_DIGITAL' };

      setIsSignatureModalOpen(false);
      setCompletedAssignment(finalAct);
      setSelectedUser(null);
      setSelectedItemsList([]);
      setObservations('Entrega de equipamiento para puesto de trabajo en módulo de atención.');
      loadData();

      // Abrir automáticamente el PDF en el visor nativo / nueva ventana
      try {
        await PDFService.openActPDFInNewWindow(finalAct);
      } catch (pdfErr) {
        console.warn('No se pudo abrir automáticamente la nueva ventana:', pdfErr);
      }
    } catch (err: any) {
      setSignatureModalError(err.message || 'Error al emitir el acta.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#003B70] dark:text-white tracking-tight">Asignaciones & Actas Oficiales TI</h1>
          <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 font-medium">
            Entrega formal de hardware a funcionarios con validación en Active Directory y deducción exacta de stock por bodega
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#0C1729] border border-slate-200 dark:border-[#1E3352] rounded-lg p-1 shadow-2xs">
          <button
            onClick={() => { setActiveTab('NEW'); setCompletedAssignment(null); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'NEW' 
                ? 'bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:to-[#0055A5] text-white shadow-2xs border border-transparent dark:border-[#38BDF8]/40' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Nueva Asignación
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'HISTORY' 
                ? 'bg-[#003B70] dark:bg-gradient-to-r dark:from-[#003B70] dark:to-[#0055A5] text-white shadow-2xs border border-transparent dark:border-[#38BDF8]/40' 
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs text-slate-700 font-bold">
                    Buscar funcionario para el Acta de Asignación:
                  </label>

                  {/* Filtro Rápido por Dominio */}
                  <div className="inline-flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[11px] font-semibold border border-slate-200 self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setUserDomainFilter('ALL')}
                      className={`px-2.5 py-1 rounded-md transition-all ${userDomainFilter === 'ALL' ? 'bg-[#003B70] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Todos ({allDirectoryUsers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserDomainFilter('CHA')}
                      className={`px-2.5 py-1 rounded-md transition-all ${userDomainFilter === 'CHA' ? 'bg-[#003B70] text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      ChileAtiende (@cha.cl)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserDomainFilter('IPS')}
                      className={`px-2.5 py-1 rounded-md transition-all ${userDomainFilter === 'IPS' ? 'bg-blue-600 text-white shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      IPS (@ips.gob.cl)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={adSearchQuery}
                    onChange={(e) => setAdSearchQuery(e.target.value)}
                    placeholder="Escriba Nombre (ej: Carolina Flores), RUT (ej: 15.892.341-8), Usuario o Correo..."
                    className="gov-input gov-input-with-both-icons font-medium"
                    autoFocus
                  />
                  {adSearchQuery.trim() && (
                    <button
                      type="button"
                      onClick={() => { setAdSearchQuery(''); setAdSearchResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title="Limpiar búsqueda"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Dropdown de Resultados con Microinteracciones */}
                {adSearchQuery.trim().length > 0 && (
                  <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150 mt-1">
                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                      <span>Resultados de búsqueda:</span>
                      <span className="font-bold text-[#003B70]">
                        {adSearchResults.length} {adSearchResults.length === 1 ? 'funcionario encontrado' : 'funcionarios encontrados'}
                      </span>
                    </div>

                    {adSearchResults.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                        {adSearchResults.map(u => {
                          const isIps = (u.email || '').toLowerCase().includes('@ips.gob.cl') || (u.department || '').toLowerCase().includes('ips');
                          const initials = u.fullName
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(w => w[0])
                            .join('')
                            .toUpperCase() || 'FU';

                          return (
                            <div
                              key={u.id || u.samAccountName}
                              onClick={() => handleSelectUser(u)}
                              className="p-3.5 hover:bg-[#EBF3FA] cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors group"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-9 h-9 rounded-xl ${isIps ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-[#003B70] to-[#0055A5]'} text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0`}>
                                  {initials}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 group-hover:text-[#003B70] truncate text-xs sm:text-sm">
                                      {u.fullName}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${isIps ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                      {isIps ? 'ips.gob.cl' : 'cha.cl'}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                                    {u.jobTitle || 'Funcionario'} • {u.department || 'Dirección Nacional'}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono truncate">
                                    {u.email}
                                  </div>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                <span className="font-mono font-bold text-[#003B70] text-xs sm:text-sm">
                                  {u.rut || 'Sin RUT'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {u.branchName || 'Sucursal Central'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-500 space-y-1">
                        <p className="text-xs font-bold text-slate-700">No se encontraron funcionarios coincidentes con "{adSearchQuery}".</p>
                        <p className="text-[11px] text-slate-400">Intente buscando por nombre, apellido, RUT sin puntos o usuario institucional.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-[#EBF3FA] to-[#F1F7FC] border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                  <div className={`w-11 h-11 rounded-xl ${(selectedUser.email || '').toLowerCase().includes('@ips.gob.cl') ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-[#003B70] to-[#0055A5]'} flex items-center justify-center text-white font-extrabold text-sm shadow-sm shrink-0`}>
                    {selectedUser.firstName?.[0] || 'F'}{selectedUser.lastName?.[0] || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-black text-[#003B70] truncate">{selectedUser.fullName}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${(selectedUser.email || '').toLowerCase().includes('@ips.gob.cl') ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-emerald-100 text-emerald-800 border-emerald-300'}`}>
                        {(selectedUser.email || '').toLowerCase().includes('@ips.gob.cl') ? 'IPS (ips.gob.cl)' : 'ChileAtiende (cha.cl)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5 truncate font-medium">
                      {selectedUser.jobTitle || 'Funcionario'} • {selectedUser.department || 'Dirección Nacional'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1.5 pt-1.5 border-t border-blue-200/60">
                      <span>RUT: <strong className="text-slate-900 font-mono font-bold">{selectedUser.rut || 'No informado'}</strong></span>
                      <span>Correo: <strong className="text-slate-900 font-medium">{selectedUser.email}</strong></span>
                      <span>Sucursal: <strong className="text-slate-900">{selectedUser.branchName || 'Sucursal Central'}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#003B70] font-bold text-xs border border-blue-200 hover:border-blue-400 transition-colors shadow-xs shrink-0 self-start sm:self-auto"
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
                    <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]/50 bg-white dark:bg-[#101C30] text-slate-700 dark:text-slate-300">
                      {selectedItemsList.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-[#162744]">
                          <td className="px-3 py-2 text-slate-500 dark:text-slate-400">{item.assetId ? 'Activo Serializado' : 'Insumo a Granel'}</td>
                          <td className="px-3 py-2 font-bold text-slate-900 dark:text-white">
                            {item.assetId ? `${item.brand} ${item.model}` : item.consumableName}
                          </td>
                          <td className="px-3 py-2 font-mono">
                            {item.serialNumber ? (
                              <div className="font-bold text-slate-900 dark:text-white">
                                S/N: {item.serialNumber} {item.inventoryNumber && <span className="text-[#003B70] dark:text-[#38BDF8]">[{item.inventoryNumber}]</span>}
                              </div>
                            ) : (
                              <span className="text-slate-400">No aplica</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-bold text-emerald-600 dark:text-emerald-400">{item.quantity} un.</td>
                          <td className="px-3 py-2">
                            {item.propertyType ? <PropertyBadge type={item.propertyType} /> : <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">CONSUMIBLE</span>}
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Historial de Actas de Entrega & Devolución Emitidas</h3>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-[#0C1B30] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-[#1E3352]">
              Servidor Relay Activo: <strong className="text-[#003B70] dark:text-[#38BDF8]">relaycha.cha.cl</strong>
            </span>
          </div>

          {emailNotification && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in duration-150 ${
              emailNotification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {emailNotification.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                )}
                <span>{emailNotification.message}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setEmailNotification(null)}
                className="p-1 hover:opacity-75 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#1E3352]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] dark:bg-gradient-to-r dark:from-[#002D57] dark:to-[#003B70] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-bold whitespace-nowrap">Folio Acta</th>
                  <th className="px-3 py-2.5 font-bold">Funcionario Receptor</th>
                  <th className="px-3 py-2.5 font-bold whitespace-nowrap">RUT</th>
                  <th className="px-3 py-2.5 font-bold">Bodega de Salida</th>
                  <th className="px-3 py-2.5 font-bold whitespace-nowrap">Equipos Asignados</th>
                  <th className="px-3 py-2.5 font-bold whitespace-nowrap">Estado Firma</th>
                  <th className="px-3 py-2.5 font-bold whitespace-nowrap">Fecha Emisión</th>
                  <th className="px-3 py-2.5 text-right font-bold whitespace-nowrap">Acciones / Correo / PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]/50 bg-white dark:bg-[#101C30] text-slate-700 dark:text-slate-300">
                {assignments.map(act => (
                  <tr key={act.id} className="hover:bg-slate-50 dark:hover:bg-[#162744]">
                    <td className="px-3 py-2.5 font-mono font-bold text-[#003B70] dark:text-[#38BDF8] whitespace-nowrap">{act.actNumber}</td>
                    <td className="px-3 py-2.5 font-bold text-slate-900 dark:text-white">
                      <div>{act.recipientName}</div>
                      {act.recipientEmail && (
                        <div className="text-[11px] font-normal text-slate-400 font-mono truncate max-w-[180px]">
                          {act.recipientEmail}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">{act.recipientRut}</td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200">{act.branchName}</td>
                    <td className="px-3 py-2.5 font-bold whitespace-nowrap">{act.items.length} ítems</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><AssignmentStatusBadge status={act.status} /></td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(act.createdAt)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleResendEmail(act)}
                          disabled={isResendingEmailId === act.id}
                          title={`Reenviar copia del acta por correo a ${act.recipientEmail || act.recipientName} vía relaycha.cha.cl`}
                          className={`inline-flex items-center gap-1 py-1 px-2.5 rounded-lg border text-xs font-bold transition-all ${
                            isDark 
                              ? 'bg-[#101C30] hover:bg-[#1A2D4C] text-[#38BDF8] border-[#1E3352]' 
                              : 'bg-[#EBF3FA] hover:bg-[#D8E8F8] text-[#003B70] border-[#BFDBFE]'
                          }`}
                        >
                          {isResendingEmailId === act.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#003B70] dark:text-[#38BDF8]" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline">Reenviar Correo</span>
                        </button>

                        <button
                          onClick={() => PDFService.downloadActPDF(act)}
                          className="gov-btn-secondary py-1 px-2.5 text-[#003B70] dark:text-[#38BDF8] font-bold"
                          title="Descargar archivo PDF oficial"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
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

            {/* Correo para Envío del Comprobante y Relay */}
            <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-[#0C1B30] border border-blue-200 dark:border-[#1E3B66] space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#003B70] dark:text-[#38BDF8] flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shouldSendEmail}
                    onChange={(e) => setShouldSendEmail(e.target.checked)}
                    className="w-4 h-4 rounded text-[#003B70] focus:ring-[#003B70] cursor-pointer"
                  />
                  <span>Enviar copia del comprobante digital y acta en PDF por correo</span>
                </label>
                <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold bg-blue-100/80 dark:bg-blue-950/80 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                  Relay: relaycha.cha.cl
                </span>
              </div>

              {shouldSendEmail && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={receiptEmailInput}
                      onChange={(e) => {
                        setReceiptEmailInput(e.target.value);
                        setSignatureModalError(null);
                      }}
                      placeholder="Escriba el correo institucional (ej: funcionario@chileatiende.cl o ips.gob.cl)..."
                      className="gov-input gov-input-with-icon text-xs sm:text-sm font-semibold w-full"
                      required={shouldSendEmail}
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Se enviará automáticamente el correo institucional con el archivo PDF oficial adjunto vía el servidor relay <strong>relaycha.cha.cl</strong>.
                  </p>
                </div>
              )}
            </div>

            {signatureModalError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-[#E4002B] shrink-0" />
                <span>{signatureModalError}</span>
              </div>
            )}

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
                className="text-slate-600 hover:text-slate-900 underline font-medium"
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
                  El documento oficial en PDF se ha desplegado automáticamente en una nueva ventana del visualizador predeterminado de tu dispositivo.
                </p>
                {completedAssignment.recipientEmail && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-semibold pt-1">
                    <Mail className="w-4 h-4 text-emerald-700" />
                    <span>Comprobante enviado a: <strong>{completedAssignment.recipientEmail}</strong></span>
                  </div>
                )}
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
                  <span className="text-slate-500 block">Correo Comprobante:</span>
                  <strong className="text-slate-800 break-all">{completedAssignment.recipientEmail || 'No informado'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Bodega de Origen:</span>
                  <strong className="text-slate-800">{completedAssignment.branchName}</strong>
                </div>
                <div className="sm:col-span-2">
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
