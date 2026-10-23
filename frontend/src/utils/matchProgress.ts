export const POLL_INTERVAL_MS = 60_000;
export const SSE_FALLBACK_INTERVAL_MS = 300_000;

/**
 * Explicit dark theme for the TV kiosk. The kiosk has its own dark shell, but it
 * does not inherit the app's `.dark` context, so Flowbite would otherwise render
 * a light track with dark text. Dark blue fill + white percentage.
 */
export const KIOSK_PROGRESS_THEME = {
  base: 'bg-slate-800 dark:bg-slate-800',
  bar: 'text-white dark:text-white',
  color: { blue: 'bg-blue-700 dark:bg-blue-700' },
};
