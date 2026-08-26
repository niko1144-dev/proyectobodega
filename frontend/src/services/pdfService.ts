// Servicio de Generación de Actas Oficiales en PDF y Etiquetas de Activos
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { Assignment } from '../types/assignment';
import { Asset, TimelineEvent } from '../types/asset';
import { formatDate, formatDateTime } from '../utils/formatters';

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

    const tableBody = timeline.map(evt => [
      formatDateTime(evt.timestamp),
      evt.title,
      evt.branchName,
      evt.actor,
      evt.documentRef || 'N/A',
      evt.details?.recipientName ? `Receptor: ${evt.details.recipientName} (${evt.details.recipientRut || ''})` : (evt.details?.changeReason || evt.details?.observations || '-')
    ]);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha / Hora', 'Tipo de Movimiento', 'Bodega / Sucursal', 'Responsable', 'Documento Ref.', 'Detalle / Observaciones']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 105, 180],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold'
      },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 30 },
        3: { cellWidth: 28 },
        4: { cellWidth: 25 },
        5: { cellWidth: 42 }
      }
    });

    doc.save(`Hoja_de_Vida_${asset.serialNumber}.pdf`);
  }
}
