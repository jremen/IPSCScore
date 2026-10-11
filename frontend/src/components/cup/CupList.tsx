import { useEffect, useState } from 'react';
import { Button, Badge, Table, TableHead, TableBody, TableRow, TableCell, TableHeadCell } from 'flowbite-react';
import { useTranslation } from 'react-i18next';
import { useCupStore } from '../../stores/cupStore';
import { TbPlus, TbCup, TbTrash } from 'react-icons/tb';
import CupDetail from './CupDetail';
import CreateCupModal from './CreateCupModal';
import DeleteCupModal from './DeleteCupModal';

export default function CupList() {
  const { t } = useTranslation();
  const cups = useCupStore((s) => s.cups);
  const loading = useCupStore((s) => s.loading);
  const fetchCups = useCupStore((s) => s.fetchCups);
  const clearDetail = useCupStore((s) => s.clearDetail);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [activeCupId, setActiveCupId] = useState<string | null>(null);

  useEffect(() => { fetchCups(); }, [fetchCups]);

  if (activeCupId) {
    return <CupDetail cupId={activeCupId} onBack={() => { setActiveCupId(null); clearDetail(); }} />;
  }

  return (
    <div className="p-4 mx-auto">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold dark:text-white">
          {t('tabs.cups')} <Badge color="gray" size="sm" className="ml-1 inline">{cups.length}</Badge>
        </h2>
        <Button size="sm" color="green" onClick={() => setShowCreate(true)}>
          <TbPlus className="mr-2" /> {t('cups.newCup')}
        </Button>
      </div>

      {loading && <p className="text-gray-500">{t('common.loading')}</p>}

      {cups.length > 0 ? (
        <div className="overflow-x-auto w-full rounded-lg border border-gray-200 dark:border-gray-700">
          <Table striped hoverable>
            <TableHead>
              <TableRow>
                <TableHeadCell>{t('cups.cupName')}</TableHeadCell>
                <TableHeadCell>{t('cups.scoringMode')}</TableHeadCell>
                <TableHeadCell>{t('cups.matches')}</TableHeadCell>
                <TableHeadCell>{t('cups.minimumMatches')}</TableHeadCell>
                <TableHeadCell>{t('cups.minimumParticipants')}</TableHeadCell>
                <TableHeadCell></TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cups.map((cup) => (
                <TableRow key={cup.id} className="cursor-pointer" onClick={() => setActiveCupId(cup.id)}>
                  <TableCell className="font-medium dark:text-white whitespace-nowrap">
                    <TbCup className="inline mr-1.5 text-purple-500" />
                    {cup.name}
                  </TableCell>
                  <TableCell>
                    <Badge color={cup.scoring_mode === 'hit_factor' ? 'info' : 'purple'} size="sm">
                      {cup.scoring_mode === 'hit_factor' ? t('cups.scoringModeHitFactor') : t('cups.scoringModePoints')}
                    </Badge>
                  </TableCell>
                  <TableCell>{cup.match_count}</TableCell>
                  <TableCell>
                    {cup.minimum_matches ??
                      t('cups.minimumMatchesAuto', { n: Math.floor(cup.match_count / 2) + 1 })}
                  </TableCell>
                  <TableCell>{cup.minimum_participants ?? '—'}</TableCell>
                  <TableCell>
                    <Button
                      size="xs"
                      color="red"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(cup.id); }}
                    >
                      <TbTrash />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        !loading && <p className="text-center text-gray-500 mt-8">{t('cups.empty')}</p>
      )}

      <CreateCupModal show={showCreate} onClose={() => setShowCreate(false)} onCreated={() => setActiveCupId(null)} />
      <DeleteCupModal show={deleteTarget !== null} onClose={() => setDeleteTarget(null)} cupId={deleteTarget} />
    </div>
  );
}