import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  Modal,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Bell,
  MapPin,
  Database,
  Coins,
  Settings,
  ChevronRight,
  Info,
  RotateCcw,
  Share2,
  Trash2,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useSettingsStore } from "../src/store/settingsStore";
import { usePeopleStore } from "../src/store/peopleStore";
import { usePlacesStore } from "../src/store/placesStore";
import { useLedgerStore } from "../src/store/ledgerStore";
import { useTasksStore } from "../src/store/tasksStore";
import { apiService } from "../src/services/api";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    morningRecapTime,
    eveningCheckinTime,
    ledgerFollowUpDays,
    snoozeIntervalMinutes,
    defaultGeofenceRadius,
    currencySymbol,
    graphVisibilityDepth,
    landingTab,
    notificationsEnabled,
    updateSetting,
    resetAllSettings,
  } = useSettingsStore();

  const { people, fetchPeople } = usePeopleStore();
  const { places, fetchPlaces } = usePlacesStore();
  const { fetchTransactions } = useLedgerStore();
  const { fetchTodayTasks } = useTasksStore();

  const [bgPermStatus, setBgPermStatus] = useState("checking...");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportedDataStr, setExportedDataStr] = useState("");

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const { status } = await Location.getBackgroundPermissionsAsync();
      setBgPermStatus(status === "granted" ? "Granted (Always Allow)" : "Denied / Tap to request");
    } catch {
      setBgPermStatus("Unavailable");
    }
  };

  const handleRequestBgPermission = async () => {
    try {
      const { status: foreStatus } = await Location.requestForegroundPermissionsAsync();
      if (foreStatus !== "granted") {
        Alert.alert("Permission Error", "Foreground permission is required first.");
        return;
      }
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus === "granted") {
        setBgPermStatus("Granted (Always Allow)");
        Alert.alert("Success", "Always-Allow location access is enabled!");
      } else {
        setBgPermStatus("Denied");
        Alert.alert("Permission Denied", "Geofencing works best with Always Allow.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to trigger permission dialog.");
    }
  };

  const handleResetApp = () => {
    Alert.alert(
      "☢️ Reset System Data",
      "This action will clear all saved preferences. Your backend data will remain, but local stores will refresh on next launch. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset Preferences",
          style: "destructive",
          onPress: () => {
            resetAllSettings();
            Alert.alert("Reset Successful", "All local preferences have been set back to default.");
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const fullData = await apiService.exportFullData();
      const jsonStr = JSON.stringify(fullData, null, 2);
      setExportedDataStr(jsonStr);
      setShowExportModal(true);
    } catch (err: any) {
      Alert.alert("Export Error", err.message || "Failed to retrieve full data backup.");
    }
  };

  const copyToClipboard = () => {
    Clipboard.setString(exportedDataStr);
    Alert.alert("Copied", "Export data copy saved to clipboard!");
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-4 pt-4" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl"
        >
          <ArrowLeft size={16} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">System Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Section 1: Notifications & Schedule */}
        <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6">
          <View className="flex-row items-center space-x-2 mb-4">
            <Bell size={18} color="#8b5cf6" />
            <Text className="text-sm font-bold text-white">Notifications & Reminders</Text>
          </View>

          {/* Toggle Push */}
          <View className="flex-row justify-between items-center py-2.5 border-b border-neutral-850">
            <View>
              <Text className="text-xs font-bold text-white">Enable Push Alerts</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">Toggle geofence & ledger reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => updateSetting("notificationsEnabled", val)}
              trackColor={{ false: "#262626", true: "#8b5cf6" }}
              thumbColor={notificationsEnabled ? "#ffffff" : "#a3a3a3"}
            />
          </View>

          {/* Morning recap timing */}
          <View className="flex-row justify-between items-center py-2.5 border-b border-neutral-850">
            <View>
              <Text className="text-xs font-bold text-white">Morning Digest Alert</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">Alert schedule for daily recap</Text>
            </View>
            <TextInput
              value={morningRecapTime}
              onChangeText={(val) => updateSetting("morningRecapTime", val)}
              placeholder="HH:MM"
              placeholderTextColor="#525252"
              className="text-white text-xs font-bold bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 w-16 text-center"
            />
          </View>

          {/* Evening check-in timing */}
          <View className="flex-row justify-between items-center py-2.5 border-b border-neutral-850">
            <View>
              <Text className="text-xs font-bold text-white">Evening Log Prompt</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">Alert schedule for task audits</Text>
            </View>
            <TextInput
              value={eveningCheckinTime}
              onChangeText={(val) => updateSetting("eveningCheckinTime", val)}
              placeholder="HH:MM"
              placeholderTextColor="#525252"
              className="text-white text-xs font-bold bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 w-16 text-center"
            />
          </View>

          {/* Resurfacing snooze */}
          <View className="flex-row justify-between items-center py-2.5">
            <View>
              <Text className="text-xs font-bold text-white">Task Resurface Interval</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">Snooze time before tasks re-appear</Text>
            </View>
            <TextInput
              value={String(snoozeIntervalMinutes)}
              onChangeText={(val) => updateSetting("snoozeIntervalMinutes", parseInt(val) || 0)}
              keyboardType="numeric"
              className="text-white text-xs font-bold bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 w-16 text-center"
            />
          </View>
        </View>

        {/* Section 2: Location & Geofencing */}
        <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6">
          <View className="flex-row items-center space-x-2 mb-4">
            <MapPin size={18} color="#10b981" />
            <Text className="text-sm font-bold text-white">Location & Geofencing</Text>
          </View>

          {/* Background Location Status */}
          <View className="py-2.5 border-b border-neutral-850">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-xs font-bold text-white">Always-Allow Location</Text>
                <Text className="text-[10px] text-neutral-500 mt-0.5">Required for background entry alerts</Text>
              </View>
              <Text
                className={`text-xs font-bold ${
                  bgPermStatus.includes("Granted") ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                {bgPermStatus}
              </Text>
            </View>
            {!bgPermStatus.includes("Granted") && (
              <TouchableOpacity
                onPress={handleRequestBgPermission}
                className="mt-3 bg-neutral-950 border border-neutral-800 py-2 rounded-xl items-center"
              >
                <Text className="text-white text-xs font-bold">Request Location Permission</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Default Radius */}
          <View className="py-2.5 border-b border-neutral-850">
            <Text className="text-xs font-bold text-white mb-2">Default Geofence Radius</Text>
            <View className="flex-row gap-2">
              {[50, 150, 300, 500].map((radiusVal) => {
                const isSel = defaultGeofenceRadius === radiusVal;
                return (
                  <TouchableOpacity
                    key={radiusVal}
                    onPress={() => updateSetting("defaultGeofenceRadius", radiusVal)}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      isSel ? "bg-emerald-600 border-emerald-500" : "bg-neutral-950 border-neutral-850"
                    }`}
                  >
                    <Text className="text-xs font-bold text-white">{radiusVal}m</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Android battery quirks warning */}
          <View className="bg-neutral-950 p-3 rounded-2xl border border-neutral-850 mt-2 flex-row space-x-2">
            <Info size={14} color="#10b981" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                Manufacturer Warning: If you run a Xiaomi, Huawei, or OnePlus device, please disable battery optimization for LifeOS to ensure geofences register reliably in background mode.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Money Ledger preferences */}
        <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6">
          <View className="flex-row items-center space-x-2 mb-4">
            <Coins size={18} color="#f59e0b" />
            <Text className="text-sm font-bold text-white">Money & Ledger Preferences</Text>
          </View>

          {/* Currency Symbol Selection */}
          <View className="py-2.5 border-b border-neutral-850">
            <Text className="text-xs font-bold text-white mb-2">Preferred Currency Display</Text>
            <View className="flex-row gap-2">
              {["$", "₹", "€", "£", "¥"].map((sym) => {
                const isSel = currencySymbol === sym;
                return (
                  <TouchableOpacity
                    key={sym}
                    onPress={() => updateSetting("currencySymbol", sym)}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      isSel ? "bg-amber-600 border-amber-500" : "bg-neutral-950 border-neutral-850"
                    }`}
                  >
                    <Text className="text-sm font-extrabold text-white">{sym}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Money Follow up default window */}
          <View className="flex-row justify-between items-center py-2.5">
            <View>
              <Text className="text-xs font-bold text-white">Default Follow-up Window</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">Days before reminding unpaid ledger debts</Text>
            </View>
            <TextInput
              value={String(ledgerFollowUpDays)}
              onChangeText={(val) => updateSetting("ledgerFollowUpDays", parseInt(val) || 0)}
              keyboardType="numeric"
              className="text-white text-xs font-bold bg-neutral-950 px-3 py-1.5 rounded-lg border border-neutral-800 w-16 text-center"
            />
          </View>
        </View>

        {/* Section 4: Data & System administration */}
        <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6">
          <View className="flex-row items-center space-x-2 mb-4">
            <Database size={18} color="#3b82f6" />
            <Text className="text-sm font-bold text-white">Data & Backup Tools</Text>
          </View>

          {/* Export database stats */}
          <TouchableOpacity
            onPress={handleExportData}
            className="flex-row justify-between items-center py-3 border-b border-neutral-850"
          >
            <View>
              <Text className="text-xs font-bold text-white">Export System Metadata</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">Get raw JSON backups of active directory metrics</Text>
            </View>
            <Share2 size={16} color="#3b82f6" />
          </TouchableOpacity>

          {/* Reset System configuration preferences */}
          <TouchableOpacity
            onPress={handleResetApp}
            className="flex-row justify-between items-center py-3"
          >
            <View>
              <Text className="text-xs font-bold text-red-400">Reset Local Configurations</Text>
              <Text className="text-[10px] text-neutral-500 mt-0.5">Wipe custom intervals and symbols</Text>
            </View>
            <RotateCcw size={16} color="#f87171" />
          </TouchableOpacity>
        </View>

        {/* Section 5: Version & App Info */}
        <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-8 flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <Settings size={18} color="#666" />
            <View>
              <Text className="text-xs font-bold text-white">LifeOS Core Sandbox</Text>
              <Text className="text-[9px] text-neutral-500 mt-0.5">Locally encrypted data storage | Version 1.2.0</Text>
            </View>
          </View>
          <View className="bg-neutral-950 border border-neutral-850 px-2.5 py-1 rounded-xl">
            <Text className="text-[9px] font-bold text-neutral-400 uppercase">Sandbox MVP</Text>
          </View>
        </View>
      </ScrollView>

      {/* Export data preview modal */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-6 min-h-[300px]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-white">System Data Export</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Text className="text-neutral-400 text-sm">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="bg-neutral-950 p-4 rounded-2xl max-h-[220px] mb-4 border border-neutral-850">
              <Text className="text-[10px] text-neutral-400 font-mono">{exportedDataStr}</Text>
            </ScrollView>
            <TouchableOpacity
              onPress={copyToClipboard}
              className="bg-indigo-600 py-3.5 rounded-2xl items-center justify-center"
            >
              <Text className="text-white text-xs font-bold">Copy JSON to Clipboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
