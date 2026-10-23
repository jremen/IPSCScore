import { Button, Table, TableHead, TableBody, TableRow, TableHeadCell, TextInput, ToggleSwitch } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import CSVImportExport from '../shared/CSVImportExport';
import BulkActionToolbar from '../shared/BulkActionToolbar';
import SelectAllCheckbox from '../shared/SelectAllCheckbox';
import ShooterFormModal from './ShooterFormModal';
import DeleteShooterModal from './DeleteShooterModal';
import BulkDeleteShootersModal from './BulkDeleteShootersModal';
import BulkEditShootersModal from './BulkEditShootersModal';
import ShooterRow from './ShooterRow';
import { useShooterDatabaseView } from '../../hooks/useShooterDatabaseView';

export default function ShooterDatabase() {
  const { t } = useTranslation();
  const {
    shooters,
    total,
    loading,
    showDeleted,
    toggleShowDeleted,
    fetchShooters,
    search,
    setSearch,
    searchRef,
    selection,
    selectedNames,
    showCreate,
    setShowCreate,
    editShooter,
    setEditShooter,
    showBulkDelete,
    setShowBulkDelete,
    showBulkEdit,
    setShowBulkEdit,
    shooterToDelete,
    setShooterToDelete,
    handleDeleteClick,
    handleDeleted,
    handleRestore,
    handleCloseModal,
    handleBulkDeleted,
    handleBulkEdited,
  } = useShooterDatabaseView();

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="sticky top-4 pb-4 before:bg-gray-200 eink:before:bg-white dark:before:bg-gray-900 before:absolute before:h-4 before:w-full before:-top-4 bg-gray-200 dark:bg-gray-900 z-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-bold dark:text-white">{t('shooters.title')} ({total})</h2>
          <div className="flex gap-2">
            <CSVImportExport type="shooters" onImportComplete={fetchShooters} />
            <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('shooters.newShooter')}</Button>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-2">
          <TextInput
            ref={searchRef}
            placeholder={t('shooters.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
          <ToggleSwitch checked={showDeleted} onChange={toggleShowDeleted} label={t('shooters.showDeleted')} />
        </div>

        <BulkActionToolbar
          selectedCount={selection.selectedCount}
          onEdit={() => setShowBulkEdit(true)}
          onDelete={() => setShowBulkDelete(true)}
          onClearSelection={selection.clearSelection}
        />
      </div>

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeadCell className="w-10">
                <SelectAllCheckbox
                  allSelected={selection.allSelected}
                  someSelected={selection.someSelected}
                  onToggle={selection.allSelected ? selection.deselectAll : selection.selectAll}
                  selectedCount={selection.selectedCount}
                  totalCount={shooters.length}
                />
              </TableHeadCell>
              <TableHeadCell>{t('common.name')}</TableHeadCell>
              <TableHeadCell>{t('shooters.category')}</TableHeadCell>
              <TableHeadCell>{t('shooters.division')}</TableHeadCell>
              <TableHeadCell>PF</TableHeadCell>
              <TableHeadCell>{t('shooters.region')}</TableHeadCell>
              <TableHeadCell>{t('shooters.tag')}</TableHeadCell>
              <TableHeadCell>{t('common.actions')}</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shooters.map((shooter) => (
              <ShooterRow
                key={shooter.id}
                shooter={shooter}
                selected={selection.isSelected(shooter.id)}
                onToggle={selection.toggle}
                onEdit={setEditShooter}
                onDelete={handleDeleteClick}
                onRestore={handleRestore}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {!loading && shooters.length === 0 && (
        <p className="text-center text-gray-500 mt-8">{t('shooters.empty')}</p>
      )}

      <ShooterFormModal show={showCreate || Boolean(editShooter)} onClose={handleCloseModal} editShooter={editShooter} />
      <DeleteShooterModal
        show={Boolean(shooterToDelete)}
        onClose={() => setShooterToDelete(null)}
        shooter={shooterToDelete}
        onDeleted={handleDeleted}
      />
      <BulkDeleteShootersModal
        show={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        shooterIds={selection.selectedArray}
        shooterNames={selectedNames}
        onDeleted={handleBulkDeleted}
      />
      <BulkEditShootersModal
        show={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        selectedIds={selection.selectedArray}
        onSaved={handleBulkEdited}
      />
    </div>
  );
}
