import { Card, TextInput, Button, Alert } from 'flowbite-react';
import LanguageSelector from '../settings/LanguageSelector';
import { useStageLoginPage } from '../../hooks/useStageLoginPage';

export default function StageLoginPage() {
  const {
    t,
    loading,
    error,
    isLocalNetwork,
    pendingApproval,
    deviceID,
    isStandalone,
    isOffline,
    pasteMode,
    pastedUrl,
    pasteError,
    changePastedUrl,
    togglePasteMode,
    handlePasteSubmit,
    handleCheckLogin,
  } = useStageLoginPage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <div className="flex justify-end">
          <LanguageSelector />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          {t('auth.trustTitle')}
        </h2>
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
          {t('auth.trustSubtitle')}
        </p>

        {error && (
          <Alert color="failure" className="mb-4">
            {error}
          </Alert>
        )}

        {pendingApproval && (
          <Alert color="warning" className="mb-4">
            {t('auth.trustPendingHint')}
            <br /><br />
            <p className="font-medium text-xl">{t('auth.trustDeviceId')}:&nbsp;{deviceID.substring(0, 8)}…</p>
          </Alert>
        )}

        {isOffline && !isStandalone && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              {t('auth.offlineNoDataTitle')}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {t('auth.offlineNoDataHint')}
            </p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
            📱 {t('auth.trustIosNote')}
          </p>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>{t('auth.trustStep1')}</li>
            <li>{t('auth.trustStep2Ios')}</li>
            <li>{t('auth.trustStep3Ios')}</li>
          </ol>
        </div>

        <Button
          color="blue"
          className="w-full mb-2"
          onClick={handleCheckLogin}
          disabled={loading}
        >
          {loading ? t('auth.connecting') : t('auth.trustCheckButton')}
        </Button>

        <Button
          color="gray"
          size="sm"
          className="w-full"
          onClick={togglePasteMode}
        >
          {pasteMode ? t('common.cancel') : t('auth.trustPasteToggle')}
        </Button>

        {pasteMode && (
          <div className="mt-4 space-y-2">
            <TextInput
              type="url"
              placeholder={t('auth.trustPastePlaceholder')}
              value={pastedUrl}
              onChange={(event) => changePastedUrl(event.target.value)}
            />
            {pasteError && (
              <Alert color="failure" className="text-sm py-2">
                {pasteError}
              </Alert>
            )}
            <Button
              className="w-full"
              onClick={handlePasteSubmit}
              disabled={!pastedUrl.trim() || loading}
            >
              {t('common.submit')}
            </Button>
          </div>
        )}

        {isLocalNetwork && (
          <div className="text-center mt-4">
            {isStandalone ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                🔒 {t('auth.adminNote')}
              </p>
            ) : (
              <a href="/" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                🔒 {t('auth.adminLogin')}
              </a>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
