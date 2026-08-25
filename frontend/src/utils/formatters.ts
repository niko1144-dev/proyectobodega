// Utilidades de Formato Estandarizadas ChileAtiende / Gobierno de Chile

export function formatDate(isoDateString?: string | null): string {
  if (!isoDateString) return 'N/A';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    return d.toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch {
    return isoDateString;
  }
}

export function formatDateTime(isoDateString?: string | null): string {
  if (!isoDateString) return 'N/A';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    return d.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoDateString;
  }
}

export function getDaysUntil(targetDateString?: string | null): number | null {
  if (!targetDateString) return null;
  try {
    const target = new Date(targetDateString).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return null;
  }
}

export function formatCurrencyCLP(amount?: number | null): string {
  if (amount === undefined || amount === null) return '$0';
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0
  }).format(amount);
}

export async function generateSHA256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- NORMALIZACIÓN DE TEXTO PARA BÚSQUEDAS (Insensible a Acentos / Tildes) ---

/**
 * Normaliza texto eliminando acentos/tildes y convirtiendo a minúsculas
 * Ejemplo: "André González" -> "andre gonzalez"
 */
export function normalizeText(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

// --- VALIDACIONES Y HOMOLOGACIÓN DE RUT CHILENO ---

export function cleanRut(rut: string): string {
  return typeof rut === 'string' ? rut.replace(/[^0-9kK]/g, '').toUpperCase() : '';
}

export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 2) return cleaned;
  
  const dv = cleaned.slice(-1);
  let body = cleaned.slice(0, -1);
  
  // Agregar puntos de miles automáticamente
  body = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  
  return `${body}-${dv}`;
}

export function validateRut(rut: string): boolean {
  const cleaned = cleanRut(rut);
  if (cleaned.length < 7 || cleaned.length > 10) return false;
  return /^[0-9]+[0-9K]$/.test(cleaned);
}

// --- VALIDACIÓN DE CORREO ELECTRÓNICO ---
export function validateEmail(email: string): boolean {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase().trim());
}
