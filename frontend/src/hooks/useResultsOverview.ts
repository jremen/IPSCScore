import { useCallback, useEffect, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useMatchStore } from '../stores/matchStore';
import { useResultsStore } from '../stores/resultsStore';
import { getDivisionsForMatch } from '../utils/constants';
import { effectiveResultTab, visibleResultTabs } from '../utils/resultsTabs';
import type { ResultTab, ResultsOverviewProps } from '../components/results/types';

export function useResultsOverview({ matchOverride }: ResultsOverviewProps) {
  const activeMatchId = useUIStore((s) => s.activeMatchId);
  const matches = useMatchStore((s) => s.matches);
  const overallResults = useResultsStore((s) => s.overallResults);
  const dqOverall = useResultsStore((s) => s.dqOverall);
  const divisionResults = useResultsStore((s) => s.divisionResults);
  const dqDivisions = useResultsStore((s) => s.dqDivisions);
  const stageResults = useResultsStore((s) => s.stageResults);
  const categoryResults = useResultsStore((s) => s.categoryResults);
  const dqCategories = useResultsStore((s) => s.dqCategories);
  const tagResults = useResultsStore((s) => s.tagResults);
  const dqTags = useResultsStore((s) => s.dqTags);
  const loading = useResultsStore((s) => s.loading);
  const fetchOverall = useResultsStore((s) => s.fetchOverall);
  const fetchByDivision = useResultsStore((s) => s.fetchByDivision);
  const fetchByStage = useResultsStore((s) => s.fetchByStage);
  const fetchByCategory = useResultsStore((s) => s.fetchByCategory);
  const fetchByTag = useResultsStore((s) => s.fetchByTag);
  const fetchShooterStageSummaries = useResultsStore((s) => s.fetchShooterStageSummaries);
  const shooterSummary = useResultsStore((s) => s.shooterSummary);
  const shooterSummaryLoading = useResultsStore((s) => s.shooterSummaryLoading);
  const clearShooterSummary = useResultsStore((s) => s.clearShooterSummary);

  const [activeTab, setActiveTab] = useState<ResultTab>('byDivision');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);

  const activeMatch = matches?.find((match) => match.id === activeMatchId) ?? matchOverride ?? undefined;
  const divisionsApply = activeMatch ? getDivisionsForMatch(activeMatch).length > 0 : true;
  const visibleTabs = visibleResultTabs(divisionsApply);
  const effectiveTab = effectiveResultTab(activeTab, divisionsApply);

  useEffect(() => {
    if (!divisionsApply && activeTab === 'byDivision') setActiveTab('overall');
  }, [divisionsApply, activeTab]);

  useEffect(() => {
    if (!activeMatchId) return;
    fetchOverall(activeMatchId);
    fetchByDivision(activeMatchId);
    fetchByStage(activeMatchId);
    fetchByCategory(activeMatchId);
    fetchByTag(activeMatchId);
  }, [activeMatchId, fetchOverall, fetchByDivision, fetchByStage, fetchByCategory, fetchByTag]);

  const handleShooterClick = useCallback((registrationId: string) => {
    if (!activeMatchId) return;
    setSelectedRegistrationId(registrationId);
    fetchShooterStageSummaries(activeMatchId, registrationId);
  }, [activeMatchId, fetchShooterStageSummaries]);

  const handleCloseSummary = useCallback(() => {
    setSelectedRegistrationId(null);
    clearShooterSummary();
  }, [clearShooterSummary]);

  return {
    activeMatchId,
    activeMatch,
    activeTab,
    setActiveTab,
    effectiveTab,
    visibleTabs,
    divisionsApply,
    selectedRegistrationId,
    loading,
    overallResults,
    dqOverall,
    divisionResults,
    dqDivisions,
    stageResults,
    categoryResults,
    dqCategories,
    tagResults,
    dqTags,
    shooterSummary,
    shooterSummaryLoading,
    handleShooterClick,
    handleCloseSummary,
  };
}
