import { create } from "zustand";
import { apiService, Occasion } from "../services/api";

interface OccasionsState {
  occasions: Record<string, Occasion[]>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchOccasions: (personId: string) => Promise<void>;
  addOccasion: (
    personId: string,
    title: string,
    date: string,
    type: string,
    offsets: number[]
  ) => Promise<void>;
  deleteOccasion: (personId: string, id: string) => Promise<void>;
}

export const useOccasionsStore = create<OccasionsState>((set, get) => ({
  occasions: {},
  isLoading: false,
  error: null,

  fetchOccasions: async (personId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiService.fetchOccasions(personId);
      set((state) => ({
        occasions: {
          ...state.occasions,
          [personId]: data,
        },
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to load occasions list", isLoading: false });
    }
  },

  addOccasion: async (
    personId: string,
    title: string,
    date: string,
    type: string,
    offsets: number[]
  ) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.createOccasion(personId, title, date, type, offsets);
      await get().fetchOccasions(personId);
    } catch (err: any) {
      set({ error: err.message || "Failed to establish occasion record", isLoading: false });
      throw err;
    }
  },

  deleteOccasion: async (personId: string, id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deleteOccasion(id);
      await get().fetchOccasions(personId);
    } catch (err: any) {
      set({ error: err.message || "Failed to remove occasion", isLoading: false });
      throw err;
    }
  },
}));
