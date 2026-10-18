/**
 * Export helpers shared by every PDF/CSV/HTML export.
 *
 * Three runtimes, three save strategies:
 *
 *   web / electron — File System Access API, falling back to a browser download
 *   android / ios  — Capacitor Filesystem, written into the public Documents folder
 *
 * `nativeSaveAs` asks the OS for a destination (desktop only) while
 * `saveBlobToDevice` persists a blob whose file name is already decided.
 */
import { isLocalRuntime } from '../services/data/platform';

/** Folder created inside Documents to keep on-device exports together. */
const DEVICE_EXPORT_DIR = 'IPSCScore';

/** Strip the characters Android/iOS reject in file names. */
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|]+/g, '_').replace(/^\.+/, '').trim();
  return cleaned || 'export';
}

/** Read a blob as bare base64 (no `data:` prefix) — what Capacitor Filesystem expects. */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file contents'));
    reader.onload = () => {
      const result = String(reader.result ?? '');
      const comma = result.indexOf(',');
      resolve(comma === -1 ? result : result.slice(comma + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** Write to the device's public Documents folder. Throws when the write fails. */
async function writeToDeviceDocuments(blob: Blob, filename: string): Promise<boolean> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem');
  const path = `${DEVICE_EXPORT_DIR}/${sanitizeFileName(filename)}`;

  // Public storage needs an explicit runtime permission up to Android 10;
  // newer releases grant it implicitly.
  try {
    const { publicStorage } = await Filesystem.checkPermissions();
    if (publicStorage === 'denied') return false;
    if (publicStorage !== 'granted') {
      const asked = await Filesystem.requestPermissions();
      if (asked.publicStorage !== 'granted') return false;
    }
  } catch {
    // No storage permission model on this platform — let writeFile report problems.
  }

  // "Save As" semantics: re-exporting under the same name replaces the old file.
  try {
    await Filesystem.deleteFile({ path, directory: Directory.Documents });
  } catch { /* nothing to replace */ }

  await Filesystem.writeFile({
    path,
    data: await blobToBase64(blob),
    directory: Directory.Documents,
    recursive: true,
  });
  return true;
}

/**
 * Hand the finished file to another app when Documents is not writable (for
 * instance when storage access was denied). The user then chooses where it lands.
 */
async function shareBlobFromCache(blob: Blob, filename: string): Promise<boolean> {
  const { Directory, Filesystem } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');
  const name = sanitizeFileName(filename);
  const { uri } = await Filesystem.writeFile({
    path: name,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
    recursive: true,
  });
  // Only `files` is passed: a file:// `url` would attach the same file twice.
  await Share.share({ title: name, files: [uri], dialogTitle: name });
  return true;
}

/**
 * Persist a generated export.
 *
 * On Android/iOS this writes to `Documents/IPSCScore/`; in the browser or
 * Electron it triggers a normal download. Returns false only when nothing was
 * saved, so callers can report an error instead of claiming success.
 */
export async function saveBlobToDevice(blob: Blob, filename: string): Promise<boolean> {
  if (isLocalRuntime()) {
    try {
      if (await writeToDeviceDocuments(blob, filename)) return true;
    } catch (err) {
      console.error('Filesystem save failed:', err);
    }
    try {
      return await shareBlobFromCache(blob, filename);
    } catch (err) {
      console.error('File share fallback failed:', err);
      return false;
    }
  }

  downloadBlob(blob, filename);
  return true;
}

/**
 * Ask the OS for a destination before writing.
 *
 * Only useful on desktop browsers; on device this returns false so the caller
 * can prompt for a file name and then hand the blob to `saveBlobToDevice`.
 */
export async function nativeSaveAs(blob: Blob, defaultName: string, types: { description: string; accept: Record<string, string[]> }[]): Promise<boolean> {
  if (isLocalRuntime()) return false;
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
