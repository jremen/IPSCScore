import { Button, TextInput, Select, Label } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { CATEGORIES } from '../../utils/constants';
import CSVImportExport from '../shared/CSVImportExport';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import RegistrationTable from './RegistrationTable';
import AddShooterModal from './AddShooterModal';
import CreateShooterModal from './CreateShooterModal';
import EditRegistrationModal from './EditRegistrationModal';
import BulkEditRegistrationsModal from './BulkEditRegistrationsModal';
import BulkRemoveRegistrationsModal from './BulkRemoveRegistrationsModal';
import SquaddingModal from './SquaddingModal';
import { useMatchRegistrationView } from '../../hooks/useMatchRegistrationView';

export default function MatchRegistration() {
  const { t } = useTranslation();
  const {
    activeMatchId,
    registrations,
    divisions,
    search,
    setSearch,
    divisionFilter,
    setDivisionFilter,
    categoryFilter,
    setCategoryFilter,
    filtered,
    hasActiveFilters,
    clearFilters,
    selection,
    selectedCount,
    selectedHasGroup,
    selectedNames,
    filteredIds,
    loadRegistrations,
    handleRemove,
    handleBulkAction,
    handleBulkGroup,
    handleUngroupSelected,
    handleUngroupSingle,
    handleDragToGroup,
    showAdd,
    setShowAdd,
    showInlineCreate,
    setShowInlineCreate,
    editRegistration,
    setEditRegistration,
    showBulkEdit,
    setShowBulkEdit,
    showBulkRemove,
    setShowBulkRemove,
    showSquadding,
    setShowSquadding,
  } = useMatchRegistrationView();

  if (!activeMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('offline.noCachedData')}</p>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="sticky top-4 before:bg-gray-200 eink:before:bg-white pb-4 dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">
            {t('registration.title')} ({registrations.length})
            {hasActiveFilters && filtered.length !== registrations.length && (
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                {t('registration.showingOf', { shown: filtered.length, total: registrations.length })}
              </span>
            )}
          </h2>
          <div className="flex gap-2">
            <CSVImportExport type="registrations" matchId={activeMatchId} onImportComplete={loadRegistrations} />
            <Button size="sm" color="purple" onClick={() => setShowSquadding(true)}>{t('squadding.title')}</Button>
            <Button size="sm" color="green" onClick={() => setShowInlineCreate(true)}>{t('shooters.newShooter')}</Button>
            <Button size="sm" color="blue" onClick={() => setShowAdd(true)}>{t('registration.addShooter')}</Button>
          </div>
        </div>

        <BulkActionToolbar
          selectedCount={selectedCount}
          onEdit={() => setShowBulkEdit(true)}
          onDelete={() => setShowBulkRemove(true)}
          onClearSelection={selection.clearSelection}
          editLabel={t('bulkActions.editSelected')}
          deleteLabel={t('bulkActions.removeSelected')}
          onGroup={handleBulkGroup}
          onUngroup={handleUngroupSelected}
          showGroup={selectedCount >= 2}
          showUngroup={selectedHasGroup}
        />
      </div>

      {registrations.length > 0 && (
        <div className="flex flex-wrap items-end gap-3 mb-3">
          <div className="flex-1 min-w-50">
            <Label htmlFor="reg-search">{t('common.name')}</Label>
            <TextInput
              id="reg-search"
              placeholder={t('registration.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {divisions.length > 0 && (
            <div className="min-w-45">
              <Label htmlFor="reg-div">{t('shooters.division')}</Label>
              <Select
                id="reg-div"
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
              >
                <option value="">{t('registration.allDivisions')}</option>
                {divisions.map((division) => (
                  <option key={division.value} value={division.value}>{division.label}</option>
                ))}
              </Select>
            </div>
          )}
          <div className="min-w-45">
            <Label htmlFor="reg-cat">{t('shooters.category')}</Label>
            <Select
              id="reg-cat"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">{t('registration.allCategories')}</option>
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>{t(category.i18nKey)}</option>
              ))}
            </Select>
          </div>
          {hasActiveFilters && (
            <Button size="sm" color="gray" onClick={clearFilters}>{t('registration.clearFilters')}</Button>
          )}
        </div>
      )}

      {registrations.length > 0 ? (
        filtered.length > 0 ? (
          <RegistrationTable
            registrations={filtered}
            totalCount={filteredIds.length}
            selection={selection}
            onEdit={setEditRegistration}
            onRemove={handleRemove}
            onUngroup={handleUngroupSingle}
            onDragToGroup={handleDragToGroup}
            showDivision={divisions.length > 0}
          />
        ) : (
          <p className="text-center text-gray-500 mt-8">{t('registration.searchEmpty')}</p>
        )
      ) : (
        <p className="text-center text-gray-500 mt-8">{t('registration.empty')}</p>
      )}

      <AddShooterModal
        show={showAdd}
        onClose={() => setShowAdd(false)}
        onCreate={() => setShowInlineCreate(true)}
        matchId={activeMatchId}
        registeredShooterIds={registrations.map((registration) => registration.shooter_id)}
        onAdded={loadRegistrations}
      />
      <CreateShooterModal
        show={showInlineCreate}
        onClose={() => setShowInlineCreate(false)}
        matchId={activeMatchId}
        onCreated={loadRegistrations}
      />
      <EditRegistrationModal
        show={Boolean(editRegistration)}
        onClose={() => setEditRegistration(null)}
        registration={editRegistration}
        matchId={activeMatchId}
        onSaved={loadRegistrations}
      />
      <BulkEditRegistrationsModal
        show={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        selectedIds={selection.selectedArray}
        matchId={activeMatchId}
        onSaved={handleBulkAction}
      />
      <BulkRemoveRegistrationsModal
        show={showBulkRemove}
        onClose={() => setShowBulkRemove(false)}
        registrationIds={selection.selectedArray}
        registrationNames={selectedNames}
        matchId={activeMatchId}
        onRemoved={handleBulkAction}
      />
      <SquaddingModal
        show={showSquadding}
        onClose={() => setShowSquadding(false)}
        matchId={activeMatchId}
        onUpdated={loadRegistrations}
      />
    </div>
  );
}
