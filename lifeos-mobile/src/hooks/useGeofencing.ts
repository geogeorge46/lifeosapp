import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import { apiService, Place } from "../services/api";

const GEOFENCE_TASK_NAME = "LIFEOS_GEOFENCE_TASK";

// Register background task listener globally as required by Expo TaskManager
TaskManager.defineTask(GEOFENCE_TASK_NAME, async ({ data: { eventType, region }, error }: any) => {
  if (error) {
    console.error("[GeofenceTask] Background boundary monitoring error:", error);
    return;
  }

  // Monitor ENTER triggers only for battery optimization
  if (eventType === Location.GeofencingEventType.Enter) {
    console.log("[GeofenceTask] Native geofence ENTER detected:", region);
    const placeId = region.identifier;

    try {
      // 1. Notify backend database to resolve task triggers
      const dispatchedLogs = await apiService.triggerGeofenceEvent(placeId);

      // 2. Post immediate local push notifications for matched triggers
      for (const log of dispatchedLogs) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: log.title,
            body: log.body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: null,
        });
      }
    } catch (err) {
      console.error("[GeofenceTask] Sync trigger event processing failed:", err);
    }
  }
});

export function useGeofencing() {
  const checkHasBackgroundPermission = async (): Promise<boolean> => {
    const { status } = await Location.getBackgroundPermissionsAsync();
    return status === "granted";
  };

  const requestForegroundPermission = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === "granted";
  };

  const requestBackgroundPermission = async (): Promise<boolean> => {
    const hasForeground = await requestForegroundPermission();
    if (!hasForeground) return false;

    const { status } = await Location.requestBackgroundPermissionsAsync();
    return status === "granted";
  };

  const syncGeofences = async (places: Place[]): Promise<boolean> => {
    try {
      const hasBackground = await checkHasBackgroundPermission();
      if (!hasBackground) {
        console.warn("[Geofencing] Cannot sync: Background location permission not granted.");
        return false;
      }

      // Filter: Only watch places that have at least one active pending task reminder trigger
      const activePlaces = places.filter(
        (p) => p.geofences && p.geofences.some((g) => g.active)
      );

      // Respect region limit (capping at 20 active regions to comply with iOS and Android OS limits)
      const cappedPlaces = activePlaces.slice(0, 20);

      if (cappedPlaces.length === 0) {
        try {
          await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
          console.log("[Geofencing] No active regions to monitor, stopped geofencing.");
        } catch {
          // Task might not be running, ignore
        }
        return true;
      }

      const regions = cappedPlaces.map((place) => ({
        identifier: place.id,
        latitude: place.latitude,
        longitude: place.longitude,
        radius: place.radius,
        notifyOnEnter: true,
        notifyOnExit: false,
      }));

      // startGeofencingAsync overwrites the monitored set with this new list
      await Location.startGeofencingAsync(GEOFENCE_TASK_NAME, regions);
      console.log(`[Geofencing] Synced ${regions.length} native regions (limit: 20).`);
      return true;
    } catch (err) {
      console.error("[Geofencing] Error resyncing background geofence task:", err);
      return false;
    }
  };

  const unregisterAllGeofences = async () => {
    try {
      await Location.stopGeofencingAsync(GEOFENCE_TASK_NAME);
      console.log("[Geofencing] Unregistered all native geofence trackers.");
    } catch (err) {
      console.error("[Geofencing] Failed to unregister task:", err);
    }
  };

  return {
    checkHasBackgroundPermission,
    requestForegroundPermission,
    requestBackgroundPermission,
    syncGeofences,
    unregisterAllGeofences,
  };
}
