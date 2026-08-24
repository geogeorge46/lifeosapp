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
    const inTabsGroup = segments[0] === "(tabs)";

    if (!token && !inAuthGroup) {
      // Direct unauthorized traffic to login gateway
      router.replace("/(auth)/login");
    } else if (token && !inTabsGroup) {
      // Direct authenticated traffic to main home day page
      router.replace("/(tabs)/day");
    }
  }, [token, loading, segments]);

  return <Slot />;
}
