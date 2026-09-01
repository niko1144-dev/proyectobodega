// Servicio de Importación Masiva y Exportación a Excel / CSV
import * as XLSX from 'xlsx';
import { Asset, AssetPropertyType, PhysicalCondition } from '../types/asset';
import { formatDate } from '../utils/formatters';

export interface BulkImportRow {
  rowNumber: number;
  serialNumber: string;
  inventoryNumber?: string;
  brand: string;
  model: string;
  assetTypeName: string;
  physicalCondition: PhysicalCondition;
  cpu?: string;
  ram?: string;
  storage?: string;
  isValid: boolean;
  errors: string[];
}

export class ExcelService {
  /**
   * Exporta la lista completa de activos a archivo Excel (.xlsx)
   */
  public static exportAssetsToExcel(assets: Asset[], filename = 'Inventario_Activos_ChileAtiende.xlsx'): void {
    const data = assets.map(a => ({
      'ID Activo': a.id,
      'N° Serie': a.serialNumber,
      'N° Inventario': a.inventoryNumber || 'N/A (Arriendo)',
      'Modalidad': a.propertyType,
      'Tipo de Dispositivo': a.assetTypeName,
      'Marca': a.brand,
      'Modelo': a.model,
      'Estado Operativo': a.status,
      'Condición Física': a.physicalCondition,
      'Sucursal': a.currentBranchName,
      'Ubicación Detalle': a.locationDetail || '-',
      'Asignado a': a.assignedToUserName || 'En Bodega',
      'RUT Asignado': a.assignedToUserRut || '-',
      'N° Guía Despacho': a.dispatchGuideNumber,
      'N° Orden Compra': a.purchaseOrderNumber || '-',
      'N° Contrato Arriendo': a.leasingContractNumber || '-',
      'Proveedor': a.supplierName,
      'Vencimiento Contrato': a.contractEndDate ? formatDate(a.contractEndDate) : '-',
      'Fecha Ingreso': formatDate(a.receptionDate)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Activos ITAM');
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Genera y descarga una plantilla Excel vacía para carga masiva
   */
  public static downloadImportTemplate(propertyType: AssetPropertyType): void {
    const headers = propertyType === 'PROPIO'
      ? [
          {
            'N_Serie': '5CD2349XZL',
            'N_Inventario_Institucional': 'CA-NB-2026-00501',
            'Tipo_Equipo': 'Notebook Corporativo',
            'Marca': 'HP',
            'Modelo': 'EliteBook 640 G9',
            'Condicion_Fisica': 'NUEVO',
            'CPU': 'Intel Core i5 1335U',
            'RAM': '16GB',
            'Almacenamiento': '512GB SSD'
          }
        ]
      : [
          {
            'N_Serie': 'CN990145A',
            'Tipo_Equipo': 'Monitor 24" IPS',
            'Marca': 'Dell',
            'Modelo': 'P2422H',
            'Condicion_Fisica': 'NUEVO',
            'CPU': '',
            'RAM': '',
            'Almacenamiento': ''
          }
        ];

    const worksheet = XLSX.utils.json_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    const sheetName = propertyType === 'PROPIO' ? 'Plantilla_Activos_Propios' : 'Plantilla_Activos_Arriendo';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${sheetName}.xlsx`);
  }

  /**
   * Lee y parsea un archivo Excel / CSV subido por el usuario
   */
  public static async parseUploadedFile(
    file: File,
    propertyType: AssetPropertyType,
    existingSerials: Set<string>,
    existingInventoryNumbers: Set<string>
  ): Promise<BulkImportRow[]> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const seenSerialsInBatch = new Set<string>();
    const seenInvInBatch = new Set<string>();

    return rawRows.map((row, idx) => {
      const rowNumber = idx + 2; // Considerando encabezado en fila 1
      const serialNumber = (row['N_Serie'] || row['Numero_Serie'] || row['Serie'] || row['Serial'] || '').toString().trim();
      const inventoryNumber = (row['N_Inventario_Institucional'] || row['N_Inventario'] || row['Inventario'] || '').toString().trim();
      const brand = (row['Marca'] || row['Brand'] || '').toString().trim();
      const model = (row['Modelo'] || row['Model'] || '').toString().trim();
      const assetTypeName = (row['Tipo_Equipo'] || row['Tipo'] || row['Categoria'] || 'Notebook Corporativo').toString().trim();
      const conditionRaw = (row['Condicion_Fisica'] || row['Condicion'] || 'NUEVO').toString().trim().toUpperCase();
      
      const cpu = (row['CPU'] || '').toString().trim();
      const ram = (row['RAM'] || '').toString().trim();
      const storage = (row['Almacenamiento'] || row['Storage'] || '').toString().trim();

      const errors: string[] = [];

      // Validaciones
      if (!serialNumber) {
        errors.push('El N° de Serie es obligatorio.');
      } else if (existingSerials.has(serialNumber.toUpperCase())) {
        errors.push(`El N° de Serie '${serialNumber}' ya existe en el sistema.`);
      } else if (seenSerialsInBatch.has(serialNumber.toUpperCase())) {
        errors.push(`El N° de Serie '${serialNumber}' está duplicado dentro de este mismo archivo.`);
      } else {
        seenSerialsInBatch.add(serialNumber.toUpperCase());
      }

      if (inventoryNumber) {
        if (existingInventoryNumbers.has(inventoryNumber.toUpperCase())) {
          errors.push(`El N° de Inventario '${inventoryNumber}' ya está en uso en el inventario.`);
        } else if (seenInvInBatch.has(inventoryNumber.toUpperCase())) {
          errors.push(`El N° de Inventario '${inventoryNumber}' está duplicado en este archivo.`);
        } else {
          seenInvInBatch.add(inventoryNumber.toUpperCase());
        }
      }

      if (!brand) errors.push('La Marca es obligatoria.');
      if (!model) errors.push('El Modelo es obligatorio.');

      const physicalCondition: PhysicalCondition = 
        ['NUEVO', 'BUENO', 'REGULAR', 'DETERIORADO', 'IRREPARABLE'].includes(conditionRaw)
          ? conditionRaw as PhysicalCondition
          : 'NUEVO';

      return {
        rowNumber,
        serialNumber,
        inventoryNumber: propertyType === 'PROPIO' ? inventoryNumber : undefined,
        brand: brand || 'Genérica',
        model: model || 'Estándar',
        assetTypeName,
        physicalCondition,
        cpu,
        ram,
        storage,
        isValid: errors.length === 0,
        errors
      };
    });
  }
}
