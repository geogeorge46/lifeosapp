import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Flame, Trophy, Target, X, Calendar, CheckCircle2 } from "lucide-react-native";
import { useHabitsStore } from "../../../store/habitsStore";

interface HabitHeatmapModalProps {
  visible: boolean;
  onClose: () => void;
}

export const HabitHeatmapModal: React.FC<HabitHeatmapModalProps> = ({ visible, onClose }) => {
  const { habits } = useHabitsStore();
  const [selectedCellDate, setSelectedCellDate] = useState<string | null>(null);

  // Generate last 60 days list (from 59 days ago to today)
  const generateDaysList = () => {
    const days: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 59; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const isoStr = d.toISOString().split("T")[0];
      days.push(isoStr);
    }
    return days;
  };

  const pastDays = generateDaysList();

  // Compute completion stats for each day
  const getDayStats = (dateStr: string) => {
    if (habits.length === 0) return { total: 0, completedCount: 0, percentage: 0 };

    let completedCount = 0;
    habits.forEach((h) => {
      const completions = h.completions || [];
      if (completions.some((c) => c.date.startsWith(dateStr))) {
        completedCount++;
      }
    });

    const total = habits.length;
    const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    return { total, completedCount, percentage };
  };

  // Streak calculations
  const calculateStreakStats = () => {
    if (habits.length === 0) return { currentStreak: 0, longestStreak: 0, overallRate: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayStr = new Date().toISOString().split("T")[0];
    let totalCompletedDays = 0;

    pastDays.forEach((d) => {
      const stats = getDayStats(d);
      if (stats.completedCount > 0) {
        totalCompletedDays++;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        tempStreak = 0;
      }
    });

    // Calculate active current streak backwards from today
    for (let i = pastDays.length - 1; i >= 0; i--) {
      const stats = getDayStats(pastDays[i]);
      if (stats.completedCount > 0) {
        currentStreak++;
      } else if (pastDays[i] !== todayStr) {
        // If not today and 0 completed, streak breaks
        break;
      }
    }

    const overallRate = Math.round((totalCompletedDays / pastDays.length) * 100);
    return { currentStreak, longestStreak, overallRate };
  };

  const { currentStreak, longestStreak, overallRate } = calculateStreakStats();

  // Heatmap intensity color resolver
  const getIntensityColor = (percentage: number, completedCount: number) => {
    if (completedCount === 0 || percentage === 0) return "#E2E8F0"; // Slate-200
    if (percentage < 34) return "#FED7AA"; // Light orange (orange-200)
    if (percentage < 67) return "#FB923C"; // Medium orange (orange-400)
    if (percentage < 100) return "#F97316"; // Bright orange (orange-500)
    return "#E05646"; // 100% Brand Warm Orange
  };

  const activeStats = selectedCellDate ? getDayStats(selectedCellDate) : null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-[#F0F4F8] rounded-t-3xl p-6 shadow-2xl max-h-[90%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-5 border-b border-slate-200 pb-3">
            <View className="flex-row items-center space-x-2">
              <View className="w-10 h-10 rounded-2xl bg-orange-100 items-center justify-center">
                <Flame size={22} color="#E05646" />
              </View>
              <View>
                <Text className="text-xl font-black text-[#0F172A]">Habits Heatmap</Text>
                <Text className="text-xs font-bold text-[#64748B]">Consistency & streak analytics</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-white border border-slate-200 rounded-xl shadow-sm">
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Key Metrics Stats Banner */}
          <View className="flex-row space-x-3 mb-6">
            <View className="flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 items-center shadow-sm">
              <Flame size={18} color="#E05646" style={{ marginBottom: 4 }} />
              <Text className="text-base font-black text-[#0F172A]">{currentStreak} Days</Text>
              <Text className="text-[9px] font-bold text-[#64748B] uppercase">Current Streak</Text>
            </View>

            <View className="flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 items-center shadow-sm">
              <Trophy size={18} color="#F59E0B" style={{ marginBottom: 4 }} />
              <Text className="text-base font-black text-[#0F172A]">{longestStreak} Days</Text>
              <Text className="text-[9px] font-bold text-[#64748B] uppercase">Longest Streak</Text>
            </View>

            <View className="flex-1 bg-white border border-slate-200 rounded-2xl p-3.5 items-center shadow-sm">
              <Target size={18} color="#10B981" style={{ marginBottom: 4 }} />
              <Text className="text-base font-black text-[#0F172A]">{overallRate}%</Text>
              <Text className="text-[9px] font-bold text-[#64748B] uppercase">60-Day Rate</Text>
            </View>
          </View>

          {/* GitHub-style Heatmap Grid (Last 60 Days) */}
          <View className="bg-white border border-slate-200 rounded-3xl p-5 mb-5 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-xs font-extrabold text-[#0F172A]">🔥 60-Day Consistency Grid</Text>
              <Text className="text-[10px] font-bold text-[#64748B]">Tap square to inspect</Text>
            </View>

            {/* Grid Cells Matrix */}
            <View className="flex-row flex-wrap gap-1.5 justify-start">
              {pastDays.map((d) => {
                const stats = getDayStats(d);
                const bg = getIntensityColor(stats.percentage, stats.completedCount);
                const isSelected = selectedCellDate === d;

                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setSelectedCellDate(d)}
                    style={{
                      width: "11.5%",
                      aspectRatio: 1,
                      backgroundColor: bg,
                    }}
                    className={`rounded-lg items-center justify-center ${
                      isSelected ? "border-2 border-[#0F172A]" : ""
                    }`}
                  />
                );
              })}
            </View>

            {/* Legend */}
            <View className="flex-row items-center justify-end space-x-2 mt-4 pt-3 border-t border-slate-100">
              <Text className="text-[9px] font-bold text-slate-400">Less</Text>
              <View style={{ width: 12, height: 12, backgroundColor: "#E2E8F0" }} className="rounded-sm" />
              <View style={{ width: 12, height: 12, backgroundColor: "#FED7AA" }} className="rounded-sm" />
              <View style={{ width: 12, height: 12, backgroundColor: "#F97316" }} className="rounded-sm" />
              <View style={{ width: 12, height: 12, backgroundColor: "#E05646" }} className="rounded-sm" />
              <Text className="text-[9px] font-bold text-slate-400">100%</Text>
            </View>
          </View>

          {/* Inspector Card */}
          {selectedCellDate && activeStats && (
            <View className="bg-[#202E4E] border border-slate-700 rounded-2xl p-4 mb-4 shadow-sm">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-xs font-bold text-white">
                  📅 {new Date(selectedCellDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                </Text>
                <View className="bg-orange-500 px-2 py-0.5 rounded-md">
                  <Text className="text-[10px] font-black text-white">
                    {activeStats.completedCount}/{activeStats.total} Habits ({activeStats.percentage}%)
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Action Footer */}
          <TouchableOpacity
            onPress={onClose}
            className="py-3.5 bg-[#E05646] rounded-2xl items-center shadow-md shadow-[#E05646]/20"
          >
            <Text className="text-white text-xs font-extrabold">Close Console</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
