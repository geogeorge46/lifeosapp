import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService, Person } from "../services/api";

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

interface PeopleState {
  people: Person[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPeople: () => Promise<void>;
  addPerson: (
    name: string,
    phone?: string,
    relationship?: string,
    birthday?: string,
    tags?: string[]
  ) => Promise<Person>;
  deletePerson: (id: string) => Promise<void>;
  linkPlace: (personId: string, placeId: string) => Promise<void>;
  unlinkPlace: (personId: string, placeId: string) => Promise<void>;
  addTag: (personId: string, tagName: string) => Promise<void>;
}

export const usePeopleStore = create<PeopleState>()(
  persist(
    (set, get) => ({
      people: [],
      isLoading: false,
      error: null,

      fetchPeople: async () => {
        set({ isLoading: true, error: null });
        try {
          const fetchedPeople = await apiService.fetchPeople();
          set({ people: fetchedPeople, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to load contacts directory", isLoading: false });
        }
      },

      addPerson: async (name: string, phone?: string, relationship?: string, birthday?: string, tags?: string[]) => {
        set({ isLoading: true, error: null });
        try {
          const newPerson = await apiService.createPerson(name, phone, relationship, birthday, tags);
          set((state) => ({ people: [...state.people, newPerson], isLoading: false }));
          return newPerson;
        } catch (err: any) {
          set({ error: err.message || "Failed to create contact", isLoading: false });
          throw err;
        }
      },

      deletePerson: async (id: string) => {
        set((state) => ({ people: state.people.filter((p) => p.id !== id) }));
        try {
          await apiService.deletePerson(id);
        } catch (err) {
          console.error("[PeopleStore] Delete failed, reloading backend list:", err);
          get().fetchPeople();
        }
      },

      linkPlace: async (personId: string, placeId: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.linkPlaceToPerson(personId, placeId);
          await get().fetchPeople();
        } catch (err: any) {
          set({ error: err.message || "Failed to link location to contact", isLoading: false });
          throw err;
        }
      },

      unlinkPlace: async (personId: string, placeId: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.unlinkPlaceFromPerson(personId, placeId);
          await get().fetchPeople();
        } catch (err: any) {
          set({ error: err.message || "Failed to unlink location from contact", isLoading: false });
          throw err;
        }
      },

      addTag: async (personId: string, tagName: string) => {
        set({ isLoading: true, error: null });
        try {
          await apiService.addTagToPerson(personId, tagName);
          await get().fetchPeople();
        } catch (err: any) {
          set({ error: err.message || "Failed to append tag to contact", isLoading: false });
          throw err;
        }
      },
    }),
    {
      name: "lifeos-people-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
