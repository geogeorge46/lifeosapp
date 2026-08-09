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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-6 px-4 pt-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2.5 bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
        >
          <ArrowLeft size={16} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-[#0F172A]">System Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} className="flex-1 px-4">
        {/* Section 1: Notifications & Schedule */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 shadow-sm shadow-[#0F172A]/5">
          <View className="flex-row items-center space-x-2 mb-4">
            <Bell size={18} color="#E05646" />
            <Text className="text-sm font-extrabold text-[#0F172A]">Notifications & Reminders</Text>
          </View>

          {/* Toggle Push */}
          <View className="flex-row justify-between items-center py-2.5 border-b border-[#E2E8F0]">
            <View>
              <Text className="text-xs font-bold text-[#0F172A]">Enable Push Alerts</Text>
              <Text className="text-[10px] text-[#64748B] mt-0.5 font-semibold">Toggle geofence & ledger reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => updateSetting("notificationsEnabled", val)}
              trackColor={{ false: "#E2E8F0", true: "#E05646" }}
              thumbColor={notificationsEnabled ? "#ffffff" : "#94A3B8"}
            />
          </View>

          {/* Morning recap timing */}
          <View className="flex-row justify-between items-center py-2.5 border-b border-[#E2E8F0]">
            <View>
              <Text className="text-xs font-bold text-[#0F172A]">Morning Digest Alert</Text>
              <Text className="text-[10px] text-[#64748B] mt-0.5 font-semibold">Alert schedule for daily recap</Text>
            </View>
            <TextInput
              value={morningRecapTime}
              onChangeText={(val) => updateSetting("morningRecapTime", val)}
              placeholder="HH:MM"
              placeholderTextColor="#94A3B8"
              className="text-[#0F172A] text-xs font-bold bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0] w-16 text-center font-semibold"
            />
          </View>

          {/* Evening check-in timing */}
          <View className="flex-row justify-between items-center py-2.5 border-b border-[#E2E8F0]">
            <View>
              <Text className="text-xs font-bold text-[#0F172A]">Evening Log Prompt</Text>
              <Text className="text-[10px] text-[#64748B] mt-0.5 font-semibold">Alert schedule for task audits</Text>
            </View>
            <TextInput
              value={eveningCheckinTime}
              onChangeText={(val) => updateSetting("eveningCheckinTime", val)}
              placeholder="HH:MM"
              placeholderTextColor="#94A3B8"
              className="text-[#0F172A] text-xs font-bold bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0] w-16 text-center font-semibold"
            />
          </View>

          {/* Resurfacing snooze */}
          <View className="flex-row justify-between items-center py-2.5">
            <View>
              <Text className="text-xs font-bold text-[#0F172A]">Task Resurface Interval</Text>
              <Text className="text-[10px] text-[#64748B] mt-0.5 font-semibold">Snooze time before tasks re-appear</Text>
            </View>
            <TextInput
              value={String(snoozeIntervalMinutes)}
              onChangeText={(val) => updateSetting("snoozeIntervalMinutes", parseInt(val) || 0)}
              keyboardType="numeric"
              className="text-[#0F172A] text-xs font-bold bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0] w-16 text-center font-semibold"
            />
          </View>
        </View>

        {/* Section 2: Location & Geofencing */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 shadow-sm shadow-[#0F172A]/5">
          <View className="flex-row items-center space-x-2 mb-4">
            <MapPin size={18} color="#E05646" />
            <Text className="text-sm font-bold text-[#0F172A]">Location & Geofencing</Text>
          </View>

          {/* Background Location Status */}
          <View className="py-2.5 border-b border-[#E2E8F0]">
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="text-xs font-bold text-[#0F172A]">Always-Allow Location</Text>
                <Text className="text-[10px] text-[#64748B] mt-0.5 font-medium">Required for background entry alerts</Text>
              </View>
              <Text
                className={`text-xs font-bold ${
                  bgPermStatus.includes("Granted") ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {bgPermStatus}
              </Text>
            </View>
            {!bgPermStatus.includes("Granted") && (
              <TouchableOpacity
                onPress={handleRequestBgPermission}
                className="mt-3 bg-[#F8FAFC] border border-[#E2E8F0] py-2 rounded-xl items-center"
              >
                <Text className="text-[#0F172A] text-xs font-bold">Request Location Permission</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Default Radius */}
          <View className="py-2.5 border-b border-[#E2E8F0]">
            <Text className="text-xs font-bold text-[#0F172A] mb-2">Default Geofence Radius</Text>
            <View className="flex-row gap-2">
              {[50, 150, 300, 500].map((radiusVal) => {
                const isSel = defaultGeofenceRadius === radiusVal;
                return (
                  <TouchableOpacity
                    key={radiusVal}
                    onPress={() => updateSetting("defaultGeofenceRadius", radiusVal)}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      isSel ? "bg-[#E05646] border-[#E05646]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${isSel ? "text-white" : "text-[#64748B]"}`}>{radiusVal}m</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Android battery quirks warning */}
          <View className="bg-slate-50 p-3 rounded-2xl border border-slate-200 mt-2 flex-row space-x-2">
            <Info size={14} color="#E05646" style={{ marginTop: 2 }} />
            <View className="flex-1">
              <Text className="text-[10px] text-[#64748B] font-semibold leading-relaxed">
                Manufacturer Warning: If you run a Xiaomi, Huawei, or OnePlus device, please disable battery optimization for LifeOS to ensure geofences register reliably in background mode.
              </Text>
            </View>
          </View>
        </View>

        {/* Section 3: Money Ledger preferences */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 shadow-sm shadow-[#0F172A]/5">
          <View className="flex-row items-center space-x-2 mb-4">
            <Coins size={18} color="#E05646" />
            <Text className="text-sm font-bold text-[#0F172A]">Money & Ledger Preferences</Text>
          </View>

          {/* Currency Symbol Selection */}
          <View className="py-2.5 border-b border-[#E2E8F0]">
            <Text className="text-xs font-bold text-[#0F172A] mb-2">Preferred Currency Display</Text>
            <View className="flex-row gap-2">
              {["$", "₹", "€", "£", "¥"].map((sym) => {
                const isSel = currencySymbol === sym;
                return (
                  <TouchableOpacity
                    key={sym}
                    onPress={() => updateSetting("currencySymbol", sym)}
                    className={`flex-1 py-2 rounded-xl border items-center justify-center ${
                      isSel ? "bg-[#E05646] border-[#E05646]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                    }`}
                  >
                    <Text className={`text-sm font-extrabold ${isSel ? "text-white" : "text-[#64748B]"}`}>{sym}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Money Follow up default window */}
          <View className="flex-row justify-between items-center py-2.5">
            <View>
              <Text className="text-xs font-bold text-[#0F172A]">Default Follow-up Window</Text>
              <Text className="text-[10px] text-[#64748B] mt-0.5 font-semibold">Days before reminding unpaid ledger debts</Text>
            </View>
            <TextInput
              value={String(ledgerFollowUpDays)}
              onChangeText={(val) => updateSetting("ledgerFollowUpDays", parseInt(val) || 0)}
              keyboardType="numeric"
              className="text-[#0F172A] text-xs font-bold bg-[#F8FAFC] px-3 py-1.5 rounded-lg border border-[#E2E8F0] w-16 text-center font-semibold"
            />
          </View>
        </View>

        {/* Section 4: Data & System administration */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 shadow-sm shadow-[#0F172A]/5">
          <View className="flex-row items-center space-x-2 mb-4">
            <Database size={18} color="#202E4E" />
            <Text className="text-sm font-bold text-[#0F172A]">Data & Backup Tools</Text>
          </View>

          {/* Export database stats */}
          <TouchableOpacity
            onPress={handleExportData}
            className="flex-row justify-between items-center py-3 border-b border-[#E2E8F0]"
          >
            <View>
              <Text className="text-xs font-bold text-[#0F172A]">Export System Metadata</Text>
              <Text className="text-[10px] text-[#64748B] mt-0.5 font-medium">Get raw JSON backups of active directory metrics</Text>
            </View>
            <Share2 size={16} color="#E05646" />
          </TouchableOpacity>

          {/* Reset System configuration preferences */}
          <TouchableOpacity
            onPress={handleResetApp}
            className="flex-row justify-between items-center py-3"
          >
            <View>
              <Text className="text-xs font-bold text-rose-600">Reset Local Configurations</Text>
              <Text className="text-[10px] text-[#64748B] mt-0.5 font-medium">Wipe custom intervals and symbols</Text>
            </View>
            <RotateCcw size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Section 5: Version & App Info */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-8 flex-row items-center justify-between shadow-sm shadow-[#0F172A]/5">
          <View className="flex-row items-center space-x-2">
            <Settings size={18} color="#64748B" />
            <View>
              <Text className="text-xs font-bold text-[#0F172A]">LifeOS Core Sandbox</Text>
              <Text className="text-[9px] text-[#64748B] mt-0.5 font-semibold">Locally encrypted data storage | Version 1.2.0</Text>
            </View>
          </View>
          <View className="bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
            <Text className="text-[9px] font-bold text-[#64748B] uppercase">Sandbox MVP</Text>
          </View>
        </View>
      </ScrollView>

      {/* Export data preview modal */}
      <Modal visible={showExportModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-slate-900/30">
          <View className="bg-white border-t border-t-[#E2E8F0] rounded-t-3xl p-6 min-h-[300px] shadow-2xl">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-extrabold text-[#0F172A]">System Data Export</Text>
              <TouchableOpacity onPress={() => setShowExportModal(false)}>
                <Text className="text-[#64748B] text-sm font-bold">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="bg-[#F8FAFC] p-4 rounded-2xl max-h-[220px] mb-4 border border-[#E2E8F0]">
              <Text className="text-[10px] text-[#0F172A] font-mono">{exportedDataStr}</Text>
            </ScrollView>
            <TouchableOpacity
              onPress={copyToClipboard}
              className="bg-[#E05646] py-3.5 rounded-2xl items-center justify-center shadow-md shadow-[#E05646]/20"
            >
              <Text className="text-white text-xs font-bold">Copy JSON to Clipboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
