import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Truck, 
  ShoppingBag, 
  FileSpreadsheet, 
  Database, 
  RotateCcw,
  Laptop,
  Plus,
  CheckCircle2,
  AlertCircle,
  Layers,
  Pencil,
  MapPin,
  Power
} from 'lucide-react';
import { Branch, Supplier, PurchaseOrder, LeasingContract } from '../../types/document';
import { AssetType } from '../../types/asset';
import { storage } from '../../db/storage';
import { formatDate, formatCurrencyCLP, validateRut, formatRut } from '../../utils/formatters';
import { ApiClient } from '../../api/client';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';

const CHILEAN_REGIONS = [
  'Región de Arica y Parinacota',
  'Región de Tarapacá',
  'Región de Antofagasta',
  'Región de Atacama',
  'Región de Coquimbo',
  'Región de Valparaíso',
  'Región Metropolitana',
  'Región de O\'Higgins',
  'Región del Maule',
  'Región de Ñuble',
  'Región del Biobío',
  'Región de La Araucanía',
  'Región de Los Ríos',
  'Región de Los Lagos',
  'Región de Aysén',
  'Región de Magallanes'
];

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'TYPES' | 'BRANCHES' | 'SUPPLIERS' | 'POS' | 'LEASING' | 'SYSTEM'>('TYPES');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [leasingContracts, setLeasingContracts] = useState<LeasingContract[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);

  // Modal Crear Bodega / Sucursal
  const [isCreateBranchModalOpen, setIsCreateBranchModalOpen] = useState<boolean>(false);
  const [newBranchCode, setNewBranchCode] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [newBranchRegion, setNewBranchRegion] = useState<string>('Región Metropolitana');
  const [newBranchCommune, setNewBranchCommune] = useState<string>('Santiago');
  const [newBranchAddress, setNewBranchAddress] = useState<string>('');
  const [newBranchError, setNewBranchError] = useState<string | null>(null);
  const [isCreatingBranch, setIsCreatingBranch] = useState<boolean>(false);

  // Modal Editar Bodega / Sucursal
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState<boolean>(false);
  const [editingBranchId, setEditingBranchId] = useState<string>('');
  const [editBranchCode, setEditBranchCode] = useState<string>('');
  const [editBranchName, setEditBranchName] = useState<string>('');
  const [editBranchRegion, setEditBranchRegion] = useState<string>('');
  const [editBranchCommune, setEditBranchCommune] = useState<string>('');
  const [editBranchAddress, setEditBranchAddress] = useState<string>('');
  const [editBranchIsActive, setEditBranchIsActive] = useState<boolean>(true);
  const [editBranchError, setEditBranchError] = useState<string | null>(null);
  const [isUpdatingBranch, setIsUpdatingBranch] = useState<boolean>(false);

  // Modal Crear Tipo de Hardware
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState<boolean>(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newTypeCategory, setNewTypeCategory] = useState<string>('COMPUTO');
  const [newTypeRequiresInv, setNewTypeRequiresInv] = useState<boolean>(true);
  const [newTypeError, setNewTypeError] = useState<string | null>(null);
  const [isCreatingType, setIsCreatingType] = useState<boolean>(false);

  // Modal Crear Proveedor
  const [isCreateSupplierModalOpen, setIsCreateSupplierModalOpen] = useState<boolean>(false);
  const [newSupplierRut, setNewSupplierRut] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [newSupplierContact, setNewSupplierContact] = useState<string>('');
  const [newSupplierEmail, setNewSupplierEmail] = useState<string>('');
  const [newSupplierPhone, setNewSupplierPhone] = useState<string>('');
  const [newSupplierError, setNewSupplierError] = useState<string | null>(null);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState<boolean>(false);

  // Modal Crear Orden de Compra
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState<boolean>(false);
  const [newPOOCNumber, setNewPOOCNumber] = useState<string>('');
  const [newPOSupplierId, setNewPOSupplierId] = useState<string>('');
  const [newPODescription, setNewPODescription] = useState<string>('');
  const [newPOOrderDate, setNewPOOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPOTotalAmount, setNewPOTotalAmount] = useState<string>('');
  const [newPOError, setNewPOError] = useState<string | null>(null);
  const [isCreatingPO, setIsCreatingPO] = useState<boolean>(false);

  // Modal Crear Contrato / Licitación
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState<boolean>(false);
  const [newContractNumber, setNewContractNumber] = useState<string>('');
  const [newContractName, setNewContractName] = useState<string>('');
  const [newContractSupplierId, setNewContractSupplierId] = useState<string>('');
  const [newContractStartDate, setNewContractStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newContractEndDate, setNewContractEndDate] = useState<string>(new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
  const [newContractWarningDays, setNewContractWarningDays] = useState<number>(30);
  const [newContractError, setNewContractError] = useState<string | null>(null);
  const [isCreatingContract, setIsCreatingContract] = useState<boolean>(false);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const loadData = async () => {
    const [b, s, pos, contracts, types] = await Promise.all([
      ApiClient.getBranches(),
      ApiClient.getSuppliers(),
      ApiClient.getPurchaseOrders(),
      ApiClient.getLeasingContracts(),
      ApiClient.getAssetTypes()
    ]);
    setBranches(b);
    setSuppliers(s);
    setPurchaseOrders(pos);
    setLeasingContracts(contracts);
    setAssetTypes(types);

    if (s.length > 0) {
      if (!newPOSupplierId) setNewPOSupplierId(s[0].id);
      if (!newContractSupplierId) setNewContractSupplierId(s[0].id);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- MANEJADORES DE BODEGAS / SUCURSALES ---
  const handleOpenCreateBranch = () => {
    setNewBranchCode('');
    setNewBranchName('');
    setNewBranchRegion('Región Metropolitana');
    setNewBranchCommune('Santiago');
    setNewBranchAddress('');
    setNewBranchError(null);
    setIsCreateBranchModalOpen(true);
  };

  const handleOpenEditBranch = (branch: Branch) => {
    setEditingBranchId(branch.id);
    setEditBranchCode(branch.code);
    setEditBranchName(branch.name);
    setEditBranchRegion(branch.region);
    setEditBranchCommune(branch.commune);
    setEditBranchAddress(branch.address);
    setEditBranchIsActive(branch.isActive !== false);
    setEditBranchError(null);
    setIsEditBranchModalOpen(true);
  };

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewBranchError(null);

    const cleanCode = newBranchCode.trim().toUpperCase();
    const cleanName = newBranchName.trim();
    const cleanRegion = newBranchRegion.trim();
    const cleanCommune = newBranchCommune.trim();
    const cleanAddress = newBranchAddress.trim() || 'Dirección no informada';

    if (!cleanCode || !cleanName || !cleanRegion || !cleanCommune) {
      setNewBranchError('Código, Nombre, Región y Comuna son obligatorios.');
      return;
    }

    setIsCreatingBranch(true);
    try {
      await ApiClient.createBranch({
        code: cleanCode,
        name: cleanName,
        region: cleanRegion,
        commune: cleanCommune,
        address: cleanAddress,
        isActive: true
      });

      setFeedbackMsg(`✓ Bodega / Sucursal '${cleanName}' registrada exitosamente.`);
      setIsCreateBranchModalOpen(false);
      loadData();
      window.dispatchEvent(new Event('itam_storage_updated'));
    } catch (err: any) {
      setNewBranchError(err.message || 'Error al registrar sucursal o bodega.');
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditBranchError(null);

    const cleanCode = editBranchCode.trim().toUpperCase();
    const cleanName = editBranchName.trim();
    const cleanRegion = editBranchRegion.trim();
    const cleanCommune = editBranchCommune.trim();
    const cleanAddress = editBranchAddress.trim() || 'Dirección no informada';

    if (!cleanCode || !cleanName || !cleanRegion || !cleanCommune) {
      setEditBranchError('Código, Nombre, Región y Comuna son obligatorios.');
      return;
    }

    setIsUpdatingBranch(true);
    try {
      await ApiClient.updateBranch(editingBranchId, {
        code: cleanCode,
        name: cleanName,
        region: cleanRegion,
        commune: cleanCommune,
        address: cleanAddress,
        isActive: editBranchIsActive
      });

      setFeedbackMsg(`✓ Bodega / Sucursal '${cleanName}' actualizada exitosamente.`);
      setIsEditBranchModalOpen(false);
      loadData();
      window.dispatchEvent(new Event('itam_storage_updated'));
    } catch (err: any) {
      setEditBranchError(err.message || 'Error al actualizar sucursal o bodega.');
    } finally {
      setIsUpdatingBranch(false);
    }
  };

  const handleToggleBranchStatus = async (branch: Branch) => {
    const nextStatus = !(branch.isActive !== false);
    const actionWord = nextStatus ? 'activar' : 'desactivar';
    if (!confirm(`¿Confirma que desea ${actionWord} la bodega '${branch.name}'?`)) return;

    try {
      await ApiClient.updateBranch(branch.id, { isActive: nextStatus });
      setFeedbackMsg(`✓ Bodega '${branch.name}' ${nextStatus ? 'activada' : 'desactivada'} exitosamente.`);
      loadData();
      window.dispatchEvent(new Event('itam_storage_updated'));
    } catch (err: any) {
      alert(`Error al cambiar estado de la bodega: ${err.message}`);
    }
  };

  const handleCreateAssetType = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewTypeError(null);

    const cleanName = newTypeName.trim();
    if (!cleanName) {
      setNewTypeError('El nombre del tipo de hardware es obligatorio.');
      return;
    }

    setIsCreatingType(true);
    try {
      await ApiClient.createAssetType({
        name: cleanName,
        category: newTypeCategory,
        requiresInventoryNumber: newTypeRequiresInv,
        iconName: 'Laptop'
      });

      setFeedbackMsg(`✓ Tipo de hardware '${cleanName}' registrado correctamente.`);
      setIsCreateTypeModalOpen(false);
      setNewTypeName('');
      loadData();
    } catch (err: any) {
      setNewTypeError(err.message || 'Error al registrar tipo de hardware.');
    } finally {
      setIsCreatingType(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSupplierError(null);

    const cleanRut = formatRut(newSupplierRut.trim());
    if (!validateRut(cleanRut)) {
      setNewSupplierError('El RUT del proveedor no es válido (mínimo 7 caracteres numéricos + dígito verificador).');
      return;
    }

    if (!newSupplierName.trim()) {
      setNewSupplierError('La Razón Social es obligatoria.');
      return;
    }

    setIsCreatingSupplier(true);
    try {
      await ApiClient.createSupplier({
        rut: cleanRut,
        businessName: newSupplierName.trim(),
        contactName: newSupplierContact.trim() || undefined,
        contactEmail: newSupplierEmail.trim() || undefined,
        contactPhone: newSupplierPhone.trim() || undefined
      });

      setFeedbackMsg(`✓ Proveedor '${newSupplierName.trim()}' registrado correctamente.`);
      setIsCreateSupplierModalOpen(false);
      setNewSupplierRut('');
      setNewSupplierName('');
      setNewSupplierContact('');
      setNewSupplierEmail('');
      setNewSupplierPhone('');
      loadData();
    } catch (err: any) {
      setNewSupplierError(err.message || 'Error al registrar proveedor.');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPOError(null);

    if (!newPOOCNumber.trim() || !newPODescription.trim()) {
      setNewPOError('El N° de Orden de Compra y la Descripción son obligatorios.');
      return;
    }

    const supId = newPOSupplierId || (suppliers[0]?.id || '');
    if (!supId) {
      setNewPOError('Seleccione el proveedor.');
      return;
    }

    setIsCreatingPO(true);
    try {
      await ApiClient.createPurchaseOrder({
        ocNumber: newPOOCNumber.trim().toUpperCase(),
        supplierId: supId,
        description: newPODescription.trim(),
        orderDate: newPOOrderDate,
        totalAmountCLP: newPOTotalAmount ? parseFloat(newPOTotalAmount) : undefined
      });

      setFeedbackMsg(`✓ Orden de Compra '${newPOOCNumber.trim().toUpperCase()}' registrada correctamente.`);
      setIsCreatePOModalOpen(false);
      setNewPOOCNumber('');
      setNewPODescription('');
      setNewPOTotalAmount('');
      loadData();
    } catch (err: any) {
      setNewPOError(err.message || 'Error al registrar orden de compra.');
    } finally {
      setIsCreatingPO(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewContractError(null);

    if (!newContractNumber.trim() || !newContractName.trim()) {
      setNewContractError('El N° de Contrato y Nombre de Licitación son obligatorios.');
      return;
    }

    const supId = newContractSupplierId || (suppliers[0]?.id || '');
    if (!supId) {
      setNewContractError('Seleccione el proveedor adjudicatario.');
      return;
    }

    setIsCreatingContract(true);
    try {
      await ApiClient.createLeasingContract({
        contractNumber: newContractNumber.trim().toUpperCase(),
        name: newContractName.trim(),
        supplierId: supId,
        startDate: newContractStartDate,
        endDate: newContractEndDate,
        warningDaysThreshold: newContractWarningDays
      });

      setFeedbackMsg(`✓ Contrato / Licitación '${newContractNumber.trim().toUpperCase()}' registrado correctamente.`);
      setIsCreateContractModalOpen(false);
      setNewContractNumber('');
      setNewContractName('');
      loadData();
    } catch (err: any) {
      setNewContractError(err.message || 'Error al registrar contrato.');
    } finally {
      setIsCreatingContract(false);
    }
  };

  const handleResetData = () => {
    if (confirm('¿Está seguro de que desea reiniciar todos los datos a la configuración institucional inicial?')) {
      storage.resetToDefaults();
      alert('✓ Base de datos reiniciada a los valores predeterminados.');
      window.location.reload();
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'COMPUTO':
        return <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">CÓMPUTO</span>;
      case 'PANTALLAS':
        return <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">PANTALLAS / MONITORES</span>;
      case 'REDES':
        return <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">REDES & TELECOM</span>;
      case 'IMPRESION':
        return <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">IMPRESIÓN & SCANNER</span>;
      case 'PERIFERICOS_BIOMETRIA':
        return <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 font-bold border border-purple-200">BIOMETRÍA & ACCESO</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">{cat}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003B70] tracking-tight">Configuración & Tablas Maestras</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de Tipos de Hardware, Proveedores, Licitaciones/Contratos y Órdenes de Compra
          </p>
        </div>

        <div>
          {activeTab === 'TYPES' && (
            <button
              onClick={() => {
                setNewTypeName('');
                setNewTypeCategory('COMPUTO');
                setNewTypeRequiresInv(true);
                setNewTypeError(null);
                setIsCreateTypeModalOpen(true);
              }}
              className="gov-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Crear Tipo de Hardware
            </button>
          )}

          {activeTab === 'SUPPLIERS' && (
            <button
              onClick={() => {
                setNewSupplierRut('');
                setNewSupplierName('');
                setNewSupplierContact('');
                setNewSupplierEmail('');
                setNewSupplierPhone('');
                setNewSupplierError(null);
                setIsCreateSupplierModalOpen(true);
              }}
              className="gov-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Crear Proveedor
            </button>
          )}

          {activeTab === 'POS' && (
            <button
              onClick={() => {
                setNewPOOCNumber('');
                setNewPOSupplierId(suppliers[0]?.id || '');
                setNewPODescription('');
                setNewPOTotalAmount('');
                setNewPOError(null);
                setIsCreatePOModalOpen(true);
              }}
              className="gov-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Crear Orden de Compra
            </button>
          )}

          {activeTab === 'LEASING' && (
            <button
              onClick={() => {
                setNewContractNumber('');
                setNewContractName('');
                setNewContractSupplierId(suppliers[0]?.id || '');
                setNewContractError(null);
                setIsCreateContractModalOpen(true);
              }}
              className="gov-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Crear Contrato / Licitación
            </button>
          )}

          {activeTab === 'BRANCHES' && (
            <button
              onClick={handleOpenCreateBranch}
              className="gov-btn-primary"
            >
              <Plus className="w-4 h-4" />
              Crear Nueva Bodega / Sucursal
            </button>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between">
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
      <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('TYPES')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'TYPES' ? 'bg-[#003B70] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          Tipos de Hardware ({assetTypes.length})
        </button>

        <button
          onClick={() => setActiveTab('SUPPLIERS')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'SUPPLIERS' ? 'bg-[#003B70] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          Proveedores ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('POS')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'POS' ? 'bg-[#003B70] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Órdenes de Compra ({purchaseOrders.length})
        </button>

        <button
          onClick={() => setActiveTab('LEASING')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'LEASING' ? 'bg-[#003B70] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Contratos Arriendo ({leasingContracts.length})
        </button>

        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'BRANCHES' ? 'bg-[#003B70] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Bodegas & Sucursales ({branches.length})
        </button>

        <button
          onClick={() => setActiveTab('SYSTEM')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors ${
            activeTab === 'SYSTEM' ? 'bg-[#003B70] text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          Base de Datos & Sistema
        </button>
      </div>

      {/* Contenido según Tab */}

      {/* TAB TIPOS DE HARDWARE */}
      {activeTab === 'TYPES' && (
        <div className="gov-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Catálogo de Tipologías de Hardware y Equipamiento ITAM</h3>
            <span className="text-xs text-slate-500 font-semibold">{assetTypes.length} tipologías registradas</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] text-white">
                <tr>
                  <th className="px-3.5 py-2.5 font-bold">Tipo de Hardware</th>
                  <th className="px-3.5 py-2.5 font-bold">Categoría Tecnológica</th>
                  <th className="px-3.5 py-2.5 font-bold">Exigencia N° Inventario</th>
                  <th className="px-3.5 py-2.5 font-bold">Total Activos Registrados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {assetTypes.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-900">{t.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {t.id}</div>
                    </td>
                    <td className="px-3.5 py-2.5">
                      {getCategoryBadge(t.category)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {t.requiresInventoryNumber ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#003B70]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Obligatorio en Propios
                        </span>
                      ) : (
                        <span className="text-slate-400">Opcional</span>
                      )}
                    </td>
                    <td className="px-3.5 py-2.5 font-bold text-slate-800">
                      {(t as any).assetsCount !== undefined ? `${(t as any).assetsCount} equipos` : 'Disponible'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB PROVEEDORES */}
      {activeTab === 'SUPPLIERS' && (
        <div className="gov-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Registro de Proveedores Acreditados</h3>
            <span className="text-xs text-slate-500 font-semibold">{suppliers.length} empresas registradas</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-bold">Razón Social</th>
                  <th className="px-3 py-2.5 font-bold">RUT</th>
                  <th className="px-3 py-2.5 font-bold">Contacto Comercial</th>
                  <th className="px-3 py-2.5 font-bold">Correo Electrónico</th>
                  <th className="px-3 py-2.5 font-bold">Teléfono</th>
                  <th className="px-3 py-2.5 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-bold text-slate-900">{s.businessName}</td>
                    <td className="px-3 py-2.5 font-mono text-[#003B70] font-bold">{s.rut}</td>
                    <td className="px-3 py-2.5">{s.contactName || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.contactEmail || '-'}</td>
                    <td className="px-3 py-2.5 text-slate-500">{s.contactPhone || '-'}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded bg-[#ECFDF5] text-[#065F46] font-bold border border-[#A7F3D0]">
                        Habilitado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB ÓRDENES DE COMPRA */}
      {activeTab === 'POS' && (
        <div className="gov-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Órdenes de Compra (ChileCompra / Mercado Público)</h3>
            <span className="text-xs text-slate-500 font-semibold">{purchaseOrders.length} órdenes registradas</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-bold">N° Orden de Compra</th>
                  <th className="px-3 py-2.5 font-bold">Proveedor</th>
                  <th className="px-3 py-2.5 font-bold">Descripción / Glosa</th>
                  <th className="px-3 py-2.5 font-bold">Fecha Emisión</th>
                  <th className="px-3 py-2.5 font-bold">Monto Total</th>
                  <th className="px-3 py-2.5 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {purchaseOrders.map(po => {
                  const sup = suppliers.find(s => s.id === po.supplierId);
                  return (
                    <tr key={po.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-[#003B70]">{po.ocNumber}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">{sup ? sup.businessName : po.supplierId}</td>
                      <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{po.description || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{formatDate(po.orderDate)}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        {po.totalAmountCLP ? formatCurrencyCLP(po.totalAmountCLP) : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                          {(po as any).status || 'VIGENTE'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTRATOS ARRIENDO */}
      {activeTab === 'LEASING' && (
        <div className="gov-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Contratos de Arriendo / Licitaciones de Hardware</h3>
            <span className="text-xs text-slate-500 font-semibold">{leasingContracts.length} contratos vigentes</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-bold">N° Contrato / Licitación</th>
                  <th className="px-3 py-2.5 font-bold">Nombre del Servicio</th>
                  <th className="px-3 py-2.5 font-bold">Proveedor Adjudicado</th>
                  <th className="px-3 py-2.5 font-bold">Vigencia (Inicio - Fin)</th>
                  <th className="px-3 py-2.5 font-bold">Alerta Devolución</th>
                  <th className="px-3 py-2.5 font-bold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {leasingContracts.map(c => {
                  const sup = suppliers.find(s => s.id === c.supplierId);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-mono font-bold text-blue-800">{c.contractNumber}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">{c.name}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700">{sup ? sup.businessName : c.supplierId}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {formatDate(c.startDate)} al <span className="font-bold text-[#E4002B]">{formatDate(c.endDate)}</span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-600">
                        {c.warningDaysThreshold} días antes
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                          {(c as any).status || (c.isActive ? 'ACTIVO' : 'VENCIDO')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB BODEGAS & SUCURSALES */}
      {activeTab === 'BRANCHES' && (
        <div className="gov-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Directorio de Bodegas & Sucursales Regionales</h3>
              <p className="text-xs text-slate-500">Puntos de almacenamiento, custodia y distribución de equipamiento ITAM a nivel nacional</p>
            </div>
            <button
              onClick={handleOpenCreateBranch}
              className="gov-btn-primary py-2 text-xs font-bold self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Bodega
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] text-white">
                <tr>
                  <th className="px-3.5 py-2.5 font-bold">Código</th>
                  <th className="px-3.5 py-2.5 font-bold">Nombre Bodega / Sucursal</th>
                  <th className="px-3.5 py-2.5 font-bold">Región & Comuna</th>
                  <th className="px-3.5 py-2.5 font-bold">Dirección Física</th>
                  <th className="px-3.5 py-2.5 font-bold text-center">Estado</th>
                  <th className="px-3.5 py-2.5 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {branches.map(b => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3.5 py-3 font-mono font-bold text-[#003B70]">
                      <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                        {b.code}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#003B70] shrink-0" />
                        <span>{b.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {b.id}</div>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-slate-800">{b.commune}</div>
                      <div className="text-[11px] text-slate-500">{b.region}</div>
                    </td>
                    <td className="px-3.5 py-3 text-slate-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{b.address || 'No informada'}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      {b.isActive !== false ? (
                        <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#065F46] font-bold text-[10px] border border-[#A7F3D0]">
                          ✓ OPERATIVA
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] border border-slate-300">
                          INACTIVA
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditBranch(b)}
                          className="px-2.5 py-1.5 rounded-lg text-[#003B70] bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 font-bold text-xs flex items-center gap-1"
                          title="Editar Bodega / Sucursal"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggleBranchStatus(b)}
                          className={`p-1.5 rounded-lg transition-colors border ${
                            b.isActive !== false
                              ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                          title={b.isActive !== false ? 'Desactivar bodega' : 'Activar bodega'}
                        >
                          <Power className="w-3.5 h-3.5" />
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

      {/* TAB SISTEMA */}
      {activeTab === 'SYSTEM' && (
        <div className="gov-card p-5 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Estado de la Plataforma</h3>
            <p className="text-xs text-slate-500 mt-1">
              Información de la instancia, conectividad con PostgreSQL y operaciones de mantenimiento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-medium">Base de Datos:</span>
              <p className="text-sm font-bold text-[#003B70] mt-0.5">PostgreSQL 17 + Prisma ORM</p>
              <p className="text-[11px] text-slate-400 mt-1">Esquema itam_chileatiende</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-medium">Frontend:</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">React 19 + TypeScript + Vite</p>
              <p className="text-[11px] text-slate-400 mt-1">Design System ChileAtiende</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-slate-500 font-medium">Active Directory:</span>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">Sincronización Conectada</p>
              <p className="text-[11px] text-slate-400 mt-1">Directorio de Funcionarios IPS</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-bold text-[#E4002B] mb-1">Zona de Mantenimiento / Reset de Datos</h4>
            <p className="text-xs text-slate-500 mb-3">
              Restaura la base de datos a los datos iniciales de fábrica de ChileAtiende.
            </p>
            <button
              onClick={handleResetData}
              className="gov-btn-danger"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar Base de Datos Local a Valores por Defecto
            </button>
          </div>
        </div>
      )}

      {/* MODAL CREAR TIPO DE HARDWARE */}
      {isCreateTypeModalOpen && (
        <Modal
          isOpen={isCreateTypeModalOpen}
          onClose={() => setIsCreateTypeModalOpen(false)}
          title="Agregar Nuevo Tipo de Hardware / Dispositivo"
          subtitle="Registrar una nueva categoría o tipología para el inventario ITAM"
          maxWidth="md"
        >
          <form onSubmit={handleCreateAssetType} className="space-y-4 text-xs">
            {newTypeError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{newTypeError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nombre del Tipo de Hardware *</label>
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Ej: Tablet Robusta, Lector Biométrico, Servidor Rack, Switch PoE..."
                className="gov-input font-semibold"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Categoría Tecnológica *</label>
              <SearchableSelect
                value={newTypeCategory}
                onChange={(val) => setNewTypeCategory(val)}
                options={[
                  { value: 'COMPUTO', label: 'Cómputo (Notebooks, All-in-One, Mini PC, Servidores)', badge: 'Cómputo' },
                  { value: 'PANTALLAS', label: 'Pantallas & Monitores (Monitores IPS, Televisores)', badge: 'Pantallas' },
                  { value: 'REDES', label: 'Redes & Conectividad (Switches, Routers, Access Points)', badge: 'Redes' },
                  { value: 'IMPRESION', label: 'Impresión & Digitalización (Impresoras térmicas, Multifuncionales)', badge: 'Impresión' },
                  { value: 'PERIFERICOS_BIOMETRIA', label: 'Biometría & Seguridad (Lectores de huella, Cédula, Cámaras)', badge: 'Seguridad' }
                ]}
                placeholder="Seleccione categoría..."
                searchPlaceholder="Filtrar categoría..."
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <input
                type="checkbox"
                id="settingsReqInvCheck"
                checked={newTypeRequiresInv}
                onChange={(e) => setNewTypeRequiresInv(e.target.checked)}
                className="w-4 h-4 text-[#003B70] rounded"
              />
              <label htmlFor="settingsReqInvCheck" className="text-slate-700 font-semibold cursor-pointer select-none">
                Requiere Número de Inventario institucional para bienes propios
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateTypeModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingType}
                className="gov-btn-primary"
              >
                <Laptop className="w-4 h-4" />
                {isCreatingType ? 'Guardando en PostgreSQL...' : 'Guardar Tipo de Hardware'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CREAR PROVEEDOR */}
      {isCreateSupplierModalOpen && (
        <Modal
          isOpen={isCreateSupplierModalOpen}
          onClose={() => setIsCreateSupplierModalOpen(false)}
          title="Registrar Nuevo Proveedor Acreditado"
          subtitle="Creación de empresa proveedora de hardware y servicios TI"
          maxWidth="md"
        >
          <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
            {newSupplierError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{newSupplierError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">RUT Proveedor / Empresa *</label>
              <input
                type="text"
                value={newSupplierRut}
                onChange={(e) => setNewSupplierRut(formatRut(e.target.value))}
                placeholder="Ej: 76.123.456-7 o 7777777-7"
                className="gov-input font-mono font-bold"
                required
                autoFocus
              />
              <p className="text-[11px] text-slate-400 mt-1">Homologación automática: con o sin puntos y guión (ej: 7777777-7 → 7.777.777-7)</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Razón Social *</label>
              <input
                type="text"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Ej: Entel Digital S.A. / Lenovo Chile SpA"
                className="gov-input font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nombre de Contacto / Ejecutivo</label>
              <input
                type="text"
                value={newSupplierContact}
                onChange={(e) => setNewSupplierContact(e.target.value)}
                placeholder="Ej: Cristian Lagos (KAM Gobierno)"
                className="gov-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Correo de Contacto</label>
                <input
                  type="email"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  placeholder="contacto@proveedor.cl"
                  className="gov-input"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Teléfono</label>
                <input
                  type="text"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="+56 2 2999 8888"
                  className="gov-input font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateSupplierModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingSupplier}
                className="gov-btn-primary"
              >
                <Truck className="w-4 h-4" />
                {isCreatingSupplier ? 'Registrando en PostgreSQL...' : 'Guardar Proveedor'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CREAR ORDEN DE COMPRA */}
      {isCreatePOModalOpen && (
        <Modal
          isOpen={isCreatePOModalOpen}
          onClose={() => setIsCreatePOModalOpen(false)}
          title="Registrar Orden de Compra (ChileCompra)"
          subtitle="Vincular adquisición de activos propios institucionales"
          maxWidth="md"
        >
          <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
            {newPOError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{newPOError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">N° Orden de Compra (OC) *</label>
              <input
                type="text"
                value={newPOOCNumber}
                onChange={(e) => setNewPOOCNumber(e.target.value)}
                placeholder="Ej: 2450-128-CM26"
                className="gov-input font-mono font-bold text-[#003B70]"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Proveedor Adjudicado *</label>
              <SearchableSelect
                value={newPOSupplierId}
                onChange={(val) => setNewPOSupplierId(val)}
                options={suppliers.map(s => ({
                  value: s.id,
                  label: s.businessName,
                  sublabel: s.rut,
                  badge: s.contactName || 'Proveedor'
                }))}
                placeholder="Seleccione proveedor..."
                searchPlaceholder="Filtrar proveedor..."
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Descripción de la Adquisición *</label>
              <textarea
                rows={2}
                value={newPODescription}
                onChange={(e) => setNewPODescription(e.target.value)}
                placeholder="Ej: Adquisición de 50 Notebooks para renovación de puestos de atención..."
                className="gov-input"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Fecha Emisión OC *</label>
                <input
                  type="date"
                  value={newPOOrderDate}
                  onChange={(e) => setNewPOOrderDate(e.target.value)}
                  className="gov-input"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Monto Total CLP (Opcional)</label>
                <input
                  type="number"
                  value={newPOTotalAmount}
                  onChange={(e) => setNewPOTotalAmount(e.target.value)}
                  placeholder="Ej: 35000000"
                  className="gov-input font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreatePOModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingPO}
                className="gov-btn-primary"
              >
                <ShoppingBag className="w-4 h-4" />
                {isCreatingPO ? 'Guardando en PostgreSQL...' : 'Guardar y Vincular OC'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CREAR CONTRATO / LICITACIÓN */}
      {isCreateContractModalOpen && (
        <Modal
          isOpen={isCreateContractModalOpen}
          onClose={() => setIsCreateContractModalOpen(false)}
          title="Registrar Contrato de Arriendo / Licitación"
          subtitle="Asociar arriendo de equipamiento tecnológico y vencimiento"
          maxWidth="md"
        >
          <form onSubmit={handleCreateContract} className="space-y-4 text-xs">
            {newContractError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{newContractError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">N° Contrato / ID Licitación *</label>
              <input
                type="text"
                value={newContractNumber}
                onChange={(e) => setNewContractNumber(e.target.value)}
                placeholder="Ej: LIC-2026-ARRIENDO-02 / LP-2450-12-26"
                className="gov-input font-mono font-bold text-blue-800"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nombre del Servicio de Arriendo *</label>
              <input
                type="text"
                value={newContractName}
                onChange={(e) => setNewContractName(e.target.value)}
                placeholder="Ej: Servicio de Arriendo de Equipamiento Microinformático 36 Meses"
                className="gov-input font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Empresa Proveedora de Arriendo *</label>
              <SearchableSelect
                value={newContractSupplierId}
                onChange={(val) => setNewContractSupplierId(val)}
                options={suppliers.map(s => ({
                  value: s.id,
                  label: s.businessName,
                  sublabel: s.rut,
                  badge: s.contactName || 'Proveedor'
                }))}
                placeholder="Seleccione proveedor..."
                searchPlaceholder="Filtrar proveedor..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Fecha Inicio Contrato *</label>
                <input
                  type="date"
                  value={newContractStartDate}
                  onChange={(e) => setNewContractStartDate(e.target.value)}
                  className="gov-input"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Fecha Término / Devolución *</label>
                <input
                  type="date"
                  value={newContractEndDate}
                  onChange={(e) => setNewContractEndDate(e.target.value)}
                  className="gov-input font-bold text-[#E4002B]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Días de Anticipación para Alerta de Vencimiento</label>
              <input
                type="number"
                min="1"
                max="180"
                value={newContractWarningDays}
                onChange={(e) => setNewContractWarningDays(parseInt(e.target.value, 10) || 30)}
                className="gov-input font-bold"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateContractModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingContract}
                className="gov-btn-primary"
              >
                <Layers className="w-4 h-4" />
                {isCreatingContract ? 'Guardando en PostgreSQL...' : 'Guardar Contrato'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CREAR BODEGA / SUCURSAL */}
      {isCreateBranchModalOpen && (
        <Modal
          isOpen={isCreateBranchModalOpen}
          onClose={() => setIsCreateBranchModalOpen(false)}
          title="Agregar Nueva Bodega o Sucursal"
          subtitle="Registrar un nuevo punto de almacenamiento o atención institucional"
          maxWidth="md"
        >
          <form onSubmit={handleCreateBranch} className="space-y-4 text-xs">
            {newBranchError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{newBranchError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Código Único de Bodega / Sucursal *</label>
              <input
                type="text"
                value={newBranchCode}
                onChange={(e) => setNewBranchCode(e.target.value.toUpperCase())}
                placeholder="Ej: BOD-RM-CENTRO / SUC-BIO-CONCEPCION"
                className="gov-input font-mono font-bold text-[#003B70]"
                required
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-1">Identificador estandarizado de la dependencia</p>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nombre Oficial de la Bodega / Sucursal *</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="Ej: Bodega Central Alameda / Sucursal Concepción Plaza"
                className="gov-input font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Región Político-Administrativa *</label>
                <select
                  value={newBranchRegion}
                  onChange={(e) => setNewBranchRegion(e.target.value)}
                  className="gov-input font-medium"
                  required
                >
                  {CHILEAN_REGIONS.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Comuna *</label>
                <input
                  type="text"
                  value={newBranchCommune}
                  onChange={(e) => setNewBranchCommune(e.target.value)}
                  placeholder="Ej: Santiago, Concepción, Temuco..."
                  className="gov-input font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Dirección Física Completa</label>
              <input
                type="text"
                value={newBranchAddress}
                onChange={(e) => setNewBranchAddress(e.target.value)}
                placeholder="Ej: Av. Libertador Bernardo O'Higgins 1353, Piso 3"
                className="gov-input"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCreateBranchModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingBranch}
                className="gov-btn-primary"
              >
                <Building2 className="w-4 h-4" />
                {isCreatingBranch ? 'Guardando en PostgreSQL...' : 'Crear Bodega'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL EDITAR BODEGA / SUCURSAL */}
      {isEditBranchModalOpen && (
        <Modal
          isOpen={isEditBranchModalOpen}
          onClose={() => setIsEditBranchModalOpen(false)}
          title="Editar Bodega o Sucursal"
          subtitle={`Actualizar información de la dependencia ${editBranchCode}`}
          maxWidth="md"
        >
          <form onSubmit={handleUpdateBranch} className="space-y-4 text-xs">
            {editBranchError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                <span>{editBranchError}</span>
              </div>
            )}

            <div>
              <label className="block text-slate-700 font-bold mb-1">Código Único de Bodega / Sucursal *</label>
              <input
                type="text"
                value={editBranchCode}
                onChange={(e) => setEditBranchCode(e.target.value.toUpperCase())}
                className="gov-input font-mono font-bold text-[#003B70]"
                required
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Nombre Oficial de la Bodega / Sucursal *</label>
              <input
                type="text"
                value={editBranchName}
                onChange={(e) => setEditBranchName(e.target.value)}
                className="gov-input font-semibold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Región *</label>
                <select
                  value={editBranchRegion}
                  onChange={(e) => setEditBranchRegion(e.target.value)}
                  className="gov-input font-medium"
                  required
                >
                  {CHILEAN_REGIONS.map(reg => (
                    <option key={reg} value={reg}>{reg}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Comuna *</label>
                <input
                  type="text"
                  value={editBranchCommune}
                  onChange={(e) => setEditBranchCommune(e.target.value)}
                  className="gov-input font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Dirección Física</label>
              <input
                type="text"
                value={editBranchAddress}
                onChange={(e) => setEditBranchAddress(e.target.value)}
                className="gov-input"
              />
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <label className="text-slate-800 font-bold block">Estado de la Dependencia</label>
                <span className="text-[11px] text-slate-500">
                  {editBranchIsActive ? 'La bodega se encuentra operativa y habilitada para recepciones y asignaciones' : 'La bodega está temporalmente inactiva o cerrada'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditBranchIsActive(!editBranchIsActive)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                  editBranchIsActive
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                {editBranchIsActive ? '✓ OPERATIVA' : 'INACTIVA'}
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsEditBranchModalOpen(false)}
                className="gov-btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdatingBranch}
                className="gov-btn-primary"
              >
                <Pencil className="w-4 h-4" />
                {isUpdatingBranch ? 'Guardando en PostgreSQL...' : 'Actualizar Bodega'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
