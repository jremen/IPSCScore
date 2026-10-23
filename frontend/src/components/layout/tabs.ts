import type { TabId } from '../../stores/uiStore';

export const APP_TABS: { id: TabId; labelKey: string; icon: string }[] = [
  { id: 'matches', labelKey: 'tabs.matches', icon: '🏅' },
  { id: 'stages', labelKey: 'tabs.stages', icon: '🎯' },
  { id: 'shooters', labelKey: 'tabs.shooters', icon: '👤' },
  { id: 'registration', labelKey: 'tabs.registration', icon: '📋' },
  { id: 'scoring', labelKey: 'tabs.scoring', icon: '📊' },
  { id: 'results', labelKey: 'tabs.results', icon: '🥇' },
  { id: 'cups', labelKey: 'tabs.cups', icon: '🏆' },
];
