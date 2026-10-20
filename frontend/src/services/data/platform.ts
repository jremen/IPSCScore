/**
 * Runtime platform detection.
 *
 * The same Vite bundle runs in four very different places:
 *
 *   web      — browser talking to a remote HTTP/PostgreSQL backend
 *   electron — desktop shell, same HTTP backend started as a child process
 *   android  — Capacitor shell, fully local SQLite, no backend at all
 *   ios      — Capacitor shell, same on-device SQLite data layer as Android
 *
 * Detection deliberately avoids a static `@capacitor/core` import so the web
 * bundle stays lean; Capacitor injects `window.Capacitor` on native platforms.
 */

export type RuntimePlatform = 'web' | 'electron' | 'android' | 'ios';

interface CapacitorGlobal {
  getPlatform?: () => string;
  isNativePlatform?: () => boolean;
}

function capacitorGlobal(): CapacitorGlobal | undefined {
  return (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export function getRuntimePlatform(): RuntimePlatform {
  const cap = capacitorGlobal();
  if (cap?.isNativePlatform?.()) {
    const platform = cap.getPlatform?.();
    if (platform === 'android') return 'android';
    if (platform === 'ios') return 'ios';
  }

  if (typeof window !== 'undefined' && (window as { electronAPI?: unknown }).electronAPI) {
    return 'electron';
  }

  return 'web';
}

/**
 * True when the app must run entirely on-device: no HTTP backend, no network.
 */
export function isLocalRuntime(): boolean {
  const platform = getRuntimePlatform();
  return platform === 'android' || platform === 'ios';
}
