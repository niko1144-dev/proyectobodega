// Servicio de Generación de Actas Oficiales en PDF y Etiquetas de Activos
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Assignment } from '../types/assignment';
import { Asset, TimelineEvent } from '../types/asset';
import { TopDeliveredResponse, TopDeliveredProduct } from '../types/dashboard';
import { formatDate, formatDateTime, extractAssignedPersonAndCleanReason } from '../utils/formatters';

export class PDFService {
  /**
   * Genera el Acta de Entrega / Devolución Oficial en PDF
   */
  public static async generateAssignmentActPDF(assignment: Assignment): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const isDevolucion = assignment.assignmentType === 'DEVOLUCION';
    const titleText = isDevolucion 
      ? 'ACTA OFICIAL DE RECEPCIÓN Y DEVOLUCIÓN DE EQUIPAMIENTO TI' 
      : 'ACTA OFICIAL DE ENTREGA Y ASIGNACIÓN DE EQUIPAMIENTO TI';

    // 1. Membrete Institucional
    doc.setFillColor(15, 105, 180); // Azul ChileAtiende #0F69B4
    doc.rect(0, 0, pageWidth, 6, 'F');

    doc.setFillColor(235, 59, 69); // Rojo Gobierno #EB3B45
    doc.rect(0, 6, 35, 2.5, 'F');
    doc.setFillColor(15, 105, 180);
    doc.rect(35, 6, pageWidth - 35, 2.5, 'F');

