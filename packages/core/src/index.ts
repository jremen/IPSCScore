/**
 * @ipscscore/core — platform-agnostic domain layer.
 *
 * Consumed by the React frontend (web + Capacitor/Android + Capacitor/iOS) and,
 * progressively, by the Node backend. Keeping types and scoring here guarantees
 * that the desktop backend, the browser client and the mobile runtimes compute
 * identical results.
 */

export * from './domain';
export * from './scoring';
