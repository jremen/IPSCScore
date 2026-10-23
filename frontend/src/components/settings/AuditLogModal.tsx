import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Spinner, Alert, Select } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { auditRoleClass, formatAuditTarget, formatAuditTime } from '../../utils/audit';
import { useAuditLogModal } from '../../hooks/useAuditLogModal';
import type { AuditLogModalProps } from './types';

export default function AuditLogModal({ show, onClose }: AuditLogModalProps) {
  const { t } = useTranslation();
  const {
    entries,
    total,
    loading,
    error,
    roleFilter,
    pendingActionFilter,
    setPendingActionFilter,
    handleRefresh,
    handleFilterApply,
    handleRoleChange,
    handleLoadMore,
  } = useAuditLogModal({ show, onClose });

  return (
    <Modal show={show} onClose={onClose} size="6xl">
      <ModalHeader>{t('settings.auditLogTitle')}</ModalHeader>
      <ModalBody>
        {error && (
          <Alert color="failure" className="mb-4">
            <p>{t('settings.auditLogError')} {error}</p>
          </Alert>
        )}

        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.auditLogAction')}
            </label>
            <input
              type="text"
              value={pendingActionFilter}
              onChange={(e) => setPendingActionFilter(e.target.value)}
              placeholder={t('settings.auditLogFilterAction')}
              className="block w-48 rounded-md border border-gray-300 bg-white px-3 py-2.5 text-sm shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              onKeyDown={(e) => { if (e.key === 'Enter') handleFilterApply(); }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('settings.auditLogFilterRole')}
            </label>
            <Select value={roleFilter} onChange={(e) => handleRoleChange(e.target.value)}>
              <option value="">{t('settings.auditLogRoleAll')}</option>
              <option value="admin">admin</option>
              <option value="scorer">scorer</option>
              <option value="anonymous">anonymous</option>
            </Select>
          </div>
          <Button color="gray" onClick={handleFilterApply}>{t('common.filter')}</Button>
          <Button color="gray" onClick={handleRefresh} disabled={loading}>{t('common.refresh')}</Button>
        </div>

        <div className="overflow-x-auto">
          {loading && entries.length === 0 ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              {t('settings.auditLogNoEntries')}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogTime')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogActor')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogAction')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogTarget')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogIp')}</th>
                  <th className="pb-2 font-medium text-gray-500 dark:text-gray-400">{t('settings.auditLogMeta')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 whitespace-nowrap text-gray-900 dark:text-gray-100" title={entry.at}>
                      {formatAuditTime(entry.at)}
                    </td>
                    <td className="py-2 text-gray-700 dark:text-gray-300">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${auditRoleClass(entry.actor_role)}`}>
                        {entry.actor_role}
                      </span>
                      {entry.actor_token_id && (
                        <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">{entry.actor_token_id}</span>
                      )}
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-800 dark:text-gray-200">{entry.action}</td>
                    <td className="py-2 text-xs text-gray-600 dark:text-gray-400">{formatAuditTarget(entry)}</td>
                    <td className="py-2 text-xs text-gray-500 dark:text-gray-400">{entry.ip || '—'}</td>
                    <td className="py-2 text-xs text-gray-500 dark:text-gray-400">
                      {entry.meta ? (
                        <details>
                          <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
                            {t('settings.auditLogMeta')}
                          </summary>
                          <pre className="mt-1 text-xs whitespace-pre-wrap break-all">
                            {JSON.stringify(entry.meta, null, 2)}
                          </pre>
                        </details>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {loading && entries.length > 0 && (
          <div className="flex justify-center py-4"><Spinner size="sm" /></div>
        )}

        {!loading && entries.length < total && (
          <div className="flex justify-center py-4">
            <Button size="sm" color="gray" onClick={handleLoadMore}>
              {t('settings.auditLogLoadMore')} ({entries.length} / {total})
            </Button>
          </div>
        )}

        <div className="text-xs text-gray-400 dark:text-gray-500 text-right mt-2">
          {t('settings.auditLogTotal', { count: total })}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}
