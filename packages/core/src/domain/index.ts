/**
 * Domain barrel.
 *
 * Split by concern — entities, score payloads, result rows — but exposed as one
 * subpath (`@ipscscore/core/types`) so platform type files can re-export from a
 * single specifier.
 */

export * from './types';
export * from './scoring-types';
export * from './result-types';
