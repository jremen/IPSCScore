import { Modal, ModalHeader, ModalBody, ModalFooter, Button, TextInput, Select, Label, Checkbox, Alert } from 'flowbite-react';
import MatchPicker from './MatchPicker';
import { useCreateCupModal } from '../../hooks/useCreateCupModal';
import { CUP_OUTPUT_CATEGORIES } from '../../utils/cup';
import type { CreateCupModalProps } from './types';

export default function CreateCupModal(props: CreateCupModalProps) {
  const {
    t,
    name,
    setName,
    scoringMode,
    setScoringMode,
    minimum,
    setMinimum,
    minimumParticipants,
    setMinimumParticipants,
    categories,
    selected,
    error,
    saving,
    toggleMatch,
    toggleCategory,
    handleCreate,
    handleClose,
  } = useCreateCupModal(props);

  return (
    <Modal show={props.show} onClose={handleClose} size="lg">
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
              {CUP_OUTPUT_CATEGORIES.map((category) => (
                <label key={category.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    className="size-4"
                    checked={categories.has(category.value)}
                    onChange={() => toggleCategory(category.value)}
                  />
                  <span className="dark:text-white">{t(category.i18nKey)}</span>
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
