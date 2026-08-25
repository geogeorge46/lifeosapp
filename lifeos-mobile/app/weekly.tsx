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
  Calendar as CalendarIcon,
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
import { DatePickerModal } from "../src/components/common/DatePickerModal";
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
  const [datePickerVisible, setDatePickerVisible] = useState(false);

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top", "left", "right"]}>
      {/* Header Date Range Navigation */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#E2E8F0", backgroundColor: "#F0F4F8" }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, backgroundColor: "#FFFFFF", borderRadius: 999, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
          <ChevronLeft size={16} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={handlePrevWeek} style={{ padding: 4 }}>
            <ChevronLeft size={18} color="#64748B" />
          </TouchableOpacity>
          
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#0F172A", fontSize: 16, fontWeight: "800", letterSpacing: -0.5 }}>
              {monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – {sunday.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </Text>
            <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "700", marginTop: 2, textTransform: "uppercase", letterSpacing: 1 }}>
              Weekly Recap Audits
            </Text>
          </View>
          
          <TouchableOpacity onPress={handleNextWeek} style={{ padding: 4 }}>
            <ChevronRight size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#E05646" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 24 }}>
          {/* Productivity Stats Grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 }}>
            {/* Completed */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <CheckCircle2 size={16} color="#10b981" />
                <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Completed</Text>
              </View>
              <Text style={{ color: "#0F172A", fontSize: 24, fontWeight: "800" }}>{totalCompleted}</Text>
            </View>

            {/* Success Ratio */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Activity size={16} color="#202E4E" />
                <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Success Rate</Text>
              </View>
              <Text style={{ color: "#0F172A", fontSize: 24, fontWeight: "800" }}>{successRatio}%</Text>
            </View>

            {/* Postponed */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <AlertTriangle size={16} color="#E05646" />
                <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Postponed</Text>
              </View>
              <Text style={{ color: "#0F172A", fontSize: 24, fontWeight: "800" }}>{totalRescheduled}</Text>
            </View>

            {/* Canceled */}
            <View style={{ flex: 1, minWidth: "45%", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <XCircle size={16} color="#ef4444" />
                <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "bold", textTransform: "uppercase" }}>Dropped</Text>
              </View>
              <Text style={{ color: "#0F172A", fontSize: 24, fontWeight: "800" }}>{totalDropped}</Text>
            </View>
          </View>

          {/* Friction Warning Banner */}
          {totalFrictionTasks > 0 && (
            <View style={{ backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FCD34D", borderRadius: 20, padding: 16, marginBottom: 24, flexDirection: "row", alignItems: "center", gap: 14 }}>
              <AlertTriangle size={20} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#92400E", fontSize: 13, fontWeight: "800" }}>Procrastination Friction Detected</Text>
                <Text style={{ color: "#B45309", fontSize: 11, marginTop: 2, lineHeight: 15, fontWeight: "600" }}>
                  You rescheduled {totalFrictionTasks} task{totalFrictionTasks > 1 ? "s" : ""} 3 or more times this week. Review them in the Insights tab.
                </Text>
              </View>
            </View>
          )}

          {/* Navigation Segments Tab Bar */}
          <View style={{ flexDirection: "row", backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 16, padding: 4, marginBottom: 20 }}>
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
                    borderRadius: 12,
                    alignItems: "center",
                    backgroundColor: isActive ? "#FFFFFF" : "transparent",
                    borderWidth: isActive ? 1 : 0,
                    borderColor: isActive ? "#E2E8F0" : "transparent",
                    shadowColor: isActive ? "#0F172A" : "transparent",
                    shadowOffset: isActive ? { width: 0, height: 1 } : { width: 0, height: 0 },
                    shadowOpacity: isActive ? 0.05 : 0,
                    shadowRadius: 2,
                    elevation: isActive ? 1 : 0,
                  }}
                >
                  <Text style={{ color: isActive ? "#0F172A" : "#64748B", fontSize: 10, fontWeight: "700" }}>{label}</Text>
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
                    <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "bold", marginTop: 12 }}>No Completed Tasks</Text>
                  </View>
                ) : (
                  report?.completed.map((o) => (
                    <View key={o.id} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}>
                      <CheckCircle2 size={16} color="#10b981" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#0F172A", fontSize: 13, fontWeight: "700" }}>{o.task.title}</Text>
                        <Text style={{ color: "#64748B", fontSize: 10, marginTop: 4, fontWeight: "500" }}>
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
                    <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "bold", textAlign: "center" }}>No Canceled Tasks. Clean Slate!</Text>
                  </View>
                ) : (
                  report?.dropped.map((o) => (
                    <View key={o.id} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 1 }}>
                      <XCircle size={16} color="#ef4444" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: "#0F172A", fontSize: 13, fontWeight: "700", textDecorationLine: "line-through" }}>{o.task.title}</Text>
                        <Text style={{ color: "#64748B", fontSize: 10, marginTop: 4, fontWeight: "500" }}>
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
                    <Sparkles size={24} color="#D97706" />
                    <Text style={{ color: "#0F172A", fontSize: 13, fontWeight: "800" }}>Perfect Momentum</Text>
                    <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "500" }}>No tasks were postponed this week. Zero delay!</Text>
                  </View>
                ) : (
                  report?.rescheduled.map((stat) => {
                    const isFriction = stat.postponeCount >= 3;
                    return (
                      <View
                        key={stat.taskId}
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderWidth: 1,
                          borderColor: isFriction ? "#E05646" : "#E2E8F0",
                          borderRadius: 20,
                          padding: 16,
                          shadowColor: "#0F172A",
                          shadowOffset: { width: 0, height: 4 },
                          shadowOpacity: 0.03,
                          shadowRadius: 8,
                          elevation: 2,
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <View style={{ flex: 1, paddingRight: 10 }}>
                            <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "700" }}>{stat.title}</Text>
                          </View>
                          <View style={{ backgroundColor: isFriction ? "#FEE2E2" : "#FEF3C7", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ color: isFriction ? "#EF4444" : "#D97706", fontSize: 10, fontWeight: "bold" }}>
                              {stat.postponeCount}x Postponed
                            </Text>
                          </View>
                        </View>

                        {isFriction && (
                          <View style={{ backgroundColor: "#FEE2E2", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                            <Text style={{ color: "#EF4444", fontSize: 10, fontWeight: "bold" }}>💡 Optimization Insight:</Text>
                            <Text style={{ color: "#991B1B", fontSize: 10, marginTop: 4, lineHeight: 15, fontWeight: "500" }}>
                              This task is encountering resistance. Try breaking it down into smaller sub-tasks, allocating it a specific calendar timeblock, or drop/cancel it if it is no longer relevant.
                            </Text>
                          </View>
                        )}

                        <Text style={{ color: "#64748B", fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
                          Rescheduling Path
                        </Text>
                        
                        <View style={{ gap: 8 }}>
                          {stat.history.map((log, idx) => (
                            <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <Calendar size={12} color="#94A3B8" />
                              <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "500" }}>
                                {new Date(log.fromDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </Text>
                              <ArrowRight size={12} color="#94A3B8" />
                              <Text style={{ color: "#0F172A", fontSize: 11, fontWeight: "700" }}>
                                {new Date(log.toDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </Text>
                              {log.reason && (
                                <Text style={{ color: "#94A3B8", fontSize: 11, fontStyle: "italic", fontWeight: "500" }}>
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
                    <Text style={{ color: "#0F172A", fontSize: 13, fontWeight: "800" }}>Backlog Cleared!</Text>
                    <Text style={{ color: "#64748B", fontSize: 10, fontWeight: "500" }}>All past tasks have been reviewed and completed.</Text>
                  </View>
                ) : (
                  report?.uncompleted.map((o) => {
                    const isReschedulingThis = reschedulingId === o.id;

                    return (
                      <View key={o.id} style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <View style={{ flex: 1, paddingRight: 8 }}>
                            <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "700" }}>{o.task.title}</Text>
                            <Text style={{ color: "#64748B", fontSize: 11, marginTop: 4, fontWeight: "500" }}>
                              Scheduled on {new Date(o.scheduledDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                            </Text>
                          </View>
                          {o.rescheduleCount && o.rescheduleCount > 0 ? (
                            <View style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: "#EF4444", fontSize: 8, fontWeight: "bold" }}>
                                {o.rescheduleCount}x Rescheduled
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {isReschedulingThis ? (
                          <View style={{ marginTop: 8 }}>
                            <Text style={{ color: "#64748B", fontSize: 11, marginBottom: 6, fontWeight: "700" }}>Select New Date:</Text>
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TouchableOpacity
                                onPress={() => setDatePickerVisible(true)}
                                style={{
                                  flex: 1,
                                  backgroundColor: "#F8FAFC",
                                  borderWidth: 1,
                                  borderColor: "#E2E8F0",
                                  borderRadius: 12,
                                  paddingHorizontal: 12,
                                  paddingVertical: 8,
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <Text style={{ fontSize: 12, fontWeight: "600", color: rescheduleDateInput ? "#0F172A" : "#94A3B8" }}>
                                  {rescheduleDateInput ? `📅 ${rescheduleDateInput}` : "Select Date"}
                                </Text>
                                <CalendarIcon size={14} color="#E05646" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleSaveReschedule(o.id)}
                                disabled={isSubmittingReschedule}
                                style={{
                                  backgroundColor: "#E05646",
                                  paddingHorizontal: 16,
                                  borderRadius: 12,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  shadowColor: "#E05646",
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.1,
                                  shadowRadius: 4,
                                  elevation: 2,
                                }}
                              >
                                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "bold" }}>Save</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setReschedulingId(null)}
                                style={{
                                  backgroundColor: "#F8FAFC",
                                  borderWidth: 1,
                                  borderColor: "#E2E8F0",
                                  paddingHorizontal: 12,
                                  borderRadius: 12,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "bold" }}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                            <TouchableOpacity
                              onPress={() => handleDoToday(o.id)}
                              style={{
                                flex: 1.2,
                                backgroundColor: "#ECFDF5",
                                borderWidth: 1,
                                borderColor: "#D1FAE5",
                                paddingVertical: 8,
                                borderRadius: 12,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: "#059669", fontSize: 11, fontWeight: "700" }}>Do Today</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => startRescheduling(o)}
                              style={{
                                flex: 1.2,
                                backgroundColor: "#F5F3FF",
                                borderWidth: 1,
                                borderColor: "#DDD6FE",
                                paddingVertical: 8,
                                borderRadius: 12,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: "#7C3AED", fontSize: 11, fontWeight: "700" }}>Reschedule</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleCancelOccurrence(o.id)}
                              style={{
                                flex: 1,
                                backgroundColor: "#FEF2F2",
                                borderWidth: 1,
                                borderColor: "#FEE2E2",
                                paddingVertical: 8,
                                borderRadius: 12,
                                alignItems: "center",
                              }}
                            >
                              <Text style={{ color: "#DC2626", fontSize: 11, fontWeight: "700" }}>Drop</Text>
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
      <DatePickerModal
        visible={datePickerVisible}
        title="Select Reschedule Date"
        initialDate={rescheduleDateInput || undefined}
        onSelectDate={(selectedStr: string) => setRescheduleDateInput(selectedStr)}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function FrownIcon() {
  return (
    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", borderStyle: "solid", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}>
      <Text style={{ color: "#64748B", fontSize: 18 }}>😕</Text>
    </View>
  );
}
