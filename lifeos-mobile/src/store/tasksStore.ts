import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService, Task, TaskOccurrence } from "../services/api";
import { usePlacesStore } from "./placesStore";

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

interface TasksState {
  todayOccurrences: TaskOccurrence[];
  backlogOccurrences: TaskOccurrence[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTodayTasks: (dateStr?: string) => Promise<void>;
  addTask: (rawInput: string, notes?: string, currentDateStr?: string) => Promise<void>;
  toggleOccurrence: (occurrenceId: string) => Promise<void>;
  rescheduleOccurrence: (occurrenceId: string, newDateStr: string, reason?: string, currentDateStr?: string) => Promise<void>;
  deleteOccurrence: (occurrenceId: string) => Promise<void>;
  convertInboxItem: (inboxItemId: string, currentDateStr?: string) => Promise<void>;
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      todayOccurrences: [],
      backlogOccurrences: [],
      isLoading: false,
      error: null,

      fetchTodayTasks: async (dateStr) => {
        set({ isLoading: true, error: null });
        try {
          const targetDate = dateStr || new Date().toISOString().split("T")[0];
          const result = await apiService.fetchTodayTasks(targetDate);
          set({
            todayOccurrences: result.today,
            backlogOccurrences: result.backlog,
            isLoading: false,
          });
        } catch (err: any) {
          set({ error: err.message || "Failed to load tasks list", isLoading: false });
        }
      },

      addTask: async (rawInput, notes, currentDateStr) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.createTask(rawInput, notes);
          const targetDate = currentDateStr || new Date().toISOString().split("T")[0];
          await get().fetchTodayTasks(targetDate);
          usePlacesStore.getState().fetchPlaces().catch(() => {});
        } catch (err: any) {
          set({ error: err.message || "Failed to add task", isLoading: false });
        }
      },

      toggleOccurrence: async (occurrenceId) => {
        const { todayOccurrences, backlogOccurrences } = get();
        
        // Find occurrence in either today list or backlog list
        let occurrence = todayOccurrences.find((o) => o.id === occurrenceId);
        let listKey: "todayOccurrences" | "backlogOccurrences" = "todayOccurrences";
        
        if (!occurrence) {
          occurrence = backlogOccurrences.find((o) => o.id === occurrenceId);
          listKey = "backlogOccurrences";
        }
        
        if (!occurrence) return;

        const originalStatus = occurrence.status;
        const newStatus = originalStatus === "COMPLETED" ? "SCHEDULED" : "COMPLETED";

        // 1. Optimistic toggle
        set((state) => ({
          [listKey]: state[listKey].map((o) =>
            o.id === occurrenceId ? { ...o, status: newStatus } : o
          ),
        }));

        try {
          await apiService.updateTaskStatus(occurrenceId, newStatus);
          usePlacesStore.getState().fetchPlaces().catch(() => {});
        } catch (err) {
          console.error("[TasksStore] Update status failed, reverting local toggle state:", err);
          // Rollback to original status
          set((state) => ({
            [listKey]: state[listKey].map((o) =>
              o.id === occurrenceId ? { ...o, status: originalStatus } : o
            ),
          }));
        }
      },

      rescheduleOccurrence: async (occurrenceId, newDateStr, reason, currentDateStr) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.rescheduleTask(occurrenceId, newDateStr, reason);
          const targetDate = currentDateStr || new Date().toISOString().split("T")[0];
          await get().fetchTodayTasks(targetDate);
          usePlacesStore.getState().fetchPlaces().catch(() => {});
        } catch (err: any) {
          set({ error: err.message || "Failed to reschedule task", isLoading: false });
        }
      },

      deleteOccurrence: async (occurrenceId) => {
        // Optimistic delete
        set((state) => ({
          todayOccurrences: state.todayOccurrences.filter((o) => o.id !== occurrenceId),
          backlogOccurrences: state.backlogOccurrences.filter((o) => o.id !== occurrenceId),
        }));
        try {
          await apiService.deleteTaskOccurrence(occurrenceId);
          usePlacesStore.getState().fetchPlaces().catch(() => {});
        } catch (err) {
          console.error("[TasksStore] Delete occurrence failed:", err);
          // Refresh list on failure
          const targetDate = new Date().toISOString().split("T")[0];
          get().fetchTodayTasks(targetDate);
        }
      },

      convertInboxItem: async (inboxItemId, currentDateStr) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.createTaskFromInbox(inboxItemId);
          const targetDate = currentDateStr || new Date().toISOString().split("T")[0];
          await get().fetchTodayTasks(targetDate);
        } catch (err: any) {
          set({ error: err.message || "Failed to convert inbox item", isLoading: false });
          throw err;
        }
      },
    }),
    {
      name: "lifeos-tasks-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
