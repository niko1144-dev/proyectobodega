import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface EmailItemDetail {
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  inventoryNumber?: string;
  category?: string;
  quantity: number;
  itemType?: 'HARDWARE' | 'CONSUMABLE';
}

export interface SendActEmailParams {
  recipientEmail: string;
  recipientName: string;
  recipientRut?: string;
  recipientJobTitle?: string;
  recipientDepartment?: string;
  actNumber: string;
  assignmentType?: string;
  branchName: string;
  technicianName: string;
  technicianRut?: string;
  createdAt: string | Date;
  items: EmailItemDetail[];
  observations?: string;
  pdfBase64?: string;
  pdfBuffer?: Buffer;
}

export interface SendPasswordResetEmailParams {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Obtiene o inicializa el transporte SMTP apuntando al relay institucional
   */
  private static getTransporter(): Transporter {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST || 'relaycha.cha.cl';
    const port = Number(process.env.SMTP_PORT) || 25;
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    const transportOptions: any = {
      host,
      port,
      secure,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    };

    if (user && pass) {
      transportOptions.auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(transportOptions);
    return this.transporter;
  }

  /**
   * Genera la plantilla HTML institucional para el correo de asignación de activos
   */
  private static buildAssignmentEmailHtml(params: SendActEmailParams): string {
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

  /**
   * Envía el Acta Oficial por correo electrónico con el archivo PDF adjunto
   */
  public static async sendAssignmentActEmail(params: SendActEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const isEnabled = process.env.SMTP_ENABLED !== 'false';
    if (!isEnabled) {
      console.log(`[EmailService] Envío de correos deshabilitado en .env. Omitiendo envío a ${params.recipientEmail}`);
      return { success: true, error: 'SMTP deshabilitado' };
    }

    if (!params.recipientEmail || !params.recipientEmail.includes('@')) {
      console.warn(`[EmailService] Correo de receptor inválido o vacío: ${params.recipientEmail}`);
      return { success: false, error: 'Dirección de correo inválida' };
    }

    try {
      const transporter = this.getTransporter();
      const fromAddress = process.env.SMTP_FROM || 'Gestión de Activos TI ChileAtiende <notificaciones-itam@chileatiende.cl>';
      const subject = `[ITAM ChileAtiende] Acta Oficial de Asignación TI - Folio ${params.actNumber}`;
      const htmlContent = this.buildAssignmentEmailHtml(params);

      // Preparar adjuntos
      const attachments: any[] = [];
      const pdfFilename = `Acta_Oficial_${params.actNumber}.pdf`;

      if (params.pdfBuffer) {
        attachments.push({
          filename: pdfFilename,
          content: params.pdfBuffer,
          contentType: 'application/pdf'
        });
      } else if (params.pdfBase64) {
        const commaIdx = params.pdfBase64.indexOf('base64,');
        const cleanBase64 = commaIdx !== -1 
          ? params.pdfBase64.substring(commaIdx + 7).trim() 
          : params.pdfBase64.replace(/^data:.*?;base64,/, '').trim();
        
        try {
          const pdfBuffer = Buffer.from(cleanBase64, 'base64');
          if (pdfBuffer.length > 0) {
            attachments.push({
              filename: pdfFilename,
              content: pdfBuffer,
              contentType: 'application/pdf'
            });
          }
        } catch (bufErr) {
          console.error('[EmailService] Error decodificando PDF base64:', bufErr);
        }
      }

      console.log(`[EmailService] Enviando acta ${params.actNumber} a ${params.recipientEmail} vía relay ${process.env.SMTP_HOST || 'relaycha.cha.cl'}...`);

      const info = await transporter.sendMail({
        from: fromAddress,
        to: params.recipientEmail,
        subject,
        html: htmlContent,
        attachments
      });

      console.log(`[EmailService] ✓ Correo enviado exitosamente. MessageId: ${info.messageId} a ${params.recipientEmail}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] ✗ Error al enviar correo de acta ${params.actNumber} a ${params.recipientEmail}:`, error);
      return { success: false, error: error.message || 'Error al conectar con el servidor relay SMTP' };
    }
  }

  /**
   * Genera la plantilla HTML institucional para la recuperación de contraseñas
   */
  private static buildPasswordResetEmailHtml(params: SendPasswordResetEmailParams): string {
    const expireMinutes = params.expiresInMinutes || 60;

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recuperación de Contraseña - ITAM ChileAtiende</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 12px;">
          <tr>
            <td align="center">
              <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border: 1px solid #CBD5E1;">
                
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
                            <div style="font-size: 10px; color: #94A3B8; text-transform: uppercase; font-weight: 700;">Seguridad</div>
                            <div style="font-size: 13px; font-weight: 900; color: #38BDF8;">Recuperación Clave</div>
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

                    <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 16px 0;">
                      Hemos recibido una solicitud para restablecer la contraseña de acceso a la plataforma <strong>ITAM ChileAtiende</strong> vinculada a su cuenta de usuario.
                    </p>

                    <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
                      Para definir su nueva contraseña, por favor presione el siguiente botón oficial de acceso seguro:
                    </p>

                    <!-- Botón de Acción Principal -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                      <tr>
                        <td align="center">
                          <a href="${params.resetUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #003B70; background: linear-gradient(135deg, #003B70 0%, #0055A5 100%); color: #FFFFFF; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(0, 59, 112, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">
                            Restablecer Mi Contraseña &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Caja de Enlace Directo Alternativo -->
                    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 12px; color: #64748B;">
                      <div style="font-weight: 700; color: #334155; margin-bottom: 4px;">¿Problemas con el botón?</div>
                      <div style="margin-bottom: 6px;">Copie y pegue directamente el siguiente enlace en la barra de su navegador:</div>
                      <a href="${params.resetUrl}" style="color: #0284C7; word-break: break-all; text-decoration: underline; font-family: monospace; font-size: 11px;">
                        ${params.resetUrl}
                      </a>
                    </div>

                    <!-- Alerta de Seguridad y Expiración -->
                    <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 12px 14px; font-size: 12px; color: #92400E; line-height: 1.5;">
                      <strong>⚠️ Aviso de Seguridad:</strong> Este enlace es de un solo uso y expirará automáticamente en <strong>${expireMinutes} minutos</strong>. Si usted no solicitó este cambio de clave, desestime este correo. Su contraseña actual continuará siendo válida y segura.
                    </div>
                  </td>
                </tr>

                <!-- Pie de Página Institucional -->
                <tr>
                  <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px 28px; text-align: center;">
                    <div style="font-size: 11.5px; color: #64748B; line-height: 1.5;">
                      <strong>Instituto de Previsión Social (IPS) • Gobierno de Chile</strong><br>
                      Mesa de Ayuda DTI • Anexo <strong>8700</strong> • soporteti@chileatiende.cl<br>
                      <span style="font-size: 10.5px; color: #94A3B8;">Este es un mensaje automático generado por el Sistema ITAM. Por favor no responda directamente a este correo.</span>
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

  /**
   * Envía el correo electrónico institucional de recuperación de contraseña vía relay
   */
  public static async sendPasswordResetEmail(params: SendPasswordResetEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!process.env.SMTP_ENABLED || process.env.SMTP_ENABLED === 'false') {
      console.warn('[EmailService] SMTP deshabilitado por variable de entorno.');
      return { success: false, error: 'Servicio SMTP deshabilitado por configuración.' };
    }

    if (!params.recipientEmail) {
      return { success: false, error: 'No se especificó un correo electrónico de destino válido.' };
    }

    try {
      const transporter = this.getTransporter();
      const fromAddress = process.env.SMTP_FROM || 'Gestión de Activos TI ChileAtiende <notificaciones-itam@chileatiende.cl>';
      const subject = '[ITAM ChileAtiende] Solicitud para Restablecer Contraseña de Acceso';
      const htmlContent = this.buildPasswordResetEmailHtml(params);

      console.log(`[EmailService] Enviando correo de recuperación a ${params.recipientEmail} vía relay ${process.env.SMTP_HOST || 'relaycha.cha.cl'}...`);

      const info = await transporter.sendMail({
        from: fromAddress,
        to: params.recipientEmail,
        subject,
        html: htmlContent
      });

      console.log(`[EmailService] ✓ Correo de recuperación enviado exitosamente a ${params.recipientEmail}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error: any) {
      console.error(`[EmailService] ✗ Error al enviar correo de recuperación a ${params.recipientEmail}:`, error);
      return { success: false, error: error.message || 'Error al conectar con el servidor relay SMTP' };
    }
  }

  /**
   * Prueba la conectividad con el servidor SMTP Relay
   */
  public static async testSmtpConnection(targetEmail?: string): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      const transporter = this.getTransporter();
      const host = process.env.SMTP_HOST || 'relaycha.cha.cl';
      const port = Number(process.env.SMTP_PORT) || 25;

      console.log(`[EmailService] Probando conexión con ${host}:${port}...`);
      await transporter.verify();

      if (targetEmail) {
        const fromAddress = process.env.SMTP_FROM || 'Gestión de Activos TI ChileAtiende <notificaciones-itam@chileatiende.cl>';
        const info = await transporter.sendMail({
          from: fromAddress,
          to: targetEmail,
          subject: '[ITAM ChileAtiende] Prueba de Conectividad SMTP Relay',
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #CBD5E1; border-radius: 8px;">
              <h2 style="color: #003B70;">Prueba de Conectividad Exitosa</h2>
              <p>Este correo certifica que el servidor backend de ITAM ChileAtiende se conecta correctamente al servidor Relay <strong>${host}:${port}</strong>.</p>
              <p style="font-size: 12px; color: #64748B;">Fecha y Hora: ${new Date().toISOString()}</p>
            </div>
          `
        });
        return {
          success: true,
          message: `Conexión SMTP exitosa con ${host}:${port}. Correo de prueba enviado a ${targetEmail}. MessageId: ${info.messageId}`,
          details: info
        };
      }

      return {
        success: true,
        message: `Conexión SMTP verificada exitosamente con el servidor relay ${host}:${port}.`
      };
    } catch (error: any) {
      console.error('[EmailService] Error en prueba SMTP:', error);
      return {
        success: false,
        message: `Error al conectar con el servidor relay SMTP (${process.env.SMTP_HOST || 'relaycha.cha.cl'}): ${error.message}`,
        details: error
      };
    }
  }
}
