import { useEffect, useState } from 'react';
import { Button, Badge, TextInput, Label, Modal, ModalHeader, ModalBody, ModalFooter, Checkbox } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useCupStore } from '../../stores/cupStore';
import { useUIStore } from '../../stores/uiStore';
import { CATEGORIES, categoryLabel, divisionLabel, formatDate } from '../../utils/constants';
import { useEscClose } from '../../hooks/useEscClose';
import ResultsTable, { type ColumnKey } from '../results/ResultsTable';
import { TbArrowBack, TbPlus, TbTrash, TbPencil } from 'react-icons/tb';
import useCupExport, { type CupTab } from '../../hooks/useCupExport';
import { MatchPicker } from './CreateCupModal';

const CUP_TABS: { key: CupTab; labelKey: string }[] = [
  { key: 'byDivision', labelKey: 'results.byDivision' },
  { key: 'overall', labelKey: 'results.overall' },
  { key: 'byCategory', labelKey: 'results.byCategory' },
  { key: 'byTag', labelKey: 'results.byTag' },
];

function columnsFor(tab: CupTab, mode: 'hit_factor' | 'points'): ColumnKey[] {
  const withDivision = tab === 'overall';
  const base: ColumnKey[] = ['position', 'shooter'];
  if (withDivision) base.push('division');
  base.push('matches', 'time', 'alpha', 'charlie', 'delta', 'miss', 'noShootHits', 'procedurals', 'matchPercent');
  base.push(mode === 'hit_factor' ? 'hitFactor' : 'matchPoints');
  return base;
}

function AddCupMatchesModal({ show, onClose, cupId, existingIds }: { show: boolean; onClose: () => void; cupId: string; existingIds: string[] }) {
  const { t } = useTranslation();
  const addMatches = useCupStore((s) => s.addMatches);
  const addToast = useUIStore((s) => s.addToast);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  useEscClose(onClose);

  useEffect(() => {
    if (show) setSelected(new Set());
  }, [show]);

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      await addMatches(cupId, Array.from(selected));
      addToast(t('cups.matchesAdded'), 'success');
      onClose();
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal show={show} onClose={onClose} size="lg">
      <ModalHeader>{t('cups.addMatches')}</ModalHeader>
      <ModalBody>
        <p className="text-sm text-gray-500 mb-2">{t('cups.addMatchesHint')}</p>
        <MatchPicker selected={selected} onToggle={(id) => setSelected((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        })} excludeIds={new Set(existingIds)} />
      </ModalBody>
      <ModalFooter>
        <Button size="sm" color="green" onClick={handleSave} disabled={saving || selected.size === 0}>
          {saving ? t('common.loading') : t('cups.addMatches')}
        </Button>
        <Button size="sm" color="gray" onClick={onClose}>{t('common.cancel')}</Button>
      </ModalFooter>
    </Modal>
  );
}

