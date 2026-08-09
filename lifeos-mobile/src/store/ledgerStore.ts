import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiService, Transaction, LedgerSummary } from "../services/api";

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

interface LedgerState {
  transactions: Transaction[];
  summary: LedgerSummary | null;
  personBalances: Record<string, { netBalance: number; transactions: Transaction[] }>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTransactions: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  addTransaction: (
    amount: number,
    type: "EXPENSE" | "LENT" | "BORROWED",
    description: string,
    personId?: string | null,
    placeId?: string | null,
    category?: string | null,
    dueDate?: string | null
  ) => Promise<Transaction>;
  settleTransaction: (id: string, amount?: number) => Promise<Transaction>;
  splitExpense: (
    totalAmount: number,
    description: string,
    placeId: string | null,
    splits: Array<{ personId: string; amount: number }>
  ) => Promise<Transaction[]>;
  fetchPersonBalance: (personId: string) => Promise<{ netBalance: number; transactions: Transaction[] }>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      transactions: [],
      summary: null,
      personBalances: {},
      isLoading: false,
      error: null,

      fetchTransactions: async () => {
        set({ isLoading: true, error: null });
        try {
          const txs = await apiService.fetchTransactions();
          set({ transactions: txs, isLoading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to fetch transactions", isLoading: false });
        }
      },

      fetchSummary: async () => {
        try {
          const sum = await apiService.fetchLedgerSummary();
          set({ summary: sum });
        } catch (err) {
          console.error("Failed to load ledger summary:", err);
        }
      },

      addTransaction: async (amount, type, description, personId, placeId, category, dueDate) => {
        set({ isLoading: true, error: null });
        try {
          const newTx = await apiService.createTransaction(
            amount,
            type,
            description,
            personId,
            placeId,
            category,
            dueDate
          );
          set((state) => ({
            transactions: [newTx, ...state.transactions],
            isLoading: false,
          }));
          
          // Re-fetch calculations
          get().fetchSummary();
          if (personId) {
            get().fetchPersonBalance(personId);
          }

          return newTx;
        } catch (err: any) {
          set({ error: err.message || "Failed to create transaction", isLoading: false });
          throw err;
        }
      },

      settleTransaction: async (id, amount) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await apiService.settleTransaction(id, amount);
          set((state) => ({
            transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
            isLoading: false,
          }));

          // Re-fetch calculations
          get().fetchSummary();
          if (updated.personId) {
            get().fetchPersonBalance(updated.personId);
          }

          return updated;
        } catch (err: any) {
          set({ error: err.message || "Failed to settle transaction", isLoading: false });
          throw err;
        }
      },

      splitExpense: async (totalAmount, description, placeId, splits) => {
        set({ isLoading: true, error: null });
        try {
          const createdList = await apiService.splitExpense(totalAmount, description, placeId, splits);
          set((state) => ({
            transactions: [...createdList, ...state.transactions],
            isLoading: false,
          }));

          // Re-fetch calculations
          get().fetchSummary();
          for (const split of splits) {
            get().fetchPersonBalance(split.personId);
          }

          return createdList;
        } catch (err: any) {
          set({ error: err.message || "Failed to process group split", isLoading: false });
          throw err;
        }
      },

      fetchPersonBalance: async (personId: string) => {
        try {
          const balanceDetails = await apiService.fetchPersonBalance(personId);
          set((state) => ({
            personBalances: {
              ...state.personBalances,
              [personId]: balanceDetails,
            },
          }));
          return balanceDetails;
        } catch (err: any) {
          console.error(`Failed to load balance for person ${personId}:`, err);
          throw err;
        }
      },

      deleteTransaction: async (id) => {
        // Find existing transaction to see if we should refresh a person's profile
        const tx = get().transactions.find((t) => t.id === id);
        
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        }));

        try {
          await apiService.deleteTransaction(id);
          get().fetchSummary();
          if (tx?.personId) {
            get().fetchPersonBalance(tx.personId);
          }
        } catch (err) {
          console.error("Failed to delete transaction:", err);
          get().fetchTransactions();
        }
      },
    }),
    {
      name: "lifeos-ledger-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
