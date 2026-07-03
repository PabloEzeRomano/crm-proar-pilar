export function formatPrice(price: number): string {
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD`;
}

/** Format a minute count into a human-readable string (uses absolute value). */
export function formatMinutes(mins: number): string {
  const abs = Math.abs(mins);
  if (abs < 60) return `${abs} minuto${abs !== 1 ? 's' : ''}`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
