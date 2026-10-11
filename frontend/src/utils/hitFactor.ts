export function hasHitFactor(rows: any[] | null | undefined): boolean {
  return Array.isArray(rows) && rows.some((r) => r?.hit_factor != null);
}

export function formatHitFactor(value: unknown, fallback = ''): string {
  return value != null ? Number(value).toFixed(4) : fallback;
}
