import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://qciudgmkzfqmgwprdffl.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjaXVkZ21remZxbWd3cHJkZmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzE5MjYsImV4cCI6MjEwMTk0NzkyNn0.7P7RYcORFhIpqs0RkqhAcM85zc1egb3Wp1SkTMMnB0A";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});
