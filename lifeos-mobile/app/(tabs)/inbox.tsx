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
  Calendar,
  ListTodo,
  Lightbulb,
  Edit2,
  FolderOpen,
} from "lucide-react-native";
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
    <SafeAreaView className="flex-1 bg-black px-4 pt-4" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Header bar */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-3xl font-extrabold text-white tracking-tight">Brain Dump</Text>
            <Text className="text-xs text-neutral-400 mt-1">Get it out of your head immediately.</Text>
          </View>

          <View className="bg-neutral-900 border border-neutral-800 rounded-full px-3 py-1 flex-row items-center space-x-2">
            {isOnline ? (
              <Wifi size={13} color="#10B981" />
            ) : (
              <WifiOff size={13} color="#EF4444" />
            )}
            <Text className="text-[10px] text-white font-medium">{isOnline ? "Online" : "Offline"}</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              thumbColor={isOnline ? "#10B981" : "#EF4444"}
              trackColor={{ false: "#7f1d1d", true: "#064e3b" }}
              style={{ transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] }}
            />
          </View>
        </View>

        {/* Collections Folders Horizontal Scroller */}
        <View className="mb-3">
          <View className="flex-row justify-between items-center mb-2 px-1">
            <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Collections</Text>
            <TouchableOpacity onPress={() => setNewFolderVisible(true)} className="flex-row items-center">
              <FolderPlus size={11} color="#A3A3A3" />
              <Text className="text-[10px] text-neutral-400 font-bold ml-1">New Collection</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
            <TouchableOpacity
              onPress={() => setActiveFilters(null, activeType)}
              className={`px-4 py-2 rounded-full border mr-2 flex-row items-center space-x-1.5 ${
                activeCollectionId === null
                  ? "bg-indigo-600 border-indigo-500"
                  : "bg-neutral-900 border-neutral-850"
              }`}
            >
              <FolderOpen size={12} color="#fff" />
              <Text className="text-xs font-bold text-white">All Captures</Text>
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
                className={`px-4 py-2 rounded-full border mr-2 flex-row items-center space-x-1.5 ${
                  activeCollectionId === col.id
                    ? "bg-indigo-600 border-indigo-500"
                    : "bg-neutral-900 border-neutral-850"
                }`}
              >
                <Folder size={12} color="#fff" />
                <Text className="text-xs font-bold text-white">{col.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Type pills horizontal scroller */}
        <View className="mb-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row py-1">
            {ENTRY_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setActiveFilters(activeCollectionId, type)}
                className={`px-3 py-1.5 rounded-xl border mr-1.5 ${
                  activeType === type
                    ? "bg-violet-950 border-violet-800 text-violet-200"
                    : "bg-neutral-950 border-neutral-900 text-neutral-400"
                }`}
              >
                <Text
                  className={`text-[10px] font-extrabold uppercase tracking-wider ${
                    activeType === type ? "text-violet-300" : "text-neutral-500"
                  }`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* List of Brain Captures */}
        <View className="flex-1 mb-3">
          {isLoading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#ffffff" />
            </View>
          ) : items.length === 0 ? (
            <View className="flex-1 justify-center items-center py-12 px-6">
              <Volume2 size={48} color="#303030" />
              <Text className="text-sm font-bold text-neutral-400 mt-4 text-center">
                Clean Brain Space
              </Text>
              <Text className="text-[10px] text-neutral-600 mt-1 text-center max-w-[240px]">
                No captures found matching your active filters. Unload something below.
              </Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isTemp = item.id.startsWith("temp-");
                return (
                  <TouchableOpacity
                    onPress={() => !isTemp && handleOpenDetailModal(item)}
                    className="bg-neutral-900 border border-neutral-850 rounded-2xl p-4 mb-2.5 active:bg-neutral-850"
                  >
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center space-x-2">
                        {item.contentType === "TEXT" ? (
                          <FileText size={11} color="#A3A3A3" />
                        ) : (
                          <Play size={11} color="#ef4444" />
                        )}
                        <Text className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                          {item.contentType}
                        </Text>
                        {item.type && (
                          <View className="bg-violet-950/60 border border-violet-900 px-2 py-0.5 rounded">
                            <Text className="text-[8px] font-bold text-violet-300 uppercase">{item.type}</Text>
                          </View>
                        )}
                        {item.collection?.name && (
                          <View className="bg-indigo-950/60 border border-indigo-900 px-2 py-0.5 rounded">
                            <Text className="text-[8px] font-bold text-indigo-300 uppercase">{item.collection.name}</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text className="text-[9px] text-neutral-600 font-medium">
                        {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </Text>
                    </View>

                    {item.contentType === "TEXT" ? (
                      <Text className="text-white text-sm leading-relaxed" numberOfLines={2}>{item.content}</Text>
                    ) : (
                      <View>
                        <Text className="text-[11px] text-neutral-500 italic" numberOfLines={1}>{item.content}</Text>
                        {item.rawText && (
                          <Text className="text-neutral-300 text-xs italic mt-1 leading-relaxed" numberOfLines={2}>
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
        <View className="bg-neutral-950 border border-neutral-850 rounded-3xl p-3 mb-4 flex-row items-end space-x-3 shadow-2xl">
          <TextInput
            placeholder={isRecording ? "Listening to your mind..." : "Write a capture note..."}
            placeholderTextColor="#666"
            value={text}
            onChangeText={setText}
            editable={!isRecording}
            multiline
            maxLength={500}
            className="flex-1 text-white text-sm bg-neutral-900 rounded-2xl px-4 py-3 max-h-24 border border-neutral-850 text-left"
          />

          <View className="flex-row items-center space-x-2 pb-0.5">
            <TouchableOpacity
              onPress={handleToggleRecording}
              className={`p-3 rounded-2xl flex-row items-center justify-center ${
                isRecording ? "bg-red-650 scale-105" : "bg-neutral-800 border border-neutral-700"
              }`}
            >
              <Mic size={16} color="#fff" />
              {isRecording && (
                <Text className="text-white text-xs font-bold ml-1.5 pr-0.5">
                  {formatDuration(recordDuration)}
                </Text>
              )}
            </TouchableOpacity>

            {!isRecording && text.trim().length > 0 && (
              <TouchableOpacity
                onPress={handleSendText}
                className="bg-indigo-650 p-3 rounded-2xl flex-row items-center justify-center"
              >
                <Send size={16} color="#fff" />
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
        <View className="flex-1 bg-black/80 justify-center items-center px-6">
          <View className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl w-full">
            <Text className="text-base font-extrabold text-white mb-1.5">New Collection Folder</Text>
            <Text className="text-xs text-neutral-400 mb-4">Group thoughts on college, geofencing, app features, etc.</Text>
            <TextInput
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="e.g. App Features"
              placeholderTextColor="#666"
              className="bg-neutral-950 border border-neutral-850 p-4 text-white rounded-2xl text-sm mb-4"
            />
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setNewFolderVisible(false)} className="flex-1 bg-neutral-950 p-3.5 rounded-xl border border-neutral-850 items-center">
                <Text className="text-xs font-bold text-neutral-400">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateFolder} className="flex-1 bg-indigo-600 p-3.5 rounded-xl items-center">
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
        <View className="flex-1 bg-black/90 justify-center items-center px-4">
          <View className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 w-full max-h-[85%]">
            <View className="flex-row justify-between items-center border-b border-neutral-800 pb-3 mb-4">
              <Text className="text-base font-extrabold text-white tracking-tight">Brain Dump Entry</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text className="text-xs text-neutral-450 font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 320, maxHeight: 480, marginBottom: 16 }}>
              {/* Content Panel Editable */}
              <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-1.5">Edit Raw Thoughts</Text>
              <TextInput
                value={editText}
                onChangeText={setEditText}
                multiline
                numberOfLines={3}
                placeholder="Capture notes..."
                placeholderTextColor="#555"
                className="bg-neutral-950 border border-neutral-850 text-white rounded-2xl p-4 text-sm mb-4 text-left"
              />

              <TouchableOpacity onPress={handleSaveTextChanges} className="bg-neutral-950 border border-neutral-850 py-3.5 rounded-2xl items-center mb-4 flex-row justify-center space-x-1.5">
                <Edit2 size={13} color="#fff" />
                <Text className="text-xs font-bold text-white">Save Changes</Text>
              </TouchableOpacity>

              {/* Assignment Selectors */}
              <View className="mb-4">
                <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Classify Type</Text>
                <View className="flex-row flex-wrap">
                  {ENTRY_TYPES.filter(t => t !== "All").map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => handleUpdateType(type)}
                      className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
                        selectedDump?.type === type
                          ? "bg-violet-950 border-violet-800"
                          : "bg-neutral-950 border-neutral-850"
                      }`}
                    >
                      <Text className="text-[10px] text-white font-bold">{type}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    onPress={() => handleUpdateType(null)}
                    className={`px-3 py-2 rounded-xl border mr-2 mb-2 ${
                      selectedDump?.type === null ? "bg-violet-950 border-violet-800" : "bg-neutral-950 border-neutral-850"
                    }`}
                  >
                    <Text className="text-[10px] text-neutral-400 font-bold">Unassigned</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">Move Folder Collection</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                  <TouchableOpacity
                    onPress={() => handleMoveCollection(null)}
                    className={`px-3.5 py-2 rounded-xl border mr-2 ${
                      selectedDump?.collectionId === null ? "bg-indigo-950 border-indigo-900" : "bg-neutral-950 border-neutral-850"
                    }`}
                  >
                    <Text className="text-xs font-bold text-neutral-400">None</Text>
                  </TouchableOpacity>
                  {collections.map((col) => (
                    <TouchableOpacity
                      key={col.id}
                      onPress={() => handleMoveCollection(col.id)}
                      className={`px-3.5 py-2 rounded-xl border mr-2 ${
                        selectedDump?.collectionId === col.id ? "bg-indigo-950 border-indigo-900" : "bg-neutral-950 border-neutral-850"
                      }`}
                    >
                      <Text className="text-xs font-bold text-white">{col.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Action Spawn Panels */}
              <Text className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2.5">Organize & Act Spawners</Text>
              
              <View className="space-y-2 mb-4">
                <TouchableOpacity onPress={handleOpenSpawnIdea} className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3">
                    <Lightbulb size={16} color="#EAB308" />
                    <View>
                      <Text className="text-white text-xs font-bold">Create Idea blueprint</Text>
                      <Text className="text-[9px] text-neutral-500">Refine details, notes, and specs</Text>
                    </View>
                  </View>
                  <ChevronDown size={14} color="#525252" style={{ transform: [{ rotate: "-90deg" }] }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleOpenSpawnTask} className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3">
                    <ListTodo size={16} color="#6366F1" />
                    <View>
                      <Text className="text-white text-xs font-bold">Create Task commitment</Text>
                      <Text className="text-[9px] text-neutral-500">Add to scheduled/habit execution checklists</Text>
                    </View>
                  </View>
                  <ChevronDown size={14} color="#525252" style={{ transform: [{ rotate: "-90deg" }] }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleOpenSpawnEvent} className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-3">
                    <Calendar size={16} color="#10B981" />
                    <View>
                      <Text className="text-white text-xs font-bold">Create Event appointment</Text>
                      <Text className="text-[9px] text-neutral-500">Pin to specific dates and hours bounds</Text>
                    </View>
                  </View>
                  <ChevronDown size={14} color="#525252" style={{ transform: [{ rotate: "-90deg" }] }} />
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
                  className="flex-1 bg-amber-950/40 border border-amber-900/60 p-3.5 rounded-2xl items-center flex-row justify-center space-x-1.5"
                >
                  <Archive size={13} color="#D97706" />
                  <Text className="text-xs font-bold text-amber-600">Archive Capture</Text>
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
                  className="flex-1 bg-red-950/40 border border-red-900/60 p-3.5 rounded-2xl items-center flex-row justify-center space-x-1.5"
                >
                  <Trash2 size={13} color="#EF4444" />
                  <Text className="text-xs font-bold text-red-400">Delete Raw</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TASK SPAWNER PREFILL */}
      <Modal visible={spawnTaskVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-black/85 justify-center items-center px-4">
          <View className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl w-full max-h-[80%]">
            <Text className="text-base font-extrabold text-white mb-4">Create Task Commitment</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Title</Text>
              <TextInput value={taskTitle} onChangeText={setTaskTitle} className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 mb-4" />

              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Notes / Description</Text>
              <TextInput value={taskNotes} onChangeText={setTaskNotes} placeholder="Add context..." placeholderTextColor="#666" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 mb-4 text-left" multiline />

              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Schedule Date</Text>
              <TextInput value={taskDate} onChangeText={setTaskDate} placeholder="YYYY-MM-DD" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 mb-4" />

              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Time (Optional)</Text>
              <TextInput value={taskTime} onChangeText={setTaskTime} placeholder="e.g. 10:00 AM" placeholderTextColor="#666" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850" />
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setSpawnTaskVisible(false)} className="flex-1 bg-neutral-950 p-3.5 border border-neutral-850 rounded-xl items-center"><Text className="text-xs font-bold text-neutral-400">Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpawnTask} disabled={isSavingSpawn} className="flex-1 bg-indigo-600 p-3.5 rounded-xl items-center">
                {isSavingSpawn ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-xs font-bold text-white">Save Task</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EVENT SPAWNER PREFILL */}
      <Modal visible={spawnEventVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-black/85 justify-center items-center px-4">
          <View className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl w-full max-h-[80%]">
            <Text className="text-base font-extrabold text-white mb-4">Create Event Appointment</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Event Title</Text>
              <TextInput value={eventTitle} onChangeText={setEventTitle} className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 mb-4" />

              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Notes / Description</Text>
              <TextInput value={eventNotes} onChangeText={setEventNotes} placeholder="Details..." placeholderTextColor="#666" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 mb-4 text-left" multiline />

              <View className="flex-row space-x-3 mb-4">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Start Date</Text>
                  <TextInput value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">End Date</Text>
                  <TextInput value={eventEndDate} onChangeText={setEventEndDate} placeholder="YYYY-MM-DD" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850" />
                </View>
              </View>

              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Start</Text>
                  <TextInput value={eventStartTime} onChangeText={setEventStartTime} className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">End</Text>
                  <TextInput value={eventEndTime} onChangeText={setEventEndTime} className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850" />
                </View>
              </View>
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setSpawnEventVisible(false)} className="flex-1 bg-neutral-950 p-3.5 border border-neutral-850 rounded-xl items-center"><Text className="text-xs font-bold text-neutral-400">Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpawnEvent} disabled={isSavingSpawn} className="flex-1 bg-emerald-600 p-3.5 rounded-xl items-center">
                {isSavingSpawn ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-xs font-bold text-white">Save Event</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* IDEA SPAWNER PREFILL */}
      <Modal visible={spawnIdeaVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-black/85 justify-center items-center px-4">
          <View className="bg-neutral-900 border border-neutral-850 p-6 rounded-3xl w-full max-h-[80%]">
            <Text className="text-base font-extrabold text-white mb-4">Create Refined Idea Blueprint</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Concept Title</Text>
              <TextInput value={ideaTitle} onChangeText={setIdeaTitle} className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 mb-4" />

              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Category (e.g. Geofencing, Business)</Text>
              <TextInput value={ideaCategory} onChangeText={setIdeaCategory} placeholder="Category..." placeholderTextColor="#666" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 mb-4" />

              <Text className="text-xs font-bold text-neutral-400 uppercase mb-2">Refined Use Cases / Notes</Text>
              <TextInput value={ideaNotes} onChangeText={setIdeaNotes} placeholder="Notes, descriptions, specs..." placeholderTextColor="#666" className="bg-neutral-950 p-4 text-white rounded-2xl border border-neutral-850 text-left" multiline />
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setSpawnIdeaVisible(false)} className="flex-1 bg-neutral-950 p-3.5 border border-neutral-850 rounded-xl items-center"><Text className="text-xs font-bold text-neutral-400">Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpawnIdea} disabled={isSavingSpawn} className="flex-1 bg-yellow-600 p-3.5 rounded-xl items-center">
                {isSavingSpawn ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-xs font-bold text-white">Save Idea</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
