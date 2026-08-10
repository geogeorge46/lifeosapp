import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  token: string | null;
  user: any | null;
  loading: boolean;
  setAuth: (token: string | null, user: any | null) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loading: true,
  setAuth: async (token, user) => {
    try {
      if (token) {
        await SecureStore.setItemAsync("supabase_token", token);
        if (user) {
          await SecureStore.setItemAsync("supabase_user", JSON.stringify(user));
        }
      } else {
        await SecureStore.deleteItemAsync("supabase_token");
        await SecureStore.deleteItemAsync("supabase_user");
      }
      set({ token, user });
    } catch (e) {
      console.error("Failed to persist authentication state:", e);
    }
  },
  logout: async () => {
    try {
      await SecureStore.deleteItemAsync("supabase_token");
      await SecureStore.deleteItemAsync("supabase_user");
      set({ token: null, user: null });
    } catch (e) {
      console.error("Failed to clear authentication state:", e);
    }
  },
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync("supabase_token");
      const userJson = await SecureStore.getItemAsync("supabase_user");
      const user = userJson ? JSON.parse(userJson) : null;
      set({ token, user, loading: false });
    } catch {
      set({ token: null, user: null, loading: false });
    }
  },
}));
