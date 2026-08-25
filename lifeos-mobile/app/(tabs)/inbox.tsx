import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Mic,
  Send,
  Trash2,
  Archive,
  Wifi,
  WifiOff,
  RefreshCw,
  Play,
  FileText,
  Volume2,
  Folder,
  FolderPlus,
  Plus,
  Tag,
  ChevronDown,
  Calendar as CalendarIcon,
  ListTodo,
  Lightbulb,
  Edit2,
  FolderOpen,
} from "lucide-react-native";
import { DatePickerModal } from "../../src/components/common/DatePickerModal";
import { useInboxStore } from "../../src/store/inboxStore";
import { apiService, BrainDump } from "../../src/services/api";
import { audioRecordingService } from "../../src/services/audio";

const ENTRY_TYPES = ["All", "THOUGHT", "IDEA", "QUESTION", "PROBLEM", "NOTE"];

export default function InboxScreen() {
  const {
    items,
    collections,
    activeCollectionId,
    activeType,
    offlineQueue,
    isLoading,
    isSyncing,
    fetchInbox,
    fetchCollections,
    createCollection,
    deleteCollection,
    moveToCollection,
    updateItemType,
    updateItemContent,
    setActiveFilters,
    captureText,
    captureAudio,
    syncOfflineItems,
    archiveItem,
    deleteItem,
  } = useInboxStore();

  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // New Folder Creation Modal State
  const [newFolderVisible, setNewFolderVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Details options modal
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDump, setSelectedDump] = useState<BrainDump | null>(null);
  const [editText, setEditText] = useState("");

  // Spawning task/event overlays states
  const [spawnTaskVisible, setSpawnTaskVisible] = useState(false);
  const [spawnEventVisible, setSpawnEventVisible] = useState(false);
  const [spawnIdeaVisible, setSpawnIdeaVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"TASK" | "EVENT_START" | "EVENT_END">("TASK");

  // Form parameters
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");

  const [eventTitle, setEventTitle] = useState("");
  const [eventNotes, setEventNotes] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("10:00 AM");
  const [eventEndTime, setEventEndTime] = useState("11:00 AM");

  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("Product");

  const [isSavingSpawn, setIsSavingSpawn] = useState(false);

  // Load datasets on mount
  useEffect(() => {
    fetchInbox();
    fetchCollections();
  }, []);

  // Sync automatically
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      syncOfflineItems();
    }
  }, [isOnline, offlineQueue.length]);

  // Duration timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordDuration(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleSendText = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText("");
    await captureText(content, isOnline);
  };

  const handleToggleRecording = async () => {
    try {
      if (!isRecording) {
        setIsRecording(true);
        await audioRecordingService.startRecording();
      } else {
        setIsRecording(false);
        const fileUri = await audioRecordingService.stopRecording();
        if (fileUri) {
          await captureAudio(fileUri, isOnline);
        } else {
          Alert.alert("Error", "Could not locate audio file URI.");
        }
      }
    } catch (err: any) {
      setIsRecording(false);
      Alert.alert("Microphone Error", err.message || "Failed to record voice clip");
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createCollection(newFolderName.trim());
      setNewFolderName("");
      setNewFolderVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create folder");
    }
  };

  // Entry selection details modal launcher
  const handleOpenDetailModal = (item: BrainDump) => {
    setSelectedDump(item);
    setEditText(item.contentType === "AUDIO" ? item.rawText || "" : item.content);
    setDetailModalVisible(true);
  };

  const handleSaveTextChanges = async () => {
    if (!selectedDump || !editText.trim()) return;
    try {
      await updateItemContent(selectedDump.id, editText.trim());
      setSelectedDump((prev) => {
        if (!prev) return null;
        if (prev.contentType === "AUDIO") {
          return { ...prev, rawText: editText.trim() };
        } else {
          return { ...prev, content: editText.trim() };
        }
      });
      Alert.alert("Success", "Capture content updated!");
    } catch (err: any) {
      Alert.alert("Error", "Failed to update content");
    }
  };

  const handleMoveCollection = async (collectionId: string | null) => {
    if (!selectedDump) return;
    try {
      await moveToCollection(selectedDump.id, collectionId);
      setSelectedDump((prev) => (prev ? { ...prev, collectionId } : null));
    } catch (err) {
      Alert.alert("Error", "Failed to move folder");
    }
  };

  const handleUpdateType = async (type: string | null) => {
    if (!selectedDump) return;
    try {
      const dbType = type === "All" ? null : type;
      await updateItemType(selectedDump.id, dbType);
      setSelectedDump((prev) => (prev ? { ...prev, type: dbType } : null));
    } catch (err) {
      Alert.alert("Error", "Failed to update category");
    }
  };

  // Spawners triggers
  const handleOpenSpawnTask = () => {
    if (!selectedDump) return;
    setTaskTitle(selectedDump.contentType === "TEXT" ? selectedDump.content : selectedDump.rawText || "");
    setTaskNotes("");
    setTaskDate(new Date().toISOString().split("T")[0]);
    setTaskTime("10:00 AM");
    setSpawnTaskVisible(true);
  };

  const handleOpenSpawnEvent = () => {
    if (!selectedDump) return;
    setEventTitle(selectedDump.contentType === "TEXT" ? selectedDump.content : selectedDump.rawText || "");
    setEventNotes("");
    const today = new Date().toISOString().split("T")[0];
    setEventDate(today);
    setEventEndDate(today);
    setEventStartTime("10:00 AM");
    setEventEndTime("11:00 AM");
    setSpawnEventVisible(true);
  };

  const handleOpenSpawnIdea = () => {
    if (!selectedDump) return;
    setIdeaTitle(selectedDump.contentType === "TEXT" ? selectedDump.content : selectedDump.rawText || "");
    setIdeaNotes("");
    setIdeaCategory("Product");
    setSpawnIdeaVisible(true);
  };

  const convertTo24h = (time12h: string): string => {
    const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return "10:00";
    let hour = parseInt(match[1], 10);
    const minute = match[2];
    const ampm = match[3].toUpperCase();

    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;

    const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
    return `${hourStr}:${minute}`;
  };

  const handleSaveSpawnTask = async () => {
    if (!selectedDump || !taskTitle.trim() || !taskDate.trim()) return;
    setIsSavingSpawn(true);
    try {
      const timePart = taskTime.trim() ? ` at ${taskTime.trim()}` : "";
      const rawInput = `${taskTitle.trim()} on ${taskDate.trim()}${timePart}`;
      await apiService.createTask(rawInput, taskNotes.trim() || undefined);
      
      // Update BrainDump status to PROCESSED
      await apiService.processInboxItem(selectedDump.id);
      
      setSpawnTaskVisible(false);
      setDetailModalVisible(false);
      fetchInbox();
      Alert.alert("Success", "Task created successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create task");
    } finally {
      setIsSavingSpawn(false);
    }
  };

  const handleSaveSpawnEvent = async () => {
    if (!selectedDump || !eventTitle.trim() || !eventDate.trim() || !eventEndDate.trim()) return;
    const startMatch = eventDate.trim().match(/^\d{4}-\d{2}-\d{2}$/);
    const endMatch = eventEndDate.trim().match(/^\d{4}-\d{2}-\d{2}$/);
    if (!startMatch || !endMatch) {
      Alert.alert("Invalid Date Format", "Please enter start and end dates in YYYY-MM-DD format.");
      return;
    }

    setIsSavingSpawn(true);
    try {
      // Compose dates using robust parts constructor
      const [startY, startM, startD] = eventDate.trim().split("-").map(Number);
      const [endY, endM, endD] = eventEndDate.trim().split("-").map(Number);
      const [startH, startMin] = convertTo24h(eventStartTime).split(":").map(Number);
      const [endH, endMin] = convertTo24h(eventEndTime).split(":").map(Number);

      const start = new Date(startY, startM - 1, startD, startH, startMin);
      const end = new Date(endY, endM - 1, endD, endH, endMin);
      
      await apiService.createEvent({
        title: eventTitle.trim(),
        description: eventNotes.trim() || undefined,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        brainDumpId: selectedDump.id,
      });

      setSpawnEventVisible(false);
      setDetailModalVisible(false);
      fetchInbox();
      Alert.alert("Success", "Calendar Event created successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create event");
    } finally {
      setIsSavingSpawn(false);
    }
  };

  const handleSaveSpawnIdea = async () => {
    if (!selectedDump || !ideaTitle.trim()) return;
    setIsSavingSpawn(true);
    try {
      await apiService.createIdea({
        title: ideaTitle.trim(),
        notes: ideaNotes.trim() || undefined,
        category: ideaCategory,
        brainDumpId: selectedDump.id,
      });

      // Update BrainDump status to PROCESSED
      await apiService.processInboxItem(selectedDump.id);

      setSpawnIdeaVisible(false);
      setDetailModalVisible(false);
      fetchInbox();
      Alert.alert("Success", "Refined Concept (Idea) saved!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save Idea");
    } finally {
      setIsSavingSpawn(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header bar */}
        <View className="flex-row justify-between items-center mb-4 px-4">
          <View>
            <Text className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Brain Dump</Text>
            <Text className="text-xs text-[#64748B] mt-1 font-semibold">Get it out of your head immediately.</Text>
          </View>

          <View className="bg-white border border-[#E2E8F0] rounded-full px-3 py-1 flex-row items-center space-x-2 shadow-sm shadow-[#0F172A]/5">
            {isOnline ? (
              <Wifi size={12} color="#10B981" />
            ) : (
              <WifiOff size={12} color="#EF4444" />
            )}
            <Text className="text-[10px] text-[#0F172A] font-bold">{isOnline ? "Online" : "Offline"}</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              thumbColor={isOnline ? "#10B981" : "#EF4444"}
              trackColor={{ false: "#FCA5A5", true: "#A7F3D0" }}
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
            />
          </View>
        </View>

        {/* Collections Folders Horizontal Scroller */}
        <View className="mb-3 px-4">
          <View className="flex-row justify-between items-center mb-2 px-1">
            <Text className="text-[10px] font-black text-[#64748B] uppercase tracking-wider">Collections</Text>
            <TouchableOpacity onPress={() => setNewFolderVisible(true)} className="flex-row items-center bg-white border border-[#E2E8F0] px-2.5 py-1.5 rounded-xl shadow-sm">
              <FolderPlus size={11} color="#64748B" />
              <Text className="text-[9px] text-[#64748B] font-bold ml-1">New Folder</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
            <TouchableOpacity
              onPress={() => setActiveFilters(null, activeType)}
              className={`px-4 py-2.5 rounded-full border mr-2 flex-row items-center space-x-1.5 ${
                activeCollectionId === null
                  ? "bg-[#202E4E] border-[#202E4E] shadow-sm shadow-[#202E4E]/20"
                  : "bg-white border-[#E2E8F0] shadow-sm shadow-[#0F172A]/5"
              }`}
            >
              <FolderOpen size={12} color={activeCollectionId === null ? "#FFFFFF" : "#64748B"} />
              <Text className={`text-xs font-bold ${activeCollectionId === null ? "text-white" : "text-[#64748B]"}`}>All Captures</Text>
            </TouchableOpacity>

            {collections.map((col) => (
              <TouchableOpacity
                key={col.id}
                onPress={() => setActiveFilters(col.id, activeType)}
                onLongPress={() => {
                  Alert.alert(
                     "Delete Collection",
                     `Are you sure you want to delete folder "${col.name}"? Captures inside will not be deleted but will become unassigned.`,
                     [
                       { text: "Cancel", style: "cancel" },
                       { text: "Delete", style: "destructive", onPress: () => deleteCollection(col.id) }
                     ]
                  );
                }}
                className={`px-4 py-2.5 rounded-full border mr-2 flex-row items-center space-x-1.5 ${
                  activeCollectionId === col.id
                    ? "bg-[#202E4E] border-[#202E4E] shadow-sm shadow-[#202E4E]/20"
                    : "bg-white border-[#E2E8F0] shadow-sm shadow-[#0F172A]/5"
                }`}
              >
                <Folder size={12} color={activeCollectionId === col.id ? "#FFFFFF" : "#64748B"} />
                <Text className={`text-xs font-bold ${activeCollectionId === col.id ? "text-white" : "text-[#64748B]"}`}>{col.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Type pills horizontal scroller */}
        <View className="mb-4 px-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
            {ENTRY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setActiveFilters(activeCollectionId, type)}
                className={`px-3 py-2 rounded-xl border mr-1.5 ${
                  activeType === type
                    ? "bg-[#E05646] border-[#E05646] shadow-sm shadow-[#E05646]/20"
                    : "bg-white border-[#E2E8F0] shadow-sm shadow-[#0F172A]/5"
                }`}
              >
                <Text
                  className={`text-[9px] font-black uppercase tracking-wider ${
                    activeType === type ? "text-white" : "text-[#64748B]"
                  }`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List of Brain Captures */}
        <View className="flex-1 mb-3 px-4">
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#E05646" />
            </View>
          ) : items.length === 0 ? (
            <View className="flex-1 justify-center items-center py-12 px-6">
              <Volume2 size={48} color="#94A3B8" />
              <Text className="text-sm font-bold text-[#0F172A] mt-4 text-center">
                Clean Brain Space
              </Text>
              <Text className="text-[10px] text-[#64748B] mt-1 text-center max-w-[240px] font-medium">
                No captures found matching your active filters. Unload something below.
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 130 }}
              renderItem={({ item }) => {
                const isTemp = item.id.startsWith("temp-");
                return (
                  <TouchableOpacity
                    onPress={() => !isTemp && handleOpenDetailModal(item)}
                    className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-2.5 active:bg-[#F8FAFC] shadow-sm shadow-[#0F172A]/5"
                  >
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center space-x-2">
                        {item.contentType === "TEXT" ? (
                          <FileText size={11} color="#64748B" />
                        ) : (
                          <Play size={11} color="#E05646" />
                        )}
                        <Text className="text-[9px] font-black text-[#64748B] uppercase tracking-widest">
                          {item.contentType}
                        </Text>
                        {item.type && (
                          <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            <Text className="text-[8px] font-bold text-amber-700 uppercase tracking-wide">{item.type}</Text>
                          </View>
                        )}
                        {item.collection?.name && (
                          <View className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                            <Text className="text-[8px] font-bold text-[#0F172A] uppercase tracking-wide">{item.collection.name}</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text className="text-[9px] text-[#94A3B8] font-bold">
                        {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </Text>
                    </View>

                    {item.contentType === "TEXT" ? (
                      <Text className="text-[#0F172A] text-sm font-semibold leading-relaxed" numberOfLines={2}>{item.content}</Text>
                    ) : (
                      <View>
                        <Text className="text-[11px] text-[#94A3B8] italic font-semibold" numberOfLines={1}>{item.content}</Text>
                        {item.rawText && (
                          <Text className="text-[#64748B] text-xs font-semibold italic mt-1 leading-relaxed" numberOfLines={2}>
                            "{item.rawText}"
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Input Bar */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-3 mb-4 flex-row items-end space-x-3 shadow-lg shadow-[#0F172A]/10">
          <TextInput
            placeholder={isRecording ? "Listening to your mind..." : "Write a capture note..."}
            placeholderTextColor="#94A3B8"
            value={text}
            onChangeText={setText}
            editable={!isRecording}
            multiline
            maxLength={500}
            className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-2xl px-4 py-3 max-h-24 border border-[#E2E8F0] text-left"
          />

          <View className="flex-row items-center space-x-2 pb-0.5">
            <TouchableOpacity
              onPress={handleToggleRecording}
              className={`p-3 rounded-2xl flex-row items-center justify-center ${
                isRecording ? "bg-[#EF4444] scale-105" : "bg-slate-50 border border-slate-200"
              }`}
            >
              <Mic size={16} color={isRecording ? "#FFFFFF" : "#0F172A"} />
              {isRecording && (
                <Text className="text-white text-xs font-bold ml-1.5 pr-0.5">
                  {formatDuration(recordDuration)}
                </Text>
              )}
            </TouchableOpacity>

            {!isRecording && text.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSendText}
                className="bg-[#E05646] p-3 rounded-2xl flex-row items-center justify-center"
              >
                <Send size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* NEW COLLECTION MODAL */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={newFolderVisible}
        onRequestClose={() => setNewFolderVisible(false)}
      >
        <View className="flex-1 bg-[#0F172A]/40 justify-center items-center px-6">
          <View className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full shadow-2xl">
            <Text className="text-base font-extrabold text-[#0F172A] mb-1.5">New Collection Folder</Text>
            <Text className="text-xs text-[#64748B] mb-4">Group thoughts on college, geofencing, app features, etc.</Text>
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="e.g. App Features"
              placeholderTextColor="#94A3B8"
              className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 text-[#0F172A] rounded-2xl text-sm mb-4 text-left"
            />
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setNewFolderVisible(false)} className="flex-1 bg-slate-50 p-3.5 rounded-xl border border-slate-200 items-center">
                <Text className="text-xs font-bold text-[#64748B]">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateFolder} className="flex-1 bg-[#E05646] p-3.5 rounded-xl items-center shadow-md shadow-[#E05646]/20">
                <Text className="text-xs font-bold text-white">Create Folder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* BRAIN DUMP ACTIONS OVERLAY BOARD */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View className="flex-1 bg-[#0F172A]/50 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-center border-b border-[#E2E8F0] pb-3 mb-4">
              <Text className="text-base font-extrabold text-[#0F172A] tracking-tight">Brain Dump Entry</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text className="text-xs text-[#64748B] font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 320, maxHeight: 480, marginBottom: 16 }}>
              {/* Content Panel Editable */}
              <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-1.5">Edit Raw Thoughts</Text>
              <TextInput
                value={editText}
                onChangeText={setEditText}
                multiline
                numberOfLines={3}
                placeholder="Capture notes..."
                placeholderTextColor="#94A3B8"
                className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-2xl p-4 text-sm mb-4 text-left"
              />

              <TouchableOpacity onPress={handleSaveTextChanges} className="bg-white border border-[#E2E8F0] py-3.5 rounded-2xl items-center mb-4 flex-row justify-center space-x-1.5 shadow-sm shadow-[#0F172A]/5">
                <Edit2 size={13} color="#0F172A" />
                <Text className="text-xs font-bold text-[#0F172A]">Save Changes</Text>
              </TouchableOpacity>

              {/* Assignment Selectors */}
              <View className="mb-4">
                <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Classify Type</Text>
                <View className="flex-row flex-wrap">
                  {ENTRY_TYPES.filter(t => t !== "All").map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => handleUpdateType(type)}
                      className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
                        selectedDump?.type === type
                          ? "bg-[#E05646] border-[#E05646]"
                          : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <Text className={`text-[10px] font-bold ${selectedDump?.type === type ? "text-white" : "text-[#64748B]"}`}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => handleUpdateType(null)}
                    className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
                      selectedDump?.type === null ? "bg-[#E05646] border-[#E05646]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                    }`}
                  >
                    <Text className={`text-[10px] font-bold ${selectedDump?.type === null ? "text-white" : "text-[#64748B]"}`}>Unassigned</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Move Folder Collection</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  <TouchableOpacity
                    onPress={() => handleMoveCollection(null)}
                    className={`px-3.5 py-2 rounded-xl border mr-2 ${
                      selectedDump?.collectionId === null ? "bg-[#202E4E] border-[#202E4E]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${selectedDump?.collectionId === null ? "text-white" : "text-[#64748B]"}`}>None</Text>
                  </TouchableOpacity>
                  {collections.map((col) => (
                    <TouchableOpacity
                      key={col.id}
                      onPress={() => handleMoveCollection(col.id)}
                      className={`px-3.5 py-2 rounded-xl border mr-2 ${
                        selectedDump?.collectionId === col.id ? "bg-[#202E4E] border-[#202E4E]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <Text className={`text-xs font-bold ${selectedDump?.collectionId === col.id ? "text-white" : "text-[#64748B]"}`}>{col.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Action Spawn Panels */}
              <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2.5">Organize & Act Spawners</Text>
              
              <View className="space-y-2 mb-4">
                <TouchableOpacity onPress={handleOpenSpawnIdea} className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex-row items-center justify-between shadow-sm">
                  <View className="flex-row items-center space-x-3">
                    <Lightbulb size={16} color="#F59E0B" />
                    <View>
                      <Text className="text-[#0F172A] text-xs font-bold">Create Idea blueprint</Text>
                      <Text className="text-[9px] text-[#64748B]">Refine details, notes, and specs</Text>
                    </View>
                  </View>
                  <ChevronDown size={14} color="#64748B" style={{ transform: [{ rotate: "-90deg" }] }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleOpenSpawnTask} className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex-row items-center justify-between shadow-sm">
                  <View className="flex-row items-center space-x-3">
                    <ListTodo size={16} color="#E05646" />
                    <View>
                      <Text className="text-[#0F172A] text-xs font-bold">Create Task commitment</Text>
                      <Text className="text-[9px] text-[#64748B]">Add to scheduled/habit execution checklists</Text>
                    </View>
                  </View>
                  <ChevronDown size={14} color="#64748B" style={{ transform: [{ rotate: "-90deg" }] }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleOpenSpawnEvent} className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl flex-row items-center justify-between shadow-sm">
                  <View className="flex-row items-center space-x-3">
                    <CalendarIcon size={16} color="#10B981" />
                    <View>
                      <Text className="text-[#0F172A] text-xs font-bold">Create Event appointment</Text>
                      <Text className="text-[9px] text-[#64748B]">Pin to specific dates and hours bounds</Text>
                    </View>
                  </View>
                  <ChevronDown size={14} color="#64748B" style={{ transform: [{ rotate: "-90deg" }] }} />
                </TouchableOpacity>
              </View>

              {/* Dismiss / Delete operations */}
              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={async () => {
                    if (!selectedDump) return;
                    await archiveItem(selectedDump.id);
                    setDetailModalVisible(false);
                    fetchInbox();
                    Alert.alert("Success", "Capture item archived!");
                  }}
                  className="flex-1 bg-amber-50 border border-amber-200 p-3.5 rounded-2xl items-center flex-row justify-center space-x-1.5"
                >
                  <Archive size={13} color="#D97706" />
                  <Text className="text-xs font-bold text-amber-700">Archive Capture</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    if (!selectedDump) return;
                    Alert.alert(
                      "Delete Capture",
                      "Delete this raw thought permanently?",
                      [
                        { text: "Cancel" },
                        {
                          text: "Delete",
                          style: "destructive",
                          onPress: async () => {
                            await deleteItem(selectedDump.id);
                            setDetailModalVisible(false);
                            fetchInbox();
                          }
                        }
                      ]
                    );
                  }}
                  className="flex-1 bg-red-50 border border-red-100 p-3.5 rounded-2xl items-center flex-row justify-center space-x-1.5"
                >
                  <Trash2 size={13} color="#EF4444" />
                  <Text className="text-xs font-bold text-red-600">Delete Raw</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TASK SPAWNER PREFILL */}
      <Modal visible={spawnTaskVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-[#0F172A]/40 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full max-h-[80%] shadow-2xl">
            <Text className="text-base font-extrabold text-[#0F172A] mb-4">Create Task Commitment</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Title</Text>
              <TextInput value={taskTitle} onChangeText={setTaskTitle} className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4 text-left" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Notes / Description</Text>
              <TextInput value={taskNotes} onChangeText={setTaskNotes} placeholder="Add context..." placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4 text-left" multiline />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Schedule Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setDatePickerTarget("TASK");
                  setDatePickerVisible(true);
                }}
                className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] mb-4 flex-row justify-between items-center"
              >
                <Text className={`text-sm font-semibold ${taskDate ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                  {taskDate ? `📅 ${taskDate}` : "Select Schedule Date (Tap for Calendar)"}
                </Text>
                <CalendarIcon size={16} color="#E05646" />
              </TouchableOpacity>

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Time (Optional)</Text>
              <TextInput value={taskTime} onChangeText={setTaskTime} placeholder="e.g. 10:00 AM" placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] text-left" />
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setSpawnTaskVisible(false)} className="flex-1 bg-slate-50 p-3.5 border border-slate-200 rounded-xl items-center"><Text className="text-xs font-bold text-[#64748B]">Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpawnTask} disabled={isSavingSpawn} className="flex-1 bg-[#E05646] p-3.5 rounded-xl items-center shadow-sm">
                {isSavingSpawn ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-white">Save Task</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EVENT SPAWNER PREFILL */}
      <Modal visible={spawnEventVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-[#0F172A]/40 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full max-h-[80%] shadow-2xl">
            <Text className="text-base font-extrabold text-[#0F172A] mb-4">Create Event Appointment</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Event Title</Text>
              <TextInput value={eventTitle} onChangeText={setEventTitle} className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4 text-left" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Notes / Description</Text>
              <TextInput value={eventNotes} onChangeText={setEventNotes} placeholder="Details..." placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4 text-left" multiline />

              <View className="flex-row space-x-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Start Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setDatePickerTarget("EVENT_START");
                      setDatePickerVisible(true);
                    }}
                    className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] flex-row justify-between items-center"
                  >
                    <Text className={`text-xs font-semibold ${eventDate ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                      {eventDate || "YYYY-MM-DD"}
                    </Text>
                    <CalendarIcon size={14} color="#E05646" />
                  </TouchableOpacity>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">End Date</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setDatePickerTarget("EVENT_END");
                      setDatePickerVisible(true);
                    }}
                    className="bg-[#F8FAFC] p-3.5 rounded-2xl border border-[#E2E8F0] flex-row justify-between items-center"
                  >
                    <Text className={`text-xs font-semibold ${eventEndDate ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                      {eventEndDate || "YYYY-MM-DD"}
                    </Text>
                    <CalendarIcon size={14} color="#E05646" />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Start</Text>
                  <TextInput value={eventStartTime} onChangeText={setEventStartTime} className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] text-left" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">End</Text>
                  <TextInput value={eventEndTime} onChangeText={setEventEndTime} className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] text-left" />
                </View>
              </View>
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setSpawnEventVisible(false)} className="flex-1 bg-slate-50 p-3.5 border border-slate-200 rounded-xl items-center"><Text className="text-xs font-bold text-[#64748B]">Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpawnEvent} disabled={isSavingSpawn} className="flex-1 bg-[#10B981] p-3.5 rounded-xl items-center shadow-sm">
                {isSavingSpawn ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-white">Save Event</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* IDEA SPAWNER PREFILL */}
      <Modal visible={spawnIdeaVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-[#0F172A]/40 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full max-h-[80%] shadow-2xl">
            <Text className="text-base font-extrabold text-[#0F172A] mb-4">Create Refined Idea Blueprint</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Concept Title</Text>
              <TextInput value={ideaTitle} onChangeText={setIdeaTitle} className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4 text-left" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Category (e.g. Geofencing, Business)</Text>
              <TextInput value={ideaCategory} onChangeText={setIdeaCategory} placeholder="Category..." placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4 text-left" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Refined Use Cases / Notes</Text>
              <TextInput value={ideaNotes} onChangeText={setIdeaNotes} placeholder="Notes, descriptions, specs..." placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] text-left" multiline />
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setSpawnIdeaVisible(false)} className="flex-1 bg-slate-50 p-3.5 border border-slate-200 rounded-xl items-center"><Text className="text-xs font-bold text-[#64748B]">Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpawnIdea} disabled={isSavingSpawn} className="flex-1 bg-[#F59E0B] p-3.5 rounded-xl items-center shadow-sm">
                {isSavingSpawn ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text className="text-xs font-bold text-white">Save Idea</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={datePickerVisible}
        title={
          datePickerTarget === "TASK"
            ? "Select Schedule Date"
            : datePickerTarget === "EVENT_START"
            ? "Select Event Start Date"
            : "Select Event End Date"
        }
        initialDate={
          (datePickerTarget === "TASK"
            ? taskDate
            : datePickerTarget === "EVENT_START"
            ? eventDate
            : eventEndDate) || undefined
        }
        onSelectDate={(selectedStr: string) => {
          if (datePickerTarget === "TASK") {
            setTaskDate(selectedStr);
          } else if (datePickerTarget === "EVENT_START") {
            setEventDate(selectedStr);
          } else {
            setEventEndDate(selectedStr);
          }
        }}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}
