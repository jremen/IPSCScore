import type { ResultTab } from '../components/results/types';

export const RESULT_TABS: { key: ResultTab; labelKey: string }[] = [
  { key: 'byDivision', labelKey: 'results.byDivision' },
  { key: 'overall', labelKey: 'results.overall' },
  { key: 'byStage', labelKey: 'results.byStage' },
  { key: 'byCategory', labelKey: 'results.byCategory' },
  { key: 'byTag', labelKey: 'results.byTag' },
];

export function visibleResultTabs(divisionsApply: boolean) {
  return divisionsApply
    ? RESULT_TABS
    : RESULT_TABS.filter((tab) => tab.key !== 'byDivision');
}

export function effectiveResultTab(tab: ResultTab, divisionsApply: boolean): ResultTab {
  return tab === 'byDivision' && !divisionsApply ? 'overall' : tab;
}

export function resultTabClass(active: boolean) {
  return `px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
    active
      ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
      : 'cursor-pointer border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
  }`;
}
