import { TbSun, TbMoon } from 'react-icons/tb';
import { BsCircleHalf } from 'react-icons/bs';
import type { ThemeOption } from './types';

export const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', icon: <TbSun className="size-4" />, labelKey: 'settings.themeLight' },
  { value: 'dark', icon: <TbMoon className="size-4" />, labelKey: 'settings.themeDark' },
  { value: 'eink', icon: <BsCircleHalf className="size-4" />, labelKey: 'settings.themeEink' },
];
