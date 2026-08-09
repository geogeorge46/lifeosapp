import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Trash2,
  Activity,
  ArrowRight,
  Sparkles,
} from "lucide-react-native";
import { apiService, WeeklyReport, TaskOccurrence } from "../src/services/api";

type TabType = "COMPLETED" | "INSIGHTS" | "CANCELED" | "BACKLOG";

export default function WeeklyReviewScreen() {
  const router = useRouter();
  const [baseDate, setBaseDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("COMPLETED");

  // Inline Reschedule states
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleDateInput, setRescheduleDateInput] = useState("");
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Helper date calculators
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const monday = getMonday(baseDate);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const startStr = monday.toISOString().split("T")[0];
  const endStr = sunday.toISOString().split("T")[0];

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.fetchWeeklyReport(startStr, endStr);
      setReport(data);
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", "Failed to retrieve weekly report datasets");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startStr]);

  const handlePrevWeek = () => {
    const prev = new Date(baseDate);
    prev.setDate(baseDate.getDate() - 7);
    setBaseDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(baseDate);
    next.setDate(baseDate.getDate() + 7);
    setBaseDate(next);
  };

  const handleDoToday = async (occurrenceId: string) => {
    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await apiService.rescheduleTask(occurrenceId, todayStr, "Moved to today during Weekly Review");
      Alert.alert("Success", "Task rescheduled to today!");
      fetchReport();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update task schedule");
    }
  };

  const handleCancelOccurrence = async (occurrenceId: string) => {
    try {
      await apiService.updateTaskStatus(occurrenceId, "CANCELLED");
      Alert.alert("Success", "Occurrence dropped!");
      fetchReport();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to drop task occurrence");
    }
  };

  const startRescheduling = (occurrence: TaskOccurrence) => {
    setReschedulingId(occurrence.id);
    setRescheduleDateInput(new Date().toISOString().split("T")[0]);
  };

  const handleSaveReschedule = async (occurrenceId: string) => {
    if (!rescheduleDateInput.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Invalid Date", "Please enter in YYYY-MM-DD format.");
      return;
    }
    setIsSubmittingReschedule(true);
    try {
      await apiService.rescheduleTask(occurrenceId, rescheduleDateInput.trim(), "Rescheduled during Weekly Review");
      setReschedulingId(null);
      Alert.alert("Success", "Task rescheduled!");
      fetchReport();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reschedule task");
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Stats calculation
  const totalCompleted = report?.completed.length || 0;
  const totalDropped = report?.dropped.length || 0;
  const totalRescheduled = report?.rescheduled.reduce((sum, item) => sum + item.postponeCount, 0) || 0;
  const totalFrictionTasks = report?.rescheduled.filter(item => item.postponeCount >= 3).length || 0;

  const totalActions = totalCompleted + totalDropped;
  const successRatio = totalActions > 0 ? Math.round((totalCompleted / totalActions) * 100) : 100;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }} edges={["top", "left", "right"]}>
      {/* Header Date Range Navigation */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#111" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: "#111", borderRadius: 999 }}>
          <ChevronLeft size={16} color="#fff" />
        </TouchableOpacity>
        
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={handlePrevWeek} style={{ padding: 4 }}>
            <ChevronLeft size={18} color="#888" />
          </TouchableOpacity>
          
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
            <Text style={{ color: "#555", fontSize: 10, fontWeight: "600", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>
              Weekly Recap Audits
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleNextWeek} style={{ padding: 4 }}>
            <ChevronRight size={18} color="#888" />
          </TouchableOpacity>
        </View>

        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          {/* Productivity Stats Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            {/* Completed */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={{ color: "#555", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Completed</Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{totalCompleted}</Text>
            </View>

            {/* Success Ratio */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Activity size={16} color="#3b82f6" />
                <Text style={{ color: "#555", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Success Rate</Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{successRatio}%</Text>
            </View>

            {/* Postponed */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <AlertTriangle size={16} color="#f59e0b" />
                <Text style={{ color: "#555", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Postponed</Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{totalRescheduled}</Text>
            </View>

            {/* Canceled */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 16, padding: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <XCircle size={16} color="#ef4444" />
                <Text style={{ color: "#555", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Dropped</Text>
              </View>
              <Text style={{ color: "#fff", fontSize: 24, fontWeight: "800" }}>{totalDropped}</Text>
            </View>
          </View>

          {/* Friction Warning Banner */}
          {totalFrictionTasks > 0 && (
            <View style={{ backgroundColor: "#1e1302", borderWidth: 1, borderColor: "#78350f", borderRadius: 16, padding: 16, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <AlertTriangle size={20} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#fef3c7", fontSize: 13, fontWeight: "bold" }}>Procrastination Friction Detected</Text>
                <Text style={{ color: "#d97706", fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                  You rescheduled {totalFrictionTasks} task{totalFrictionTasks > 1 ? "s" : ""} 3 or more times this week. Review them in the Insights tab.
                </Text>
              </View>
            </View>
          )}

          {/* Navigation Segments Tab Bar */}
          <View style={{ flexDirection: "row", backgroundColor: "#0a0a0a", borderWidth: 1, borderColor: "#151515", borderRadius: 14, padding: 4, marginBottom: 20 }}>
            {(["COMPLETED", "INSIGHTS", "CANCELED", "BACKLOG"] as TabType[]).map((tab) => {
              const isActive = activeTab === tab;
              let label = "Done";
              if (tab === "INSIGHTS") label = "Insights";
              if (tab === "CANCELED") label = "Canceled";
              if (tab === "BACKLOG") label = `Backlog (${report?.uncompleted.length || 0})`;

              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: "center",
                    backgroundColor: isActive ? "#111" : "transparent",
                  }}
                >
                  <Text style={{ color: isActive ? "#fff" : "#666", fontSize: 10, fontWeight: "700" }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tab Contents */}
          <View>
            {/* TAB: COMPLETED */}
            {activeTab === "COMPLETED" && (
              <View style={{ gap: 10 }}>
                {report?.completed.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: "center" }}>
                    <FrownIcon />
                    <Text style={{ color: "#555", fontSize: 12, fontWeight: "bold", marginTop: 12 }}>No Completed Tasks</Text>
                  </View>
                ) : (
                  report?.completed.map((o) => (
                    <View key={o.id} style={{ backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600" }}>{o.task.title}</Text>
                        <Text style={{ color: "#555", fontSize: 10, marginTop: 4 }}>
                          Completed on {new Date(o.completedAt!).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB: CANCELED */}
            {activeTab === "CANCELED" && (
              <View style={{ gap: 10 }}>
                {report?.dropped.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: "center" }}>
                    <Text style={{ color: "#555", fontSize: 12, fontWeight: "bold", textAlign: "center" }}>No Canceled Tasks. Clean Slate!</Text>
                  </View>
                ) : (
                  report?.dropped.map((o) => (
                    <View key={o.id} style={{ backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <XCircle size={16} color="#ef4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#fff", fontSize: 13, fontWeight: "600", textDecorationLine: "line-through" }}>{o.task.title}</Text>
                        <Text style={{ color: "#555", fontSize: 10, marginTop: 4 }}>
                          Dropped on {new Date(o.scheduledDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}

            {/* TAB: INSIGHTS */}
            {activeTab === "INSIGHTS" && (
              <View style={{ gap: 12 }}>
                {report?.rescheduled.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: "center", gap: 8 }}>
                    <Sparkles size={24} color="#eab308" />
                    <Text style={{ color: "#888", fontSize: 13, fontWeight: "bold" }}>Perfect Momentum</Text>
                    <Text style={{ color: "#555", fontSize: 10 }}>No tasks were postponed this week. Zero delay!</Text>
                  </View>
                ) : (
                  report?.rescheduled.map((stat) => {
                    const isFriction = stat.postponeCount >= 3;
                    return (
                      <View
                        key={stat.taskId}
                        style={{
                          backgroundColor: "#0d0d0d",
                          borderWidth: 1,
                          borderColor: isFriction ? "#78350f" : "#1a1a1a",
                          borderRadius: 16,
                          padding: 16,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{stat.title}</Text>
                          </View>
                          <View style={{ backgroundColor: isFriction ? "#ef444415" : "#f59e0b10", borderWidth: 1, borderColor: isFriction ? "#ef4444" : "#f59e0b", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: isFriction ? "#ef4444" : "#f59e0b", fontSize: 10, fontWeight: "bold" }}>
                              {stat.postponeCount}x Postponed
                            </Text>
                          </View>
                        </View>

                        {isFriction && (
                          <View style={{ backgroundColor: "#2d0606", borderRadius: 8, padding: 10, marginBottom: 12 }}>
                            <Text style={{ color: "#fca5a5", fontSize: 10, fontWeight: "bold" }}>💡 Optimization Insight:</Text>
                            <Text style={{ color: "#ef4444", fontSize: 10, marginTop: 2, lineHeight: 14 }}>
                              This task is encountering resistance. Try breaking it down into smaller sub-tasks, allocating it a specific calendar timeblock, or drop/cancel it if it is no longer relevant.
                            </Text>
                          </View>
                        )}

                        <Text style={{ color: "#444", fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                          Rescheduling Path
                        </Text>
                        
                        <View style={{ gap: 8 }}>
                          {stat.history.map((log, idx) => (
                            <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Calendar size={12} color="#444" />
                              <Text style={{ color: "#888", fontSize: 11 }}>
                                {new Date(log.fromDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </Text>
                              <ArrowRight size={12} color="#444" />
                              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                                {new Date(log.toDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </Text>
                              {log.reason && (
                                <Text style={{ color: "#555", fontSize: 11, fontStyle: "italic" }}>
                                  ({log.reason})
                                </Text>
                              )}
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* TAB: BACKLOG REVIEW */}
            {activeTab === "BACKLOG" && (
              <View style={{ gap: 12 }}>
                {report?.uncompleted.length === 0 ? (
                  <View style={{ paddingVertical: 32, alignItems: "center", gap: 8 }}>
                    <Sparkles size={24} color="#10b981" />
                    <Text style={{ color: "#888", fontSize: 13, fontWeight: "bold" }}>Backlog Cleared!</Text>
                    <Text style={{ color: "#555", fontSize: 10 }}>All past tasks have been reviewed and completed.</Text>
                  </View>
                ) : (
                  report?.uncompleted.map((o) => {
                    const isReschedulingThis = reschedulingId === o.id;

                    return (
                      <View key={o.id} style={{ backgroundColor: "#0d0d0d", borderWidth: 1, borderColor: "#1a1a1a", borderRadius: 16, padding: 16 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{o.task.title}</Text>
                            <Text style={{ color: "#555", fontSize: 11, marginTop: 4 }}>
                              Scheduled on {new Date(o.scheduledDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </Text>
                          </View>
                          {o.rescheduleCount && o.rescheduleCount > 0 ? (
                            <View style={{ backgroundColor: "#ef444410", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: "#ef4444", fontSize: 8, fontWeight: "bold" }}>
                                {o.rescheduleCount}x Rescheduled
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {isReschedulingThis ? (
                          <View style={{ marginTop: 8 }}>
                            <Text style={{ color: "#888", fontSize: 11, marginBottom: 6 }}>Enter New Date (YYYY-MM-DD):</Text>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TextInput
                                value={rescheduleDateInput}
                                onChangeText={setRescheduleDateInput}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#444"
                                style={{
                                  flex: 1,
                                  backgroundColor: "#111",
                                  borderWidth: 1,
                                  borderColor: "#222",
                                  borderRadius: 10,
                                  color: "#fff",
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  fontSize: 13,
                                }}
                              />
                              <TouchableOpacity
                                onPress={() => handleSaveReschedule(o.id)}
                                disabled={isSubmittingReschedule}
                                style={{
                                  backgroundColor: "#8b5cf6",
                                  paddingHorizontal: 16,
                                  borderRadius: 10,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>Save</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setReschedulingId(null)}
                                style={{
                                  backgroundColor: "#111",
                                  borderWidth: 1,
                                  borderColor: "#222",
                                  paddingHorizontal: 12,
                                  borderRadius: 10,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text style={{ color: "#aaa", fontSize: 12, fontWeight: "bold" }}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                            <TouchableOpacity
                              onPress={() => handleDoToday(o.id)}
                              style={{
                                flex: 1.2,
                                backgroundColor: "#10b98115",
                                borderWidth: 1,
                                borderColor: "#10b98130",
                                paddingVertical: 8,
                                borderRadius: 10,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "700" }}>Do Today</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => startRescheduling(o)}
                              style={{
                                flex: 1.2,
                                backgroundColor: "#8b5cf615",
                                borderWidth: 1,
                                borderColor: "#8b5cf630",
                                paddingVertical: 8,
                                borderRadius: 10,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: "#8b5cf6", fontSize: 11, fontWeight: "700" }}>Reschedule</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleCancelOccurrence(o.id)}
                              style={{
                                flex: 1,
                                backgroundColor: "#ef444415",
                                borderWidth: 1,
                                borderColor: "#ef444430",
                                paddingVertical: 8,
                                borderRadius: 10,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: "#ef4444", fontSize: 11, fontWeight: "700" }}>Drop</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function FrownIcon() {
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#111", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#555", fontSize: 18 }}>😕</Text>
    </View>
  );
}
