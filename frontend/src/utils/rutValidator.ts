// Validador y Formateador Homologado de RUT Chileno

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
