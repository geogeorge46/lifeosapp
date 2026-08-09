import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Check, Trash2, Calendar, AlertCircle } from "lucide-react-native";
import { TaskOccurrence } from "../../../services/api";

interface TaskItemProps {
  occurrence: TaskOccurrence;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ occurrence, onToggle, onDelete }) => {
  const isCompleted = occurrence.status === "COMPLETED";
  const { task } = occurrence;

  return (
    <View className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex-row items-center justify-between mb-3 shadow-sm">
      {/* Left section: Checkbox and Details */}
      <View className="flex-row items-center flex-1 pr-3">
        {/* Custom Premium Checkbox */}
        <TouchableOpacity
          onPress={() => onToggle(occurrence.id)}
          className={`w-6 h-6 rounded-full border flex items-center justify-center mr-3 ${
            isCompleted
              ? "bg-indigo-600 border-indigo-500"
              : "border-neutral-700 bg-neutral-950"
          }`}
        >
          {isCompleted && <Check size={12} color="#fff" strokeWidth={3} />}
        </TouchableOpacity>

        {/* Task Details */}
        <View className="flex-1">
          <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
            <Text
              className={`text-sm font-medium ${
                isCompleted ? "line-through text-neutral-500" : "text-white"
              }`}
            >
              {task.title}
            </Text>
            {occurrence.scheduledTime && (
              <Text className="text-xs text-indigo-400 font-semibold ml-2">
                ({occurrence.scheduledTime})
              </Text>
            )}
          </View>

          {/* Fuzzy Due Date / Recurrence Info Tag */}
          {(task.fuzzyDate || task.recurrenceRule) && (
            <View className="flex-row items-center space-x-1 mt-1">
              <Calendar size={10} color="#818CF8" />
              <Text className="text-[10px] font-semibold text-indigo-400">
                {task.fuzzyDate || (task.recurrenceRule === "FREQ=DAILY" ? "Daily" : "Weekly")}
              </Text>
            </View>
          )}

          {/* Postponement warning badge */}
          {occurrence.rescheduleCount !== undefined && occurrence.rescheduleCount > 0 && (
            <View className="flex-row items-center space-x-1 mt-1 bg-amber-950/40 border border-amber-900/60 rounded px-1.5 py-0.5 self-start">
              <AlertCircle size={8} color="#F59E0B" />
              <Text className="text-[9px] font-semibold text-amber-500">
                Postponed {occurrence.rescheduleCount} times
              </Text>
            </View>
          )}

          {/* Description summary */}
          {task.description && (
            <Text
              numberOfLines={1}
              className={`text-[11px] mt-1 ${
                isCompleted ? "text-neutral-600" : "text-neutral-400"
              }`}
            >
              {task.description}
            </Text>
          )}
        </View>
      </View>

      {/* Right section: Delete Button */}
      <TouchableOpacity
        onPress={() => onDelete(occurrence.id)}
        className="p-2 bg-red-950/40 border border-red-900/60 rounded-lg"
      >
        <Trash2 size={13} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
};
