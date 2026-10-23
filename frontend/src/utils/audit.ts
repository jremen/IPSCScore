import type { AuditEntry } from '../types/audit';

export function formatAuditTime(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function formatAuditTarget(entry: AuditEntry) {
  if (!entry.target_table) return '—';
  if (entry.target_id) return `${entry.target_table}:${entry.target_id}`;
  return entry.target_table;
}

export function auditRoleClass(role: string) {
  if (role === 'admin') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300';
  if (role === 'scorer') return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
}
