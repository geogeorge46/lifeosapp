import { create } from "zustand";
import { apiService, Relationship } from "../services/api";

interface RelationshipState {
  relationships: Relationship[];
  connections: Record<string, Array<{ name: string; relation: string }>>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchRelationships: () => Promise<void>;
  addRelationship: (personAId: string, personBId: string, type: string) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;
  fetchConnections: (personId: string) => Promise<void>;
}

export const useRelationshipStore = create<RelationshipState>((set, get) => ({
  relationships: [],
  connections: {},
  isLoading: false,
  error: null,

  fetchRelationships: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiService.fetchRelationships();
      set({ relationships: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to load relationships graph", isLoading: false });
    }
  },

  addRelationship: async (personAId: string, personBId: string, type: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.createRelationship(personAId, personBId, type);
      await get().fetchRelationships();
    } catch (err: any) {
      set({ error: err.message || "Failed to establish link", isLoading: false });
      throw err;
    }
  },

  deleteRelationship: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await apiService.deleteRelationship(id);
      await get().fetchRelationships();
    } catch (err: any) {
      set({ error: err.message || "Failed to remove link", isLoading: false });
      throw err;
    }
  },

  fetchConnections: async (personId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await apiService.fetchConnections(personId);
      set({ connections: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || "Failed to trace connections path", isLoading: false });
    }
  },
}));
