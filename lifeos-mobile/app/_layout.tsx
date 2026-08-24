import { Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { useAuthStore } from "../src/store/authStore";

export default function RootLayout() {
  const { token, loading, initialize } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // Load saved session on application mount
  useEffect(() => {
    initialize();
  }, []);

  // Monitor session and handle authentication routing checks
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isIndexRoute = (segments as any).length === 0 || segments[0] === "index" || segments[0] === "";

    if (!token && !inAuthGroup) {
      // Direct unauthorized traffic to login gateway
      router.replace("/(auth)/login");
    } else if (token && (inAuthGroup || isIndexRoute)) {
      // Direct authenticated traffic to main home day page
      router.replace("/(tabs)/day");
    }
  }, [token, loading, segments]);

  return <Slot />;
}
