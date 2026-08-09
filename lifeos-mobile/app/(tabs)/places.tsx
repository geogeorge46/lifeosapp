import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MapPin, Navigation, Compass, AlertCircle, Plus, Trash2, Link } from "lucide-react-native";
import { usePlacesStore } from "../../src/store/placesStore";
import { useTasksStore } from "../../src/store/tasksStore";
import { Task, TaskOccurrence } from "../../src/services/api";
import { useGeofencing } from "../../src/hooks/useGeofencing";

export default function PlacesScreen() {
  const { places, isLoading, fetchPlaces, addPlace, deletePlace, bindTask, triggerMockEntry } =
    usePlacesStore();
  const { todayOccurrences, backlogOccurrences, fetchTodayTasks } = useTasksStore();
  const { checkHasBackgroundPermission, requestBackgroundPermission, syncGeofences } = useGeofencing();

  const [hasBackgroundPerm, setHasBackgroundPerm] = useState<boolean | null>(null);

  // Add Place form fields
  const [name, setName] = useState("");
  const [radius, setRadius] = useState(150); // Default 150m
  const [lat, setLat] = useState("37.7749"); // Defaults to San Francisco
  const [lng, setLng] = useState("-122.4194");

  // Bind Task form fields
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Poll database records on mount
  useEffect(() => {
    fetchPlaces();
    const todayStr = new Date().toISOString().split("T")[0];
    fetchTodayTasks(todayStr);

    const checkPerm = async () => {
      const granted = await checkHasBackgroundPermission();
      setHasBackgroundPerm(granted);
    };
    checkPerm();
  }, []);

  useEffect(() => {
    if (places.length > 0 && hasBackgroundPerm) {
      syncGeofences(places);
    }
  }, [places, hasBackgroundPerm]);

  const handleCreatePlace = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Please provide a name for the place.");
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      Alert.alert("Validation Error", "Please enter valid numeric coordinates.");
      return;
    }

    try {
      await addPlace(name.trim(), latitude, longitude, radius, "Custom Coordinate Pin");
      
      // Reset input fields
      setName("");
      Alert.alert("Success", `"${name}" added successfully!`);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create place");
    }
  };

  const handleBindTask = async () => {
    if (!selectedPlaceId || !selectedTaskId) {
      Alert.alert("Validation Error", "Select both a location and a task to bind.");
      return;
    }

    try {
      await bindTask(selectedPlaceId, selectedTaskId, "ENTER");
      setSelectedTaskId(null);
      Alert.alert("Success", "Task bound to geofence successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to bind task");
    }
  };

  const handleSimulateCross = async (placeId: string, placeName: string) => {
    await triggerMockEntry(placeId);
    Alert.alert(
      "Simulated Boundary Crossing",
      `Sent trigger event for "${placeName}". If you have tasks bound, check your local notifications!`
    );
  };

  // Extract unique active tasks from occurrences
  const activeTasks: Task[] = [];
  const taskIdsSeen = new Set<string>();

  const processOccurrence = (o: TaskOccurrence) => {
    if (o.task && !taskIdsSeen.has(o.task.id)) {
      taskIdsSeen.add(o.task.id);
      activeTasks.push(o.task);
    }
  };

  todayOccurrences.forEach(processOccurrence);
  backlogOccurrences.forEach(processOccurrence);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} className="flex-1">
        {/* Header */}
        <View className="mb-6 px-4 pt-4">
          <Text className="text-3xl font-extrabold text-[#0F172A] tracking-tight">Places</Text>
          <Text className="text-xs text-[#64748B] mt-1 font-semibold">Configure geofenced location reminders.</Text>
        </View>

        {/* Background Location Permission Explanation */}
        {!hasBackgroundPerm && (
          <View className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-6 mx-4 shadow-sm shadow-amber-250/10">
            <Text className="text-sm font-bold text-amber-800 mb-2">
              📍 Background Location Access Needed
            </Text>
            <Text className="text-xs text-amber-700 leading-relaxed mb-3 font-medium">
              LifeOS uses geofencing to send you alerts when you arrive at a place (e.g. reminding you to buy groceries at the store). To enable this, choose "Always Allow" in the next system prompt.
            </Text>
            <Text className="text-[10px] text-amber-600 leading-relaxed mb-4 italic font-semibold">
              Note for Xiaomi, OnePlus, or Huawei users: Please ensure you manually disable battery optimization for LifeOS to prevent delayed geofence notifications.
            </Text>
            <TouchableOpacity
              onPress={async () => {
                const granted = await requestBackgroundPermission();
                setHasBackgroundPerm(granted);
                if (granted) {
                  Alert.alert("Success", "Geofencing triggers are now fully active!");
                  syncGeofences(places);
                } else {
                  Alert.alert("Permission Denied", "Triggers will only fire in the foreground.");
                }
              }}
              className="bg-amber-600 py-3.5 rounded-2xl flex items-center justify-center shadow-md shadow-amber-600/20"
            >
              <Text className="text-white text-xs font-bold">Enable Always-Allow Permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 1. Add Location Panel */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 mx-4 shadow-sm shadow-[#0F172A]/5">
          <Text className="text-base font-extrabold text-[#0F172A] mb-3">Add Location Pin</Text>

          {/* Location Name */}
          <TextInput
            placeholder="Place Name (e.g. Grocery Store)"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            className="text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 mb-3 border border-[#E2E8F0] text-left font-semibold"
          />

          {/* Coordinates Grid */}
          <View className="flex-row space-x-3 mb-3">
            <TextInput
              placeholder="Latitude"
              placeholderTextColor="#94A3B8"
              value={lat}
              onChangeText={setLat}
              keyboardType="numeric"
              className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-left font-semibold"
            />
            <TextInput
              placeholder="Longitude"
              placeholderTextColor="#94A3B8"
              value={lng}
              onChangeText={setLng}
              keyboardType="numeric"
              className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-left font-semibold"
            />
          </View>

          {/* Radius selector indicator */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-xs text-[#64748B] font-bold">Geofence Radius</Text>
              <Text className="text-xs font-black text-[#E05646]">{radius} meters</Text>
            </View>
            
            {/* Custom Tap Selector for Radius */}
            <View className="flex-row justify-between space-x-2">
              {[50, 150, 300, 500].map((val) => (
                <TouchableOpacity
                  key={val}
                  onPress={() => setRadius(val)}
                  className={`flex-1 py-2 rounded-lg border flex items-center justify-center ${
                    radius === val
                      ? "bg-[#E05646] border-[#E05646] shadow-sm shadow-[#E05646]/20"
                      : "bg-[#F8FAFC] border-[#E2E8F0]"
                  }`}
                >
                  <Text className={`text-xs font-bold ${radius === val ? "text-white" : "text-[#64748B]"}`}>{val}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit Pin */}
          <TouchableOpacity
            onPress={handleCreatePlace}
            className="bg-[#E05646] p-3.5 rounded-2xl flex-row items-center justify-center shadow-md shadow-[#E05646]/20"
          >
            <Plus size={18} color="#FFFFFF" />
            <Text className="text-white text-sm font-bold ml-1.5">Add Place & Active Geofence</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Bind Task to Location Trigger Panel */}
        {places.length > 0 && activeTasks.length > 0 && (
          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 mx-4 shadow-sm shadow-[#0F172A]/5">
            <Text className="text-base font-extrabold text-[#0F172A] mb-3">Link Task to Location</Text>

            {/* Select Place */}
            <Text className="text-xs text-[#64748B] font-bold mb-1.5">1. Choose Location</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-3">
              {places.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => setSelectedPlaceId(place.id)}
                  className={`px-4 py-2.5 rounded-xl border mr-2 flex-row items-center space-x-1.5 ${
                    selectedPlaceId === place.id
                      ? "bg-[#202E4E] border-[#202E4E]"
                      : "bg-[#F8FAFC] border-[#E2E8F0]"
                  }`}
                >
                  <MapPin size={12} color={selectedPlaceId === place.id ? "#FFFFFF" : "#64748B"} />
                  <Text className={`text-xs font-bold ${selectedPlaceId === place.id ? "text-white" : "text-[#64748B]"}`}>{place.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Select Task */}
            <Text className="text-xs text-[#64748B] font-bold mb-1.5">2. Choose Active Task</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
              {activeTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  onPress={() => setSelectedTaskId(task.id)}
                  className={`px-4 py-2.5 rounded-xl border mr-2 flex-row items-center space-x-1.5 ${
                    selectedTaskId === task.id
                      ? "bg-[#202E4E] border-[#202E4E]"
                      : "bg-[#F8FAFC] border-[#E2E8F0]"
                  }`}
                >
                  <Text className={`text-xs font-bold ${selectedTaskId === task.id ? "text-white" : "text-[#64748B]"}`}>{task.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Bind Action */}
            <TouchableOpacity
              onPress={handleBindTask}
              className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-2xl flex-row items-center justify-center"
            >
              <Link size={14} color="#E05646" />
              <Text className="text-[#E05646] text-xs font-bold ml-1.5">Create Location Reminder</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 3. Saved Places Directory List */}
        <View className="mb-6 px-4">
          <View className="flex-row items-center space-x-1.5 mb-3">
            <Compass size={14} color="#64748B" />
            <Text className="text-[10px] font-black text-[#64748B] uppercase tracking-wider">
              Active Geofences ({places.length})
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color="#E05646" className="my-6" />
          ) : places.length === 0 ? (
            <View className="bg-white border border-[#E2E8F0] border-dashed rounded-2xl py-10 px-4 flex items-center justify-center shadow-sm">
              <AlertCircle size={24} color="#94A3B8" />
              <Text className="text-xs font-bold text-[#0F172A] mt-2">No location boundaries saved</Text>
              <Text className="text-[10px] text-[#64748B] mt-1 text-center max-w-[280px]">Setup your places above to enable geofences.</Text>
            </View>
          ) : (
            places.map((place) => (
              <View
                key={place.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-3 flex-row items-center justify-between shadow-sm shadow-[#0F172A]/5"
              >
                {/* Geofence Info details */}
                <View className="flex-1 pr-3">
                  <View className="flex-row items-center space-x-1.5">
                    <MapPin size={14} color="#E05646" />
                    <Text className="text-[#0F172A] font-bold text-sm">{place.name}</Text>
                  </View>
                  <Text className="text-[10px] text-[#64748B] mt-1 font-medium">
                    Coordinates: ({place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}) | Radius: {place.radius}m
                  </Text>

                  {/* Active bindings counters */}
                  {place.geofences && place.geofences.length > 0 && (
                    <View className="mt-2.5 bg-[#F8FAFC] border border-[#E2E8F0] p-2.5 rounded-lg">
                      <Text className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                        Active Reminders:
                      </Text>
                      {place.geofences.map((trigger) => (
                        <Text key={trigger.id} className="text-[11px] text-[#202E4E] italic font-semibold">
                          • {trigger.task?.title || "Unnamed Task"}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* Simulated entry trigger button and Delete button */}
                <View className="flex-row items-center space-x-2">
                  <TouchableOpacity
                    onPress={() => handleSimulateCross(place.id, place.name)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <Navigation size={12} color="#202E4E" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => deletePlace(place.id)}
                    className="p-2 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <Trash2 size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
