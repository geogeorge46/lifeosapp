import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";

export async function exportEventToNativeCalendar(
  title: string,
  startDate: Date | string,
  endDate: Date | string,
  notes?: string | null,
  location?: string | null
): Promise<boolean> {
  try {
    // 1. Request system permissions
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Calendar access permission is required to save events to your phone.");
      return false;
    }

    // 2. Locate default/writable calendar on device
    const defaultCalendar = await getDefaultCalendarSource();
    if (!defaultCalendar) {
      Alert.alert("Calendar Error", "Unable to locate a writable system calendar on your device.");
      return false;
    }

    // 3. Format start & end dates safely
    const start = new Date(startDate);
    let end = new Date(endDate);
    if (isNaN(end.getTime()) || end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 60 * 60 * 1000); // Default to 1 hour duration
    }

    // 4. Create native event
    await Calendar.createEventAsync(defaultCalendar.id, {
      title,
      startDate: start,
      endDate: end,
      notes: notes || "Exported from Synora",
      location,
      timeZone: "default",
    });

    Alert.alert("Saved to Calendar 📅", `"${title}" was added to your system calendar.`);
    return true;
  } catch (err: any) {
    console.error("[CalendarExport] Failed to export event:", err);
    Alert.alert("Export Error", err.message || "Failed to save event to device calendar.");
    return false;
  }
}

async function getDefaultCalendarSource() {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  
  if (Platform.OS === "ios") {
    try {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      return defaultCalendar;
    } catch {
      // Fallback
    }
  }

  // On Android/fallback, look for a writable calendar (e.g. Google Calendar owner account)
  const writableCalendar = calendars.find(
    (cal) => cal.allowsModifications && (cal.accessLevel === Calendar.CalendarAccessLevel.OWNER || cal.isPrimary)
  ) || calendars.find((cal) => cal.allowsModifications);

  return writableCalendar || calendars[0] || null;
}
