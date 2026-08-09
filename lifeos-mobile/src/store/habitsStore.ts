import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService, Habit } from "../services/api";

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

interface HabitsState {
  habits: Habit[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchHabits: () => Promise<void>;
  addHabit: (title: string) => Promise<Habit>;
  toggleHabit: (id: string, dateStr?: string) => Promise<Habit>;
  deleteHabit: (id: string) => Promise<void>;
}

export const useHabitsStore = create<HabitsState>()(
  persist(
    (set, get) => ({
      habits: [],
      isLoading: false,
      error: null,

      fetchHabits: async () => {
        set({ isLoading: true, error: null });
        try {
          const fetched = await apiService.fetchHabits();
          set({ habits: fetched, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to load habits", isLoading: false });
        }
      },

      addHabit: async (title: string) => {
        set({ isLoading: true, error: null });
        try {
          const newHabit = await apiService.createHabit(title);
          set((state) => ({ habits: [newHabit, ...state.habits], isLoading: false }));
          return newHabit;
        } catch (err: any) {
          set({ error: err.message || "Failed to create habit", isLoading: false });
          throw err;
        }
      },

      toggleHabit: async (id: string, dateStr?: string) => {
        const targetDateStr = dateStr || new Date().toISOString().split("T")[0];
        
        // Optimistic UI updates
        set((state) => {
          const updatedHabits = state.habits.map((habit) => {
            if (habit.id === id) {
              const completions = habit.completions || [];
              const isCompleted = completions.some((c) => c.date.startsWith(targetDateStr));
              
              let newCompletions = [];
              if (isCompleted) {
                newCompletions = completions.filter((c) => !c.date.startsWith(targetDateStr));
              } else {
                newCompletions = [
                  ...completions,
                  {
                    id: "temp-id",
                    habitId: id,
                    date: targetDateStr,
                    completedAt: new Date().toISOString(),
                  },
                ];
              }
              
              return {
                ...habit,
                completions: newCompletions,
              };
            }
            return habit;
          });
          return { habits: updatedHabits };
        });

        try {
          const updated = await apiService.toggleHabitCompletion(id, dateStr);
          set((state) => ({
            habits: state.habits.map((h) => (h.id === id ? updated : h)),
          }));
          return updated;
        } catch (err: any) {
          // Revert to stable backend data on network error
          get().fetchHabits();
          throw err;
        }
      },

      deleteHabit: async (id: string) => {
        set((state) => ({ habits: state.habits.filter((h) => h.id !== id) }));
        try {
          await apiService.deleteHabit(id);
        } catch (err) {
          console.error("[HabitsStore] Delete failed, reloading:", err);
          get().fetchHabits();
        }
      },
    }),
    {
      name: "lifeos-habits-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
