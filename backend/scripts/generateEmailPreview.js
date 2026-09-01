import fs from 'fs';
import path from 'path';

// Simulamos los parámetros de una asignación real
const sampleParams = {
  recipientEmail: 'patricio.silva@chileatiende.cl',
  recipientName: 'Patricio Alejandro Silva Morales',
  recipientRut: '14.238.990-1',
  recipientJobTitle: 'Ejecutivo de Atención Integral',
  recipientDepartment: 'Sucursal Alameda - Dirección Regional Metropolitana',
  actNumber: 'ACT-2026-0089',
  assignmentType: 'ENTREGA_DEFINITIVA',
  branchName: 'Sucursal Alameda (Santiago Centro)',
  technicianName: 'Nicolás Galarce González',
  technicianRut: '17.432.119-K',
  createdAt: new Date(),
  items: [
    {
      name: 'Notebook HP EliteBook 840 G10',
      brand: 'HP',
      model: 'EliteBook 840 G10 (Core i7 / 16GB / 512GB SSD)',
      serialNumber: '5CG3429XYZ',
      inventoryNumber: 'INV-TI-2026-4421',
      category: 'Computadores Portátiles',
      quantity: 1,
      itemType: 'HARDWARE'
    },
    {
      name: 'Monitor Corporativo Dell 24"',
      brand: 'Dell',
      model: 'P2422H FHD IPS con Hub USB',
      serialNumber: 'CN088349DEL',
      inventoryNumber: 'INV-TI-2026-8812',
      category: 'Monitores y Pantallas',
      quantity: 1,
      itemType: 'HARDWARE'
    },
    {
      name: 'Kit Teclado + Mouse Inalámbrico Logitech',
      brand: 'Logitech',
      model: 'MK270 Wireless USB',
      serialNumber: 'SN-LOGI-88432',
      inventoryNumber: 'INV-TI-2026-9901',
      category: 'Periféricos y Accesorios',
      quantity: 1,
      itemType: 'HARDWARE'
    },
    {
      name: 'Tóner HP LaserJet Original 58A',
      brand: 'HP',
      model: 'CF258A Negro',
      category: 'Insumos y Consumibles',
      quantity: 2,
      itemType: 'CONSUMABLE'
    }
  ],
  observations: 'Entrega por renovación de puesto de trabajo. Equipos entregados en caja original con cargador, cable HDMI y candado de seguridad Kensington.'
};

