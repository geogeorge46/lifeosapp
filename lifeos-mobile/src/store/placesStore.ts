import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService, Place } from "../services/api";

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

interface PlacesState {
  places: Place[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPlaces: () => Promise<void>;
  addPlace: (
    name: string,
    latitude: number,
    longitude: number,
    radius?: number,
    address?: string
  ) => Promise<Place>;
  deletePlace: (id: string) => Promise<void>;
  bindTask: (placeId: string, taskId: string, triggerType?: "ENTER" | "EXIT") => Promise<void>;
  triggerMockEntry: (placeId: string) => Promise<void>;
}

export const usePlacesStore = create<PlacesState>()(
  persist(
    (set, get) => ({
      places: [],
      isLoading: false,
      error: null,

      fetchPlaces: async () => {
        set({ isLoading: true, error: null });
        try {
          const fetchedPlaces = await apiService.fetchPlaces();
          set({ places: fetchedPlaces, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to load places list", isLoading: false });
        }
      },

      addPlace: async (
        name: string,
        latitude: number,
        longitude: number,
        radius?: number,
        address?: string
      ) => {
        set({ isLoading: true, error: null });
        try {
          const newPlace = await apiService.createPlace(name, latitude, longitude, radius, address);
          set((state) => ({ places: [newPlace, ...state.places], isLoading: false }));
          return newPlace;
        } catch (err: any) {
          set({ error: err.message || "Failed to create place", isLoading: false });
          throw err;
        }
      },

      deletePlace: async (id: string) => {
        set((state) => ({ places: state.places.filter((p) => p.id !== id) }));
        try {
          await apiService.deletePlace(id);
        } catch (err) {
          console.error("[PlacesStore] Delete failed, reloading backend list:", err);
          get().fetchPlaces();
        }
      },

      bindTask: async (placeId: string, taskId: string, triggerType = "ENTER") => {
        set({ isLoading: true, error: null });
        try {
          await apiService.bindTaskToPlace(placeId, taskId, triggerType);
          // Reload places to pull updated geofences layout
          await get().fetchPlaces();
        } catch (err: any) {
          set({ error: err.message || "Failed to link task reminder", isLoading: false });
          throw err;
        }
      },

      triggerMockEntry: async (placeId: string) => {
        try {
          await apiService.triggerGeofenceEvent(placeId);
          console.log(`[PlacesStore] Mock entry processed for place ${placeId}`);
        } catch (err) {
          console.error("[PlacesStore] Failed to trigger mock entry event:", err);
        }
      },
    }),
    {
      name: "lifeos-places-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
