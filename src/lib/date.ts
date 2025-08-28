export function toYmd(input: string | Date | null | undefined): string {
  if (!input) return '';
  if (typeof input === 'string') {
    // si ya viene 'YYYY-MM-DD' la dejamos tal cual
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
    // intentamos parse simple (Safari-safe)
    const d = new Date(input);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return input;
  }
  return input.toISOString().slice(0, 10);
}

export function toDisplay(input: string | Date | null | undefined): string {
  const ymd = toYmd(input);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}
