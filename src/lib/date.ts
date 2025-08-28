export function toYmd(input: string | Date | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') {
    // si ya viene 'YYYY-MM-DD' la dejamos tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    // intentamos parse simple (Safari-safe)
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      // Usar fecha local en lugar de UTC para evitar problemas de zona horaria
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return input;
  }
  // Para objetos Date, usar fecha local en lugar de UTC
  const year = input.getFullYear();
  const month = String(input.getMonth() + 1).padStart(2, '0');
  const day = String(input.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toDisplay(input: string | Date | null | undefined): string {
  const ymd = toYmd(input);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}
