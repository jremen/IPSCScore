import { Modal, ModalHeader, ModalBody, TextInput, ModalFooter, Button, theme } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import { twMerge } from 'tailwind-merge';
import { useSquaddingModal } from '../../hooks/useSquaddingModal';
import SquadColumn from './SquadColumn';
import ShooterCard from './ShooterCard';
import AddShooterToSquadModal from './AddShooterToSquadModal';
import type { SquaddingModalProps } from './types';

export default function SquaddingModal({ show, onClose, matchId, onUpdated }: SquaddingModalProps) {
  const { t } = useTranslation();
  const {
    registrations,
    columns,
    unassigned,
    squadCount,
    effectiveSquadCount,
    addSquad,
    query,
    setQuery,
    totalShooterCount,
    addShooterSquad,
    setAddShooterSquad,
    filteredUnassigned,
    activeRegistration,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleClose,
    handleAddShooter,
    handleRemoveFromGroup,
    handleGeneratePdf,
  } = useSquaddingModal({ show, matchId, onClose, onUpdated });

  return (
    <>
      <Modal show={show} onClose={handleClose} size="full" theme={{ content: { inner: twMerge(theme.modal.content.inner, 'min-h-[70vh]') } }}>
        <ModalHeader>
          <span className="flex items-baseline gap-3">
            <span className="text-xl font-semibold text-gray-900 dark:text-white">{t('squadding.title')}</span>
            <span className="text-sm dark:text-gray-300">{t('squadding.totalCount', { count: totalShooterCount })}</span>
          </span>
        </ModalHeader>
        <ModalBody>
          {squadCount === 0 && effectiveSquadCount === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">{t('squadding.noStages')}</p>
              <button
                type="button"
                onClick={addSquad}
                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer"
              >
                + {t('squadding.addSquad', 'Squad')}
              </button>
            </div>
          ) : (
            <>
              <TextInput
                placeholder={t('squadding.searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-4 dark:[&_input]:bg-gray-800"
              />

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <div className="flex flex-1 h-auto! gap-4">
                  {unassigned.length > 0 && (
                    <div className="flex flex-col min-w-65 max-w-75 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                        <span className="font-semibold text-sm dark:text-white">{t('squadding.unassigned')}</span>
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({unassigned.length})</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-20 max-h-130">
                        {filteredUnassigned.length > 0 ? (
                          filteredUnassigned.map((r) => (
                            <ShooterCard key={r.shooter_id} registration={r} onRemoveFromGroup={handleRemoveFromGroup} />
                          ))
                        ) : (
                          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">
                            {query ? t('squadding.searchEmpty') : t('squadding.noShooters')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4">
                    {Array.from({ length: effectiveSquadCount }, (_, i) => i + 1).map((n) => (
                      <SquadColumn
                        key={n}
                        squadNumber={n}
                        shooters={columns[n] || []}
                        onAddShooter={() => setAddShooterSquad(n)}
                        onRemoveFromGroup={handleRemoveFromGroup}
                        query={query}
                      />
                    ))}
                  </div>
                </div>

                <DragOverlay>
                  {activeRegistration && <ShooterCard registration={activeRegistration} isDragging />}
                </DragOverlay>
              </DndContext>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button type="button" className="mx-auto" onClick={addSquad}>
            {t('squadding.addSquad', 'Squad')}
          </Button>
          <Button onClick={handleClose} color="gray">{t('common.close')}</Button>
          <Button onClick={handleGeneratePdf} color="blue">{t('squadding.generatePdf', 'Generate PDF')}</Button>
        </ModalFooter>
      </Modal>

      {addShooterSquad !== null && (
        <AddShooterToSquadModal
          show
          onClose={() => setAddShooterSquad(null)}
          targetSquad={addShooterSquad}
          registrations={registrations}
          onAdd={handleAddShooter}
        />
      )}
    </>
  );
}
