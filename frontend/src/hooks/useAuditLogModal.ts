import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useEscClose } from './useEscClose';
import type { AuditEntry } from '../types/audit';

const LIMIT = 100;

export function useAuditLogModal({ show, onClose }: { show: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  useEscClose(onClose);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [pendingActionFilter, setPendingActionFilter] = useState('');

  const load = useCallback(async (nextOffset: number, action: string, role: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.getAuditLog({
        limit: LIMIT,
        offset: nextOffset,
        action: action || undefined,
        actor_role: role || undefined,
      });
      if (nextOffset === 0) setEntries(response.entries);
      else setEntries((previous) => [...previous, ...response.entries]);
      setTotal(response.total);
      setOffset(nextOffset);
    } catch (err: any) {
      setError(err.message || t('settings.auditLogErrorFallback'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!show) return;
    setEntries([]);
    setTotal(0);
    setOffset(0);
    setActionFilter('');
    setRoleFilter('');
    setPendingActionFilter('');
    setError(null);
    load(0, '', '');
  }, [show, load]);

  const handleRefresh = useCallback(() => load(0, actionFilter, roleFilter), [actionFilter, load, roleFilter]);

  const handleFilterApply = useCallback(() => {
    setActionFilter(pendingActionFilter);
    load(0, pendingActionFilter, roleFilter);
  }, [load, pendingActionFilter, roleFilter]);

  const handleRoleChange = useCallback((newRole: string) => {
    setRoleFilter(newRole);
    load(0, actionFilter, newRole);
  }, [actionFilter, load]);

  const handleLoadMore = useCallback(() => load(offset + LIMIT, actionFilter, roleFilter), [actionFilter, load, offset, roleFilter]);

  return {
    entries,
    total,
    loading,
    error,
    actionFilter,
    roleFilter,
    pendingActionFilter,
    setPendingActionFilter,
    handleRefresh,
    handleFilterApply,
    handleRoleChange,
    handleLoadMore,
  };
}
