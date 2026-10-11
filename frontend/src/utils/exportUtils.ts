export async function nativeSaveAs(blob: Blob, defaultName: string, types: { description: string; accept: Record<string, string[]> }[]): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false;
  try {
    const handle = await (window as any).showSaveFilePicker({ suggestedName: defaultName, types });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatDateLong(dateStr: string | undefined): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(document.documentElement.lang || 'en', { year: 'numeric', month: 'long', day: 'numeric' });
}

export const MARGIN = 10;
export const TITLE_SIZE = 14;
export const SUBTITLE_SIZE = 11;
export const TABLE_FONT = 9;

export const TABLE_STYLE = {
  theme: 'plain' as const,
  styles: { font: 'OpenSans', fontStyle: 'normal' as const, fontSize: TABLE_FONT, textColor: 0 },
  headStyles: { font: 'OpenSans', fontStyle: 'bold' as const, fontSize: TABLE_FONT, fillColor: [0, 0, 0] as [number, number, number], textColor: [255, 255, 255] as [number, number, number] },
  alternateRowStyles: { fillColor: [245, 245, 245] as [number, number, number] },
};