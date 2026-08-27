import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { CloudOff, RefreshCw, Trash2 } from "lucide-react-native";
import { useInboxStore } from "../../store/inboxStore";

export const OfflineSyncBanner = () => {
  const { offlineQueue, isSyncing, syncOfflineItems, clearOfflineQueue } = useInboxStore();

  if (offlineQueue.length === 0) return null;

  const handleSync = async () => {
    try {
      await syncOfflineItems();
      const remaining = useInboxStore.getState().offlineQueue.length;
      if (remaining === 0) {
        Alert.alert("Sync Complete", "All offline captures synced to server successfully!");
      } else {
        Alert.alert("Sync Warning", `${remaining} item(s) could not be synced. Check network connection.`);
      }
    } catch (err: any) {
      Alert.alert("Sync Error", err.message || "Failed to sync offline items.");
    }
  };

  return (
    <View className="bg-[#202E4E] border-b border-slate-700/50 px-4 py-2.5 flex-row items-center justify-between shadow-sm">
      <View className="flex-row items-center space-x-2 flex-1 pr-2">
        <CloudOff size={16} color="#F59E0B" />
        <Text className="text-xs font-bold text-white flex-1" numberOfLines={1}>
          {offlineQueue.length} offline capture{offlineQueue.length > 1 ? "s" : ""} pending sync
        </Text>
      </View>
      <View className="flex-row items-center space-x-2">
        <TouchableOpacity
          onPress={handleSync}
          disabled={isSyncing}
          className="bg-[#E05646] px-3 py-1.5 rounded-xl flex-row items-center space-x-1.5 shadow-sm"
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <RefreshCw size={12} color="#FFFFFF" />
              <Text className="text-xs font-extrabold text-white">Sync Now</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              "Clear Offline Queue",
              "Are you sure you want to clear pending offline captures?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Clear", style: "destructive", onPress: clearOfflineQueue },
              ]
            );
          }}
          className="bg-slate-700/60 p-1.5 rounded-xl flex-row items-center justify-center"
        >
          <Trash2 size={14} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
