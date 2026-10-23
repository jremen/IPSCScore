import { Alert, Button } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import StageFormModal from './StageFormModal';
import PrintScoreSheetButton from './PrintScoreSheetButton';
import StageCard from './StageCard';
import { useStageListView } from '../../hooks/useStageListView';

export default function StageList() {
  const { t } = useTranslation();
  const {
    stages,
    loading,
    error,
    activeMatchId,
    showCreate,
    setShowCreate,
    editStage,
    setEditStage,
    handleDelete,
    handleCloseModal,
  } = useStageListView();

  if (!activeMatchId) {
    return <p className="p-4 text-gray-500 text-center">{t('stages.noMatch')}</p>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold dark:text-white">{t('stages.title')}</h2>
        <div className="flex gap-2">
          <PrintScoreSheetButton stages={stages} />
          <Button size="sm" color="green" onClick={() => setShowCreate(true)}>{t('stages.addStage')}</Button>
        </div>
      </div>

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      <div className="space-y-3">
        {stages.map((stage) => (
          <StageCard key={stage.id} stage={stage} onEdit={setEditStage} onDelete={handleDelete} />
        ))}
      </div>

      {!loading && stages.length === 0 && (
        <p className="text-center text-gray-500 mt-8">{error || t('stages.empty')}</p>
      )}

      {!loading && stages.length === 0 && error && (
        <Alert color="warning" className="mt-4">{t('offline.noCachedStages')}</Alert>
      )}

      <StageFormModal show={showCreate} onClose={handleCloseModal} matchId={activeMatchId} />
      <StageFormModal show={Boolean(editStage)} onClose={handleCloseModal} editStage={editStage} matchId={activeMatchId} />
    </div>
  );
}
