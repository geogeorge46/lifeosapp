import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  Plus,
  Search,
  Tag,
  Lightbulb,
  Edit2,
  Trash2,
  ListTodo,
  FileText,
  Calendar as CalendarIcon,
} from "lucide-react-native";
import { DatePickerModal } from "../src/components/common/DatePickerModal";
import { apiService, Idea } from "../src/services/api";

export default function IdeasScreen() {
  const router = useRouter();

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Edit/View modal state
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  
  // Input fields for edit/create
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaCategory, setIdeaCategory] = useState("");
  const [ideaNotes, setIdeaNotes] = useState("");

  // Create Mode state
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Spawning task state
  const [spawnTaskVisible, setSpawnTaskVisible] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskTime, setTaskTime] = useState("");
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  const fetchAllIdeas = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.fetchIdeas();
      setIdeas(data);
    } catch (err: any) {
      Alert.alert("Error", "Failed to retrieve ideas index");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllIdeas();
  }, []);

  const handleOpenDetail = (idea: Idea) => {
    setSelectedIdea(idea);
    setIdeaTitle(idea.title);
    setIdeaCategory(idea.category);
    setIdeaNotes(idea.notes || "");
    setDetailModalVisible(true);
  };

  const handleUpdateIdea = async () => {
    if (!selectedIdea || !ideaTitle.trim()) return;
    try {
      const updated = await apiService.updateIdea(selectedIdea.id, {
        title: ideaTitle.trim(),
        category: ideaCategory.trim() || "General",
        notes: ideaNotes.trim() || null,
      });
      setIdeas((prev) => prev.map((i) => (i.id === selectedIdea.id ? updated : i)));
      setSelectedIdea(updated);
      Alert.alert("Success", "Concept updated successfully!");
    } catch (err) {
      Alert.alert("Error", "Failed to save updates");
    }
  };

  const handleDeleteIdea = async (id: string) => {
    Alert.alert("Delete Idea", "Are you sure you want to delete this concept blueprint?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiService.deleteIdea(id);
            setIdeas((prev) => prev.filter((i) => i.id !== id));
            setDetailModalVisible(false);
          } catch (err) {
            Alert.alert("Error", "Failed to delete idea");
          }
        },
      },
    ]);
  };

  const handleCreateIdea = async () => {
    if (!ideaTitle.trim()) return;
    try {
      const created = await apiService.createIdea({
        title: ideaTitle.trim(),
        category: ideaCategory.trim() || "General",
        notes: ideaNotes.trim() || undefined,
      });
      setIdeas((prev) => [created, ...prev]);
      setIdeaTitle("");
      setIdeaCategory("General");
      setIdeaNotes("");
      setCreateModalVisible(false);
    } catch (err) {
      Alert.alert("Error", "Failed to create concept idea");
    }
  };

  // Convert to task trigger
  const handleOpenSpawnTask = () => {
    if (!selectedIdea) return;
    setTaskTitle(selectedIdea.title);
    setTaskNotes(selectedIdea.notes || "");
    setTaskDate(new Date().toISOString().split("T")[0]);
    setTaskTime("10:00 AM");
    setSpawnTaskVisible(true);
  };

  const handleSaveSpawnTask = async () => {
    if (!selectedIdea || !taskTitle.trim() || !taskDate.trim()) return;
    setIsSavingTask(true);
    try {
      const timePart = taskTime.trim() ? ` at ${taskTime.trim()}` : "";
      const rawInput = `${taskTitle.trim()} on ${taskDate.trim()}${timePart}`;
      await apiService.createTask(rawInput, taskNotes.trim() || undefined);
      
      setSpawnTaskVisible(false);
      setDetailModalVisible(false);
      Alert.alert("Success", "Task commitment successfully scheduled!");
    } catch (err: any) {
      Alert.alert("Error", "Failed to schedule task: " + err.message);
    } finally {
      setIsSavingTask(false);
    }
  };

  // Filter ideas by search string
  const filteredIdeas = ideas.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.category.toLowerCase().includes(search.toLowerCase()) ||
      (i.notes && i.notes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F8] px-4 pt-4" edges={["top", "left", "right"]}>
      {/* Header bar */}
      <View className="flex-row items-center justify-between mb-6">
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-white rounded-full border border-[#E2E8F0] shadow-sm">
          <ChevronLeft size={16} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-[#0F172A]">Ideas Board</Text>
        <TouchableOpacity
          onPress={() => {
            setIdeaTitle("");
            setIdeaCategory("Product");
            setIdeaNotes("");
            setCreateModalVisible(true);
          }}
          className="p-2 bg-[#E05646] rounded-full shadow-sm shadow-[#E05646]/20"
        >
          <Plus size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Filter input */}
      <View className="flex-row items-center bg-white border border-[#E2E8F0] rounded-2xl px-4 py-3 mb-4 space-x-2 shadow-sm shadow-[#0F172A]/5">
        <Search size={14} color="#64748B" />
        <TextInput
          placeholder="Search concepts or categories..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
          className="flex-1 text-[#0F172A] text-xs font-bold"
        />
      </View>

      {/* Listing Content */}
      <View className="flex-1">
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#E05646" />
          </View>
        ) : filteredIdeas.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12 px-6">
            <Lightbulb size={48} color="#94A3B8" />
            <Text className="text-sm font-bold text-[#0F172A] mt-4 text-center">No Ideas Logged</Text>
            <Text className="text-[10px] text-[#64748B] mt-1 text-center max-w-[240px]">
              Tap the (+) icon in the header to create a refined concept blueprint.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredIdeas}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleOpenDetail(item)}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-2.5 active:bg-[#F8FAFC] shadow-sm shadow-[#0F172A]/5"
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex-row items-center space-x-1">
                    <Tag size={8} color="#D97706" />
                    <Text className="text-[8px] font-bold text-amber-700 uppercase tracking-widest">{item.category}</Text>
                  </View>
                  <Text className="text-[9px] text-[#64748B] font-bold">
                    {new Date(item.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </Text>
                </View>
                <Text className="text-[#0F172A] text-sm font-bold leading-snug">{item.title}</Text>
                {item.notes && (
                  <Text className="text-[#64748B] text-xs mt-1.5 leading-relaxed" numberOfLines={2}>
                    {item.notes}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* CREATE IDEA MODAL */}
      <Modal visible={createModalVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-slate-900/30 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full max-h-[80%] shadow-2xl">
            <Text className="text-base font-extrabold text-[#0F172A] mb-4">Create Refined Idea Blueprint</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Concept Title</Text>
              <TextInput value={ideaTitle} onChangeText={setIdeaTitle} placeholder="e.g. Location reminders widget" placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Category (e.g. AI, Geofencing)</Text>
              <TextInput value={ideaCategory} onChangeText={setIdeaCategory} placeholder="Product" placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Notes & Spec descriptions</Text>
              <TextInput value={ideaNotes} onChangeText={setIdeaNotes} placeholder="Spec specifications details..." placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] text-left" multiline />
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setCreateModalVisible(false)} className="flex-1 bg-slate-50 p-3.5 border border-slate-200 rounded-xl items-center"><Text className="text-xs font-bold text-[#64748B]">Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleCreateIdea} className="flex-1 bg-[#E05646] p-3.5 rounded-xl items-center shadow-md shadow-[#E05646]/20">
                <Text className="text-xs font-bold text-white">Save Concept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DETAIL MODAL PANEL */}
      <Modal visible={detailModalVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-slate-900/30 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-center border-b border-[#E2E8F0] pb-3 mb-4">
              <Text className="text-base font-extrabold text-[#0F172A] tracking-tight">Idea Spec Detail</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Text className="text-xs text-[#64748B] font-bold">Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 320, maxHeight: 480, marginBottom: 16 }}>
              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Title</Text>
              <TextInput value={ideaTitle} onChangeText={setIdeaTitle} className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-2xl p-4 text-sm mb-4" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Category</Text>
              <TextInput value={ideaCategory} onChangeText={setIdeaCategory} className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-2xl p-4 text-sm mb-4" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Description Notes</Text>
              <TextInput value={ideaNotes} onChangeText={setIdeaNotes} multiline className="bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-2xl p-4 text-sm mb-4 text-left" />

              <TouchableOpacity onPress={handleUpdateIdea} className="bg-[#202E4E] border border-[#202E4E] py-3.5 rounded-2xl items-center mb-6 flex-row justify-center space-x-1.5 shadow-sm">
                <Edit2 size={13} color="#FFFFFF" />
                <Text className="text-xs font-bold text-white">Save Changes</Text>
              </TouchableOpacity>

              {/* Action Spawner triggers */}
              <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2.5">Organize & Act</Text>
              
              <TouchableOpacity onPress={handleOpenSpawnTask} className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex-row items-center justify-between mb-4">
                <View className="flex-row items-center space-x-3">
                  <ListTodo size={16} color="#6366F1" />
                  <View>
                    <Text className="text-indigo-700 text-xs font-bold">Create Task commitment</Text>
                    <Text className="text-[9px] text-indigo-600 font-semibold">Add to scheduled / habit checklists</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {selectedIdea?.brainDump && (
                <View className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
                  <Text className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-2">Derived Source Dump</Text>
                  <View className="flex-row items-center space-x-2">
                    <FileText size={12} color="#64748B" />
                    <Text className="text-[#0F172A] text-xs leading-relaxed flex-1 italic font-medium">
                      "{selectedIdea.brainDump.content || selectedIdea.brainDump.rawText}"
                    </Text>
                  </View>
                </View>
              )}

              {/* Delete operation */}
              <TouchableOpacity
                onPress={() => selectedIdea && handleDeleteIdea(selectedIdea.id)}
                className="bg-red-50 border border-red-100 p-3.5 rounded-2xl items-center flex-row justify-center space-x-1.5"
              >
                <Trash2 size={13} color="#EF4444" />
                <Text className="text-xs font-bold text-red-650 text-red-650 text-red-600">Delete Idea Blueprint</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* TASK SPAWNER OVERLAY */}
      <Modal visible={spawnTaskVisible} transparent={true} animationType="slide">
        <View className="flex-1 bg-slate-900/30 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] p-6 rounded-3xl w-full max-h-[80%] shadow-2xl">
            <Text className="text-base font-extrabold text-[#0F172A] mb-4">Create Task Commitment</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ minHeight: 280, maxHeight: 400, marginBottom: 20 }}>
              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Title</Text>
              <TextInput value={taskTitle} onChangeText={setTaskTitle} className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4" />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Notes / Description</Text>
              <TextInput value={taskNotes} onChangeText={setTaskNotes} placeholder="Add context..." placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0] mb-4 text-left" multiline />

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Schedule Date</Text>
              <TouchableOpacity
                onPress={() => setDatePickerVisible(true)}
                className="bg-[#F8FAFC] p-4 rounded-2xl border border-[#E2E8F0] mb-4 flex-row justify-between items-center"
              >
                <Text className={`text-sm font-semibold ${taskDate ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                  {taskDate ? `📅 ${taskDate}` : "Select Schedule Date (Tap for Calendar)"}
                </Text>
                <CalendarIcon size={16} color="#E05646" />
              </TouchableOpacity>

              <Text className="text-xs font-bold text-[#64748B] uppercase mb-2">Time (Optional)</Text>
              <TextInput value={taskTime} onChangeText={setTaskTime} placeholder="e.g. 10:00 AM" placeholderTextColor="#94A3B8" className="bg-[#F8FAFC] p-4 text-[#0F172A] rounded-2xl border border-[#E2E8F0]" />
            </ScrollView>
            <View className="flex-row space-x-3">
              <TouchableOpacity onPress={() => setSpawnTaskVisible(false)} className="flex-1 bg-slate-50 p-3.5 border border-slate-200 rounded-xl items-center"><Text className="text-xs font-bold text-[#64748B]">Back</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveSpawnTask} disabled={isSavingTask} className="flex-1 bg-[#E05646] p-3.5 rounded-xl items-center shadow-md shadow-[#E05646]/20">
                {isSavingTask ? <ActivityIndicator size="small" color="#fff" /> : <Text className="text-xs font-bold text-white">Save Task</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={datePickerVisible}
        title="Select Schedule Date"
        initialDate={taskDate || undefined}
        onSelectDate={(selectedStr: string) => setTaskDate(selectedStr)}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}
