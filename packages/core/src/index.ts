/**
 * @ipscscore/core — platform-agnostic domain layer.
 *
 * Consumed by the React frontend (web + Capacitor/Android) and, progressively, by
 * the Node backend. Keeping types and scoring here guarantees that the desktop
 * backend, the browser client and the Android runtime compute identical results.
 */

export * from './domain';
export * from './scoring';
