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
import { Plus, Calendar as CalendarIcon, Clock, Trash2, ChevronLeft, ChevronRight } from "lucide-react-native";
import { apiService, TaskOccurrence, Event } from "../../src/services/api";
import { useTasksStore } from "../../src/store/tasksStore";

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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      {/* Calendar Strip Header */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: "#1e1e1e", paddingBottom: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, marginBottom: 16 }}>
          <TouchableOpacity onPress={handlePrevWeek} style={{ padding: 8 }}>
            <ChevronLeft color="#fff" size={24} />
          </TouchableOpacity>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "700" }}>
            {selectedDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={handleNextWeek} style={{ padding: 8 }}>
            <ChevronRight color="#fff" size={24} />
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
                  backgroundColor: isSelected ? "#2563eb" : "transparent",
                }}
              >
                <Text style={{ color: isSelected ? "#fff" : "#666", fontSize: 12, fontWeight: "600", marginBottom: 4 }}>
                  {weekdayName}
                </Text>
                <Text style={{ color: isSelected ? "#fff" : "#fff", fontSize: 16, fontWeight: "700" }}>
                  {dayNum}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {/* Selected Date Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>
            {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </Text>
          <TouchableOpacity
            onPress={handleOpenAddModal}
            style={{
              flexDirection: "row",
              backgroundColor: "#222",
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: "#333",
              alignItems: "center",
            }}
          >
            <Plus color="#3b82f6" size={14} style={{ marginRight: 6 }} />
            <Text style={{ color: "#3b82f6", fontSize: 12, fontWeight: "600" }}>Add Entry</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" style={{ marginVertical: 30 }} />
        ) : (
          <View style={{ gap: 24 }}>
            {/* Events Section */}
            <View>
              <Text style={{ color: "#888", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Events (Fixed Time)
              </Text>
              {events.length === 0 ? (
                <Text style={{ color: "#444", fontSize: 13, fontStyle: "italic" }}>No events scheduled.</Text>
              ) : (
                events.map((event) => (
                  <View
                    key={event.id}
                    style={{
                      backgroundColor: "#0d0d0d",
                      borderLeftWidth: 4,
                      borderLeftColor: "#10b981",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 10,
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: "#1e1e1e",
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>{event.title}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                        <Clock color="#666" size={11} style={{ marginRight: 4 }} />
                        <Text style={{ color: "#666", fontSize: 11 }}>
                          {new Date(event.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} -{" "}
                          {new Date(event.endDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </Text>
                      </View>
                      {event.description && (
                        <Text style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>{event.description}</Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleDeleteEvent(event.id)} style={{ padding: 6 }}>
                      <Trash2 color="#ef4444" size={14} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>

            {/* Tasks Section */}
            <View>
              <Text style={{ color: "#888", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Tasks (Actions)
              </Text>
              {occurrences.length === 0 ? (
                <Text style={{ color: "#444", fontSize: 13, fontStyle: "italic" }}>No tasks scheduled.</Text>
              ) : (
                occurrences.map((occ) => (
                  <View
                    key={occ.id}
                    style={{
                      backgroundColor: "#0d0d0d",
                      borderLeftWidth: 4,
                      borderLeftColor: occ.status === "COMPLETED" ? "#4b5563" : "#3b82f6",
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: "#1e1e1e",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => handleToggleTask(occ.id)}
                      style={{ flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 8 }}
                    >
                      {/* Checkbox Circle */}
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 9,
                          borderWidth: 1.5,
                          borderColor: occ.status === "COMPLETED" ? "#4b5563" : "#3b82f6",
                          backgroundColor: occ.status === "COMPLETED" ? "#3b82f6" : "transparent",
                          marginRight: 12,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {occ.status === "COMPLETED" && (
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                        )}
                      </View>

                      <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text
                          style={{
                            color: occ.status === "COMPLETED" ? "#555" : "#fff",
                            textDecorationLine: occ.status === "COMPLETED" ? "line-through" : "none",
                            fontSize: 15,
                            fontWeight: "600",
                          }}
                        >
                          {occ.task.title}
                        </Text>
                        {occ.scheduledTime && (
                          <Text style={{ color: "#3b82f6", fontSize: 11, fontWeight: "600" }}>
                            {occ.scheduledTime}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleDeleteTaskOccurrence(occ.id)} style={{ padding: 6 }}>
                      <Trash2 color="#ef4444" size={14} />
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
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.8)" }}>
          <View
            style={{
              backgroundColor: "#161616",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              borderWidth: 1,
              borderColor: "#222",
              minHeight: 400,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 16 }}>
              Add Calendar Entry
            </Text>

            {/* Type selector */}
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => setItemType("TASK")}
                style={{
                  backgroundColor: itemType === "TASK" ? "#2563eb" : "#222",
                  padding: 12,
                  borderRadius: 12,
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Task</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setItemType("EVENT")}
                style={{
                  backgroundColor: itemType === "EVENT" ? "#10b981" : "#222",
                  padding: 12,
                  borderRadius: 12,
                  flex: 1,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>Event</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              value={titleInput}
              onChangeText={setTitleInput}
              placeholder="Title"
              placeholderTextColor="#555"
              style={{
                backgroundColor: "#222",
                color: "#fff",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 12,
              }}
            />

            <TextInput
              value={descriptionInput}
              onChangeText={setDescriptionInput}
              placeholder="Description (Optional)"
              placeholderTextColor="#555"
              style={{
                backgroundColor: "#222",
                color: "#fff",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "#333",
                marginBottom: 12,
              }}
            />

            {itemType === "TASK" ? (
              <View>
                <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>Scheduled Date (YYYY-MM-DD):</Text>
                <TextInput
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#555"
                  style={{
                    backgroundColor: "#222",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#333",
                    marginBottom: 12,
                  }}
                />
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>Start Date:</Text>
                  <TextInput
                    value={dateInput}
                    onChangeText={setDateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#555"
                    style={{
                      backgroundColor: "#222",
                      color: "#fff",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#333",
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: "#888", fontSize: 12, marginBottom: 6 }}>End Date:</Text>
                  <TextInput
                    value={endDateInput}
                    onChangeText={setEndDateInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#555"
                    style={{
                      backgroundColor: "#222",
                      color: "#fff",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#333",
                    }}
                  />
                </View>
              </View>
            )}

            {itemType === "TASK" ? (
              <TextInput
                value={timeInput}
                onChangeText={setTimeInput}
                placeholder="Time (e.g. 10:00 AM, optional)"
                placeholderTextColor="#555"
                style={{
                  backgroundColor: "#222",
                  color: "#fff",
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#333",
                  marginBottom: 20,
                }}
              />
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                <TextInput
                  value={startTimeInput}
                  onChangeText={setStartTimeInput}
                  placeholder="Start Time (e.g. 10:00 AM)"
                  placeholderTextColor="#555"
                  style={{
                    backgroundColor: "#222",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#333",
                    flex: 1,
                  }}
                />
                <TextInput
                  value={endTimeInput}
                  onChangeText={setEndTimeInput}
                  placeholder="End Time (e.g. 11:00 AM)"
                  placeholderTextColor="#555"
                  style={{
                    backgroundColor: "#222",
                    color: "#fff",
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#333",
                    flex: 1,
                  }}
                />
              </View>
            )}

            <TouchableOpacity
              onPress={handleCreateItem}
              disabled={isSubmitting || !titleInput.trim() || !dateInput.trim()}
              style={{
                backgroundColor: itemType === "TASK" ? "#2563eb" : "#10b981",
                padding: 16,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700" }}>Create</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{ padding: 12, alignItems: "center" }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
