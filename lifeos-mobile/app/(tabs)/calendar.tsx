import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Trash2,
  X,
  Share2,
} from "lucide-react-native";
import { DatePickerModal } from "../../src/components/common/DatePickerModal";
import { apiService, TaskOccurrence, Event } from "../../src/services/api";
import { useTasksStore } from "../../src/store/tasksStore";
import { exportEventToNativeCalendar } from "../../src/services/calendarExport";

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [occurrences, setOccurrences] = useState<TaskOccurrence[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { toggleOccurrence, deleteOccurrence } = useTasksStore();

  const handleToggleTask = async (occId: string) => {
    // Optimistic local state toggle
    setOccurrences((prev) =>
      prev.map((occ) =>
        occ.id === occId
          ? { ...occ, status: occ.status === "COMPLETED" ? "SCHEDULED" : "COMPLETED" }
          : occ
      )
    );
    try {
      await toggleOccurrence(occId);
    } catch (err) {
      console.error("Failed to toggle task from calendar:", err);
      fetchDayData();
    }
  };

  const handleDeleteTaskOccurrence = async (occId: string) => {
    // Optimistic local state delete
    setOccurrences((prev) => prev.filter((occ) => occ.id !== occId));
    try {
      await deleteOccurrence(occId);
    } catch (err) {
      console.error("Failed to delete task from calendar:", err);
      fetchDayData();
    }
  };

  // Add Item Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [itemType, setItemType] = useState<"TASK" | "EVENT">("TASK");
  const [titleInput, setTitleInput] = useState("");
  const [descriptionInput, setDescriptionInput] = useState("");
  const [dateInput, setDateInput] = useState(""); // Custom editable date field
  const [endDateInput, setEndDateInput] = useState(""); // Custom editable end date
  const [timeInput, setTimeInput] = useState("10:00 AM"); // For Tasks optional time
  const [startTimeInput, setStartTimeInput] = useState("10:00 AM"); // For Events
  const [endTimeInput, setEndTimeInput] = useState("11:00 AM"); // For Events
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState<"START" | "END">("START");

  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  const fetchDayData = async () => {
    setIsLoading(true);
    try {
      const [dayTasks, dayEvents] = await Promise.all([
        apiService.fetchCalendarOccurrences(selectedDateStr, selectedDateStr),
        apiService.fetchEvents(selectedDateStr, selectedDateStr),
      ]);
      setOccurrences(dayTasks);
      setEvents(dayEvents);
    } catch (err) {
      console.error("Failed to load calendar day data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDayData();
  }, [selectedDateStr]);

  // Generate 7 days of the week relative to selected base date (Sunday to Saturday)
  const getWeekDays = (baseDate: Date) => {
    const days = [];
    const temp = new Date(baseDate);
    const sun = new Date(temp.setDate(temp.getDate() - temp.getDay()));
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(selectedDate);

  const handlePrevWeek = () => {
    const prev = new Date(selectedDate);
    prev.setDate(selectedDate.getDate() - 7);
    setSelectedDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(selectedDate);
    next.setDate(selectedDate.getDate() + 7);
    setSelectedDate(next);
  };

  const handleOpenAddModal = () => {
    setDateInput(selectedDateStr);
    setEndDateInput(selectedDateStr);
    setModalVisible(true);
  };

  const handleCreateItem = async () => {
    if (!titleInput.trim() || !dateInput.trim()) return;
    const dateMatch = dateInput.trim().match(/^\d{4}-\d{2}-\d{2}$/);
    if (!dateMatch) {
      Alert.alert("Invalid Date", "Please enter the date in YYYY-MM-DD format.");
      return;
    }

    if (itemType === "EVENT") {
      const endMatch = endDateInput.trim().match(/^\d{4}-\d{2}-\d{2}$/);
      if (!endMatch) {
        Alert.alert("Invalid End Date", "Please enter the end date in YYYY-MM-DD format.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (itemType === "TASK") {
        const timePart = timeInput.trim() ? ` at ${timeInput.trim()}` : "";
        const rawInput = `${titleInput.trim()} on ${dateInput.trim()}${timePart}`;
        await apiService.createTask(rawInput, descriptionInput);
      } else {
        // Compose dates for event using robust parts constructor
        const [startY, startM, startD] = dateInput.trim().split("-").map(Number);
        const [endY, endM, endD] = endDateInput.trim().split("-").map(Number);
        const [startH, startMin] = convertTo24h(startTimeInput).split(":").map(Number);
        const [endH, endMin] = convertTo24h(endTimeInput).split(":").map(Number);

        const start = new Date(startY, startM - 1, startD, startH, startMin);
        const end = new Date(endY, endM - 1, endD, endH, endMin);

        await apiService.createEvent({
          title: titleInput.trim(),
          description: descriptionInput.trim(),
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        });
      }
      
      setTitleInput("");
      setDescriptionInput("");
      setModalVisible(false);
      
      // If task was added to currently selected day, refresh view
      if (dateInput.trim() === selectedDateStr) {
        fetchDayData();
      } else {
        // Switch to the target day
        setSelectedDate(new Date(dateInput.trim()));
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create calendar item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await apiService.deleteEvent(id);
      fetchDayData();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      {/* Calendar Strip Header */}
      <View style={{ backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingBottom: 16, paddingTop: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity onPress={handlePrevWeek} style={{ padding: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 }}>
            <ChevronLeft color="#0F172A" size={16} />
          </TouchableOpacity>
          <Text style={{ color: "#0F172A", fontSize: 18, fontWeight: "900", letterSpacing: -0.5 }}>
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={handleNextWeek} style={{ padding: 8, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 }}>
            <ChevronRight color="#0F172A" size={16} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-around", paddingHorizontal: 12 }}>
          {weekDays.map((day, idx) => {
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const weekdayName = day.toLocaleDateString("en-US", { weekday: "narrow" });
            const dayNum = day.getDate();

            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedDate(day)}
                style={{
                  alignItems: "center",
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: isSelected ? "#E05646" : "transparent",
                  shadowColor: isSelected ? "#E05646" : "transparent",
                  shadowOffset: isSelected ? { width: 0, height: 4 } : { width: 0, height: 0 },
                  shadowOpacity: isSelected ? 0.2 : 0,
                  shadowRadius: 6,
                  elevation: isSelected ? 4 : 0,
                }}
              >
                <Text style={{ color: isSelected ? "#FFFFFF" : "#64748B", fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>
                  {weekdayName}
                </Text>
                <Text style={{ color: isSelected ? "#FFFFFF" : "#0F172A", fontSize: 15, fontWeight: "900" }}>
                  {dayNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        {/* Selected Date Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <Text style={{ color: "#0F172A", fontSize: 16, fontWeight: "900", letterSpacing: -0.5 }}>
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Text>
          <TouchableOpacity
            onPress={handleOpenAddModal}
            style={{
              flexDirection: "row",
              backgroundColor: "#FFFFFF",
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              alignItems: "center",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Plus color="#E05646" size={12} style={{ marginRight: 6 }} strokeWidth={2.5} />
            <Text style={{ color: "#E05646", fontSize: 11, fontWeight: "800" }}>Add Entry</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#E05646" style={{ marginVertical: 30 }} />
        ) : (
          <View style={{ gap: 20 }}>
            {/* Events Section */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#E6F4EA", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                  <Clock color="#10B981" size={13} />
                </View>
                <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Events (Fixed Time)
                </Text>
              </View>
              {events.length === 0 ? (
                <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 18, alignItems: "center" }}>
                  <Text style={{ color: "#94A3B8", fontSize: 12, fontStyle: "italic", fontWeight: "600" }}>No events scheduled.</Text>
                </View>
              ) : (
                events.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderLeftWidth: 4,
                      borderLeftColor: "#10B981",
                      borderRadius: 20,
                      padding: 16,
                      marginBottom: 10,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.03,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: "#0F172A", fontSize: 14, fontWeight: "800" }}>{event.title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                        <Clock color="#64748B" size={10} style={{ marginRight: 4 }} />
                        <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "700" }}>
                          {new Date(event.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -{" "}
                          {new Date(event.endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </Text>
                      </View>
                      {event.description && (
                        <Text style={{ color: "#64748B", fontSize: 11, marginTop: 4, fontWeight: "500" }}>{event.description}</Text>
                      )}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => exportEventToNativeCalendar(event.title, event.startDate, event.endDate, event.description)}
                        style={{ padding: 8, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0", borderRadius: 12 }}
                      >
                        <CalendarIcon color="#059669" size={13} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteEvent(event.id)}
                        style={{ padding: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2", borderRadius: 12 }}
                      >
                        <Trash2 color="#EF4444" size={13} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Tasks Section */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(224, 86, 70, 0.08)", alignItems: "center", justifyContent: "center", marginRight: 8 }}>
                  <CalendarIcon color="#E05646" size={13} />
                </View>
                <Text style={{ color: "#64748B", fontSize: 11, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Tasks (Actions)
                </Text>
              </View>
              {occurrences.length === 0 ? (
                <View style={{ backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 20, padding: 18, alignItems: "center" }}>
                  <Text style={{ color: "#94A3B8", fontSize: 12, fontStyle: "italic", fontWeight: "600" }}>No tasks scheduled.</Text>
                </View>
              ) : (
                occurrences.map((occ) => (
                  <View
                    key={occ.id}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderLeftWidth: 4,
                      borderLeftColor: occ.status === "COMPLETED" ? "#94A3B8" : "#E05646",
                      borderRadius: 20,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.03,
                      shadowRadius: 6,
                      elevation: 2,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleToggleTask(occ.id)}
                      style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}
                    >
                      {/* Checkbox Circle */}
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 1.5,
                          borderColor: occ.status === "COMPLETED" ? "#E05646" : "#E2E8F0",
                          backgroundColor: occ.status === "COMPLETED" ? "#E05646" : "#F8FAFC",
                          marginRight: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {occ.status === "COMPLETED" && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" }} />
                        )}
                      </View>

                      <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text
                          style={{
                            color: occ.status === "COMPLETED" ? "#94A3B8" : "#0F172A",
                            textDecorationLine: occ.status === "COMPLETED" ? "line-through" : "none",
                            fontSize: 14,
                            fontWeight: "800",
                          }}
                        >
                          {occ.task.title}
                        </Text>
                        {occ.scheduledTime && (
                          <Text style={{ color: "#E05646", fontSize: 11, fontWeight: "800" }}>
                            {occ.scheduledTime}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteTaskOccurrence(occ.id)}
                      style={{ padding: 8, backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FEE2E2", borderRadius: 12 }}
                    >
                      <Trash2 color="#EF4444" size={13} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Add Item Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
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
              minHeight: 420,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 24,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: "#0F172A", fontSize: 18, fontWeight: "800", letterSpacing: -0.5 }}>
                Add Calendar Entry
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 }}>
                <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Type selector */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setItemType("TASK")}
                style={{
                  backgroundColor: itemType === "TASK" ? "#E05646" : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: itemType === "TASK" ? "#E05646" : "#E2E8F0",
                  padding: 12,
                  borderRadius: 12,
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: itemType === "TASK" ? "#FFFFFF" : "#64748B", fontWeight: "800" }}>Task</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setItemType("EVENT")}
                style={{
                  backgroundColor: itemType === "EVENT" ? "#10B981" : "#F8FAFC",
                  borderWidth: 1,
                  borderColor: itemType === "EVENT" ? "#10B981" : "#E2E8F0",
                  padding: 12,
                  borderRadius: 12,
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: itemType === "EVENT" ? "#FFFFFF" : "#64748B", fontWeight: "800" }}>Event</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="Title"
              placeholderTextColor="#94A3B8"
              style={{
                backgroundColor: "#F8FAFC",
                color: "#0F172A",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                marginBottom: 12,
                textAlign: "left",
                fontWeight: "600",
              }}
            />

            <TextInput
              value={descriptionInput}
              onChangeText={setDescriptionInput}
              placeholder="Description (Optional)"
              placeholderTextColor="#94A3B8"
              style={{
                backgroundColor: "#F8FAFC",
                color: "#0F172A",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#E2E8F0",
                marginBottom: 12,
                textAlign: "left",
                fontWeight: "600",
              }}
            />

            {itemType === "TASK" ? (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ color: "#64748B", fontSize: 11, marginBottom: 6, fontWeight: "700" }}>Scheduled Date:</Text>
                <TouchableOpacity
                  onPress={() => {
                    setDatePickerTarget("START");
                    setDatePickerVisible(true);
                  }}
                  style={{
                    backgroundColor: "#F8FAFC",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: dateInput ? "#0F172A" : "#94A3B8" }}>
                    {dateInput ? `📅 ${dateInput}` : "Select Date (Tap for Calendar)"}
                  </Text>
                  <CalendarIcon size={16} color="#E05646" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#64748B", fontSize: 11, marginBottom: 6, fontWeight: "700" }}>Start Date:</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setDatePickerTarget("START");
                      setDatePickerVisible(true);
                    }}
                    style={{
                      backgroundColor: "#F8FAFC",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: dateInput ? "#0F172A" : "#94A3B8" }}>
                      {dateInput || "YYYY-MM-DD"}
                    </Text>
                    <CalendarIcon size={14} color="#E05646" />
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#64748B", fontSize: 11, marginBottom: 6, fontWeight: "700" }}>End Date:</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setDatePickerTarget("END");
                      setDatePickerVisible(true);
                    }}
                    style={{
                      backgroundColor: "#F8FAFC",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: endDateInput ? "#0F172A" : "#94A3B8" }}>
                      {endDateInput || "YYYY-MM-DD"}
                    </Text>
                    <CalendarIcon size={14} color="#E05646" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {itemType === "TASK" ? (
              <TextInput
                value={timeInput}
                onChangeText={setTimeInput}
                placeholder="Time (e.g. 10:00 AM, optional)"
                placeholderTextColor="#94A3B8"
                style={{
                  backgroundColor: "#F8FAFC",
                  color: "#0F172A",
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  marginBottom: 20,
                  textAlign: "left",
                  fontWeight: "600",
                }}
              />
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                <TextInput
                  value={startTimeInput}
                  onChangeText={setStartTimeInput}
                  placeholder="Start Time (e.g. 10:00 AM)"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: "#F8FAFC",
                    color: "#0F172A",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    flex: 1,
                    textAlign: "left",
                    fontWeight: "600",
                  }}
                />
                <TextInput
                  value={endTimeInput}
                  onChangeText={setEndTimeInput}
                  placeholder="End Time (e.g. 11:00 AM)"
                  placeholderTextColor="#94A3B8"
                  style={{
                    backgroundColor: "#F8FAFC",
                    color: "#0F172A",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#E2E8F0",
                    flex: 1,
                    textAlign: "left",
                    fontWeight: "600",
                  }}
                />
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreateItem}
              disabled={isSubmitting || !titleInput.trim() || !dateInput.trim()}
              style={{
                backgroundColor: itemType === "TASK" ? "#E05646" : "#10B981",
                padding: 16,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                shadowColor: itemType === "TASK" ? "#E05646" : "#10B981",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 4,
              }}
            >
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ color: "#FFFFFF", fontWeight: "800" }}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <DatePickerModal
        visible={datePickerVisible}
        title={datePickerTarget === "START" ? "Select Start / Scheduled Date" : "Select End Date"}
        initialDate={
          (datePickerTarget === "START" ? dateInput : endDateInput) || undefined
        }
        onSelectDate={(selectedStr: string) => {
          if (datePickerTarget === "START") {
            setDateInput(selectedStr);
          } else {
            setEndDateInput(selectedStr);
          }
        }}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}
