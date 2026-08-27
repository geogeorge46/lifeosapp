import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService, BrainDump, BrainDumpCollection } from "../services/api";

const localFallbackMap = new Map<string, string>();
const fallbackStorage = {
  getItem: (key: string): string | null => localFallbackMap.get(key) || null,
  setItem: (key: string, value: string): void => {
    localFallbackMap.set(key, value);
  },
  removeItem: (key: string): void => {
    localFallbackMap.delete(key);
  },
};

export interface OfflineCapture {
  id: string;
  contentType: "TEXT" | "AUDIO";
  content: string;
  createdAt: string;
  type?: string | null;
  collectionId?: string | null;
}

interface InboxState {
  items: BrainDump[];
  collections: BrainDumpCollection[];
  activeCollectionId: string | null;
  activeType: string | null;
  offlineQueue: OfflineCapture[];
  isSyncing: boolean;
  isLoading: boolean;
  error: string | null;

  // Interface Actions
  fetchInbox: (collectionId?: string | null, type?: string | null) => Promise<void>;
  fetchCollections: () => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  moveToCollection: (id: string, collectionId: string | null) => Promise<void>;
  updateItemType: (id: string, type: string | null) => Promise<void>;
  updateItemContent: (id: string, content: string) => Promise<void>;
  setActiveFilters: (collectionId: string | null, type: string | null) => void;
  captureText: (content: string, isOnline?: boolean) => Promise<void>;
  captureAudio: (fileUri: string, isOnline?: boolean) => Promise<void>;
  syncOfflineItems: () => Promise<void>;
  processItem: (id: string) => Promise<void>;
  archiveItem: (id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearOfflineQueue: () => void;
}

export const useInboxStore = create<InboxState>()(
  persist(
    (set, get) => ({
      items: [],
      collections: [],
      activeCollectionId: null,
      activeType: "All",
      offlineQueue: [],
      isSyncing: false,
      isLoading: false,
      error: null,

      fetchInbox: async (collectionId, type) => {
        set({ isLoading: true, error: null });
        try {
          const colId = collectionId !== undefined ? collectionId : get().activeCollectionId;
          const filterType = type !== undefined ? type : get().activeType;
          const remoteItems = await apiService.fetchInbox(colId, filterType);
          set({ items: remoteItems, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to load brain dump items", isLoading: false });
        }
      },

      fetchCollections: async () => {
        try {
          const cols = await apiService.fetchCollections();
          set({ collections: cols });
        } catch (err: any) {
          console.error("Failed to load collections:", err);
        }
      },

      createCollection: async (name: string) => {
        try {
          const col = await apiService.createCollection(name);
          set((state) => ({ collections: [...state.collections, col] }));
        } catch (err: any) {
          console.error("Failed to create collection:", err);
          throw err;
        }
      },

      deleteCollection: async (id: string) => {
        try {
          await apiService.deleteCollection(id);
          set((state) => ({
            collections: state.collections.filter((c) => c.id !== id),
            activeCollectionId: state.activeCollectionId === id ? null : state.activeCollectionId,
          }));
          get().fetchInbox();
        } catch (err: any) {
          console.error("Failed to delete collection:", err);
        }
      },

      moveToCollection: async (id: string, collectionId: string | null) => {
        // Optimistic UI update
        set((state) => ({
          items: state.items.map((it) => (it.id === id ? { ...it, collectionId } : it)),
        }));
        try {
          await apiService.moveToCollection(id, collectionId);
        } catch (err) {
          console.error("Failed to move item to collection:", err);
          get().fetchInbox();
        }
      },

      updateItemType: async (id: string, type: string | null) => {
        // Optimistic UI update
        set((state) => ({
          items: state.items.map((it) => (it.id === id ? { ...it, type } : it)),
        }));
        try {
          await apiService.updateBrainDumpType(id, type);
        } catch (err) {
          console.error("Failed to update item classification type:", err);
          get().fetchInbox();
        }
      },

      updateItemContent: async (id: string, content: string) => {
        set((state) => ({
          items: state.items.map((it) => {
            if (it.id === id) {
              if (it.contentType === "AUDIO") {
                return { ...it, rawText: content };
              } else {
                return { ...it, content };
              }
            }
            return it;
          }),
        }));
        try {
          await apiService.updateBrainDumpContent(id, content);
        } catch (err) {
          console.error("Failed to update item content:", err);
          get().fetchInbox();
        }
      },

      setActiveFilters: (collectionId: string | null, type: string | null) => {
        set({ activeCollectionId: collectionId, activeType: type });
        get().fetchInbox(collectionId, type);
      },

      captureText: async (content: string, isOnline = true) => {
        const activeCollectionId = get().activeCollectionId;
        const activeType = get().activeType === "All" ? null : get().activeType;
        const tempId = `temp-txt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const localItem: BrainDump = {
          id: tempId,
          userId: "local",
          contentType: "TEXT",
          content,
          rawText: null,
          status: "INBOX",
          type: activeType,
          collectionId: activeCollectionId,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({ items: [localItem, ...state.items] }));

        if (!isOnline) {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              { id: tempId, contentType: "TEXT", content, createdAt: localItem.createdAt, type: activeType, collectionId: activeCollectionId },
            ],
          }));
          return;
        }

        try {
          const serverItem = await apiService.captureText(content);
          // If server returns, set type/collection in server
          if (activeType || activeCollectionId) {
            await apiService.moveToCollection(serverItem.id, activeCollectionId);
            if (activeType) {
              await apiService.updateBrainDumpType(serverItem.id, activeType);
            }
            get().fetchInbox();
          } else {
            set((state) => ({
              items: state.items.map((it) => (it.id === tempId ? serverItem : it)),
            }));
          }
        } catch (err) {
          console.warn("[InboxStore] Save failed, caching locally:", err);
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              { id: tempId, contentType: "TEXT", content, createdAt: localItem.createdAt, type: activeType, collectionId: activeCollectionId },
            ],
          }));
        }
      },

      captureAudio: async (fileUri: string, isOnline = true) => {
        const activeCollectionId = get().activeCollectionId;
        const activeType = get().activeType === "All" ? null : get().activeType;
        const tempId = `temp-aud-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const localItem: BrainDump = {
          id: tempId,
          userId: "local",
          contentType: "AUDIO",
          content: fileUri,
          rawText: "[Queued Voice Capture: Sync Pending]",
          status: "INBOX",
          type: activeType,
          collectionId: activeCollectionId,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({ items: [localItem, ...state.items] }));

        if (!isOnline) {
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              { id: tempId, contentType: "AUDIO", content: fileUri, createdAt: localItem.createdAt, type: activeType, collectionId: activeCollectionId },
            ],
          }));
          return;
        }

        try {
          const serverItem = await apiService.captureAudio(fileUri);
          if (activeType || activeCollectionId) {
            await apiService.moveToCollection(serverItem.id, activeCollectionId);
            if (activeType) {
              await apiService.updateBrainDumpType(serverItem.id, activeType);
            }
            get().fetchInbox();
          } else {
            set((state) => ({
              items: state.items.map((it) => (it.id === tempId ? serverItem : it)),
            }));
          }
        } catch (err) {
          console.warn("[InboxStore] Audio upload failed, caching locally:", err);
          set((state) => ({
            offlineQueue: [
              ...state.offlineQueue,
              { id: tempId, contentType: "AUDIO", content: fileUri, createdAt: localItem.createdAt, type: activeType, collectionId: activeCollectionId },
            ],
          }));
        }
      },

      syncOfflineItems: async () => {
        const { offlineQueue, isSyncing } = get();
        if (offlineQueue.length === 0 || isSyncing) return;

        set({ isSyncing: true });
        const failedItems: OfflineCapture[] = [];

        for (const queued of offlineQueue) {
          try {
            if (!queued || !queued.content || typeof queued.content !== "string") {
              continue;
            }

            if (queued.contentType === "TEXT") {
              const serverItem = await apiService.captureText(queued.content);
              if (queued.collectionId) {
                await apiService.moveToCollection(serverItem.id, queued.collectionId).catch(() => {});
              }
              if (queued.type) {
                await apiService.updateBrainDumpType(serverItem.id, queued.type).catch(() => {});
              }
            } else {
              try {
                const serverItem = await apiService.captureAudio(queued.content);
                if (queued.collectionId) {
                  await apiService.moveToCollection(serverItem.id, queued.collectionId).catch(() => {});
                }
                if (queued.type) {
                  await apiService.updateBrainDumpType(serverItem.id, queued.type).catch(() => {});
                }
              } catch (audioErr) {
                console.warn("[InboxStore] Audio upload failed, falling back to text note:", audioErr);
                const serverItem = await apiService.captureText("[Voice Note Capture]");
                if (queued.collectionId) {
                  await apiService.moveToCollection(serverItem.id, queued.collectionId).catch(() => {});
                }
              }
            }
          } catch (err) {
            console.error(`[InboxStore] Sync failed for item ${queued.id}:`, err);
            failedItems.push(queued);
          }
        }

        set({ offlineQueue: failedItems, isSyncing: false });
        get().fetchInbox();
      },

      clearOfflineQueue: () => {
        set({ offlineQueue: [] });
      },

      processItem: async (id: string) => {
        // Optimistic update
        set((state) => ({
          items: state.items.map((it) => (it.id === id ? { ...it, status: "PROCESSED" } : it)),
        }));
        try {
          await apiService.processInboxItem(id);
        } catch (err) {
          console.error("[InboxStore] Process failed, restoring UI:", err);
          get().fetchInbox();
        }
      },

      archiveItem: async (id: string) => {
        // Remove from current active checklist (since it gets archived)
        set((state) => ({ items: state.items.filter((it) => it.id !== id) }));
        try {
          await apiService.archiveInboxItem(id);
        } catch (err) {
          console.error("[InboxStore] Archive failed, restoring UI:", err);
          get().fetchInbox();
        }
      },

      deleteItem: async (id: string) => {
        set((state) => ({ items: state.items.filter((it) => it.id !== id) }));
        try {
          await apiService.deleteInboxItem(id);
        } catch (err) {
          console.error("[InboxStore] Delete failed, restoring UI:", err);
          get().fetchInbox();
        }
      },
    }),
    {
      name: "lifeos-inbox-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
