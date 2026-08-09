import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FileText, ArrowRight, CheckSquare, Plus, Sun, RefreshCw, Calendar, AlertTriangle, Zap, CheckCircle2, Trash2, MapPin, Shield, Search } from "lucide-react-native";
import { useTasksStore } from "../../src/store/tasksStore";
import { useRecapStore } from "../../src/store/recapStore";
import { useHabitsStore } from "../../src/store/habitsStore";
import { useSettingsStore } from "../../src/store/settingsStore";
import { useGeofencing } from "../../src/hooks/useGeofencing";
import { usePeopleStore } from "../../src/store/peopleStore";
import { usePlacesStore } from "../../src/store/placesStore";
import { useLedgerStore } from "../../src/store/ledgerStore";
import { TaskItem } from "../../src/components/features/tasks/TaskItem";
import { useRouter } from "expo-router";
import { apiService, Event } from "../../src/services/api";

export default function DayScreen() {
  const router = useRouter();
  const {
    todayOccurrences,
    backlogOccurrences,
    isLoading,
    fetchTodayTasks,
    addTask,
    toggleOccurrence,
    deleteOccurrence,
    rescheduleOccurrence,
    convertInboxItem,
  } = useTasksStore();

  const { recap, isDismissed, loadTodayRecap, triggerCompilation, dismissRecap, resetDismissState } = useRecapStore();
  const { habits, fetchHabits, addHabit, toggleHabit, deleteHabit } = useHabitsStore();
  const { onboardingCompleted, updateSetting } = useSettingsStore();
  const { requestBackgroundPermission } = useGeofencing();

  const { people, fetchPeople } = usePeopleStore();
  const { places, fetchPlaces } = usePlacesStore();
  const { transactions, fetchTransactions } = useLedgerStore();

  const [newTaskInput, setNewTaskInput] = useState("");
  const [newHabitInput, setNewHabitInput] = useState("");
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [customDateInput, setCustomDateInput] = useState("");

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [todayEvents, setTodayEvents] = useState<Event[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];

  const fetchTodayEvents = async () => {
    setEventsLoading(true);
    try {
      const data = await apiService.fetchEvents(todayStr, todayStr);
      setTodayEvents(data);
    } catch (err) {
      console.error("Failed to load today's events:", err);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayTasks(todayStr);
    loadTodayRecap();
    fetchTodayEvents();
    fetchHabits();
    fetchPeople().catch(() => {});
    fetchPlaces().catch(() => {});
    fetchTransactions().catch(() => {});
  }, []);

  const handleGlobalSearch = () => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return { tasks: [], people: [], places: [], transactions: [] };

    const filteredTasks = todayOccurrences.filter(
      (o) =>
        o.task?.title?.toLowerCase().includes(q) ||
        o.task?.description?.toLowerCase().includes(q)
    );

    const filteredPeople = people.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.phone?.toLowerCase().includes(q) ||
        p.relationship?.toLowerCase().includes(q)
    );

    const filteredPlaces = places.filter(
      (pl) =>
        pl.name?.toLowerCase().includes(q) ||
        pl.address?.toLowerCase().includes(q)
    );

    const filteredTransactions = transactions.filter(
      (t) =>
        t.description?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.amount?.toString().includes(q)
    );

    return {
      tasks: filteredTasks,
      people: filteredPeople,
      places: filteredPlaces,
      transactions: filteredTransactions,
    };
  };

  const searchResults = handleGlobalSearch();

  const handleAddTask = async () => {
    if (!newTaskInput.trim()) return;
    const rawInput = newTaskInput.trim();
    setNewTaskInput("");
    await addTask(rawInput, undefined, todayStr);
  };

  const handleAddHabit = async () => {
    if (!newHabitInput.trim()) return;
    try {
      await addHabit(newHabitInput.trim());
      setNewHabitInput("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create habit");
    }
  };

  const handleDoToday = async (occurrenceId: string) => {
    await rescheduleOccurrence(occurrenceId, todayStr, "Moved to Today", todayStr);
  };

  const handleOpenReschedulePicker = (occurrenceId: string) => {
    setSelectedOccurrenceId(occurrenceId);
    setRescheduleModalVisible(true);
  };

  const handleQuickReschedule = async (daysAhead: number) => {
    if (!selectedOccurrenceId) return;
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const dateStr = target.toISOString().split("T")[0];
    await rescheduleOccurrence(selectedOccurrenceId, dateStr, `Postponed ${daysAhead} days`, todayStr);
    setRescheduleModalVisible(false);
    setSelectedOccurrenceId(null);
  };

  const handleCustomReschedule = async () => {
    if (!selectedOccurrenceId || !customDateInput.trim()) return;
    const match = customDateInput.trim().match(/^\d{4}-\d{2}-\d{2}$/);
    if (!match) {
      Alert.alert("Invalid Format", "Please specify the date in YYYY-MM-DD format.");
      return;
    }
    await rescheduleOccurrence(selectedOccurrenceId, customDateInput.trim(), "Custom Reschedule", todayStr);
    setCustomDateInput("");
    setRescheduleModalVisible(false);
    setSelectedOccurrenceId(null);
  };

  const completedTasks = todayOccurrences.filter((o) => o.status === "COMPLETED").length;
  const totalTasks = todayOccurrences.length;

  const completedHabits = habits.filter((h) =>
    h.completions?.some((c) => c.date.startsWith(todayStr))
  ).length;
  const totalHabits = habits.length;

  const overallTotal = totalTasks + totalHabits;
  const overallCompleted = completedTasks + completedHabits;
  const overallCompletionRate = overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) : 0;

  const everydayTasks = todayOccurrences.filter((o) => o.task?.recurrenceRule === "FREQ=DAILY");
  const otherTasks = todayOccurrences.filter((o) => o.task?.recurrenceRule !== "FREQ=DAILY");


  const formatDateLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-black px-4 pt-4" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          {/* Header section */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <View>
              <Text className="text-3xl font-extrabold text-white tracking-tight">Today</Text>
              <Text className="text-sm text-neutral-400 mt-1">Focus on what is important right now.</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {recap && (
                <TouchableOpacity
                  onPress={resetDismissState}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "#1e1b4b",
                    borderWidth: 1,
                    borderColor: "#312e81",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Sun size={12} color="#f59e0b" style={{ marginRight: 4 }} />
                  <Text style={{ color: "#818cf8", fontSize: 11, fontWeight: "700" }}>Daily Digest</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setSearchModalVisible(true)}
                style={{
                  width: 38,
                  height: 38,
                  backgroundColor: "#171717",
                  borderWidth: 1,
                  borderColor: "#262626",
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Search size={16} color="#a3a3a3" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Progress Card */}
          <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6 flex-row justify-between items-center">
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-white">Daily Focus Rate</Text>
              <Text className="text-xs text-neutral-400 mt-1 leading-relaxed">
                {overallTotal === 0
                  ? "No commitments scheduled for today. Add one below!"
                  : `${overallCompleted} of ${overallTotal} actions completed today (${overallCompletionRate}%)`}
              </Text>
            </View>
            {overallTotal > 0 && (
              <View className="w-16 h-16 rounded-full border-4 border-indigo-950 flex items-center justify-center bg-black/40">
                <Text className="text-white font-extrabold text-xs">{overallCompletionRate}%</Text>
              </View>
            )}
          </View>


          {/* TODAY Events & Scheduled Lists */}
          {/* Today's Events Section */}
          <View className="mb-6">
            <View className="flex-row items-center space-x-1.5 mb-3">
              <Calendar size={14} color="#10B981" />
              <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Today's Events ({todayEvents.length})
              </Text>
            </View>

            {eventsLoading && todayEvents.length === 0 ? (
              <ActivityIndicator size="small" color="#ffffff" className="my-3" />
            ) : todayEvents.length === 0 ? (
              <View className="bg-neutral-900/30 border border-neutral-850 rounded-2xl py-5 px-4 items-center justify-center">
                <Text className="text-xs text-neutral-500 italic">No events scheduled today.</Text>
              </View>
            ) : (
              todayEvents.map((event) => (
                <View
                  key={event.id}
                  className="bg-neutral-900 border-l-4 border-l-emerald-500 border-neutral-850 rounded-2xl p-4 mb-2 flex-row justify-between items-center"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-white text-sm font-bold">{event.title}</Text>
                    {event.description && (
                      <Text className="text-xs text-neutral-400 mt-1">{event.description}</Text>
                    )}
                    <Text className="text-[10px] text-neutral-500 mt-1.5">
                      {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Everyday Tasks Section */}
          <View className="mb-6">
            <View className="flex-row items-center space-x-1.5 mb-3">
              <CheckSquare size={14} color="#818CF8" />
              <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Everyday Tasks ({everydayTasks.length})
              </Text>
            </View>

            {isLoading && everydayTasks.length === 0 ? (
              <ActivityIndicator size="small" color="#ffffff" className="my-3" />
            ) : everydayTasks.length === 0 ? (
              <View className="bg-neutral-900/30 border border-neutral-850 rounded-2xl py-5 px-4 items-center justify-center">
                <Text className="text-xs text-neutral-500 italic">No everyday tasks scheduled.</Text>
              </View>
            ) : (
              everydayTasks.map((occurrence) => (
                <TaskItem
                  key={occurrence.id}
                  occurrence={occurrence}
                  onToggle={toggleOccurrence}
                  onDelete={deleteOccurrence}
                />
              ))
            )}
          </View>

          {/* Other Tasks Section */}
          <View className="mb-6">
            <View className="flex-row items-center space-x-1.5 mb-3">
              <CheckSquare size={14} color="#3b82f6" />
              <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Other Tasks ({otherTasks.length})
              </Text>
            </View>

            {isLoading && otherTasks.length === 0 ? (
              <ActivityIndicator size="small" color="#ffffff" className="my-3" />
            ) : otherTasks.length === 0 ? (
              <View className="bg-neutral-900/30 border border-neutral-850 rounded-2xl py-5 px-4 items-center justify-center">
                <Text className="text-xs text-neutral-500 italic">No other tasks scheduled.</Text>
              </View>
            ) : (
              otherTasks.map((occurrence) => (
                <TaskItem
                  key={occurrence.id}
                  occurrence={occurrence}
                  onToggle={toggleOccurrence}
                  onDelete={deleteOccurrence}
                />
              ))
            )}
          </View>

          {/* Habits Loop Section */}
          <View className="mb-6">
            <View className="flex-row items-center space-x-1.5 mb-3">
              <Zap size={14} color="#eab308" />
              <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Habits Loop ({habits.length})
              </Text>
            </View>

            {habits.length === 0 ? (
              <View className="bg-neutral-900/30 border border-neutral-850 rounded-2xl py-5 px-4 items-center justify-center mb-3">
                <Text className="text-xs text-neutral-500 italic">No daily habits tracked yet. Create one below!</Text>
              </View>
            ) : (
              habits.map((habit) => {
                const isCompletedToday = habit.completions?.some((c) => c.date.startsWith(todayStr)) || false;
                return (
                  <View
                    key={habit.id}
                    className="bg-neutral-900 border border-neutral-850 rounded-2xl p-4 mb-2 flex-row justify-between items-center"
                  >
                    <TouchableOpacity
                      onPress={() => toggleHabit(habit.id, todayStr)}
                      className="flex-row items-center flex-1 pr-3"
                    >
                      <CheckCircle2
                        size={20}
                        color={isCompletedToday ? "#eab308" : "#444"}
                        style={{ marginRight: 12 }}
                      />
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-bold ${
                            isCompletedToday ? "text-neutral-400 line-through" : "text-white"
                          }`}
                        >
                          {habit.title}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          {habit.streak > 0 && (
                            <View className="bg-amber-950/60 border border-amber-900 px-1.5 py-0.5 rounded flex-row items-center">
                              <Text style={{ fontSize: 9, marginRight: 2 }}>🔥</Text>
                              <Text className="text-[8px] font-extrabold text-amber-300">
                                {habit.streak} day streak
                              </Text>
                            </View>
                          )}
                          {habit.longestStreak > 0 && (
                            <View className="bg-neutral-800 border border-neutral-750 px-1.5 py-0.5 rounded">
                              <Text className="text-[8px] font-extrabold text-neutral-400">
                                Best: {habit.longestStreak}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => deleteHabit(habit.id)} className="p-1">
                      <Trash2 size={14} color="#666" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* Quick Habit Adder Input */}
            <View className="flex-row items-center bg-neutral-950 border border-neutral-850 rounded-2xl p-2.5 space-x-2">
              <TextInput
                placeholder="Track new habit (e.g. Drink water)..."
                placeholderTextColor="#666"
                value={newHabitInput}
                onChangeText={setNewHabitInput}
                onSubmitEditing={handleAddHabit}
                className="flex-1 text-[12px] text-white bg-neutral-900 rounded-xl px-3 py-2 border border-neutral-850 text-left"
              />
              <TouchableOpacity
                onPress={handleAddHabit}
                className="bg-amber-500 p-2 rounded-xl flex items-center justify-center"
              >
                <Plus size={14} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* NOT COMPLETED Backlog */}
          {backlogOccurrences.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center space-x-1.5 mb-3">
                <AlertTriangle size={14} color="#f59e0b" />
                <Text className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                  Not Completed Backlog ({backlogOccurrences.length})
                </Text>
              </View>

              {backlogOccurrences.map((occurrence) => (
                <View
                  key={occurrence.id}
                  className="bg-neutral-900/40 border border-neutral-800/80 rounded-2xl p-4 mb-3"
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
                        {occurrence.task.title}
                      </Text>
                      <Text style={{ color: "#f59e0b", fontSize: 11, fontWeight: "600", marginTop: 4 }}>
                        ⚠️ Scheduled for {formatDateLabel(occurrence.scheduledDate)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteOccurrence(occurrence.id)}
                      style={{ padding: 4 }}
                    >
                      <Text style={{ color: "#ef4444", fontSize: 12 }}>Drop</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", marginTop: 12, gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => handleDoToday(occurrence.id)}
                      style={{
                        backgroundColor: "#2563eb",
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Do Today</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenReschedulePicker(occurrence.id)}
                      style={{
                        backgroundColor: "#222",
                        borderWidth: 1,
                        borderColor: "#333",
                        borderRadius: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Schedule</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Task Creation Input Panel */}
        <View className="bg-neutral-950 border border-neutral-800 rounded-3xl p-3 mb-6 flex-row items-center space-x-3 shadow-xl">
          <TextInput
            placeholder="Write task (e.g. exercise every day at 10 AM)..."
            placeholderTextColor="#737373"
            value={newTaskInput}
            onChangeText={setNewTaskInput}
            onSubmitEditing={handleAddTask}
            className="flex-1 text-white text-sm bg-neutral-900 rounded-2xl px-4 py-3 border border-neutral-800 text-left"
          />
          <TouchableOpacity
            onPress={handleAddTask}
            className="bg-indigo-600 p-3 rounded-2xl flex items-center justify-center shadow-lg"
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Reschedule Date Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={rescheduleModalVisible}
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.8)" }}>
          <View
            style={{
              backgroundColor: "#161616",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: "#222",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              Reschedule Task
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => handleQuickReschedule(1)}
                style={{ backgroundColor: "#222", padding: 12, borderRadius: 12, flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickReschedule(2)}
                style={{ backgroundColor: "#222", padding: 12, borderRadius: 12, flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>In 2 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickReschedule(7)}
                style={{ backgroundColor: "#222", padding: 12, borderRadius: 12, flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "600" }}>Next Week</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#888", fontSize: 12, marginBottom: 8 }}>
              Or specify a custom date (YYYY-MM-DD):
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <TextInput
                value={customDateInput}
                onChangeText={setCustomDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#555"
                style={{
                  flex: 1,
                  backgroundColor: "#222",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              />
              <TouchableOpacity
                onPress={handleCustomReschedule}
                style={{ backgroundColor: "#2563eb", paddingHorizontal: 20, borderRadius: 12, justifyContent: "center" }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Move</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setRescheduleModalVisible(false)}
              style={{ padding: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Morning Recap Modal Overlay */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={recap !== null && !isDismissed}
        onRequestClose={dismissRecap}
      >
        <View className="flex-1 bg-black/85 justify-center items-center px-4">
          <View className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 w-full max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-center border-b border-neutral-800 pb-3 mb-4">
              <View className="flex-row items-center space-x-2">
                <Sun size={20} color="#FBBF24" />
                <Text className="text-lg font-extrabold text-white tracking-tight">Daily Digest</Text>
              </View>
              <TouchableOpacity
                onPress={triggerCompilation}
                className="p-1.5 bg-neutral-800 border border-neutral-700 rounded-lg flex items-center justify-center"
              >
                <RefreshCw size={12} color="#818CF8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-6">
              {recap &&
                recap.summary.split("\n").map((line, idx) => {
                  if (line.startsWith("# ")) {
                    return (
                      <Text key={idx} className="text-xl font-extrabold text-white mt-4 mb-2 tracking-tight">
                        {line.replace("# ", "")}
                      </Text>
                    );
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <Text key={idx} className="text-base font-bold text-indigo-400 mt-4 mb-2 tracking-tight">
                        {line.replace("## ", "")}
                      </Text>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <Text key={idx} className="text-xs font-bold text-neutral-400 mt-2.5 mb-1.5 uppercase tracking-wider">
                        {line.replace("### ", "")}
                      </Text>
                    );
                  }
                  if (line.startsWith("* ")) {
                    return (
                      <Text key={idx} className="text-sm text-neutral-300 ml-3 mb-1.5 leading-relaxed">
                        • {line.replace("* ", "")}
                      </Text>
                    );
                  }
                  if (line.trim().length === 0) {
                    return null;
                  }
                  return (
                    <Text key={idx} className="text-sm text-neutral-400 mb-2 leading-relaxed">
                      {line}
                    </Text>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              onPress={dismissRecap}
              className="bg-indigo-600 p-4 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Text className="text-white text-sm font-bold">Start My Day</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* First-Run Onboarding & Privacy Agreement Modal */}
      <Modal visible={!onboardingCompleted} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-black px-6 py-6 justify-between">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 my-4">
            {/* Logo header */}
            <View className="items-center my-6">
              <View className="bg-indigo-950 border border-indigo-900 w-16 h-16 rounded-3xl items-center justify-center mb-3">
                <Shield size={32} color="#818CF8" />
              </View>
              <Text className="text-2xl font-extrabold text-white tracking-tight">Welcome to LifeOS</Text>
              <Text className="text-xs text-neutral-400 mt-1">Your offline-first context engine</Text>
            </View>

            {/* Privacy Section */}
            <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-5">
              <Text className="text-sm font-bold text-white mb-2">🛡️ Privacy & Data Agreement</Text>
              <Text className="text-xs text-neutral-300 leading-relaxed mb-3">
                LifeOS is built with strict user privacy in mind. When you input task details or link contacts:
              </Text>
              <Text className="text-xs text-neutral-400 leading-relaxed mb-2">
                • <Text className="font-bold text-white">100% Local-first:</Text> All your databases, ledgers, events, and location profiles remain encrypted locally on this device.
              </Text>
              <Text className="text-xs text-neutral-400 leading-relaxed mb-2">
                • <Text className="font-bold text-white">Full Purge Compliance:</Text> Deleting a contact removes all linked debts, transaction entries, and task mappings completely.
              </Text>
              <Text className="text-xs text-neutral-400 leading-relaxed">
                • <Text className="font-bold text-white">No Shared Data:</Text> LifeOS never transmits or shares third-party contact data without explicit user actions.
              </Text>
            </View>

            {/* Geofence Explainer */}
            <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-5">
              <Text className="text-sm font-bold text-white mb-2">📍 Location & Geofencing Explainer</Text>
              <Text className="text-xs text-neutral-300 leading-relaxed mb-3">
                LifeOS relies on hardware-level geofencing to send you alerts when you cross boundaries (e.g. reminding you to buy groceries when entering the store):
              </Text>
              <Text className="text-xs text-neutral-400 leading-relaxed mb-2">
                • <Text className="font-bold text-white">Always-Allow Requirement:</Text> To track region crossings efficiently when the app is closed, select "Always Allow" in the OS system prompt.
              </Text>
              <Text className="text-xs text-neutral-400 leading-relaxed mb-2">
                • <Text className="font-bold text-white">Battery Optimization:</Text> For Xiaomi, OnePlus, or Huawei devices, please ensure battery optimizations are disabled manually for LifeOS in system settings to prevent trigger delays.
              </Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View className="mb-4">
            <TouchableOpacity
              onPress={async () => {
                const granted = await requestBackgroundPermission();
                updateSetting("onboardingCompleted", true);
                if (granted) {
                  Alert.alert("Success", "Always-Allow location access is enabled! Geofences are active.");
                } else {
                  Alert.alert("Permission Denied", "Triggers will only fire in the foreground.");
                }
              }}
              className="bg-indigo-600 p-4 rounded-2xl flex items-center justify-center shadow-lg"
            >
              <Text className="text-white text-sm font-bold">Accept & Enable Geofencing</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Global Search Console Modal */}
      <Modal visible={searchModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-black px-5 py-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-black text-white">Global Search</Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchModalVisible(false);
              }}
              className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg"
            >
              <Text className="text-neutral-400 text-xs font-bold">Close</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View className="bg-neutral-900 border border-neutral-800 rounded-2xl flex-row items-center px-3.5 py-2 mb-4">
            <Search size={16} color="#a3a3a3" />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks, contacts, ledger, places..."
              placeholderTextColor="#525252"
              className="flex-1 text-white text-sm ml-2.5 text-left"
            />
          </View>

          {/* Results List */}
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {searchQuery.trim().length === 0 ? (
              <View className="items-center justify-center py-12">
                <Search size={32} color="#404040" />
                <Text className="text-neutral-500 text-xs mt-2 italic">Type keywords to search across the entire app</Text>
              </View>
            ) : (
              <View>
                {/* 1. Tasks Results */}
                {searchResults.tasks.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest mb-2">Tasks</Text>
                    {searchResults.tasks.map((occ) => (
                      <View key={occ.id} className="bg-neutral-900 border border-neutral-855 p-3 rounded-xl mb-1.5 flex-row justify-between items-center">
                        <View className="flex-1 mr-2">
                          <Text className="text-white text-xs font-medium">{occ.task?.title}</Text>
                          {occ.task?.description && (
                            <Text className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">{occ.task.description}</Text>
                          )}
                        </View>
                        <View className={`px-2 py-0.5 rounded ${occ.status === "COMPLETED" ? "bg-emerald-950" : "bg-neutral-800"}`}>
                          <Text className={`text-[8px] font-bold ${occ.status === "COMPLETED" ? "text-emerald-400" : "text-neutral-400"}`}>
                            {occ.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* 2. Contacts Results */}
                {searchResults.people.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest mb-2">Contacts</Text>
                    {searchResults.people.map((person) => (
                      <TouchableOpacity
                        key={person.id}
                        onPress={() => {
                          setSearchModalVisible(false);
                          router.push("/people" as any);
                        }}
                        className="bg-neutral-900 border border-neutral-855 p-3 rounded-xl mb-1.5 flex-row justify-between items-center"
                      >
                        <View>
                          <Text className="text-white text-xs font-bold">{person.name}</Text>
                          <Text className="text-[9px] text-neutral-400 mt-0.5">{person.relationship || "Contact"}</Text>
                        </View>
                        <ArrowRight size={12} color="#a3a3a3" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 3. Places Results */}
                {searchResults.places.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest mb-2">Places (Locations)</Text>
                    {searchResults.places.map((place) => (
                      <TouchableOpacity
                        key={place.id}
                        onPress={() => {
                          setSearchModalVisible(false);
                          router.push("/places" as any);
                        }}
                        className="bg-neutral-900 border border-neutral-855 p-3 rounded-xl mb-1.5 flex-row justify-between items-center"
                      >
                        <View className="flex-1 mr-2">
                          <Text className="text-white text-xs font-bold">{place.name}</Text>
                          {place.address && <Text className="text-[9px] text-neutral-400 mt-0.5">{place.address}</Text>}
                        </View>
                        <ArrowRight size={12} color="#a3a3a3" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 4. Transactions Results */}
                {searchResults.transactions.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] font-extrabold text-rose-400 uppercase tracking-widest mb-2">Ledger & Expenses</Text>
                    {searchResults.transactions.map((tx) => (
                      <TouchableOpacity
                        key={tx.id}
                        onPress={() => {
                          setSearchModalVisible(false);
                          router.push("/ledger" as any);
                        }}
                        className="bg-neutral-900 border border-neutral-855 p-3 rounded-xl mb-1.5 flex-row justify-between items-center"
                      >
                        <View className="flex-1 mr-2">
                          <Text className="text-white text-xs font-medium">{tx.description}</Text>
                          <Text className="text-[8px] text-neutral-400 font-extrabold uppercase mt-0.5">{tx.category || "General"} | {tx.type}</Text>
                        </View>
                        <Text className="text-xs font-bold text-white">${parseFloat(tx.amount).toFixed(2)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* No Results Fallback */}
                {searchResults.tasks.length === 0 &&
                  searchResults.people.length === 0 &&
                  searchResults.places.length === 0 &&
                  searchResults.transactions.length === 0 && (
                    <View className="items-center justify-center py-12">
                      <Text className="text-neutral-500 text-xs italic">No matching records found.</Text>
                    </View>
                  )}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}