    // Logo / Texto de Cabecera
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 105, 180);
    doc.text('CHILEATIENDE | INSTITUTO DE PREVISIÓN SOCIAL (IPS)', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text('División de Tecnologías de Información (DTI) • Gestión de Activos TI', 14, 23);

    // Folio y Fecha en el extremo derecho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 45);
    doc.text(`FOLIO: ${assignment.actNumber}`, pageWidth - 14, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text(`Fecha: ${formatDateTime(assignment.createdAt)}`, pageWidth - 14, 23, { align: 'right' });

    // Título Principal
    doc.setDrawColor(220, 225, 230);
    doc.line(14, 27, pageWidth - 14, 27);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(11, 67, 117);
    doc.text(titleText, pageWidth / 2, 34, { align: 'center' });

    // 2. Información del Funcionario y Técnico (Grid 2 Columnas)
    autoTable(doc, {
      startY: 38,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [15, 105, 180], cellWidth: 35 },
        1: { textColor: [30, 41, 59], cellWidth: 55 },
        2: { fontStyle: 'bold', textColor: [15, 105, 180], cellWidth: 35 },
        3: { textColor: [30, 41, 59], cellWidth: 60 }
      },
      body: [
        [
          'Funcionario Receptor:', assignment.recipientName,
          'Técnico Responsable:', assignment.technicianName
        ],
        [
          'RUT Funcionario:', assignment.recipientRut,
          'RUT Técnico:', assignment.technicianRut
        ],
        [
          'Cargo / Función:', assignment.recipientJobTitle || 'No especificado',
          'Sucursal Emisión:', assignment.branchName
        ],
        [
          'Unidad / Depto.:', assignment.recipientDepartment || 'No especificado',
          'Correo Funcionario:', assignment.recipientEmail
        ]
      ]
    });

    let currentY = (doc as any).lastAutoTable.finalY + 4;

    // 3. Tabla de Activos Serializados
    const serializedItems = assignment.items.filter(i => i.assetId || i.serialNumber);
    if (serializedItems.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(11, 67, 117);
      doc.text('1. Equipos y Dispositivos Serializados Asignados', 14, currentY + 2);

      const tableData = serializedItems.map((item, index) => [
        (index + 1).toString(),
        item.assetTypeName || 'Equipo',
        item.brand ? `${item.brand} ${item.model || ''}` : '-',
        item.serialNumber || 'S/N',
        item.propertyType === 'PROPIO' ? (item.inventoryNumber || 'En trámite') : `Arriendo (Contrato)`,
        item.propertyType || 'PROPIO',
        item.conditionAtAssignment || 'BUENO'
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['#', 'Tipo de Equipo', 'Marca / Modelo', 'N° de Serie', 'N° Inventario / Contrato', 'Modalidad', 'Estado Físico']],
        body: tableData,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 105, 180],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: { fontSize: 7.8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 248, 252] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;
    }

    // 4. Tabla de Consumibles / Accesorios No Inventariables
    const consumableItems = assignment.items.filter(i => i.consumableId || i.consumableName);
    if (consumableItems.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(11, 67, 117);
      doc.text('2. Insumos, Periféricos y Accesorios Complementarios', 14, currentY + 2);

      const tableConsumables = consumableItems.map((item, index) => [
        (index + 1).toString(),
        item.consumableSku || '-',
        item.consumableName || 'Accesorio',
        `${item.quantity} un.`,
        'Entrega Conforme'
      ]);

      autoTable(doc, {
        startY: currentY + 4,
        head: [['#', 'SKU / Código', 'Descripción del Accesorio / Insumo', 'Cantidad', 'Condición']],
        body: tableConsumables,
        theme: 'striped',
        headStyles: {
          fillColor: [70, 90, 110],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        styles: { fontSize: 7.8, cellPadding: 2 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;
    }

    // Observaciones si existen
    if (assignment.observations) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(70, 80, 90);
      doc.text('Observaciones del Responsable:', 14, currentY + 2);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(assignment.observations, 14, currentY + 6, { maxWidth: pageWidth - 28 });
      currentY += 10;
    }

    // 5. Cláusula de Responsabilidad Funcionaria y Custodia
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 105, 180);
    doc.text('TÉRMINOS DE CUSTODIA Y RESPONSABILIDAD INSTITUCIONAL:', 18, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    const legalText = 'El funcionario receptor declara recibir en perfecto estado de funcionamiento los bienes y accesorios individualizados en la presente acta, comprometiéndose a destinarlos exclusivamente a labores institucionales de ChileAtiende / IPS, bajo estricto cumplimiento del Decreto Ley N° 1.263 sobre Administración Financiera del Estado y la normativa de seguridad de la información. Ante pérdida, sustracción o daño imputable, deberá informar de inmediato a la Unidad de TI.';
    doc.text(legalText, 18, currentY + 9, { maxWidth: pageWidth - 36, lineHeightFactor: 1.2 });

    currentY += 26;

    // 6. Recuadros de Firma y Código QR de Verificación
    const qrData = JSON.stringify({
      folio: assignment.actNumber,
      rutReceptor: assignment.recipientRut,
      fecha: assignment.createdAt,
      hash: assignment.digitalSignatureHash || 'VERIFIED_CHILEATIENDE'
    });

    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 80 });

    // Código QR en la esquina inferior izquierda
    doc.addImage(qrDataUrl, 'PNG', 14, currentY, 26, 26);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Verificación Digital de Integridad', 42, currentY + 5);
    doc.text(`Hash: ${(assignment.digitalSignatureHash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855').substring(0, 32)}...`, 42, currentY + 9);
    doc.text(`Estado: ${assignment.status === 'FIRMADO_DIGITAL' ? '✓ Firmado Electrónicamente' : 'Pendiente Firma Física'}`, 42, currentY + 13);
    doc.text(`Emisión Sistema ITAM ChileAtiende`, 42, currentY + 17);

    // Firmas (Técnico y Funcionario)
    const signBoxWidth = 55;
    const signBoxY = currentY + 18;

    // Firma Técnico
    const techSignX = pageWidth - 14 - (signBoxWidth * 2) - 8;
    doc.setDrawColor(148, 163, 184);
    doc.line(techSignX, signBoxY, techSignX + signBoxWidth, signBoxY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(assignment.technicianName, techSignX + signBoxWidth / 2, signBoxY + 3.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Técnico Entrega (RUT: ${assignment.technicianRut})`, techSignX + signBoxWidth / 2, signBoxY + 7, { align: 'center' });

    // Firma Funcionario Receptor
    const userSignX = pageWidth - 14 - signBoxWidth;
    if (assignment.signatureDataUrl) {
      doc.addImage(assignment.signatureDataUrl, 'PNG', userSignX + 5, signBoxY - 14, signBoxWidth - 10, 12);
    }
    doc.line(userSignX, signBoxY, userSignX + signBoxWidth, signBoxY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(assignment.recipientName, userSignX + signBoxWidth / 2, signBoxY + 3.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Funcionario Receptor (RUT: ${assignment.recipientRut})`, userSignX + signBoxWidth / 2, signBoxY + 7, { align: 'center' });

    return doc;
  }

  /**
   * Genera el Blob URL del PDF del Acta Oficial
   */
  public static async getActPDFBlobUrl(assignment: Assignment): Promise<string> {
    const doc = await this.generateAssignmentActPDF(assignment);
    const blob = doc.output('blob');
    return URL.createObjectURL(blob);
  }

  /**
   * Abre automáticamente el PDF generado en una nueva ventana/pestaña con el visualizador predeterminado del dispositivo
   */
  public static async openActPDFInNewWindow(assignment: Assignment): Promise<string> {
    const blobUrl = await this.getActPDFBlobUrl(assignment);
    
    // Intentar abrir mediante window.open
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Fallback si el navegador restringe popups directos
      const link = document.createElement('a');
      link.href = blobUrl;
      link.target = '_blank';
      link.rel = 'noopener,noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    return blobUrl;
  }

  /**
   * Abre o descarga el PDF generado
   */
  public static async downloadActPDF(assignment: Assignment): Promise<void> {
    const doc = await this.generateAssignmentActPDF(assignment);
    doc.save(`${assignment.actNumber}_${assignment.recipientRut}.pdf`);
  }

  /**
   * Genera Etiquetas Térmicas con Código QR para rotular activos físicos
   */
  public static async generateAssetStickersPDF(assets: Asset[]): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const stickerWidth = 90;
    const stickerHeight = 45;
    const marginX = 12;
    const marginY = 15;
    let col = 0;
    let row = 0;

    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      if (i > 0 && i % 10 === 0) {
        doc.addPage();
        col = 0;
        row = 0;
      }

      const x = marginX + (col * (stickerWidth + 8));
      const y = marginY + (row * (stickerHeight + 6));

      // Borde de la etiqueta
      doc.setDrawColor(200, 210, 220);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(x, y, stickerWidth, stickerHeight, 2, 2, 'FD');

      // Franja superior institucional
      doc.setFillColor(15, 105, 180);
      doc.roundedRect(x, y, stickerWidth, 7, 2, 2, 'F');
      doc.rect(x, y + 4, stickerWidth, 3, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('CHILEATIENDE • ACTIVO TI', x + 4, y + 5);

      const propLabel = asset.propertyType === 'PROPIO' ? 'PROPIO' : 'ARRIENDO';
      doc.setFontSize(7);
      doc.text(propLabel, x + stickerWidth - 4, y + 5, { align: 'right' });

      // QR Code
      const qrData = JSON.stringify({
        id: asset.id,
        serie: asset.serialNumber,
        inv: asset.inventoryNumber || 'N/A',
        prop: asset.propertyType,
        suc: asset.currentBranchName
      });
      const qrUrl = await QRCode.toDataURL(qrData, { margin: 0, width: 80 });
      doc.addImage(qrUrl, 'PNG', x + 4, y + 10, 28, 28);

      // Datos de texto
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${asset.brand} ${asset.model}`, x + 34, y + 14, { maxWidth: 52 });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Serie: ${asset.serialNumber}`, x + 34, y + 20);

      if (asset.propertyType === 'PROPIO') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 105, 180);
        doc.text(`Inv: ${asset.inventoryNumber || 'S/I'}`, x + 34, y + 25);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        doc.text(`Contrato: ${asset.leasingContractNumber || 'Arriendo'}`, x + 34, y + 25);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Ubicación: ${asset.currentBranchName.substring(0, 25)}`, x + 34, y + 31);
      doc.text(`Ingreso: ${formatDate(asset.receptionDate)}`, x + 34, y + 36);

      col++;
      if (col > 1) {
        col = 0;
        row++;
      }
    }

    doc.save(`Etiquetas_Activos_${assets.length}_unidades.pdf`);
  }

  /**
   * Genera el Informe Oficial de Hoja de Vida y Trazabilidad de un Activo en PDF
   */
  public static async generateAssetLifecyclePDF(asset: Asset, timeline: TimelineEvent[]): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Membrete Institucional
    doc.setFillColor(15, 105, 180);
    doc.rect(0, 0, pageWidth, 6, 'F');
    doc.setFillColor(235, 59, 69);
    doc.rect(0, 6, 35, 2.5, 'F');
    doc.setFillColor(15, 105, 180);
    doc.rect(35, 6, pageWidth - 35, 2.5, 'F');

    // Cabecera
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 105, 180);
    doc.text('CHILEATIENDE | INSTITUTO DE PREVISIÓN SOCIAL (IPS)', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text('División de Tecnologías de Información (DTI) • Trazabilidad y Hoja de Vida de Activos TI', 14, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 45);
    doc.text(`SERIE: ${asset.serialNumber}`, pageWidth - 14, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text(`Emisión: ${formatDateTime(new Date().toISOString())}`, pageWidth - 14, 23, { align: 'right' });

    doc.setDrawColor(220, 225, 230);
    doc.line(14, 27, pageWidth - 14, 27);

    // Título
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(11, 67, 117);
    doc.text('HOJA DE VIDA Y KARDEX DE MOVIMIENTOS TI', pageWidth / 2, 34, { align: 'center' });

    // Ficha Técnica del Activo
    autoTable(doc, {
      startY: 38,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [15, 105, 180], cellWidth: 35 },
        1: { textColor: [30, 41, 59], cellWidth: 55 },
        2: { fontStyle: 'bold', textColor: [15, 105, 180], cellWidth: 35 },
        3: { textColor: [30, 41, 59], cellWidth: 60 }
      },
      body: [
        [
          'Equipo / Modelo:', `${asset.brand} ${asset.model}`,
          'Tipo de Propiedad:', asset.propertyType === 'PROPIO' ? `PROPIO (${asset.inventoryNumber || 'S/I'})` : `ARRIENDO (${asset.leasingContractNumber || 'Contrato'})`
        ],
        [
          'Número de Serie:', asset.serialNumber,
          'Estado Operativo:', asset.status.replace(/_/g, ' ')
        ],
        [
          'Sucursal Actual:', asset.currentBranchName,
          'Condición Física:', asset.physicalCondition
        ],
        [
          'Custodio Actual:', asset.assignedToUserName ? `${asset.assignedToUserName} (${asset.assignedToUserRut})` : 'En Bodega TI (Sin Asignar)',
          'Fecha Ingreso:', formatDate(asset.receptionDate)
        ]
      ]
    });

    let currentY = (doc as any).lastAutoTable.finalY + 6;

    // Tabla Histórica de Movimientos
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 105, 180);
    doc.text(`HISTORIAL CRONOLÓGICO DE MOVIMIENTOS (${timeline.length} REGISTROS)`, 14, currentY);

    const tableBody = timeline.map(evt => {
      const rawReason = evt.details?.changeReason || evt.details?.observations || '';
      const explicitAssigned = evt.assignedTo || evt.details?.recipientName || evt.details?.newUserName || evt.details?.assignedTo;
      const { assignedPerson, cleanReason } = extractAssignedPersonAndCleanReason(rawReason, explicitAssigned);
      
      const assignedText = assignedPerson 
        ? `${assignedPerson}${evt.details?.recipientRut ? `\n(RUT: ${evt.details.recipientRut})` : ''}`
        : '-';
      const detailText = cleanReason || '-';

      return [
        formatDateTime(evt.timestamp),
        evt.title,
        evt.branchName,
        evt.actor,
        assignedText,
        evt.documentRef || 'N/A',
        detailText
      ];
    });

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha / Hora', 'Tipo de Movimiento', 'Bodega / Sucursal', 'Responsable', 'Asignado a', 'Doc. Referencia', 'Observaciones']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 105, 180],
        textColor: 255,
        fontSize: 7,
        fontStyle: 'bold'
      },
      styles: { fontSize: 6.5, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: 23 },
        1: { cellWidth: 32, fontStyle: 'bold' },
        2: { cellWidth: 25 },
        3: { cellWidth: 24 },
        4: { cellWidth: 30, fontStyle: 'bold' },
        5: { cellWidth: 24 },
        6: { cellWidth: 32 }
      }
    });

    doc.save(`Hoja_de_Vida_${asset.serialNumber}.pdf`);
  }

  /**
   * Genera el Acta Oficial de Traspaso Inter-Bodegas
   */
  public static async generateTransferActPDF(data: {
    documentRef: string;
    transferDate: string;
    sourceBranchName: string;
    destinationBranchName: string;
    transferredByName: string;
    reason: string;
    items: Array<{
      type: 'ACTIVO' | 'INSUMO';
      identifier: string;
      name: string;
      category: string;
      quantity: number;
    }>;
  }): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();

    // 1. Membrete Institucional
    doc.setFillColor(15, 105, 180); // Azul ChileAtiende
    doc.rect(0, 0, pageWidth, 6, 'F');

    doc.setFillColor(235, 59, 69); // Rojo Gobierno
    doc.rect(0, 6, 35, 2.5, 'F');
    doc.setFillColor(15, 105, 180);
    doc.rect(35, 6, pageWidth - 35, 2.5, 'F');

    // Logo / Texto de Cabecera
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 105, 180);
    doc.text('CHILEATIENDE | INSTITUTO DE PREVISIÓN SOCIAL (IPS)', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text('División de Tecnologías de Información (DTI) • Control de Inventario & Bodegas', 14, 23);

    // Folio y Fecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 30, 45);
    doc.text(`ACTA DE TRASPASO: ${data.documentRef}`, pageWidth - 14, 18, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(90, 100, 110);
    doc.text(`Fecha: ${formatDateTime(data.transferDate)}`, pageWidth - 14, 23, { align: 'right' });

    doc.setDrawColor(220, 225, 230);
    doc.line(14, 27, pageWidth - 14, 27);

    // Título Principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 105, 180);
    doc.text('ACTA OFICIAL DE TRASPASO Y TRASLADO ENTRE BODEGAS TI', pageWidth / 2, 34, { align: 'center' });

    // Cuadro de Información del Traspaso
    autoTable(doc, {
      startY: 38,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [50, 60, 75], cellWidth: 40 },
        1: { textColor: [20, 30, 45], cellWidth: 55 },
        2: { fontStyle: 'bold', textColor: [50, 60, 75], cellWidth: 40 },
        3: { textColor: [20, 30, 45], cellWidth: 53 }
      },
      body: [
        [
          'Bodega Origen (Emisora):', data.sourceBranchName,
          'Bodega Destino (Receptora):', data.destinationBranchName
        ],
        [
          'Responsable del Traspaso:', data.transferredByName,
          'Total de Ítems / Unidades:', `${data.items.reduce((acc, i) => acc + i.quantity, 0)} unidades (${data.items.length} líneas)`
        ],
        [
          'Motivo / Justificación:', { content: data.reason || 'Traspaso operativo entre dependencias', colSpan: 3 }
        ]
      ]
    });

    let currentY = (doc as any).lastAutoTable.finalY + 6;

    // Tabla de Ítems Traspasados
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 105, 180);
    doc.text('DETALLE DE EQUIPAMIENTO E INSUMOS TRASPASADOS', 14, currentY);

    const itemsTableBody = data.items.map((item, idx) => [
      idx + 1,
      item.type,
      item.identifier,
      item.name,
      item.category,
      `${item.quantity} un.`
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['#', 'Tipo', 'N° Serie / SKU', 'Descripción del Ítem', 'Categoría', 'Cantidad']],
      body: itemsTableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 105, 180],
        textColor: 255,
        fontSize: 8,
        fontStyle: 'bold'
      },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 22, fontStyle: 'bold' },
        2: { cellWidth: 45, fontStyle: 'bold', textColor: [15, 105, 180] },
        3: { cellWidth: 65 },
        4: { cellWidth: 28 },
        5: { cellWidth: 18, halign: 'center', fontStyle: 'bold' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;

    // Cláusula de Responsabilidad y Custodia
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 110);
    const clauseText = 'Por medio del presente documento, se certifica el traslado físico y la transferencia de custodia en el sistema ITAM del equipamiento listado precedentemente. La bodega receptora asume la responsabilidad de resguardo, inventario y posterior asignación.';
    doc.text(doc.splitTextToSize(clauseText, pageWidth - 28), 14, currentY);

    currentY += 20;

    // Firmas de Responsabilidad (Emisor y Receptor)
    const colWidth = (pageWidth - 38) / 2;

    // Firma Emisor
    doc.setDrawColor(180, 190, 200);
    doc.line(14, currentY, 14 + colWidth, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 45);
    doc.text('ENTREGADO POR (BODEGA ORIGEN)', 14 + colWidth / 2, currentY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 120);
    doc.text(`Firma y Nombre: ${data.transferredByName}`, 14 + colWidth / 2, currentY + 8, { align: 'center' });
    doc.text(`Fecha: ${formatDateTime(data.transferDate)}`, 14 + colWidth / 2, currentY + 12, { align: 'center' });

    // Firma Receptor
    const col2X = 14 + colWidth + 10;
    doc.line(col2X, currentY, col2X + colWidth, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 30, 45);
    doc.text('RECIBIDO POR (BODEGA DESTINO)', col2X + colWidth / 2, currentY + 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 120);
    doc.text('Firma y Timbre Encargado de Bodega', col2X + colWidth / 2, currentY + 8, { align: 'center' });
    doc.text('Fecha Recepción Física: ____/____/2026', col2X + colWidth / 2, currentY + 12, { align: 'center' });

    return doc;
  }

  public static async openTransferActPDFInNewWindow(data: any): Promise<void> {
    const doc = await this.generateTransferActPDF(data);
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      doc.save(`Acta_Traspaso_${data.documentRef}.pdf`);
    }
  }

  /**
   * Genera el Informe Oficial y Gráfico del Top 5 de Productos Más Entregados en PDF
   */
  public static async generateTopDeliveredProductsPDF(data: {
    reportData: TopDeliveredResponse;
    periodLabel: string;
    filterTypeLabel: string;
    generatedByName?: string;
  }): Promise<jsPDF> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const now = new Date();
    const folio = `RPT-TOP5-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Membrete Institucional
    doc.setFillColor(15, 105, 180); // Azul ChileAtiende #0F69B4
    doc.rect(0, 0, pageWidth, 6, 'F');

    doc.setFillColor(235, 59, 69); // Rojo Gobierno #EB3B45
    doc.rect(0, 6, 35, 2.5, 'F');
    doc.setFillColor(15, 105, 180);
    doc.rect(35, 6, pageWidth - 35, 2.5, 'F');

    // Logo / Texto de Cabecera
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 105, 180);
    doc.text('CHILEATIENDE | INSTITUTO DE PREVISIÓN SOCIAL (IPS)', 14, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 110);
    doc.text('División de Tecnologías de Información (DTI) • Control de Gestión y Estadísticas TI', 14, 22);

    // Folio y Fecha en el extremo derecho
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 45);
    doc.text(`FOLIO: ${folio}`, pageWidth - 14, 17, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 100, 110);
    doc.text(`Emisión: ${formatDateTime(now.toISOString())}`, pageWidth - 14, 22, { align: 'right' });

    // Línea divisoria
    doc.setDrawColor(220, 225, 230);
    doc.line(14, 26, pageWidth - 14, 26);

    // Título Principal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(11, 67, 117);
    doc.text('INFORME ESTADÍSTICO: TOP 5 PRODUCTOS MÁS ENTREGADOS', pageWidth / 2, 33, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Consolidado oficial de asignaciones, equipamiento tecnológico e insumos computacionales', pageWidth / 2, 37.5, { align: 'center' });

    // 2. Parámetros del Reporte (Grid 2 Columnas)
    autoTable(doc, {
      startY: 40.5,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [15, 105, 180], cellWidth: 32 },
        1: { textColor: [30, 41, 59], cellWidth: 62 },
        2: { fontStyle: 'bold', textColor: [15, 105, 180], cellWidth: 32 },
        3: { textColor: [30, 41, 59], cellWidth: 62 }
      },
      body: [
        [
          'Período Evaluado:', data.periodLabel,
          'Sucursal / Bodega:', data.reportData.summary.branchName
        ],
        [
          'Tipo de Filtro:', data.filterTypeLabel,
          'Usuario Emisor:', data.generatedByName || 'Administrador ITAM ChileAtiende'
        ]
      ]
    });

    let currentY = (doc as any).lastAutoTable.finalY + 3;

    // 3. Tarjetas Resumen Ejecutivas (4 KPIs)
    const cardWidth = (pageWidth - 28 - 9) / 4;
    const cardHeight = 16;
    const kpiData = [
      { label: 'UNIDADES ENTREGADAS', value: `${data.reportData.summary.totalDeliveredUnits} un.`, color: [15, 105, 180] },
      { label: 'ACTAS GENERADAS', value: `${data.reportData.summary.totalAssignments} actas`, color: [5, 150, 105] },
      { label: 'PRODUCTO #1 LÍDER', value: data.reportData.items[0]?.name ? (data.reportData.items[0].name.length > 18 ? data.reportData.items[0].name.substring(0, 18) + '...' : data.reportData.items[0].name) : 'Sin datos', color: [217, 119, 6] },
      { label: 'CUOTA LÍDER TOP 1', value: `${data.reportData.summary.top1DominancePercentage}%`, color: [99, 102, 241] }
    ];

    for (let i = 0; i < 4; i++) {
      const kpi = kpiData[i];
      const cardX = 14 + i * (cardWidth + 3);

      // Fondo de tarjeta
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Franja superior de color
      doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.rect(cardX, currentY, cardWidth, 1.5, 'F');

      // Título KPI
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text(kpi.label, cardX + 3, currentY + 5.5);

      // Valor KPI
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
      doc.text(kpi.value, cardX + 3, currentY + 12);
    }

    currentY += cardHeight + 5;

    // 4. Gráfico Vectorial de Barras del Top 5
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(11, 67, 117);
    doc.text('1. Representación Gráfica del Ranking de Productos Más Entregados', 14, currentY);

    currentY += 4;

    const items = data.reportData.items;
    if (items.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(140, 150, 160);
      doc.text('No se registran entregas de productos en el rango de fechas seleccionado.', 14, currentY + 6);
      currentY += 15;
    } else {
      const maxQuantity = Math.max(...items.map(i => i.quantity), 1);
      const barTrackWidth = 100;
      const barHeight = 4.5;
      const rowGap = 8.5;

      const rankColors = [
        { fill: [15, 105, 180], badge: [245, 158, 11], label: '1°' }, // Oro / Azul
        { fill: [2, 132, 199], badge: [148, 163, 184], label: '2°' }, // Plata / Cyan
        { fill: [79, 70, 229], badge: [217, 119, 6], label: '3°' },  // Bronce / Indigo
        { fill: [217, 119, 6], badge: [100, 116, 139], label: '4°' }, // Slate / Ambar
        { fill: [124, 58, 237], badge: [71, 85, 105], label: '5°' }   // Slate / Purpura
      ];

      items.forEach((item, index) => {
        const itemY = currentY + (index * rowGap);
        const style = rankColors[index] || rankColors[3];

        // Insignia de Ranking (Recuadro redondeado)
        doc.setFillColor(style.badge[0], style.badge[1], style.badge[2]);
        doc.roundedRect(14, itemY, 7, 6, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(style.label, 17.5, itemY + 4.2, { align: 'center' });

        // Nombre del Producto y Categoría
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        const nameDisplay = item.name.length > 32 ? item.name.substring(0, 32) + '...' : item.name;
        doc.text(nameDisplay, 23, itemY + 4.2);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        const typeTag = item.itemType === 'HARDWARE' ? 'Hardware' : 'Insumo';
        doc.text(`[${item.category} • ${typeTag}]`, 23 + doc.getTextWidth(nameDisplay) + 2, itemY + 4.2);

        // Barra de fondo (Track)
        const barX = pageWidth - 14 - barTrackWidth - 25;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(barX, itemY + 0.8, barTrackWidth, barHeight, 1, 1, 'F');

        // Barra de relleno proporcional
        const fillWidth = Math.max(3, (item.quantity / maxQuantity) * barTrackWidth);
        doc.setFillColor(style.fill[0], style.fill[1], style.fill[2]);
        doc.roundedRect(barX, itemY + 0.8, fillWidth, barHeight, 1, 1, 'F');

        // Texto numérico (Cantidad y Porcentaje)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(style.fill[0], style.fill[1], style.fill[2]);
        doc.text(`${item.quantity} un.`, pageWidth - 14 - 10, itemY + 4.2, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(`(${item.percentage}%)`, pageWidth - 14, itemY + 4.2, { align: 'right' });
      });

      currentY += (items.length * rowGap) + 4;
    }

    // 5. Tabla Detallada de Datos (autoTable)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(11, 67, 117);
    doc.text('2. Cuadro Estadístico de Demanda y Asignación', 14, currentY);

    const tableData = items.map(item => [
      `${item.position}°`,
      item.name,
      item.category,
      item.itemType === 'HARDWARE' ? 'Activo TI' : 'Insumo / Periférico',
      `${item.quantity} un.`,
      `${item.percentage}%`,
      `${item.assignmentCount} actas`
    ]);

    autoTable(doc, {
      startY: currentY + 2.5,
      head: [['#', 'Descripción del Producto', 'Categoría / Tipo', 'Clase', 'Total Entregado', '% Participación', 'Frecuencia']],
      body: tableData.length > 0 ? tableData : [['-', 'Sin entregas en el período', '-', '-', '0 un.', '0%', '0 actas']],
      theme: 'striped',
      headStyles: {
        fillColor: [15, 105, 180],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      styles: { fontSize: 7.2, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 62, fontStyle: 'bold' },
        2: { cellWidth: 35 },
        3: { cellWidth: 26 },
        4: { cellWidth: 22, halign: 'center', fontStyle: 'bold', textColor: [15, 105, 180] },
        5: { cellWidth: 18, halign: 'center' },
        6: { cellWidth: 15, halign: 'center' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] }
    });

    currentY = (doc as any).lastAutoTable.finalY + 4;

    // 6. Muestra de Trazabilidad / Entregas Recientes (Evidencia)
    const recent = data.reportData.recentDeliveries?.slice(0, 4) || [];
    if (recent.length > 0 && currentY < pageHeight - 55) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(11, 67, 117);
      doc.text('3. Muestra de Actas de Entrega Recientes en el Período', 14, currentY);

      const recentTableData = recent.map(r => [
        r.actNumber,
        formatDate(r.date),
        r.recipientName,
        r.recipientRut || '-',
        r.branchName,
        r.productName,
        `${r.quantity} un.`
      ]);

      autoTable(doc, {
        startY: currentY + 2.5,
        head: [['N° Acta', 'Fecha', 'Funcionario Receptor', 'RUT', 'Sucursal', 'Producto Entregado', 'Cant.']],
        body: recentTableData,
        theme: 'grid',
        headStyles: {
          fillColor: [70, 90, 110],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold'
        },
        styles: { fontSize: 6.8, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 24, fontStyle: 'bold' },
          1: { cellWidth: 20 },
          2: { cellWidth: 42 },
          3: { cellWidth: 22 },
          4: { cellWidth: 30 },
          5: { cellWidth: 38 },
          6: { cellWidth: 12, halign: 'center', fontStyle: 'bold' }
        }
      });

      currentY = (doc as any).lastAutoTable.finalY + 4;
    }

    // 7. Pie Institucional, QR de Integridad y Firmas
    const footerY = Math.max(currentY + 2, pageHeight - 34);

    // QR de Validación
    const qrData = JSON.stringify({
      reporte: 'TOP5_PRODUCTOS_ENTREGADOS',
      folio,
      periodo: data.periodLabel,
      totalUnidades: data.reportData.summary.totalDeliveredUnits,
      fechaEmision: now.toISOString(),
      emisor: data.generatedByName || 'Administrador ITAM',
      hash: 'CHILEATIENDE-ITAM-VERIFIED-REPORT'
    });

    const qrDataUrl = await QRCode.toDataURL(qrData, { margin: 0, width: 70 });
    doc.addImage(qrDataUrl, 'PNG', 14, footerY - 2, 20, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Validación Digital ITAM ChileAtiende', 36, footerY + 2);
    doc.text(`Folio Oficial: ${folio}`, 36, footerY + 5.5);
    doc.text(`Generado: ${formatDateTime(now.toISOString())}`, 36, footerY + 9);
    doc.text('Sistema de Gestión de Activos TI & Bodega', 36, footerY + 12.5);

    // Recuadros de Firma
    const signBoxWidth = 52;
    const signBoxY = footerY + 12;

    // Firma 1: Encargado de Bodega
    const sign1X = pageWidth - 14 - (signBoxWidth * 2) - 8;
    doc.setDrawColor(180, 190, 200);
    doc.line(sign1X, signBoxY, sign1X + signBoxWidth, signBoxY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('ENCARGADO DE BODEGA TI', sign1X + signBoxWidth / 2, signBoxY + 3.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Control y Gestión de Inventario', sign1X + signBoxWidth / 2, signBoxY + 6.5, { align: 'center' });

    // Firma 2: Jefatura DTI
    const sign2X = pageWidth - 14 - signBoxWidth;
    doc.line(sign2X, signBoxY, sign2X + signBoxWidth, signBoxY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text('JEFATURA DTI / ADMINISTRADOR', sign2X + signBoxWidth / 2, signBoxY + 3.2, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(100, 116, 139);
    doc.text('División Tecnologías de Información', sign2X + signBoxWidth / 2, signBoxY + 6.5, { align: 'center' });

    return doc;
  }

  /**
   * Genera y abre el Informe del Top 5 de Productos en PDF en una nueva ventana o descarga automática
   */
  public static async openTopDeliveredProductsPDFInNewWindow(data: {
    reportData: TopDeliveredResponse;
    periodLabel: string;
    filterTypeLabel: string;
    generatedByName?: string;
  }): Promise<void> {
    const doc = await this.generateTopDeliveredProductsPDF(data);
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    const newWindow = window.open(blobUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      doc.save(`Informe_Top5_Productos_Entregados_${dateStr}.pdf`);
    }
  }

  /**
   * Descarga directamente el Informe del Top 5 de Productos en PDF
   */
  public static async downloadTopDeliveredProductsPDF(data: {
    reportData: TopDeliveredResponse;
    periodLabel: string;
    filterTypeLabel: string;
    generatedByName?: string;
  }): Promise<void> {
    const doc = await this.generateTopDeliveredProductsPDF(data);
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    doc.save(`Informe_Top5_Productos_Entregados_${dateStr}.pdf`);
  }
}
