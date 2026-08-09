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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 120 }} className="flex-1">
          {/* Header section */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <View>
              <Text className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Today</Text>
              <Text className="text-xs text-[#64748B] mt-1 font-semibold">Focus on what is important right now.</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {recap && (
                <TouchableOpacity
                  onPress={resetDismissState}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(224, 86, 70, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(224, 86, 70, 0.15)",
                    borderRadius: 14,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    shadowColor: "#E05646",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                  }}
                >
                  <Sun size={14} color="#E05646" />
                  <Text style={{ color: "#E05646", fontSize: 11, fontWeight: "800" }}>Daily Digest</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setSearchModalVisible(true)}
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                <Search size={16} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Progress Card */}
          <View className="bg-[#202E4E] border border-slate-700/30 rounded-3xl p-5 mb-6 flex-row justify-between items-center shadow-lg shadow-[#202E4E]/15">
            <View className="flex-1 pr-3">
              <Text className="text-base font-extrabold text-white">Daily Focus Rate</Text>
              <Text className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">
                {overallTotal === 0
                  ? "No commitments scheduled for today. Add one below!"
                  : `${overallCompleted} of ${overallTotal} actions completed today (${overallCompletionRate}%)`}
              </Text>
            </View>
            {overallTotal > 0 && (
              <View className="w-14 h-14 rounded-full border-4 border-slate-500/30 flex items-center justify-center bg-white/10">
                <Text className="text-white font-black text-xs">{overallCompletionRate}%</Text>
              </View>
            )}
          </View>


          {/* TODAY Events & Scheduled Lists */}
          {/* Today's Events Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-100 items-center justify-center mr-2">
                <Calendar size={14} color="#10B981" />
              </View>
              <Text className="text-xs font-black text-[#64748B] uppercase tracking-wider">
                Today's Events ({todayEvents.length})
              </Text>
            </View>

            {eventsLoading && todayEvents.length === 0 ? (
              <ActivityIndicator size="small" color="#E05646" className="my-3" />
            ) : todayEvents.length === 0 ? (
              <View className="bg-white border border-[#E2E8F0] rounded-2xl py-6 px-4 items-center justify-center shadow-sm shadow-[#0F172A]/5">
                <Text className="text-xs text-[#94A3B8] italic font-semibold">No events scheduled today.</Text>
              </View>
            ) : (
              todayEvents.map((event) => (
                <View
                  key={event.id}
                  className="bg-white border-l-4 border-l-emerald-500 border-[#E2E8F0] rounded-2xl p-4 mb-2 flex-row justify-between items-center shadow-sm shadow-[#0F172A]/5"
                >
                  <View className="flex-1 pr-3">
                    <Text className="text-[#0F172A] text-sm font-bold">{event.title}</Text>
                    {event.description && (
                      <Text className="text-xs text-[#64748B] mt-1 font-medium">{event.description}</Text>
                    )}
                    <Text className="text-[10px] text-[#94A3B8] mt-1.5 font-bold">
                      {new Date(event.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Everyday Tasks Section */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 items-center justify-center mr-2">
                <CheckSquare size={14} color="#E05646" />
              </View>
              <Text className="text-xs font-black text-[#64748B] uppercase tracking-wider">
                Everyday Tasks ({everydayTasks.length})
              </Text>
            </View>

            {isLoading && everydayTasks.length === 0 ? (
              <ActivityIndicator size="small" color="#E05646" className="my-3" />
            ) : everydayTasks.length === 0 ? (
              <View className="bg-white border border-[#E2E8F0] rounded-2xl py-6 px-4 items-center justify-center shadow-sm shadow-[#0F172A]/5">
                <Text className="text-xs text-[#94A3B8] italic font-semibold">No everyday tasks scheduled.</Text>
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
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 items-center justify-center mr-2">
                <CheckSquare size={14} color="#3b82f6" />
              </View>
              <Text className="text-xs font-black text-[#64748B] uppercase tracking-wider">
                Other Tasks ({otherTasks.length})
              </Text>
            </View>

            {isLoading && otherTasks.length === 0 ? (
              <ActivityIndicator size="small" color="#E05646" className="my-3" />
            ) : otherTasks.length === 0 ? (
              <View className="bg-white border border-[#E2E8F0] rounded-2xl py-6 px-4 items-center justify-center shadow-sm shadow-[#0F172A]/5">
                <Text className="text-xs text-[#94A3B8] italic font-semibold">No other tasks scheduled.</Text>
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
            <View className="flex-row items-center mb-3">
              <View className="w-7 h-7 rounded-full bg-amber-50 border border-amber-100 items-center justify-center mr-2">
                <Zap size={14} color="#D97706" />
              </View>
              <Text className="text-xs font-black text-[#64748B] uppercase tracking-wider">
                Habits Loop ({habits.length})
              </Text>
            </View>

            {habits.length === 0 ? (
              <View className="bg-white border border-[#E2E8F0] rounded-2xl py-6 px-4 items-center justify-center mb-3 shadow-sm shadow-[#0F172A]/5">
                <Text className="text-xs text-[#94A3B8] italic font-semibold">No daily habits tracked yet. Create one below!</Text>
              </View>
            ) : (
              habits.map((habit) => {
                const isCompletedToday = habit.completions?.some((c) => c.date.startsWith(todayStr)) || false;
                return (
                  <View
                    key={habit.id}
                    className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-2 flex-row justify-between items-center shadow-sm shadow-[#0F172A]/5"
                  >
                    <TouchableOpacity
                      onPress={() => toggleHabit(habit.id, todayStr)}
                      className="flex-row items-center flex-1 pr-3"
                    >
                      <CheckCircle2
                        size={20}
                        color={isCompletedToday ? "#E05646" : "#E2E8F0"}
                        style={{ marginRight: 12 }}
                      />
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-bold ${
                            isCompletedToday ? "text-neutral-400 line-through font-medium" : "text-[#0F172A]"
                          }`}
                        >
                          {habit.title}
                        </Text>
                        <View className="flex-row items-center gap-2 mt-1">
                          {habit.streak > 0 && (
                            <View className="bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded flex-row items-center">
                              <Text style={{ fontSize: 9, marginRight: 2 }}>🔥</Text>
                              <Text className="text-[8px] font-extrabold text-amber-700">
                                {habit.streak} day streak
                              </Text>
                            </View>
                          )}
                          {habit.longestStreak > 0 && (
                            <View className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                              <Text className="text-[8px] font-extrabold text-[#64748B]">
                                Best: {habit.longestStreak}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => deleteHabit(habit.id)} className="p-2 bg-red-50 border border-red-100 rounded-xl">
                      <Trash2 size={13} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* Quick Habit Adder Input */}
            <View className="flex-row items-center bg-white border border-[#E2E8F0] rounded-2xl p-2 space-x-2 shadow-sm shadow-[#0F172A]/5">
              <TextInput
                placeholder="Track new habit (e.g. Drink water)..."
                placeholderTextColor="#94A3B8"
                value={newHabitInput}
                onChangeText={setNewHabitInput}
                onSubmitEditing={handleAddHabit}
                className="flex-1 text-[12px] text-[#0F172A] bg-[#F8FAFC] rounded-xl px-3 py-2 border border-[#E2E8F0] text-left font-bold"
              />
              <TouchableOpacity
                onPress={handleAddHabit}
                className="bg-[#E05646] p-2.5 rounded-xl flex items-center justify-center shadow-sm shadow-[#E05646]/20"
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
          </View>

          {/* NOT COMPLETED Backlog */}
          {backlogOccurrences.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <View className="w-7 h-7 rounded-full bg-amber-100 border border-amber-200 items-center justify-center mr-2">
                  <AlertTriangle size={14} color="#D97706" />
                </View>
                <Text className="text-xs font-black text-amber-700 uppercase tracking-wider">
                  Not Completed Backlog ({backlogOccurrences.length})
                </Text>
              </View>

              {backlogOccurrences.map((occurrence) => (
                <View
                  key={occurrence.id}
                  className="bg-white border-l-4 border-l-amber-500 border-[#E2E8F0] rounded-2xl p-4 mb-3 shadow-sm shadow-[#0F172A]/5"
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "700" }}>
                        {occurrence.task.title}
                      </Text>
                      <Text style={{ color: "#D97706", fontSize: 11, fontWeight: "700", marginTop: 4 }}>
                        ⚠️ Scheduled for {formatDateLabel(occurrence.scheduledDate)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteOccurrence(occurrence.id)}
                      style={{ padding: 6, backgroundColor: "#FEF2F2", borderRadius: 8 }}
                    >
                      <Text style={{ color: "#EF4444", fontSize: 10, fontWeight: "800" }}>Drop</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: "row", marginTop: 12, gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => handleDoToday(occurrence.id)}
                      style={{
                        backgroundColor: "#E05646",
                        borderRadius: 12,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        shadowColor: "#E05646",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                        elevation: 3,
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 11, fontWeight: "800" }}>Do Today</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleOpenReschedulePicker(occurrence.id)}
                      style={{
                        backgroundColor: "#F8FAFC",
                        borderWidth: 1,
                        borderColor: "#E2E8F0",
                        borderRadius: 12,
                        paddingVertical: 8,
                        paddingHorizontal: 16,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "800" }}>Schedule</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Task Creation Input Panel - Float-Like Bar */}
        <View style={{ position: "absolute", bottom: 96, left: 20, right: 20, zIndex: 10 }} className="bg-white border border-[#E2E8F0] rounded-2xl p-2 flex-row items-center space-x-2 shadow-lg shadow-[#0F172A]/8">
          <TextInput
            placeholder="Write task (e.g. exercise every day at 10 AM)..."
            placeholderTextColor="#94A3B8"
            value={newTaskInput}
            onChangeText={setNewTaskInput}
            onSubmitEditing={handleAddTask}
            className="flex-1 text-[#0F172A] text-xs bg-[#F8FAFC] rounded-xl px-3 py-2.5 border border-[#E2E8F0] text-left font-semibold"
          />
          <TouchableOpacity
            onPress={handleAddTask}
            className="bg-[#E05646] p-2.5 rounded-xl flex items-center justify-center shadow-md shadow-[#E05646]/20"
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
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
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.3)" }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              padding: 24,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 16,
            }}
          >
            <Text style={{ color: "#0F172A", fontSize: 18, fontWeight: "800", letterSpacing: -0.5, marginBottom: 16 }}>
              Reschedule Task
            </Text>

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => handleQuickReschedule(1)}
                style={{ backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 12, borderRadius: 12, flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "#0F172A", fontWeight: "700" }}>Tomorrow</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickReschedule(2)}
                style={{ backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 12, borderRadius: 12, flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "#0F172A", fontWeight: "700" }}>In 2 Days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickReschedule(7)}
                style={{ backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", padding: 12, borderRadius: 12, flex: 1, alignItems: "center" }}
              >
                <Text style={{ color: "#0F172A", fontWeight: "700" }}>Next Week</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: "#64748B", fontSize: 12, marginBottom: 8, fontWeight: "700" }}>
              Or specify a custom date (YYYY-MM-DD):
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <TextInput
                value={customDateInput}
                onChangeText={setCustomDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94A3B8"
                style={{
                  flex: 1,
                  backgroundColor: "#F8FAFC",
                  color: "#0F172A",
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  textAlign: "left",
                  fontWeight: "600",
                }}
              />
              <TouchableOpacity
                onPress={handleCustomReschedule}
                style={{ backgroundColor: "#E05646", paddingHorizontal: 20, borderRadius: 12, justifyContent: "center" }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Move</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => setRescheduleModalVisible(false)}
              style={{ padding: 12, alignItems: "center", backgroundColor: "#F8FAFC", borderStyle: "solid", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 }}
            >
              <Text style={{ color: "#EF4444", fontWeight: "700" }}>Cancel</Text>
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
        <View className="flex-1 bg-[#0F172A]/50 justify-center items-center px-4">
          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-6 w-full max-h-[85%] shadow-2xl">
            <View className="flex-row justify-between items-center border-b border-[#E2E8F0] pb-3 mb-4">
              <View className="flex-row items-center space-x-2">
                <Sun size={20} color="#E05646" />
                <Text className="text-lg font-extrabold text-[#0F172A] tracking-tight">Daily Digest</Text>
              </View>
              <TouchableOpacity
                onPress={triggerCompilation}
                className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center"
              >
                <RefreshCw size={12} color="#E05646" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1 mb-6">
              {recap &&
                recap.summary.split("\n").map((line, idx) => {
                  if (line.startsWith("# ")) {
                    return (
                      <Text key={idx} className="text-xl font-extrabold text-[#0F172A] mt-4 mb-2 tracking-tight">
                        {line.replace("# ", "")}
                      </Text>
                    );
                  }
                  if (line.startsWith("## ")) {
                    return (
                      <Text key={idx} className="text-base font-bold text-[#E05646] mt-4 mb-2 tracking-tight">
                        {line.replace("## ", "")}
                      </Text>
                    );
                  }
                  if (line.startsWith("### ")) {
                    return (
                      <Text key={idx} className="text-xs font-bold text-[#64748B] mt-2.5 mb-1.5 uppercase tracking-wider">
                        {line.replace("### ", "")}
                      </Text>
                    );
                  }
                  if (line.startsWith("* ")) {
                    return (
                      <Text key={idx} className="text-sm text-[#334155] ml-3 mb-1.5 leading-relaxed">
                        • {line.replace("* ", "")}
                      </Text>
                    );
                  }
                  if (line.trim().length === 0) {
                    return null;
                  }
                  return (
                    <Text key={idx} className="text-sm text-[#64748B] mb-2 leading-relaxed">
                      {line}
                    </Text>
                  );
                })}
            </ScrollView>

            <TouchableOpacity
              onPress={dismissRecap}
              className="bg-[#E05646] p-4 rounded-2xl flex items-center justify-center shadow-lg shadow-[#E05646]/20"
            >
              <Text className="text-white text-sm font-bold">Start My Day</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* First-Run Onboarding & Privacy Agreement Modal */}
      <Modal visible={!onboardingCompleted} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-[#F0F4F8] px-6 py-6 justify-between">
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 my-4">
            {/* Logo header */}
            <View className="items-center my-6">
              <View className="bg-white border border-[#E2E8F0] w-16 h-16 rounded-3xl items-center justify-center mb-3 shadow-sm shadow-[#0F172A]/5">
                <Shield size={32} color="#E05646" />
              </View>
              <Text className="text-2xl font-extrabold text-[#0F172A] tracking-tight">Welcome to LifeOS</Text>
              <Text className="text-xs text-[#64748B] mt-1">Your offline-first context engine</Text>
            </View>

            {/* Privacy Section */}
            <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-5 shadow-sm shadow-[#0F172A]/5">
              <Text className="text-sm font-bold text-[#0F172A] mb-2">🛡️ Privacy & Data Agreement</Text>
              <Text className="text-xs text-[#334155] leading-relaxed mb-3">
                LifeOS is built with strict user privacy in mind. When you input task details or link contacts:
              </Text>
              <Text className="text-xs text-[#64748B] leading-relaxed mb-2">
                • <Text className="font-bold text-[#0F172A]">100% Local-first:</Text> All your databases, ledgers, events, and location profiles remain encrypted locally on this device.
              </Text>
              <Text className="text-xs text-[#64748B] leading-relaxed mb-2">
                • <Text className="font-bold text-[#0F172A]">Full Purge Compliance:</Text> Deleting a contact removes all linked debts, transaction entries, and task mappings completely.
              </Text>
              <Text className="text-xs text-[#64748B] leading-relaxed">
                • <Text className="font-bold text-[#0F172A]">No Shared Data:</Text> LifeOS never transmits or shares third-party contact data without explicit user actions.
              </Text>
            </View>

            {/* Geofence Explainer */}
            <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-5 shadow-sm shadow-[#0F172A]/5">
              <Text className="text-sm font-bold text-[#0F172A] mb-2">📍 Location & Geofencing Explainer</Text>
              <Text className="text-xs text-[#334155] leading-relaxed mb-3">
                LifeOS relies on hardware-level geofencing to send you alerts when you cross boundaries (e.g. reminding you to buy groceries when entering the store):
              </Text>
              <Text className="text-xs text-[#64748B] leading-relaxed mb-2">
                • <Text className="font-bold text-[#0F172A]">Always-Allow Requirement:</Text> To track region crossings efficiently when the app is closed, select "Always Allow" in the OS system prompt.
              </Text>
              <Text className="text-xs text-[#64748B] leading-relaxed mb-2">
                • <Text className="font-bold text-[#0F172A]">Battery Optimization:</Text> For Xiaomi, OnePlus, or Huawei devices, please ensure battery optimizations are disabled manually for LifeOS in system settings to prevent trigger delays.
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
              className="bg-[#E05646] p-4 rounded-2xl flex items-center justify-center shadow-lg shadow-[#E05646]/20"
            >
              <Text className="text-white text-sm font-bold">Accept & Enable Geofencing</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Global Search Console Modal */}
      <Modal visible={searchModalVisible} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-[#F0F4F8] px-5 py-4">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-black text-[#0F172A]">Global Search</Text>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchModalVisible(false);
              }}
              className="px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-lg shadow-sm"
            >
              <Text className="text-[#64748B] text-xs font-bold">Close</Text>
            </TouchableOpacity>
          </View>

          {/* Search Input */}
          <View className="bg-white border border-[#E2E8F0] rounded-2xl flex-row items-center px-3.5 py-2 mb-4 shadow-sm">
            <Search size={16} color="#64748B" />
            <TextInput
              autoFocus
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search tasks, contacts, ledger, places..."
              placeholderTextColor="#94A3B8"
              className="flex-1 text-[#0F172A] text-sm ml-2.5 text-left"
            />
          </View>

          {/* Results List */}
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {searchQuery.trim().length === 0 ? (
              <View className="items-center justify-center py-12">
                <Search size={32} color="#94A3B8" />
                <Text className="text-[#94A3B8] text-xs mt-2 italic">Type keywords to search across the entire app</Text>
              </View>
            ) : (
              <View>
                {/* 1. Tasks Results */}
                {searchResults.tasks.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] font-extrabold text-[#E05646] uppercase tracking-widest mb-2">Tasks</Text>
                    {searchResults.tasks.map((occ) => (
                      <View key={occ.id} className="bg-white border border-[#E2E8F0] p-3 rounded-xl mb-1.5 flex-row justify-between items-center shadow-sm">
                        <View className="flex-1 mr-2">
                          <Text className="text-[#0F172A] text-xs font-bold">{occ.task?.title}</Text>
                          {occ.task?.description && (
                            <Text className="text-[10px] text-[#64748B] mt-0.5 leading-relaxed">{occ.task.description}</Text>
                          )}
                        </View>
                        <View className={`px-2 py-0.5 rounded ${occ.status === "COMPLETED" ? "bg-emerald-50 border border-emerald-100" : "bg-slate-100 border border-slate-200"}`}>
                          <Text className={`text-[8px] font-bold ${occ.status === "COMPLETED" ? "text-emerald-700" : "text-[#64748B]"}`}>
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
                    <Text className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest mb-2">Contacts</Text>
                    {searchResults.people.map((person) => (
                      <TouchableOpacity
                        key={person.id}
                        onPress={() => {
                          setSearchModalVisible(false);
                          router.push("/people" as any);
                        }}
                        className="bg-white border border-[#E2E8F0] p-3 rounded-xl mb-1.5 flex-row justify-between items-center shadow-sm"
                      >
                        <View>
                          <Text className="text-[#0F172A] text-xs font-bold">{person.name}</Text>
                          <Text className="text-[9px] text-[#64748B] mt-0.5">{person.relationship || "Contact"}</Text>
                        </View>
                        <ArrowRight size={12} color="#64748B" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 3. Places Results */}
                {searchResults.places.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest mb-2">Places (Locations)</Text>
                    {searchResults.places.map((place) => (
                      <TouchableOpacity
                        key={place.id}
                        onPress={() => {
                          setSearchModalVisible(false);
                          router.push("/places" as any);
                        }}
                        className="bg-white border border-[#E2E8F0] p-3 rounded-xl mb-1.5 flex-row justify-between items-center shadow-sm"
                      >
                        <View className="flex-1 mr-2">
                          <Text className="text-[#0F172A] text-xs font-bold">{place.name}</Text>
                          {place.address && <Text className="text-[9px] text-[#64748B] mt-0.5">{place.address}</Text>}
                        </View>
                        <ArrowRight size={12} color="#64748B" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* 4. Transactions Results */}
                {searchResults.transactions.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest mb-2">Ledger & Expenses</Text>
                    {searchResults.transactions.map((tx) => (
                      <TouchableOpacity
                        key={tx.id}
                        onPress={() => {
                          setSearchModalVisible(false);
                          router.push("/ledger" as any);
                        }}
                        className="bg-white border border-[#E2E8F0] p-3 rounded-xl mb-1.5 flex-row justify-between items-center shadow-sm"
                      >
                        <View className="flex-1 mr-2">
                          <Text className="text-[#0F172A] text-xs font-bold">{tx.description}</Text>
                          <Text className="text-[8px] text-[#64748B] font-extrabold uppercase mt-0.5">{tx.category || "General"} | {tx.type}</Text>
                        </View>
                        <Text className="text-xs font-bold text-[#0F172A]">${parseFloat(tx.amount).toFixed(2)}</Text>
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
                      <Text className="text-[#94A3B8] text-xs italic">No matching records found.</Text>
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
