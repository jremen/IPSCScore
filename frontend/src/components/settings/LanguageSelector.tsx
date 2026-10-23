import { Select, Label } from 'flowbite-react';
import { useLanguageSelector } from '../../hooks/useLanguageSelector';
import type { Language } from '../../stores/uiStore';

export default function LanguageSelector() {
  const { t, language, changeLanguage } = useLanguageSelector();

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="language-select" className="text-xs whitespace-nowrap">
        <Select
          id="language-select"
          value={language}
          onChange={(event) => changeLanguage(event.target.value as Language)}
          className="[&_select]:py-1 [&_select]:text-sm [&_select]:bg-gray-800 [&_select]:text-white"
        >
          <option value="en">{t('settings.english')}</option>
          <option value="sk">{t('settings.slovak')}</option>
        </Select>
      </Label>
    </div>
  );
}
