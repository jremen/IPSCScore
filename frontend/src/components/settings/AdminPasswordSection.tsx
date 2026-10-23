import { Button, Label, TextInput, Alert } from 'flowbite-react';
import { useAdminPasswordSection } from '../../hooks/useAdminPasswordSection';

export default function AdminPasswordSection() {
  const {
    t,
    currentPassword,
    newPassword,
    confirmPassword,
    saving,
    message,
    setCurrentPassword,
    setNewPassword,
    setConfirmPassword,
    handleChangePassword,
  } = useAdminPasswordSection();

  return (
    <div>
      <h3 className="text-lg font-semibold dark:text-white mb-2">{t('auth.changePassword')}</h3>
      <div className="space-y-3">
        <div>
          <Label htmlFor="current-password" className="mb-1 block">
            {t('auth.currentPassword')}
          </Label>
          <TextInput
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="new-password" className="mb-1 block">
            {t('auth.newPassword')}
          </Label>
          <TextInput
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="confirm-password" className="mb-1 block">
            {t('auth.confirmNewPassword')}
          </Label>
          <TextInput
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </div>

        {message && (
          <Alert color={message.type === 'success' ? 'success' : 'failure'}>
            {message.text}
          </Alert>
        )}

        <Button
          onClick={handleChangePassword}
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
          size="sm"
        >
          {saving ? t('auth.connecting') : t('auth.changePassword')}
        </Button>
      </div>
    </div>
  );
}
