import { Button, Badge, TextInput, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell, Checkbox, Select, Label, Datepicker, theme } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { formatDate, FIREARM_TYPES, MATCH_LEVELS } from '../../utils/constants';
import MatchDetail from './MatchDetail';
import DeleteMatchModal from './DeleteMatchModal';
import CreateMatchModal from './CreateMatchModal';
import ImportMatchModal from './ImportMatchModal';
import ExportMatchModal from './ExportMatchModal';
import BulkDeleteMatchesModal from './BulkDeleteMatchesModal';
import CreateCupModal from '../cup/CreateCupModal';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import { TbFileExport, TbFileUpload } from 'react-icons/tb';
import { twMerge } from 'tailwind-merge';
import { useMatchListView } from '../../hooks/useMatchListView';

export default function MatchList() {
  const { t } = useTranslation();
  const {
    matches,
    loading,
    fetchMatches,
    activeMatchId,
    setActiveMatch,
    exporting,
    filters,
    searchRef,
    filteredMatches,
    selection,
    selectedNames,
    showCreate,
    setShowCreate,
    showImport,
    setShowImport,
    showExport,
    setShowExport,
    deleteTarget,
    setDeleteTarget,
    showBulkDelete,
    setShowBulkDelete,
    showCreateCup,
    setShowCreateCup,
    handleSearchChange,
    handleFirearmTypeChange,
    handleLevelChange,
    handleDateFromPickerChange,
    handleDateToPickerChange,
    handleToggleCurrent,
    handleCreateCupClose,
    handleBulkDeleted,
  } = useMatchListView();

  if (activeMatchId) return <MatchDetail />;

  return (
    <div className="p-4 mx-auto">
      <div className="sticky top-4 before:bg-gray-200 eink:before:bg-white pb-4 dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('matches.count', { count: matches.length })}</h2>
          <div className="flex gap-2">
            <Button size="sm" color="light" onClick={() => setShowImport(true)}>
              <TbFileUpload className="mr-2" /> {t('matches.importMatch')}
            </Button>
            <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('matches.newMatch')}</Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-2 flex-wrap">
          <div className="flex-1">
            <Label htmlFor="reg-search">{t('common.name')}</Label>
            <TextInput
              ref={searchRef}
              placeholder={t('matches.searchMatches')}
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 min-w-50"
            />
          </div>
          <div>
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterFirearmType')}:</Label>
            <Select
              value={filters.firearmType}
              onChange={(e) => handleFirearmTypeChange(e.target.value as typeof filters.firearmType)}
              className="w-36"
            >
              <option value="">{t('matches.allFirearmTypes')}</option>
              {FIREARM_TYPES.map((firearm) => (
                <option key={firearm.value} value={firearm.value}>{t(firearm.i18nKey)}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterLevel')}</Label>
            <Select
              value={String(filters.level)}
              onChange={(e) => handleLevelChange(e.target.value === '' ? '' : (Number(e.target.value) as typeof filters.level))}
              className="w-36"
            >
              <option value="">{t('matches.allLevels')}</option>
              {MATCH_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>{level.label}</option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col">
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterDateFrom')}</Label>
            <Datepicker
              className="mt-0.5"
              value={filters.dateFrom ? new Date(filters.dateFrom) : null}
              onChange={handleDateFromPickerChange}
              placeholder={t('matches.filterDateFrom')}
            />
          </div>
          <div className="flex flex-col">
            <Label className="text-sm text-gray-500 whitespace-nowrap">{t('matches.filterDateTo')}</Label>
            <Datepicker
              className="mt-0.5"
              value={filters.dateTo ? new Date(filters.dateTo) : null}
              onChange={handleDateToPickerChange}
              placeholder={t('matches.filterDateTo')}
              theme={{ popup: { root: { base: twMerge(theme.datepicker.popup.root.base, 'right-0') } } }}
            />
          </div>
        </div>

        <BulkActionToolbar
          selectedCount={selection.selectedCount}
          onCreate={() => setShowCreateCup(true)}
          onDelete={() => setShowBulkDelete(true)}
          onClearSelection={selection.clearSelection}
        />
      </div>

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      {filteredMatches.length > 0 ? (
        <div className="overflow-x-auto w-full rounded-lg border border-gray-200 dark:border-gray-700">
          <Table striped hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell className="w-10">
                  <SelectAllCheckbox
                    allSelected={selection.allSelected}
                    someSelected={selection.someSelected}
                    onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                    selectedCount={selection.selectedCount}
                    totalCount={filteredMatches.length}
                  />
                </TableHeadCell>
                <TableHeadCell>{t('matches.name')}</TableHeadCell>
                <TableHeadCell>{t('matches.date')}</TableHeadCell>
                <TableHeadCell>{t('matches.organization')}</TableHeadCell>
                <TableHeadCell>{t('matches.firearm')}</TableHeadCell>
                <TableHeadCell>{t('matches.level')}</TableHeadCell>
                <TableHeadCell>{t('matches.shooters')}</TableHeadCell>
                <TableHeadCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredMatches.map((match) => (
                <TableRow
                  key={match.id}
                  className={`cursor-pointer group ${selection.isSelected(match.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  onClick={() => setActiveMatch(match.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      className="size-5 cursor-pointer"
                      checked={selection.isSelected(match.id)}
                      onChange={() => selection.toggle(match.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium dark:text-white whitespace-nowrap">{match.name}</TableCell>
                  <TableCell>{formatDate(match.date)}</TableCell>
                  <TableCell>
                    <Badge color={match.organization === 'IPSC' ? 'info' : 'purple'} size="sm">{match.organization}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge color="gray" size="sm">{t(`firearmTypes.${match.firearm_type}`)}</Badge>
                  </TableCell>
                  <TableCell>
                    {match.match_level ? <Badge color="indigo" size="sm">{t('matches.levelBadge', { level: match.match_level })}</Badge> : '—'}
                  </TableCell>
                  <TableCell>{(match as any).shooter_count ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="xs"
                        color={match.is_current ? 'green' : 'gray'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleCurrent(match);
                        }}
                      >
                        {match.is_current ? `● ${t('matches.current')}` : t('matches.setAsCurrent')}
                      </Button>
                      <Button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(match.id); }}
                        size="xs"
                        color="red"
                      >
                        {t('matches.deleteMatch')}
                      </Button>
                      <Button
                        size="xs"
                        color="light"
                        title={t('matches.exportMatch')}
                        disabled={exporting}
                        onClick={(e) => { e.stopPropagation(); setShowExport(match.id); }}
                      >
                        <TbFileExport />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !loading && <p className="text-center text-gray-500 mt-8">{t('matches.empty')}</p>
      )}

      <DeleteMatchModal show={deleteTarget !== null} onClose={() => setDeleteTarget(null)} matchId={deleteTarget} />
      <CreateMatchModal show={showCreate} onClose={() => setShowCreate(false)} />
      <ImportMatchModal show={showImport} onClose={() => setShowImport(false)} onImported={fetchMatches} />
      {showExport && (
        <ExportMatchModal
          show
          onClose={() => setShowExport(null)}
          matchId={showExport}
          matchName={matches.find((match) => match.id === showExport)?.name || ''}
        />
      )}
      <BulkDeleteMatchesModal
        show={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        matchIds={selection.selectedArray}
        matchNames={selectedNames}
        onDeleted={handleBulkDeleted}
      />
      <CreateCupModal
        show={showCreateCup}
        onClose={handleCreateCupClose}
        preselectedMatchIds={selection.selectedArray}
      />
    </div>
  );
}
