import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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

interface SettingsState {
  morningRecapTime: string;
  eveningCheckinTime: string;
  ledgerFollowUpDays: number;
  snoozeIntervalMinutes: number;
  defaultGeofenceRadius: number;
  currencySymbol: string;
  graphVisibilityDepth: number;
  landingTab: string;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;

  // Actions
  updateSetting: (key: keyof SettingsState, value: any) => void;
  resetAllSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      morningRecapTime: "07:00",
      eveningCheckinTime: "21:00",
      ledgerFollowUpDays: 7,
      snoozeIntervalMinutes: 60,
      defaultGeofenceRadius: 150,
      currencySymbol: "$",
      graphVisibilityDepth: 3,
      landingTab: "day",
      notificationsEnabled: true,
      onboardingCompleted: false,

      updateSetting: (key, value) => {
        set({ [key]: value });
      },

      resetAllSettings: () => {
        set({
          morningRecapTime: "07:00",
          eveningCheckinTime: "21:00",
          ledgerFollowUpDays: 7,
          snoozeIntervalMinutes: 60,
          defaultGeofenceRadius: 150,
          currencySymbol: "$",
          graphVisibilityDepth: 3,
          landingTab: "day",
          notificationsEnabled: true,
          onboardingCompleted: false,
        });
      },
    }),
    {
      name: "lifeos-settings-storage",
      storage: createJSONStorage(() => fallbackStorage),
    }
  )
);
