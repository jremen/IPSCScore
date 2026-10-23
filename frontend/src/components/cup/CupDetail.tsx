import { Button, Badge, TextInput, Label, Modal, ModalHeader, ModalBody, ModalFooter, Checkbox, ToggleSwitch } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES, formatDate } from '../../utils/constants';
import { TbArrowBack, TbPlus, TbTrash, TbPencil } from 'react-icons/tb';
import { CUP_TABS } from '../../utils/cup';
import { useCupDetail } from '../../hooks/useCupDetail';
import CupDetailResults from './CupDetailResults';
import AddCupMatchesModal from './AddCupMatchesModal';
import type { CupDetailProps } from './types';

export default function CupDetail({ cupId, onBack }: CupDetailProps) {
  const { t } = useTranslation();
  const {
    detail,
    results,
    loading,
    tab,
    setTab,
    minInput,
    setMinInput,
    savingMin,
    minPartInput,
    setMinPartInput,
    savingMinPart,
    selectedCats,
    savingCats,
    showEditCup,
    setShowEditCup,
    editName,
    setEditName,
    savingName,
    showAddMatches,
    setShowAddMatches,
    showMinError,
    showMinPartError,
    showAllShooters,
    setShowAllShooters,
    limitInput,
    setLimitInput,
    mode,
    autoMin,
    required,
    requiredParticipants,
    cupExport,
    saveMinimum,
    saveMinimumParticipants,
    toggleCategory,
    saveCategories,
    openEditCup,
    saveEditName,
    handleRemoveMatch,
    getLimitedRows,
  } = useCupDetail(cupId);

  if (!detail) {
    return (
      <div className="p-4">
        <Button size="xs" color="light" onClick={onBack}><TbArrowBack className="mr-1.5" /> {t('common.back')}</Button>
        {loading ? <p className="text-gray-500 mt-4">{t('common.loading')}</p> : <p className="text-gray-500 mt-4">{t('cups.empty')}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 mx-auto">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Button size="xs" color="light" onClick={onBack}><TbArrowBack className="mr-1.5" /> {t('common.back')}</Button>
        <h2 className="text-xl font-bold dark:text-white">{detail.name}</h2>
        <Badge color={mode === 'hit_factor' ? 'info' : 'purple'} size="sm">
          {mode === 'hit_factor' ? t('cups.scoringModeHitFactor') : t('cups.scoringModePoints')}
        </Badge>
        <Badge color="gray" size="sm">{t('cups.requiredMatches', { n: required })}</Badge>
        {requiredParticipants != null && (
          <Badge color="gray" size="sm">{t('cups.requiredParticipants', { n: requiredParticipants })}</Badge>
        )}
        <Button size="xs" color="light" onClick={openEditCup}><TbPencil className="mr-1.5" /> {t('common.edit')}</Button>
      </div>

      <div className="flex flex-wrap gap-4 2xl:gap-24 mb-4">
        <div>
          <Label>{t('cups.minimumMatches')}</Label>
          <div className="flex gap-2 items-center">
            <TextInput
              type="number"
              min={1}
              className="w-28"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              placeholder={t('cups.minimumMatchesAuto', { n: autoMin })}
            />
            <Button size="xs" color="blue" onClick={saveMinimum} disabled={savingMin}>
              {savingMin ? t('common.loading') : t('common.save')}
            </Button>
          </div>
          {showMinError && <p className="text-xs text-red-500 mt-1">{t('cups.minimumMatchesInvalid')}</p>}
          <p className="text-xs text-gray-500 mt-1">{t('cups.minimumMatchesHint')}</p>
        </div>

        <div>
          <Label>{t('cups.minimumParticipants')}</Label>
          <div className="flex gap-2 items-center">
            <TextInput
              type="number"
              min={1}
              className="w-28"
              value={minPartInput}
              onChange={(e) => setMinPartInput(e.target.value)}
            />
            <Button size="xs" color="blue" onClick={saveMinimumParticipants} disabled={savingMinPart}>
              {savingMinPart ? t('common.loading') : t('common.save')}
            </Button>
          </div>
          {showMinPartError && <p className="text-xs text-red-500 mt-1">{t('cups.minimumParticipantsInvalid')}</p>}
          <p className="text-xs text-gray-500 mt-1 max-w-64">{t('cups.minimumParticipantsHint')}</p>
        </div>

        <div>
          <Label>{t('cups.outputCategories')}</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            {CATEGORIES.filter((category) => category.value !== 'regular').map((category) => (
              <label key={category.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  className="size-4"
                  checked={selectedCats.includes(category.value)}
                  onChange={() => toggleCategory(category.value)}
                />
                <span className="dark:text-white">{t(category.i18nKey)}</span>
              </label>
            ))}
          </div>
          <div className="mt-1.5">
            <Button size="xs" color="blue" onClick={saveCategories} disabled={savingCats}>
              {savingCats ? t('common.loading') : t('common.save')}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-1 max-w-64">{t('cups.outputCategoriesHint')}</p>
        </div>

        <div className="flex-1 min-w-64">
          <Label>{t('cups.matches')}</Label>
          <div className="space-y-1">
            {detail.matches.length === 0 && <p className="text-sm text-gray-500">{t('cups.noMatches')}</p>}
            {detail.matches.map((match) => (
              <div key={match.id} className="flex items-center gap-2 text-sm">
                <span className="dark:text-white">{match.name}</span>
                <span className="text-gray-500 text-xs">{formatDate(match.date)}</span>
                <Button size="xs" color="red" className="ml-auto" onClick={() => handleRemoveMatch(match.id)}>
                  <TbTrash />
                </Button>
              </div>
            ))}
            <Button size="xs" color="light" onClick={() => setShowAddMatches(true)}>
              <TbPlus className="mr-1.5" /> {t('cups.addMatches')}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
        <div className="flex flex-wrap gap-x-1 border-b border-gray-200 dark:border-gray-700 -mb-px" role="tablist">
          {CUP_TABS.map((cupTab) => (
            <button
              key={cupTab.key}
              role="tab"
              aria-selected={tab === cupTab.key}
              onClick={() => setTab(cupTab.key)}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === cupTab.key
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                  : 'cursor-pointer border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {t(cupTab.labelKey)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2">
            <ToggleSwitch
              checked={showAllShooters}
              onChange={setShowAllShooters}
              label={t('cups.showAllShooters')}
            />
            {!showAllShooters && (
              <TextInput
                type="number"
                min={1}
                className="w-20"
                value={limitInput}
                title={t('cups.shootersToShow')}
                onChange={(e) => setLimitInput(e.target.value)}
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button size="xs" color="light" onClick={cupExport.handlePrint}>🖨 {t('common.print')}</Button>
            <Button size="xs" color="blue" onClick={cupExport.handlePDF}>{t('results.pdf')}</Button>
            <Button size="xs" color="blue" onClick={cupExport.handleCSV}>{t('results.csv')}</Button>
            <Button size="xs" color="light" onClick={cupExport.handleHTML}>{t('results.html')}</Button>
          </div>
        </div>
      </div>

      {loading && !results && <p className="text-gray-500">{t('common.loading')}</p>}
      {results && <CupDetailResults results={results} tab={tab} mode={mode} getLimitedRows={getLimitedRows} />}

      <AddCupMatchesModal
        show={showAddMatches}
        onClose={() => setShowAddMatches(false)}
        cupId={cupId}
        existingIds={detail.matches.map((match) => match.id)}
      />

      <Modal show={showEditCup} onClose={() => setShowEditCup(false)} size="md">
        <ModalHeader>{t('cups.editCup', { name: detail.name })}</ModalHeader>
        <ModalBody>
          <div className="space-y-3">
            <div>
              <Label>{t('cups.cupName')}</Label>
              <TextInput value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <p className="text-sm dark:text-white">
              {t('cups.scoringMode')}:{' '}
              <strong>{mode === 'hit_factor' ? t('cups.scoringModeHitFactor') : t('cups.scoringModePoints')}</strong>
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" color="blue" onClick={saveEditName} disabled={savingName}>
            {savingName ? t('common.loading') : t('common.save')}
          </Button>
          <Button size="sm" color="gray" onClick={() => setShowEditCup(false)}>{t('common.cancel')}</Button>
        </ModalFooter>
      </Modal>

      <Modal show={cupExport.saveModal?.open ?? false} onClose={() => cupExport.setSaveModal(null)} size="md">
        <ModalHeader>{t('results.saveAs')}</ModalHeader>
        <ModalBody>
          <TextInput
            value={cupExport.saveModal?.filename ?? ''}
            onChange={(e) => cupExport.setSaveModal({ ...cupExport.saveModal!, filename: e.target.value })}
          />
        </ModalBody>
        <ModalFooter>
          <Button size="sm" color="light" onClick={() => cupExport.setSaveModal(null)}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={cupExport.confirmSave}>{t('results.save')}</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
