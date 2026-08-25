import React, { useState, useEffect } from 'react';
import { 
  PackagePlus, 
  FileText, 
  Barcode, 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Download,
  Shield,
  Layers,
  Laptop,
  Truck,
  ShoppingBag
} from 'lucide-react';
import { storage } from '../../db/storage';
import { Asset, AssetPropertyType, PhysicalCondition, AssetType, Consumable } from '../../types/asset';
import { Branch, Supplier, PurchaseOrder, LeasingContract, DispatchGuide } from '../../types/document';
import { ExcelService } from '../../services/excelService';
import { PDFService } from '../../services/pdfService';
import { formatDate, validateRut, formatRut } from '../../utils/formatters';
import { ApiClient } from '../../api/client';
import { Modal } from '../common/Modal';
import { SearchableSelect } from '../common/SearchableSelect';

interface ReceptionItem {
  id: string;
  serialNumber: string;
  inventoryNumber?: string;
  brand: string;
  model: string;
  assetTypeId: string;
  physicalCondition: PhysicalCondition;
  cpu?: string;
  ram?: string;
  storage?: string;
}

export const ReceptionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [receptionType, setReceptionType] = useState<'ASSETS' | 'CONSUMABLES'>('ASSETS');
  const [propertyType, setPropertyType] = useState<AssetPropertyType>('PROPIO');

  // Maestros
  const [branches, setBranches] = useState<Branch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [leasingContracts, setLeasingContracts] = useState<LeasingContract[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [consumables, setConsumables] = useState<Consumable[]>([]);
  const [dispatchGuides, setDispatchGuides] = useState<DispatchGuide[]>([]);

  // Formulario Documental
  const [guideNumber, setGuideNumber] = useState<string>('');
  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState<string>('');
  const [purchaseOrderId, setPurchaseOrderId] = useState<string>('');
  const [leasingContractId, setLeasingContractId] = useState<string>('');
  const [targetBranchId, setTargetBranchId] = useState<string>('');
  const [observations, setObservations] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');

  // Ítems de Activos en proceso de ingreso
  const [items, setItems] = useState<ReceptionItem[]>([]);
  
  // Inputs para escáner rápido / manual
  const [inputSerial, setInputSerial] = useState<string>('');
  const [inputInventory, setInputInventory] = useState<string>('');
  const [inputBrand, setInputBrand] = useState<string>('Lenovo');
  const [inputModel, setInputModel] = useState<string>('ThinkPad T14 Gen 4');
  const [inputAssetTypeId, setInputAssetTypeId] = useState<string>('');
  const [inputCondition, setInputCondition] = useState<PhysicalCondition>('NUEVO');
  const [inputCpu, setInputCpu] = useState<string>('Intel Core i5-1335U');
  const [inputRam, setInputRam] = useState<string>('16 GB');
  const [inputStorage, setInputStorage] = useState<string>('512 GB SSD');

  // Modal para Crear Nuevo Tipo de Hardware
  const [isCreateTypeModalOpen, setIsCreateTypeModalOpen] = useState<boolean>(false);
  const [newTypeName, setNewTypeName] = useState<string>('');
  const [newTypeCategory, setNewTypeCategory] = useState<string>('COMPUTO');
  const [newTypeRequiresInv, setNewTypeRequiresInv] = useState<boolean>(true);
  const [newTypeError, setNewTypeError] = useState<string | null>(null);
  const [isCreatingType, setIsCreatingType] = useState<boolean>(false);

  // Modal para Crear Nuevo Proveedor
  const [isCreateSupplierModalOpen, setIsCreateSupplierModalOpen] = useState<boolean>(false);
  const [newSupplierRut, setNewSupplierRut] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [newSupplierContact, setNewSupplierContact] = useState<string>('');
  const [newSupplierEmail, setNewSupplierEmail] = useState<string>('');
  const [newSupplierPhone, setNewSupplierPhone] = useState<string>('');
  const [newSupplierError, setNewSupplierError] = useState<string | null>(null);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState<boolean>(false);

  // Modal para Crear Nueva Orden de Compra
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState<boolean>(false);
  const [newPOOCNumber, setNewPOOCNumber] = useState<string>('');
  const [newPOSupplierId, setNewPOSupplierId] = useState<string>('');
  const [newPODescription, setNewPODescription] = useState<string>('');
  const [newPOOrderDate, setNewPOOrderDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPOTotalAmount, setNewPOTotalAmount] = useState<string>('');
  const [newPOError, setNewPOError] = useState<string | null>(null);
  const [isCreatingPO, setIsCreatingPO] = useState<boolean>(false);

  // Modal para Crear Nuevo Contrato / Licitación
  const [isCreateContractModalOpen, setIsCreateContractModalOpen] = useState<boolean>(false);
  const [newContractNumber, setNewContractNumber] = useState<string>('');
  const [newContractName, setNewContractName] = useState<string>('');
  const [newContractSupplierId, setNewContractSupplierId] = useState<string>('');
  const [newContractStartDate, setNewContractStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newContractEndDate, setNewContractEndDate] = useState<string>(new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]);
  const [newContractWarningDays, setNewContractWarningDays] = useState<number>(30);
  const [newContractError, setNewContractError] = useState<string | null>(null);
  const [isCreatingContract, setIsCreatingContract] = useState<boolean>(false);

  // Input para Consumibles
  const [selectedConsumableId, setSelectedConsumableId] = useState<string>('');
  const [consumableQuantity, setConsumableQuantity] = useState<number>(10);

  // Estados de validación y feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successBatch, setSuccessBatch] = useState<Asset[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    const [b, s, pos, contracts, types, cns, guides] = await Promise.all([
      ApiClient.getBranches(),
      ApiClient.getSuppliers(),
      ApiClient.getPurchaseOrders(),
      ApiClient.getLeasingContracts(),
      ApiClient.getAssetTypes(),
      ApiClient.getConsumables(),
      ApiClient.getDispatchGuides()
    ]);

    setBranches(b);
    setSuppliers(s);
    setPurchaseOrders(pos);
    setLeasingContracts(contracts);
    setAssetTypes(types);
    setConsumables(cns);
    setDispatchGuides(guides);

    if (b.length > 0 && !targetBranchId) setTargetBranchId(b[0].id);
    if (s.length > 0 && !supplierId) setSupplierId(s[0].id);
    if (pos.length > 0 && !purchaseOrderId) setPurchaseOrderId(pos[0].id);
    if (contracts.length > 0 && !leasingContractId) setLeasingContractId(contracts[0].id);
    if (types.length > 0 && !inputAssetTypeId) setInputAssetTypeId(types[0].id);
    if (cns.length > 0 && !selectedConsumableId) setSelectedConsumableId(cns[0].id);
  };

  useEffect(() => {
    loadData();
    window.addEventListener('itam_storage_updated', loadData);
    return () => window.removeEventListener('itam_storage_updated', loadData);
  }, []);

  // Handler: Crear Tipo de Hardware
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
      const created = await ApiClient.createAssetType({
        name: cleanName,
        category: newTypeCategory,
        requiresInventoryNumber: newTypeRequiresInv,
        iconName: 'Laptop'
      });

      const updatedTypes = await ApiClient.getAssetTypes();
      setAssetTypes(updatedTypes);
      setInputAssetTypeId(created.id);
      setIsCreateTypeModalOpen(false);
      setNewTypeName('');
    } catch (err: any) {
      setNewTypeError(err.message || 'Error al registrar tipo de hardware.');
    } finally {
      setIsCreatingType(false);
    }
  };

  // Handler: Crear Proveedor
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewSupplierError(null);

    const cleanRut = formatRut(newSupplierRut.trim());
    if (!validateRut(cleanRut)) {
      setNewSupplierError('El RUT del proveedor no es válido (mínimo 7 caracteres numéricos + dígito verificador).');
      return;
    }

    if (!newSupplierName.trim()) {
      setNewSupplierError('La Razón Social del proveedor es obligatoria.');
      return;
    }

    setIsCreatingSupplier(true);
    try {
      const created = await ApiClient.createSupplier({
        rut: cleanRut,
        businessName: newSupplierName.trim(),
        contactName: newSupplierContact.trim() || undefined,
        contactEmail: newSupplierEmail.trim() || undefined,
        contactPhone: newSupplierPhone.trim() || undefined
      });

      const updated = await ApiClient.getSuppliers();
      setSuppliers(updated);
      setSupplierId(created.id);
      setIsCreateSupplierModalOpen(false);
      setNewSupplierRut('');
      setNewSupplierName('');
      setNewSupplierContact('');
      setNewSupplierEmail('');
      setNewSupplierPhone('');
    } catch (err: any) {
      setNewSupplierError(err.message || 'Error al registrar proveedor.');
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  // Handler: Crear Orden de Compra
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewPOError(null);

    if (!newPOOCNumber.trim() || !newPODescription.trim()) {
      setNewPOError('El N° de Orden de Compra y la Descripción son obligatorios.');
      return;
    }

    const supId = newPOSupplierId || supplierId || (suppliers.length > 0 ? suppliers[0].id : '');
    if (!supId) {
      setNewPOError('Seleccione el proveedor emisor.');
      return;
    }

    setIsCreatingPO(true);
    try {
      const created = await ApiClient.createPurchaseOrder({
        ocNumber: newPOOCNumber.trim().toUpperCase(),
        supplierId: supId,
        description: newPODescription.trim(),
        orderDate: newPOOrderDate,
        totalAmountCLP: newPOTotalAmount ? parseFloat(newPOTotalAmount) : undefined
      });

      const updated = await ApiClient.getPurchaseOrders();
      setPurchaseOrders(updated);
      setPurchaseOrderId(created.id);
      setSupplierId(supId);
      setIsCreatePOModalOpen(false);
      setNewPOOCNumber('');
      setNewPODescription('');
      setNewPOTotalAmount('');
    } catch (err: any) {
      setNewPOError(err.message || 'Error al registrar orden de compra.');
    } finally {
      setIsCreatingPO(false);
    }
  };

  // Handler: Crear Contrato / Licitación
  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewContractError(null);

    if (!newContractNumber.trim() || !newContractName.trim()) {
      setNewContractError('El N° de Contrato y Nombre/Licitación son obligatorios.');
      return;
    }

    const supId = newContractSupplierId || supplierId || (suppliers.length > 0 ? suppliers[0].id : '');
    if (!supId) {
      setNewContractError('Seleccione el proveedor adjudicatario.');
      return;
    }

    setIsCreatingContract(true);
    try {
      const created = await ApiClient.createLeasingContract({
        contractNumber: newContractNumber.trim().toUpperCase(),
        name: newContractName.trim(),
        supplierId: supId,
        startDate: newContractStartDate,
        endDate: newContractEndDate,
        warningDaysThreshold: newContractWarningDays
      });

      const updated = await ApiClient.getLeasingContracts();
      setLeasingContracts(updated);
      setLeasingContractId(created.id);
      setSupplierId(supId);
      setIsCreateContractModalOpen(false);
      setNewContractNumber('');
      setNewContractName('');
    } catch (err: any) {
      setNewContractError(err.message || 'Error al registrar contrato.');
    } finally {
      setIsCreatingContract(false);
    }
  };

  const handleAddSingleItem = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanSerial = inputSerial.trim().toUpperCase();
    const cleanInv = inputInventory.trim().toUpperCase();
    const typeIdToUse = inputAssetTypeId || (assetTypes.length > 0 ? assetTypes[0].id : '');

    if (!cleanSerial) {
      setErrorMsg('Debe ingresar o escanear el Número de Serie.');
      return;
    }

    if (propertyType === 'PROPIO' && !cleanInv) {
      setErrorMsg('Para Activos Propios de ChileAtiende, el Número de Inventario institucional es OBLIGATORIO.');
      return;
    }

    if (!inputBrand.trim() || !inputModel.trim()) {
      setErrorMsg('Debe especificar Marca y Modelo del equipo.');
      return;
    }

    // Validación de duplicados en la lista actual
    if (items.some(i => i.serialNumber.toUpperCase() === cleanSerial)) {
      setErrorMsg(`El Número de Serie '${cleanSerial}' ya está agregado en la lista actual.`);
      return;
    }

    if (propertyType === 'PROPIO' && items.some(i => i.inventoryNumber?.toUpperCase() === cleanInv)) {
      setErrorMsg(`El Número de Inventario '${cleanInv}' ya está agregado en la lista actual.`);
      return;
    }

    // Validación contra el almacenamiento local / DB
    if (storage.checkSerialExists(cleanSerial)) {
      setErrorMsg(`El Número de Serie '${cleanSerial}' ya existe en el inventario.`);
      return;
    }

    if (propertyType === 'PROPIO' && storage.checkInventoryNumberExists(cleanInv)) {
      setErrorMsg(`El Número de Inventario '${cleanInv}' ya existe en el inventario.`);
      return;
    }

    const newItem: ReceptionItem = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      serialNumber: cleanSerial,
      inventoryNumber: propertyType === 'PROPIO' ? cleanInv : undefined,
      brand: inputBrand.trim(),
      model: inputModel.trim(),
      assetTypeId: typeIdToUse,
      physicalCondition: inputCondition,
      cpu: inputCpu.trim(),
      ram: inputRam.trim(),
      storage: inputStorage.trim()
    };

    setItems([newItem, ...items]);
    setInputSerial('');
    setInputInventory('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    try {
      const existingAssets = await ApiClient.getAssets();
      const existingSerials = new Set(existingAssets.map(a => a.serialNumber.toUpperCase()));
      const existingInv = new Set(existingAssets.map(a => a.inventoryNumber?.toUpperCase()).filter(Boolean) as string[]);

      const parsedRows = await ExcelService.parseUploadedFile(file, propertyType, existingSerials, existingInv);
      
      const invalidRows = parsedRows.filter(r => !r.isValid);
      if (invalidRows.length > 0) {
        setErrorMsg(`El archivo contiene ${invalidRows.length} fila(s) con errores o series duplicadas. Revise el archivo.`);
      }

      const validRows = parsedRows.filter(r => r.isValid);
      const newItems: ReceptionItem[] = validRows.map(r => {
        const matchedType = assetTypes.find(t => t.name.toLowerCase().includes(r.assetTypeName.toLowerCase())) || assetTypes[0];
        return {
          id: `tmp-${Date.now()}-${Math.random()}`,
          serialNumber: r.serialNumber,
          inventoryNumber: r.inventoryNumber,
          brand: r.brand,
          model: r.model,
          assetTypeId: matchedType ? matchedType.id : (assetTypes[0]?.id || 'type-notebook'),
          physicalCondition: r.physicalCondition,
          cpu: r.cpu,
          ram: r.ram,
          storage: r.storage
        };
      });

      setItems([...newItems, ...items]);
      setUploadedFileName(file.name);
    } catch (err: any) {
      setErrorMsg(`Error procesando archivo Excel: ${err.message || 'Formato no soportado'}`);
    }
  };

  const handleFinalizeReception = async () => {
    setErrorMsg(null);

    const cleanGuide = guideNumber.trim();
    if (!cleanGuide) {
      setErrorMsg('Debe ingresar el Número de Guía de Despacho SII.');
      return;
    }

    const selectedSupplier = suppliers.find(s => s.id === supplierId) || suppliers[0];
    const selectedBranch = branches.find(b => b.id === targetBranchId) || branches[0];
    const selectedPO = purchaseOrders.find(p => p.id === purchaseOrderId) || (propertyType === 'PROPIO' ? purchaseOrders[0] : undefined);
    const selectedContract = leasingContracts.find(c => c.id === leasingContractId) || (propertyType === 'ARRIENDO' ? leasingContracts[0] : undefined);
    const currentUser = storage.getCurrentUser();

    if (!selectedSupplier || !selectedBranch) {
      setErrorMsg('Verifique que existan proveedores y sucursales configurados.');
      return;
    }

    if (propertyType === 'PROPIO' && !selectedPO) {
      setErrorMsg('Para Activos Propios es obligatorio seleccionar una Orden de Compra (OC).');
      return;
    }

    if (propertyType === 'ARRIENDO' && !selectedContract) {
      setErrorMsg('Para Activos en Arriendo es obligatorio seleccionar un Contrato de Leasing.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (receptionType === 'ASSETS') {
        if (items.length === 0) {
          setErrorMsg('Debe agregar al menos un activo serializado a la lista de recepción.');
          setIsSubmitting(false);
          return;
        }

        const payload = {
          guideNumber: cleanGuide,
          supplierId: selectedSupplier.id,
          purchaseOrderId: propertyType === 'PROPIO' ? selectedPO?.id : undefined,
          leasingContractId: propertyType === 'ARRIENDO' ? selectedContract?.id : undefined,
          branchId: selectedBranch.id,
          dispatchDate,
          documentName: uploadedFileName || `Guia_${cleanGuide}.pdf`,
          receivedByUserId: currentUser.id,
          receivedByUserName: currentUser.fullName,
          propertyType,
          items,
          observations: observations.trim()
        };

        const res = await ApiClient.registerReception(payload);
        
        const now = new Date().toISOString();
        const createdAssetsList: Asset[] = res.assets || items.map(item => {
          const typeObj = assetTypes.find(t => t.id === item.assetTypeId) || assetTypes[0];
          return {
            id: `ast-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
            serialNumber: item.serialNumber,
            inventoryNumber: item.inventoryNumber,
            brand: item.brand,
            model: item.model,
            assetTypeId: typeObj?.id || 'type-notebook',
            assetTypeName: typeObj?.name || 'Hardware',
            category: typeObj?.category || 'COMPUTO',
            propertyType,
            status: 'BODEGA_DISPONIBLE',
            physicalCondition: item.physicalCondition,
            dispatchGuideId: `guide-${Date.now()}`,
            dispatchGuideNumber: cleanGuide,
            supplierName: selectedSupplier.businessName,
            currentBranchId: selectedBranch.id,
            currentBranchName: selectedBranch.name,
            receptionDate: now,
            createdAt: now,
            updatedAt: now
          };
        });

        setSuccessBatch(createdAssetsList);
        setItems([]);
        setGuideNumber('');
        setUploadedFileName('');
        loadData();
      } else {
        if (!selectedConsumableId) {
          setErrorMsg('Seleccione un insumo o accesorio.');
          setIsSubmitting(false);
          return;
        }

        if (consumableQuantity <= 0 || isNaN(consumableQuantity)) {
          setErrorMsg('La cantidad a ingresar debe ser un número entero mayor a 0.');
          setIsSubmitting(false);
          return;
        }

        await ApiClient.registerStockMovement({
          consumableId: selectedConsumableId,
          branchId: selectedBranch.id,
          movementType: 'INGRESO_GUIA',
          quantity: consumableQuantity,
          reason: `Ingreso por Guía de Despacho N° ${cleanGuide}`
        });

        const consumableObj = consumables.find(c => c.id === selectedConsumableId);
        alert(`✓ Se ingresaron exitosamente ${consumableQuantity} unidades de '${consumableObj?.name}' a ${selectedBranch.name}.`);
        setGuideNumber('');
        loadData();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar la recepción.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Cabecera y Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#003B70] tracking-tight">Recepción e Ingreso de Mercadería</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingreso formal con Guías de Despacho SII, Órdenes de Compra y Contratos de Arriendo
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-2xs">
          <button
            onClick={() => { setActiveTab('NEW'); setSuccessBatch(null); }}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'NEW' ? 'bg-[#003B70] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Nueva Recepción
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
              activeTab === 'HISTORY' ? 'bg-[#003B70] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historial de Guías ({dispatchGuides.length})
          </button>
        </div>
      </div>

      {/* Banner de Éxito */}
      {successBatch && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">¡Recepción Registrada Exitosamente!</h3>
              <p className="text-xs text-emerald-700">
                Se registraron <strong>{successBatch.length} equipos</strong> en estado <strong>BODEGA DISPONIBLE</strong> en la base de datos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => PDFService.generateAssetStickersPDF(successBatch)}
              className="gov-btn-primary bg-emerald-700 hover:bg-emerald-800"
            >
              <Printer className="w-4 h-4" />
              Imprimir Etiquetas QR ({successBatch.length})
            </button>
            <button
              onClick={() => setSuccessBatch(null)}
              className="px-3 py-2 text-xs font-bold text-emerald-800 hover:underline"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {activeTab === 'NEW' ? (
        <div className="space-y-6">
          {/* 1. Modalidad */}
          <div className="gov-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#003B70] text-white flex items-center justify-center text-xs font-bold">1</span>
                <h3 className="text-sm font-bold text-slate-800">Modalidad y Tipo de Ítems</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setReceptionType('ASSETS')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    receptionType === 'ASSETS' ? 'bg-[#003B70] text-white border-[#003B70]' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  Activos Serializados (ITAM)
                </button>
                <button
                  type="button"
                  onClick={() => setReceptionType('CONSUMABLES')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                    receptionType === 'CONSUMABLES' ? 'bg-[#003B70] text-white border-[#003B70]' : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  Insumos / Accesorios a Granel
                </button>
              </div>
            </div>

            {receptionType === 'ASSETS' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setPropertyType('PROPIO')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    propertyType === 'PROPIO'
                      ? 'bg-[#EBF3FA] border-[#003B70] text-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold text-[#003B70]">Activos Propios (ChileAtiende)</span>
                    <Shield className="w-4 h-4 text-[#003B70]" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bienes adquiridos institucionalmente. <strong>Requiere Orden de Compra (OC)</strong> y <strong>N° de Inventario obligatorio</strong>.
                  </p>
                </div>

                <div
                  onClick={() => setPropertyType('ARRIENDO')}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    propertyType === 'ARRIENDO'
                      ? 'bg-blue-50 border-blue-500 text-slate-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-extrabold text-blue-800">Activos en Arriendo (Leasing)</span>
                    <Layers className="w-4 h-4 text-blue-700" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Equipos suministrados por licitación externa. <strong>Requiere Contrato de Arriendo</strong> y control de fecha de vencimiento.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 2. Documentos de Ingreso */}
          <div className="gov-card p-4 sm:p-5 space-y-4 overflow-hidden">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-5 h-5 rounded-full bg-[#003B70] text-white flex items-center justify-center text-xs font-bold shrink-0">2</span>
              <h3 className="text-sm font-bold text-slate-800">Documentación Tributaria y Legal</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-700 font-bold">Proveedor Emisor *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSupplierRut('');
                      setNewSupplierName('');
                      setNewSupplierContact('');
                      setNewSupplierEmail('');
                      setNewSupplierPhone('');
                      setNewSupplierError(null);
                      setIsCreateSupplierModalOpen(true);
                    }}
                    className="text-[11px] text-[#003B70] hover:underline font-bold flex items-center gap-0.5"
                    title="Registrar un nuevo proveedor"
                  >
                    <Plus className="w-3 h-3" /> Nuevo Proveedor
                  </button>
                </div>
                <SearchableSelect
                  value={supplierId}
                  onChange={(val) => setSupplierId(val)}
                  options={suppliers.map(s => ({
                    value: s.id,
                    label: s.businessName,
                    sublabel: s.rut,
                    badge: s.contactName || 'Proveedor'
                  }))}
                  placeholder="Seleccione proveedor acreditado..."
                  searchPlaceholder="Filtrar proveedor por razón social o RUT..."
                />
              </div>

              <div className="min-w-0">
                <label className="block text-slate-700 font-bold mb-1">N° Guía de Despacho (SII) *</label>
                <input
                  type="text"
                  value={guideNumber}
                  onChange={(e) => setGuideNumber(e.target.value)}
                  placeholder="Ej: GD-990123"
                  className="gov-input font-mono font-bold w-full max-w-full min-w-0"
                  required
                />
              </div>

              <div className="min-w-0">
                <label className="block text-slate-700 font-bold mb-1 truncate">Fecha Emisión Guía *</label>
                <input
                  type="date"
                  value={dispatchDate}
                  onChange={(e) => setDispatchDate(e.target.value)}
                  className="gov-input w-full max-w-full min-w-0"
                  required
                />
              </div>

              {propertyType === 'PROPIO' && (
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">N° Orden de Compra (OC ChileCompra) *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewPOOCNumber('');
                        setNewPOSupplierId(supplierId || (suppliers[0]?.id || ''));
                        setNewPODescription('');
                        setNewPOTotalAmount('');
                        setNewPOError(null);
                        setIsCreatePOModalOpen(true);
                      }}
                      className="text-[11px] text-[#003B70] hover:underline font-bold flex items-center gap-0.5"
                      title="Registrar una nueva Orden de Compra"
                    >
                      <Plus className="w-3 h-3" /> Nueva OC
                    </button>
                  </div>
                  <SearchableSelect
                    value={purchaseOrderId}
                    onChange={(val) => setPurchaseOrderId(val)}
                    options={purchaseOrders.map(p => ({
                      value: p.id,
                      label: p.ocNumber,
                      sublabel: p.description,
                      badge: 'ChileCompra'
                    }))}
                    placeholder="Seleccione Orden de Compra..."
                    searchPlaceholder="Filtrar OC por número o descripción..."
                  />
                </div>
              )}

              {propertyType === 'ARRIENDO' && (
                <div className="min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 font-bold">Contrato de Leasing / Arriendo *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setNewContractNumber('');
                        setNewContractName('');
                        setNewContractSupplierId(supplierId || (suppliers[0]?.id || ''));
                        setNewContractError(null);
                        setIsCreateContractModalOpen(true);
                      }}
                      className="text-[11px] text-blue-700 hover:underline font-bold flex items-center gap-0.5"
                      title="Registrar un nuevo contrato de leasing o licitación"
                    >
                      <Plus className="w-3 h-3" /> Nueva Licitación
                    </button>
                  </div>
                  <SearchableSelect
                    value={leasingContractId}
                    onChange={(val) => setLeasingContractId(val)}
                    options={leasingContracts.map(c => ({
                      value: c.id,
                      label: c.contractNumber,
                      sublabel: c.name,
                      badge: 'Leasing'
                    }))}
                    placeholder="Seleccione contrato o licitación..."
                    searchPlaceholder="Filtrar por N° o nombre de licitación..."
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">Sucursal / Bodega de Ingreso *</label>
                <SearchableSelect
                  value={targetBranchId}
                  onChange={(val) => setTargetBranchId(val)}
                  options={branches.map(b => ({
                    value: b.id,
                    label: b.name,
                    sublabel: b.region,
                    badge: b.code
                  }))}
                  placeholder="Seleccione bodega de ingreso..."
                  searchPlaceholder="Filtrar bodega..."
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Archivo de Respaldo (PDF / Foto Guía)</label>
                <label className="cursor-pointer flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-slate-600 transition-colors">
                  <FileText className="w-4 h-4 text-[#003B70]" />
                  <span className="truncate">{uploadedFileName || 'Adjuntar Guía PDF'}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadedFileName(e.target.files?.[0]?.name || '')}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* 3. Carga de Activos */}
          {receptionType === 'ASSETS' ? (
            <div className="gov-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#003B70] text-white flex items-center justify-center text-xs font-bold">3</span>
                  <h3 className="text-sm font-bold text-slate-800">Ingreso de Equipos y Escaneo</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => ExcelService.downloadImportTemplate(propertyType)}
                    className="gov-btn-secondary"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                    Descargar Plantilla Excel
                  </button>

                  <label className="cursor-pointer gov-btn-primary bg-emerald-700 hover:bg-emerald-800">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Importar Excel Masivo
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Formulario de Escaneo Rápido */}
              <form onSubmit={handleAddSingleItem} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#003B70] uppercase tracking-wider">
                  <Barcode className="w-4 h-4" />
                  <span>Escáner / Entrada Rápida con Pistola</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">N° de Serie *</label>
                    <input
                      type="text"
                      value={inputSerial}
                      onChange={(e) => setInputSerial(e.target.value)}
                      placeholder="Escanear serie..."
                      className="gov-input font-mono font-bold"
                    />
                  </div>

                  {propertyType === 'PROPIO' && (
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">N° Inventario Institucional *</label>
                      <input
                        type="text"
                        value={inputInventory}
                        onChange={(e) => setInputInventory(e.target.value)}
                        placeholder="Ej: CA-NB-2026-00450"
                        className="gov-input font-mono font-bold text-[#003B70]"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-slate-700 font-bold">Tipo de Hardware *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTypeName('');
                          setNewTypeCategory('COMPUTO');
                          setNewTypeRequiresInv(true);
                          setNewTypeError(null);
                          setIsCreateTypeModalOpen(true);
                        }}
                        className="text-[11px] text-[#003B70] hover:underline font-bold flex items-center gap-0.5"
                        title="Crear un nuevo tipo de dispositivo o hardware"
                      >
                        <Plus className="w-3 h-3" /> Nuevo Tipo
                      </button>
                    </div>
                    <SearchableSelect
                      value={inputAssetTypeId}
                      onChange={(val) => setInputAssetTypeId(val)}
                      options={assetTypes.map(t => ({
                        value: t.id,
                        label: t.name,
                        badge: t.category
                      }))}
                      placeholder="Seleccione tipo..."
                      searchPlaceholder="Filtrar tipo de hardware..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Marca / Modelo *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputBrand}
                        onChange={(e) => setInputBrand(e.target.value)}
                        placeholder="Marca"
                        className="gov-input w-1/2"
                        required
                      />
                      <input
                        type="text"
                        value={inputModel}
                        onChange={(e) => setInputModel(e.target.value)}
                        placeholder="Modelo"
                        className="gov-input w-1/2"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span>Estado: <strong>NUEVO</strong></span>
                    <span>Destino: <strong>BODEGA DISPONIBLE</strong></span>
                  </div>

                  <button
                    type="submit"
                    className="gov-btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar al Lote
                  </button>
                </div>
              </form>

              {/* Mensaje de Error */}
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Tabla de Activos en el Lote */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Equipos cargados en este lote: <strong className="text-slate-900">{items.length} unidades</strong></span>
                  {items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setItems([])}
                      className="text-[#E4002B] hover:underline font-bold text-xs"
                    >
                      Limpiar lista
                    </button>
                  )}
                </div>

                {items.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                    No hay equipos en la lista. Escanee números de serie o importe un archivo Excel.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-2 font-bold">#</th>
                          <th className="px-3 py-2 font-bold">N° Serie</th>
                          {propertyType === 'PROPIO' && <th className="px-3 py-2 font-bold">N° Inventario</th>}
                          <th className="px-3 py-2 font-bold">Tipo</th>
                          <th className="px-3 py-2 font-bold">Marca / Modelo</th>
                          <th className="px-3 py-2 font-bold">Condición</th>
                          <th className="px-3 py-2 text-right font-bold">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                        {items.map((item, idx) => {
                          const typeObj = assetTypes.find(t => t.id === item.assetTypeId);
                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                              <td className="px-3 py-2 font-mono font-bold text-slate-900">{item.serialNumber}</td>
                              {propertyType === 'PROPIO' && (
                                <td className="px-3 py-2 font-mono font-bold text-[#003B70]">{item.inventoryNumber}</td>
                              )}
                              <td className="px-3 py-2">{typeObj?.name || 'Hardware'}</td>
                              <td className="px-3 py-2 font-medium">{item.brand} {item.model}</td>
                              <td className="px-3 py-2 text-emerald-700 font-bold">{item.physicalCondition}</td>
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
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="gov-card p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="w-5 h-5 rounded-full bg-[#003B70] text-white flex items-center justify-center text-xs font-bold">3</span>
                <h3 className="text-sm font-bold text-slate-800">Ingreso de Accesorios y Periféricos No Inventariables</h3>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#E4002B]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Accesorio / Insumo *</label>
                  <SearchableSelect
                    value={selectedConsumableId}
                    onChange={(val) => setSelectedConsumableId(val)}
                    options={consumables.map(c => ({
                      value: c.id,
                      label: c.name,
                      sublabel: `SKU: ${c.sku}`,
                      badge: c.category
                    }))}
                    placeholder="Seleccione accesorio..."
                    searchPlaceholder="Filtrar por nombre o SKU..."
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Cantidad de Unidades (mayor a 0) *</label>
                  <input
                    type="number"
                    min="1"
                    value={consumableQuantity}
                    onChange={(e) => setConsumableQuantity(parseInt(e.target.value, 10) || 1)}
                    className="gov-input font-bold"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botón Finalizar */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleFinalizeReception}
              disabled={isSubmitting || (receptionType === 'ASSETS' && items.length === 0)}
              className="gov-btn-primary px-6 py-2.5 text-sm font-bold shadow-md disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registrando en PostgreSQL...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <PackagePlus className="w-5 h-5" />
                  Finalizar y Registrar Recepción Conforme
                </span>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Pestaña Historial */
        <div className="gov-card p-5 space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Registro Histórico de Guías de Despacho Recepcionadas</h3>
          
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003B70] text-white">
                <tr>
                  <th className="px-3 py-2.5 font-bold">N° Guía SII</th>
                  <th className="px-3 py-2.5 font-bold">Proveedor</th>
                  <th className="px-3 py-2.5 font-bold">Respaldo (OC / Contrato)</th>
                  <th className="px-3 py-2.5 font-bold">Sucursal</th>
                  <th className="px-3 py-2.5 font-bold">Cantidad Ítems</th>
                  <th className="px-3 py-2.5 font-bold">Fecha Recepción</th>
                  <th className="px-3 py-2.5 font-bold">Receptor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                {dispatchGuides.map(guide => (
                  <tr key={guide.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">{guide.guideNumber}</td>
                    <td className="px-3 py-2.5 font-medium">{guide.supplierName}</td>
                    <td className="px-3 py-2.5">
                      {guide.purchaseOrderNumber && (
                        <span className="font-mono text-[#003B70] font-bold">OC: {guide.purchaseOrderNumber}</span>
                      )}
                      {guide.leasingContractNumber && (
                        <span className="font-mono text-blue-700 font-bold">Contrato: {guide.leasingContractNumber}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">{guide.branchName}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">{guide.totalItemsCount} un.</td>
                    <td className="px-3 py-2.5 text-slate-500">{formatDate(guide.receptionDate)}</td>
                    <td className="px-3 py-2.5">{guide.receivedByUserName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO TIPO DE HARDWARE */}
      {isCreateTypeModalOpen && (
        <Modal
          isOpen={isCreateTypeModalOpen}
          onClose={() => setIsCreateTypeModalOpen(false)}
          title="Agregar Nuevo Tipo de Hardware / Dispositivo"
          subtitle="Crear una nueva categoría o tipología para el inventario ITAM"
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
                id="reqInvCheck"
                checked={newTypeRequiresInv}
                onChange={(e) => setNewTypeRequiresInv(e.target.checked)}
                className="w-4 h-4 text-[#003B70] rounded"
              />
              <label htmlFor="reqInvCheck" className="text-slate-700 font-semibold cursor-pointer select-none">
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
                {isCreatingType ? 'Guardando en PostgreSQL...' : 'Guardar y Seleccionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CREAR NUEVO PROVEEDOR */}
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
                {isCreatingSupplier ? 'Registrando en PostgreSQL...' : 'Guardar y Seleccionar'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CREAR NUEVA ORDEN DE COMPRA */}
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
                value={newPOSupplierId || supplierId}
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

      {/* MODAL CREAR NUEVO CONTRATO / LICITACIÓN */}
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
                value={newContractSupplierId || supplierId}
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
                {isCreatingContract ? 'Guardando en PostgreSQL...' : 'Guardar y Vincular Contrato'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
