import { useEffect, useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Select, Label, Checkbox, Alert } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useMatchStore } from '../../stores/matchStore';
import { useCupStore } from '../../stores/cupStore';
import { useUIStore } from '../../stores/uiStore';
import { useEscClose } from '../../hooks/useEscClose';
import { CATEGORIES, formatDate } from '../../utils/constants';

interface CreateCupModalProps {
  show: boolean;
  onClose: () => void;
  onCreated?: (cupId: string) => void;
  preselectedMatchIds?: string[];
  preselectOnly?: boolean;
}

/** Multi-select picker for matches */
export function MatchPicker({ selected, onToggle, excludeIds }: { selected: Set<string>; onToggle: (id: string) => void; excludeIds?: Set<string> }) {
  const matches = useMatchStore((s) => s.matches);
  const { t } = useTranslation();
  const options = matches.filter((m: any) => !excludeIds?.has(m.id));
  return (
    <div className="max-h-56 overflow-y-auto border rounded p-2 space-y-1">
      {options.length === 0 && <p className="text-sm text-gray-500">{t('cups.noAvailableMatches')}</p>}
      {options.map((m: any) => (
        <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
          <Checkbox
            className="size-4"
            checked={selected.has(m.id)}
            onChange={() => onToggle(m.id)}
          />
          <span className="dark:text-white">{m.name}</span>
          <span className="text-gray-500 text-xs ml-auto">{formatDate(m.date)}</span>
        </label>
      ))}
    </div>
  );
}

export default function CreateCupModal({ show, onClose, onCreated, preselectedMatchIds = [] }: CreateCupModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [scoringMode, setScoringMode] = useState<'hit_factor' | 'points'>('hit_factor');
  const [minimum, setMinimum] = useState('');
  const [minimumParticipants, setMinimumParticipants] = useState('');
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const createCup = useCupStore((s) => s.createCup);
  const addToast = useUIStore((s) => s.addToast);

  useEffect(() => {
    if (show) {
      setName('');
      setScoringMode('hit_factor');
      setMinimum('');
      setMinimumParticipants('');
      setCategories(new Set());
      setError(null);
      setSelected(new Set(preselectedMatchIds));
    }
  }, [show, preselectedMatchIds]);

  const handleClose = () => { setError(null); onClose(); };
  useEscClose(handleClose);

  const toggleMatch = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (value: string) => {
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError(t('cups.nameRequired')); return; }
    setSaving(true);
    setError(null);
    try {
      const parseMin = Number(minimum);
      const parseMinPart = Number(minimumParticipants);
      const cup = await createCup({
        name: name.trim(),
        scoring_mode: scoringMode,
        minimum_matches: minimum === '' ? null : (Number.isInteger(parseMin) && parseMin >= 1 ? parseMin : null),
        minimum_participants: minimumParticipants === '' ? null : (Number.isInteger(parseMinPart) && parseMinPart >= 1 ? parseMinPart : null),
        selected_categories: categories.size > 0 ? Array.from(categories) : null,
        matchIds: Array.from(selected),
      });
      addToast(t('cups.created'), 'success');
      handleClose();
      onCreated?.(cup.id);
    } catch (err: any) {
      setError(err.message || t('common.unknownError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onClose={handleClose} size="lg">
      <ModalHeader>{t('cups.newCup')}</ModalHeader>
      <ModalBody>
        <div className="space-y-4">
          {error && <Alert color="failure">{error}</Alert>}
          <div>
            <Label>{t('cups.cupName')}</Label>
            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Oravská liga 2026" />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-40">
              <Label>{t('cups.scoringMode')}</Label>
              <Select value={scoringMode} onChange={(e) => setScoringMode(e.target.value as 'hit_factor' | 'points')}>
                <option value="hit_factor">{t('cups.scoringModeHitFactor')}</option>
                <option value="points">{t('cups.scoringModePoints')}</option>
              </Select>
            </div>
            <div className="flex-1 min-w-40">
              <Label>{t('cups.minimumMatches')}</Label>
              <TextInput
                type="number" min={1}
                value={minimum}
                onChange={(e) => setMinimum(e.target.value)}
                placeholder={t('cups.minimumMatchesAuto', { n: Math.floor(selected.size / 2) + 1 })}
              />
              <p className="text-xs text-gray-500 mt-1">{t('cups.minimumMatchesHint')}</p>
            </div>
            <div className="flex-1 min-w-40">
              <Label>{t('cups.minimumParticipants')}</Label>
              <TextInput
                type="number" min={1}
                value={minimumParticipants}
                onChange={(e) => setMinimumParticipants(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">{t('cups.minimumParticipantsHint')}</p>
            </div>
          </div>
          <div>
            <Label>{t('cups.outputCategories')}</Label>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {CATEGORIES.filter((c) => c.value !== 'regular').map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    className="size-4"
                    checked={categories.has(c.value)}
                    onChange={() => toggleCategory(c.value)}
                  />
                  <span className="dark:text-white">{t(c.i18nKey)}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">{t('cups.outputCategoriesHint')}</p>
          </div>
          <div>
            <Label>{t('cups.matches')}</Label>
            <MatchPicker selected={selected} onToggle={toggleMatch} />
            <p className="text-xs text-gray-500 mt-1">{t('cups.autoDefaultHint', { n: Math.floor(selected.size / 2) + 1 })}</p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button size="sm" color="green" onClick={handleCreate} disabled={saving}>
          {saving ? t('common.loading') : t('cups.create')}
        </Button>
        <Button size="sm" color="gray" onClick={handleClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}