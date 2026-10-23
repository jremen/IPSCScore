import type { FirearmType, MatchLevel, Organization } from '../types/match';
import { formatDate } from './constants';

export interface MatchListFilters {
  search: string;
  firearmType: FirearmType | '';
  level: MatchLevel | '';
  dateFrom: string;
  dateTo: string;
}

export function filterMatches<T extends {
  name: string;
  organization: string;
  firearm_type: string;
  date?: string | null;
  match_level?: number | null;
}>(matches: T[], filters: MatchListFilters): T[] {
  let result = matches;
  const search = filters.search.toLowerCase();
  if (search) {
    result = result.filter((match) =>
      match.name.toLowerCase().includes(search) ||
      match.organization.toLowerCase().includes(search) ||
      match.firearm_type.toLowerCase().includes(search) ||
      match.date?.includes(search),
    );
  }
  if (filters.firearmType) {
    result = result.filter((match) => match.firearm_type === filters.firearmType);
  }
  if (filters.level) {
    result = result.filter((match) => match.match_level === filters.level);
  }
  if (filters.dateFrom) {
    result = result.filter((match) => Boolean(match.date && match.date >= filters.dateFrom));
  }
  if (filters.dateTo) {
    result = result.filter((match) => Boolean(match.date && match.date <= filters.dateTo));
  }
  return result;
}

export function createInitialMatchForm(): {
  name: string;
  date: string;
  organization: Organization;
  firearm_type: FirearmType;
  match_level: '' | MatchLevel;
} {
  return {
    name: '',
    date: '',
    organization: 'IPSC',
    firearm_type: 'handgun',
    match_level: '',
  };
}

export function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export { formatDate };
