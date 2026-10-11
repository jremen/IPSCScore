import { create } from 'zustand';
import { api } from '../services/api';
import type { Cup, CupDetail, CupResultsPayload, CreateCupInput } from '../types/cup';

interface CupState {
  cups: Cup[];
  detail: CupDetail | null;
  results: CupResultsPayload | null;
  loading: boolean;
  error: string | null;
}

interface CupActions {
  fetchCups: () => Promise<void>;
  fetchCup: (id: string) => Promise<void>;
  fetchCupResults: (id: string) => Promise<void>;
  createCup: (input: CreateCupInput) => Promise<Cup>;
  updateCup: (id: string, patch: Partial<CreateCupInput>) => Promise<void>;
  deleteCup: (id: string) => Promise<void>;
  addMatches: (id: string, matchIds: string[]) => Promise<void>;
  removeMatch: (id: string, matchId: string) => Promise<void>;
  clearDetail: () => void;
}

function numFields(row: any): any {
  if (!row) return row;
  const out: any = { ...row };
  for (const key of ['time', 'match_percent', 'match_points', 'hit_factor', 'matches_count', 'matches_required', 'alpha', 'charlie', 'delta', 'miss', 'no_shoot', 'procedurals']) {
    if (key in out) out[key] = out[key] == null ? null : Number(out[key]);
  }
  return out;
}

export const useCupStore = create<CupState & CupActions>((set, get) => ({
  cups: [],
  detail: null,
  results: null,
  loading: false,
  error: null,

  fetchCups: async () => {
    set({ loading: true, error: null });
    try {
      const cups = await api.getCups();
      set({ cups, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchCup: async (id) => {
    set({ loading: true, error: null });
    try {
      const detail = await api.getCup(id);
      set({ detail, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchCupResults: async (id) => {
    set({ loading: true, error: null });
    try {
      const payload: any = await api.getCupResults(id);
      const byDivision: Record<string, any[]> = payload.results?.byDivision ?? {};
      const byCategory: Record<string, Record<string, any[]>> = payload.results?.byCategory ?? {};
      const byTag: Record<string, Record<string, any[]>> = payload.results?.byTag ?? {};
      const normalized: CupResultsPayload = {
        ...payload,
        results: {
          byDivision: Object.fromEntries(Object.entries(byDivision).map(([div, rows]) => [div, rows.map(numFields)])),
          overall: (payload.results?.overall as any[] ?? []).map(numFields),
          byCategory: Object.fromEntries(Object.entries(byCategory).map(([cat, divisions]) => [
            cat,
            Object.fromEntries(Object.entries(divisions).map(([div, rows]) => [div, rows.map(numFields)])),
          ])),
          byTag: Object.fromEntries(Object.entries(byTag).map(([tag, divisions]) => [
            tag,
            Object.fromEntries(Object.entries(divisions).map(([div, rows]) => [div, rows.map(numFields)])),
          ])),
        },
      };
      set({ results: normalized, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createCup: async (input) => {
    const cup = await api.createCup(input);
    set((state) => ({ cups: [cup, ...state.cups] }));
    return cup;
  },

  updateCup: async (id, patch) => {
    const updated = await api.updateCup(id, patch);
    set((state) => ({
      cups: state.cups.map((c) => (c.id === id ? { ...c, ...updated } : c)),
      detail: state.detail?.id === id ? { ...state.detail, ...updated } : state.detail,
    }));
    await get().fetchCupResults(id);
  },

  deleteCup: async (id) => {
    await api.deleteCup(id);
    set((state) => ({
      cups: state.cups.filter((c) => c.id !== id),
      detail: state.detail?.id === id ? null : state.detail,
      results: state.results?.cup.id === id ? null : state.results,
    }));
  },

  addMatches: async (id, matchIds) => {
    await api.addCupMatches(id, matchIds);
    await get().fetchCup(id);
    await get().fetchCupResults(id);
  },

  removeMatch: async (id, matchId) => {
    await api.removeCupMatch(id, matchId);
    await get().fetchCup(id);
    await get().fetchCupResults(id);
  },

  clearDetail: () => set({ detail: null, results: null }),
}));