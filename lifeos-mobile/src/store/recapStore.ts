import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService, DailyRecap } from "../services/api";

const memoryStore = new Map<string, string>();
const fallbackStorage = {
  getItem: (key: string): string | null => memoryStore.get(key) || null,
  setItem: (key: string, value: string): void => {
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    memoryStore.delete(key);
  },
};

interface RecapState {
  recap: DailyRecap | null;
  isLoading: boolean;
  error: string | null;
  isDismissed: boolean;

  // Actions
  loadTodayRecap: () => Promise<void>;
  triggerCompilation: () => Promise<void>;
  dismissRecap: () => void;
  resetDismissState: () => void;
}

export const useRecapStore = create<RecapState>()(
  persist(
    (set, get) => ({
      recap: null,
      isLoading: false,
      error: null,
      isDismissed: false,

      loadTodayRecap: async () => {
        set({ isLoading: true, error: null });
        try {
          const todayRecap = await apiService.fetchTodayRecap();
          
          // If recap changed or is new, reset dismissal state
          const currentRecap = get().recap;
          if (!currentRecap || currentRecap.id !== todayRecap.id) {
            set({ recap: todayRecap, isDismissed: false, isLoading: false });
          } else {
            set({ recap: todayRecap, isLoading: false });
          }
        } catch (err: any) {
          set({ error: err.message || "Failed to load recap digest", isLoading: false });
        }
      },

      triggerCompilation: async () => {
        set({ isLoading: true, error: null });
        try {
          const freshRecap = await apiService.triggerRecapGeneration();
          set({ recap: freshRecap, isDismissed: false, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to generate recap summary", isLoading: false });
        }
      },

      dismissRecap: () => {
        set({ isDismissed: true });
      },

      resetDismissState: () => {
        set({ isDismissed: false });
      },
    }),
    {
      name: "lifeos-recap-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
