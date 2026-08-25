import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { MapPin, Navigation, X, Compass, CheckCircle2, ShieldAlert } from "lucide-react-native";
import { Place } from "../../../services/api";

interface InteractiveMapModalProps {
  visible: boolean;
  places: Place[];
  onSimulateCross: (placeId: string, placeName: string) => void;
  onClose: () => void;
}

export const InteractiveMapModal: React.FC<InteractiveMapModalProps> = ({
  visible,
  places,
  onSimulateCross,
  onClose,
}) => {
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    places.length > 0 ? places[0].id : null
  );

  const selectedPlace = places.find((p) => p.id === selectedPlaceId) || places[0] || null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-[#F0F4F8] rounded-t-3xl p-6 shadow-2xl max-h-[90%] flex-1">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4 border-b border-slate-200 pb-3">
            <View className="flex-row items-center space-x-2">
              <View className="w-10 h-10 rounded-2xl bg-orange-100 items-center justify-center">
                <Compass size={20} color="#E05646" />
              </View>
              <View>
                <Text className="text-xl font-black text-[#0F172A]">Geofence Map Console</Text>
                <Text className="text-xs font-bold text-[#64748B]">Saved pins & boundary radii</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Location Selector Carousel */}
          <Text className="text-[10px] font-black text-[#64748B] uppercase tracking-wider mb-2">
            Active Geofenced Places ({places.length})
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row space-x-2.5 mb-4">
            {places.map((place) => {
              const isSelected = selectedPlaceId === place.id;
              const taskCount = place.geofences ? place.geofences.length : 0;

              return (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => setSelectedPlaceId(place.id)}
                  className={`p-3.5 rounded-2xl border w-44 ${
                    isSelected
                      ? "bg-[#202E4E] border-[#202E4E] shadow-md shadow-[#202E4E]/20"
                      : "bg-white border-slate-200 shadow-sm"
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-1.5">
                    <MapPin size={16} color={isSelected ? "#E05646" : "#64748B"} />
                    <View className={`px-2 py-0.5 rounded-md ${isSelected ? "bg-orange-500" : "bg-slate-100"}`}>
                      <Text className={`text-[9px] font-black ${isSelected ? "text-white" : "text-slate-600"}`}>
                        {place.radius}m Radius
                      </Text>
                    </View>
                  </View>

                  <Text
                    className={`text-xs font-extrabold ${isSelected ? "text-white" : "text-[#0F172A]"}`}
                    numberOfLines={1}
                  >
                    {place.name}
                  </Text>
                  <Text
                    className={`text-[9px] font-semibold mt-0.5 ${isSelected ? "text-slate-300" : "text-[#64748B]"}`}
                  >
                    {taskCount} linked task{taskCount !== 1 ? "s" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Selected Place Detail Inspector Card */}
          {selectedPlace ? (
            <View className="bg-white border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm flex-1 justify-between">
              <View>
                <View className="flex-row justify-between items-start mb-3">
                  <View className="flex-1 pr-2">
                    <View className="flex-row items-center space-x-1.5 mb-1">
                      <MapPin size={16} color="#E05646" />
                      <Text className="text-base font-black text-[#0F172A]">{selectedPlace.name}</Text>
                    </View>
                    <Text className="text-xs text-[#64748B] font-semibold">
                      Coordinates: ({selectedPlace.latitude.toFixed(4)}, {selectedPlace.longitude.toFixed(4)})
                    </Text>
                  </View>
                  <View className="bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl">
                    <Text className="text-xs font-black text-[#E05646]">
                      {selectedPlace.radius}m Radius
                    </Text>
                  </View>
                </View>

                {/* Geofence Boundary Visual Representation Card */}
                <View className="bg-[#F8FAFC] border border-slate-200 rounded-2xl p-4 mb-4 items-center justify-center py-8">
                  <View
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      backgroundColor: "rgba(224, 86, 70, 0.12)",
                      borderWidth: 2,
                      borderColor: "#E05646",
                    }}
                    className="items-center justify-center"
                  >
                    <View className="w-8 h-8 rounded-full bg-[#E05646] items-center justify-center shadow-md">
                      <MapPin size={16} color="#FFFFFF" />
                    </View>
                  </View>
                  <Text className="text-xs font-extrabold text-[#0F172A] mt-3">
                    Active Boundary Scoped
                  </Text>
                  <Text className="text-[10px] text-[#64748B] font-bold mt-0.5">
                    Triggers when entering within {selectedPlace.radius} meters
                  </Text>
                </View>

                {/* Active Reminders attached */}
                <Text className="text-xs font-extrabold text-[#0F172A] mb-2">
                  Linked Location Reminders
                </Text>
                {selectedPlace.geofences && selectedPlace.geofences.length > 0 ? (
                  <ScrollView className="max-h-28" showsVerticalScrollIndicator={false}>
                    {selectedPlace.geofences.map((gf: any) => (
                      <View key={gf.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 mb-1.5 flex-row items-center space-x-2">
                        <CheckCircle2 size={13} color="#10B981" />
                        <Text className="text-xs font-bold text-[#0F172A] flex-1">
                          {gf.task?.title || "Unnamed Task"}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                ) : (
                  <Text className="text-xs text-[#94A3B8] italic font-semibold">
                    No active tasks bound to this location yet. Link one below!
                  </Text>
                )}
              </View>

              {/* Action Buttons */}
              <TouchableOpacity
                onPress={() => onSimulateCross(selectedPlace.id, selectedPlace.name)}
                className="bg-[#202E4E] py-3.5 rounded-2xl items-center flex-row justify-center space-x-2 shadow-md shadow-[#202E4E]/20 mt-4"
              >
                <Navigation size={14} color="#FFFFFF" />
                <Text className="text-white text-xs font-extrabold">Simulate Geofence Entry Trigger</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="bg-white border border-slate-200 rounded-3xl p-8 items-center justify-center flex-1">
              <Compass size={32} color="#94A3B8" />
              <Text className="text-xs font-bold text-[#0F172A] mt-2">No location selected</Text>
            </View>
          )}

          {/* Action Footer */}
          <TouchableOpacity
            onPress={onClose}
            className="py-3.5 bg-[#E05646] rounded-2xl items-center shadow-md shadow-[#E05646]/20"
          >
            <Text className="text-white text-xs font-extrabold">Close Map Console</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