function buildAssignmentEmailHtml(params) {
  const formattedDate = new Intl.DateTimeFormat('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(params.createdAt));

  const isDevolucion = params.assignmentType === 'DEVOLUCION';
  const titleText = isDevolucion
    ? 'Acta Oficial de Devolución de Equipamiento TI'
    : 'Acta Oficial de Asignación y Entrega de Equipamiento TI';

  const itemsRows = params.items.map((item, idx) => {
    const isHw = item.itemType === 'HARDWARE' || !!item.serialNumber;
    const desc = item.brand ? `${item.brand} ${item.model || ''}`.trim() : item.name;
    const codeInfo = isHw
      ? `<strong>S/N:</strong> ${item.serialNumber || '-'} ${item.inventoryNumber ? `| <strong>Inv:</strong> ${item.inventoryNumber}` : ''}`
      : `<strong>Cantidad:</strong> ${item.quantity} un.`;

    return `
      <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #1E293B; font-weight: bold;">
          ${idx + 1}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #0F172A;">
          <strong>${desc}</strong>
          ${item.category ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">${item.category}</div>` : ''}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #334155;">
          ${codeInfo}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; color: #003B70; font-weight: bold;">
          ${item.quantity} un.
        </td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${titleText}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 12px;">
        <tr>
          <td align="center">
            
            <!-- Contenedor Principal del Correo -->
            <table width="640" border="0" cellspacing="0" cellpadding="0" style="max-width: 640px; width: 100%; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #CBD5E1;">
              
              <!-- Franja Bicromática Gobierno de Chile -->
              <tr>
                <td>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="height: 6px;">
                    <tr>
                      <td width="35%" style="background-color: #E4002B; height: 6px;"></td>
                      <td width="65%" style="background-color: #003B70; height: 6px;"></td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Cabecera Institucional -->
              <tr>
                <td style="padding: 24px 28px 18px 28px; background-color: #002B52; color: #FFFFFF;">
                  <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td>
                        <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.5px; text-transform: uppercase;">
                          ChileAtiende • Instituto de Previsión Social (IPS)
                        </div>
                        <div style="font-size: 18px; font-weight: 900; color: #FFFFFF; margin-top: 4px; line-height: 1.3;">
                          División de Tecnologías de Información (DTI)
                        </div>
                        <div style="font-size: 12px; color: #E2E8F0; margin-top: 2px;">
                          Sistema de Gestión y Control de Activos TI (ITAM)
                        </div>
                      </td>
                      <td align="right" style="vertical-align: top;">
                        <div style="display: inline-block; background-color: rgba(56, 189, 248, 0.15); border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 8px; padding: 6px 12px; text-align: right;">
                          <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 700;">Folio Oficial</div>
                          <div style="font-size: 14px; font-weight: 900; color: #38BDF8; font-family: monospace;">${params.actNumber}</div>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Cuerpo del Mensaje -->
              <tr>
                <td style="padding: 28px 28px 20px 28px;">
                  
                  <div style="font-size: 16px; font-weight: 800; color: #003B70; margin-bottom: 12px;">
                    Estimado(a) ${params.recipientName}:
                  </div>

                  <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 18px 0;">
                    Le informamos que se ha registrado y firmado exitosamente el acta oficial correspondiente a la asignación de equipamiento tecnológico e insumos computacionales a su cargo.
                  </p>

                  <!-- Ficha Resumen de Asignación -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin-bottom: 20px; padding: 14px 16px;">
                    <tr>
                      <td width="50%" style="font-size: 12.5px; color: #475569; padding: 4px 8px; vertical-align: top;">
                        <strong style="color: #003B70;">Funcionario Receptor:</strong><br>
                        ${params.recipientName} (${params.recipientRut || 'RUT Registrado'})<br>
                        <span style="font-size: 11.5px; color: #64748B;">${params.recipientJobTitle || 'Funcionario'} • ${params.recipientDepartment || 'ChileAtiende'}</span>
                      </td>
                      <td width="50%" style="font-size: 12.5px; color: #475569; padding: 4px 8px; vertical-align: top;">
                        <strong style="color: #003B70;">Técnico Responsable:</strong><br>
                        ${params.technicianName} (${params.technicianRut || 'DTI'})<br>
                        <span style="font-size: 11.5px; color: #64748B;">Sucursal: ${params.branchName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colspan="2" style="font-size: 12px; color: #64748B; padding: 8px 8px 0 8px; border-top: 1px solid #E2E8F0; margin-top: 6px;">
                        <strong>Fecha y Hora de Emisión:</strong> ${formattedDate}
                      </td>
                    </tr>
                  </table>

                  <!-- Tabla de Bienes Asignados -->
                  <div style="font-size: 13px; font-weight: 800; color: #003B70; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
                    Detalle del Equipamiento e Insumos Asignados
                  </div>

                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; margin-bottom: 20px;">
                    <thead>
                      <tr style="background-color: #003B70; color: #FFFFFF;">
                        <th style="padding: 10px 12px; font-size: 11.5px; text-align: left; font-weight: bold;" width="5%">#</th>
                        <th style="padding: 10px 12px; font-size: 11.5px; text-align: left; font-weight: bold;" width="45%">Descripción del Bien</th>
                        <th style="padding: 10px 12px; font-size: 11.5px; text-align: left; font-weight: bold;" width="35%">Identificación (Serie / Inv)</th>
                        <th style="padding: 10px 12px; font-size: 11.5px; text-align: center; font-weight: bold;" width="15%">Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsRows}
                    </tbody>
                  </table>

                  ${params.observations ? `
                    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; font-size: 12.5px; color: #92400E;">
                      <strong>Observaciones Registradas:</strong> ${params.observations}
                    </div>
                  ` : ''}

                  <!-- Cuadro de Responsabilidad y Custodia Institucional -->
                  <div style="background-color: #F8FAFC; border-left: 4px solid #003B70; padding: 14px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: bold; color: #003B70; margin-bottom: 4px;">
                      TÉRMINOS DE CUSTODIA Y RESPONSABILIDAD FUNCIONARIA:
                    </div>
                    <div style="font-size: 11.5px; line-height: 1.5; color: #475569;">
                      El equipamiento individualizado precedentemente queda bajo su custodia directa para el estricto desempeño de labores institucionales de ChileAtiende / IPS, de acuerdo con el Decreto Ley N° 1.263 sobre Administración Financiera del Estado. Se adjunta el documento oficial en formato PDF con firma digital y código QR de verificación.
                    </div>
                  </div>

                  <p style="font-size: 12px; color: #64748B; line-height: 1.5; margin: 0;">
                    Adjunto a este correo encontrará el archivo <strong>Acta_Asignacion_${params.actNumber}.pdf</strong> con el respaldo oficial.
                  </p>

                </td>
              </tr>

              <!-- Pie de Página Institucional -->
              <tr>
                <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 18px 28px; text-align: center; font-size: 11px; color: #64748B;">
                  <div style="font-weight: 700; color: #003B70; margin-bottom: 3px;">
                    División de Tecnologías de Información (DTI) • Mesa de Ayuda TI
                  </div>
                  <div>ChileAtiende • Instituto de Previsión Social (IPS) • Gobierno de Chile</div>
                  <div style="margin-top: 6px; font-size: 10px; color: #94A3B8;">
                    Este es un mensaje automático emitido por la Plataforma ITAM ChileAtiende. Por favor, no responda a este remitente.
                  </div>
                </td>
              </tr>

            </table>

          </td>
        </tr>
      </table>

    </body>
    </html>
  `;
}

const html = buildAssignmentEmailHtml(sampleParams);
const publicPath = path.resolve('../frontend/public/preview-email-asignacion.html');
const distPath = path.resolve('../frontend/dist/preview-email-asignacion.html');

fs.writeFileSync(publicPath, html);
if (fs.existsSync(path.resolve('../frontend/dist'))) {
  fs.writeFileSync(distPath, html);
}

console.log('Vista previa del correo guardada en:');
console.log(' - ' + publicPath);
console.log(' - ' + distPath);