export default function CupDetail({ cupId, onBack }: { cupId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const detail = useCupStore((s) => s.detail);
  const results = useCupStore((s) => s.results);
  const loading = useCupStore((s) => s.loading);
  const fetchCup = useCupStore((s) => s.fetchCup);
  const fetchCupResults = useCupStore((s) => s.fetchCupResults);
  const updateCup = useCupStore((s) => s.updateCup);
  const removeMatch = useCupStore((s) => s.removeMatch);
  const addToast = useUIStore((s) => s.addToast);

  const [tab, setTab] = useState<CupTab>('byDivision');
  const [minInput, setMinInput] = useState('');
  const [savingMin, setSavingMin] = useState(false);
  const [minPartInput, setMinPartInput] = useState('');
  const [savingMinPart, setSavingMinPart] = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [savingCats, setSavingCats] = useState(false);
  const [showEditCup, setShowEditCup] = useState(false);
  const [editName, setEditName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [showAddMatches, setShowAddMatches] = useState(false);
  const [showMinError, setShowMinError] = useState(false);
  const [showMinPartError, setShowMinPartError] = useState(false);

  const cupExport = useCupExport(tab);

  useEffect(() => { fetchCup(cupId); fetchCupResults(cupId); }, [cupId, fetchCup, fetchCupResults]);

  useEffect(() => {
    if (!detail) return;
    setMinInput(detail.minimum_matches != null ? String(detail.minimum_matches) : '');
    setMinPartInput(detail.minimum_participants != null ? String(detail.minimum_participants) : '');
    setSelectedCats(detail.selected_categories ?? []);
  }, [detail]);

  if (!detail) {
    return (
      <div className="p-4">
        <Button size="xs" color="light" onClick={onBack}><TbArrowBack className="mr-1.5" /> {t('common.back')}</Button>
        {loading ? <p className="text-gray-500 mt-4">{t('common.loading')}</p> : <p className="text-gray-500 mt-4">{t('cups.empty')}</p>}
      </div>
    );
  }

  const mode = results?.scoring_mode ?? detail.scoring_mode;
  const matchCount = results?.matches?.length ?? detail.matches.length;
  const autoMin = Math.floor(matchCount / 2) + 1;
  const required = results?.minimum_matches ?? detail.minimum_matches ?? autoMin;
  const requiredParticipants = results?.minimum_participants ?? detail.minimum_participants;
  const columns = columnsFor(tab, mode);

  const saveMinimum = async () => {
    setShowMinError(false);
    const parsed = Number(minInput);
    if (minInput !== '' && (!Number.isInteger(parsed) || parsed < 1)) {
      setShowMinError(true);
      return;
    }
    setSavingMin(true);
    try {
      await updateCup(cupId, { minimum_matches: minInput === '' ? null : parsed });
      addToast(t('cups.updated'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingMin(false);
    }
  };

  const saveMinimumParticipants = async () => {
    setShowMinPartError(false);
    const parsed = Number(minPartInput);
    if (minPartInput !== '' && (!Number.isInteger(parsed) || parsed < 1)) {
      setShowMinPartError(true);
      return;
    }
    setSavingMinPart(true);
    try {
      await updateCup(cupId, { minimum_participants: minPartInput === '' ? null : parsed });
      addToast(t('cups.updated'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingMinPart(false);
    }
  };

  const toggleCategory = (value: string) => {
    setSelectedCats((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]);
  };

  const saveCategories = async () => {
    setSavingCats(true);
    try {
      await updateCup(cupId, { selected_categories: selectedCats.length > 0 ? selectedCats : null });
      addToast(t('cups.updated'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingCats(false);
    }
  };

  const saveEditName = async () => {
    if (!editName.trim()) {
      addToast(t('cups.nameRequired'), 'error');
      return;
    }
    setSavingName(true);
    try {
      await updateCup(cupId, { name: editName.trim() });
      addToast(t('cups.updated'), 'success');
      setShowEditCup(false);
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    } finally {
      setSavingName(false);
    }
  };

  const handleRemoveMatch = async (matchId: string) => {
    try {
      await removeMatch(cupId, matchId);
      addToast(t('cups.matchRemoved'), 'success');
    } catch (err: any) {
      addToast(err.message || t('common.unknownError'), 'error');
    }
  };

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
        <Button size="xs" color="light" onClick={() => { setEditName(detail.name); setShowEditCup(true); }}><TbPencil className="mr-1.5" /> {t('common.edit')}</Button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <div>
          <Label>{t('cups.minimumMatches')}</Label>
          <div className="flex gap-2 items-center">
            <TextInput
              type="number" min={1} className="w-28"
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
              type="number" min={1} className="w-28"
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
            {CATEGORIES.filter((c) => c.value !== 'regular').map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  className="size-4"
                  checked={selectedCats.includes(c.value)}
                  onChange={() => toggleCategory(c.value)}
                />
                <span className="dark:text-white">{t(c.i18nKey)}</span>
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
            {detail.matches.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-sm">
                <span className="dark:text-white">{m.name}</span>
                <span className="text-gray-500 text-xs">{formatDate(m.date)}</span>
                <Button size="xs" color="red" className="ml-auto" onClick={() => handleRemoveMatch(m.id)}>
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
        <div className="flex gap-1 overflow-x-auto">
          {CUP_TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap ${
                tab === tb.key
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              {t(tb.labelKey)}
            </button>
          ))}
        </div>
        <div className="flex gap-2 no-print">
          <Button size="xs" color="light" onClick={cupExport.handlePrint}>🖨 {t('common.print')}</Button>
          <Button size="xs" color="blue" onClick={cupExport.handlePDF}>{t('results.pdf')}</Button>
          <Button size="xs" color="blue" onClick={cupExport.handleCSV}>{t('results.csv')}</Button>
          <Button size="xs" color="light" onClick={cupExport.handleHTML}>{t('results.html')}</Button>
        </div>
      </div>

      {loading && !results && <p className="text-gray-500">{t('common.loading')}</p>}

      {results && results.matches.length === 0 && (
        <p className="text-gray-500 mt-4">{t('cups.noMatches')}</p>
      )}

      {results && results.matches.length > 0 && tab === 'byDivision' && (
        <div>
          {Object.entries(results.results.byDivision)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([division, rows]) => (
              <div key={division} className="mb-6">
                <h3 className="font-semibold text-lg mb-2 dark:text-white">{divisionLabel(division)}</h3>
                <ResultsTable results={rows} columns={columns} />
              </div>
            ))}
          {Object.keys(results.results.byDivision).length === 0 && (
            <p className="text-gray-500 mt-4">{t('cups.noQualified')}</p>
          )}
        </div>
      )}

      {results && results.matches.length > 0 && tab === 'overall' && (
        <div>
          <ResultsTable results={results.results.overall} columns={columns} />
        </div>
      )}

      {results && results.matches.length > 0 && tab === 'byCategory' && (
        <div>
          {Object.entries(results.results.byCategory)
            .filter(([cat]) => cat !== 'regular')
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, divisions]) => (
              <div key={cat} className="mb-6">
                <h3 className="font-semibold text-lg mb-2 dark:text-white">{categoryLabel(cat)}</h3>
                {Object.entries(divisions)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([division, rows]) => (
                    <div key={division} className="mb-4 ml-2">
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                      <ResultsTable results={rows} columns={columns} />
                    </div>
                  ))}
              </div>
            ))}
        </div>
      )}

      {results && results.matches.length > 0 && tab === 'byTag' && (
        <div>
          {Object.entries(results.results.byTag)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([tag, divisions]) => (
              <div key={tag} className="mb-6">
                <h3 className="font-semibold text-lg mb-2 dark:text-white">{t('results.tag', { tag })}</h3>
                {Object.entries(divisions)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([division, rows]) => (
                    <div key={division} className="mb-4 ml-2">
                      <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-1">{divisionLabel(division)}</h4>
                      <ResultsTable results={rows} columns={columns} />
                    </div>
                  ))}
              </div>
            ))}
          {Object.keys(results.results.byTag).length === 0 && (
            <p className="text-gray-500 mt-4">{t('cups.noTags')}</p>
          )}
        </div>
      )}

      {/* Add matches */}
      <AddCupMatchesModal
        show={showAddMatches}
        onClose={() => setShowAddMatches(false)}
        cupId={cupId}
        existingIds={detail.matches.map((m) => m.id)}
      />

      {/* Edit cup modal — name + read-only scoring info */}
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

      {/* Save-as modal (falls back when native picker unavailable) */}
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