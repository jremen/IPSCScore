const SCROLL_THRESHOLD_PX = 8;

const COLOR_MAP: Record<string, { bg: string; ring: string; text: string; activeBg: string }> = {
  green: { bg: 'bg-green-50 dark:bg-green-900/30', ring: 'ring-green-400', text: 'text-green-700 dark:text-green-300', activeBg: 'active:bg-green-200 dark:active:bg-green-800' },
  yellow: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', ring: 'ring-yellow-400', text: 'text-yellow-700 dark:text-yellow-300', activeBg: 'active:bg-yellow-200 dark:active:bg-yellow-800' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/30', ring: 'ring-orange-400', text: 'text-orange-700 dark:text-orange-300', activeBg: 'active:bg-orange-200 dark:active:bg-orange-800' },
  red: { bg: 'bg-red-50 dark:bg-red-900/30', ring: 'ring-red-400', text: 'text-red-700 dark:text-red-300', activeBg: 'active:bg-red-200 dark:active:bg-red-800' },
  gray: { bg: 'bg-gray-50 dark:bg-gray-700/50', ring: 'ring-gray-400', text: 'text-gray-700 dark:text-gray-300', activeBg: 'active:bg-gray-200 dark:active:bg-gray-600' },
};

export function getHitCellClasses(color: string, value: number, disabled?: boolean): string {
  const palette = COLOR_MAP[color] || COLOR_MAP.gray;
  const hasValue = value > 0;
  return `
    w-11 h-11 rounded-lg flex items-center justify-center font-mono text-xl font-bold
    transition-all select-none touch-manipulation
    ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
    ${palette.bg} ${palette.text} ${disabled ? '' : palette.activeBg}
    ${hasValue ? `ring-2 ${palette.ring} eink:ring-black!` : 'ring-1 ring-gray-200 dark:ring-gray-600'}
    ${hasValue ? 'eink:bg-black! eink:text-white!' : ''}
  `;
}

export { SCROLL_THRESHOLD_PX };
