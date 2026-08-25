import { create } from "zustand";
import { apiService, Relationship } from "../services/api";

interface RelationshipsState {
  relationships: Relationship[];
  isLoading: boolean;
  error: string | null;

  fetchRelationships: () => Promise<void>;
  createRelationship: (personAId: string, personBId: string, type: string) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;
}

export const useRelationshipsStore = create<RelationshipsState>((set, get) => ({
  relationships: [],
  isLoading: false,
  error: null,

  fetchRelationships: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiService.fetchRelationships();
      set({ relationships: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to fetch relationships", isLoading: false });
    }
  },

  createRelationship: async (personAId, personBId, type) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.createRelationship(personAId, personBId, type);
      await get().fetchRelationships();
    } catch (err: any) {
      set({ error: err.message || "Failed to create relationship", isLoading: false });
      throw err;
    }
  },

  deleteRelationship: async (id) => {
    try {
      await apiService.deleteRelationship(id);
      set((state) => ({
        relationships: state.relationships.filter((r) => r.id !== id),
      }));
    } catch (err: any) {
      set({ error: err.message || "Failed to delete relationship" });
    }
  },
}));
