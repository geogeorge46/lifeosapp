import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Calendar as CalendarIcon, X, Check, ChevronLeft, ChevronRight } from "lucide-react-native";

interface DatePickerModalProps {
  visible: boolean;
  initialDate?: string; // YYYY-MM-DD
  title?: string;
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  initialDate,
  title = "Select Birthday / Date",
  onSelectDate,
  onClose,
}) => {
  const parseInitial = () => {
    if (initialDate && initialDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = initialDate.split("-").map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const today = new Date();
    return { year: 1998, month: today.getMonth(), day: today.getDate() };
  };

  const parsed = parseInitial();
  const [selectedYear, setSelectedYear] = useState<number>(parsed.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(parsed.month);
  const [selectedDay, setSelectedDay] = useState<number>(parsed.day);
  const [viewMode, setViewMode] = useState<"DAYS" | "YEARS">("DAYS");

  React.useEffect(() => {
    if (visible) {
      if (initialDate && initialDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [y, m, d] = initialDate.split("-").map(Number);
        setSelectedYear(y);
        setSelectedMonth(m - 1);
        setSelectedDay(d);
      } else {
        const today = new Date();
        setSelectedYear(1998);
        setSelectedMonth(today.getMonth());
        setSelectedDay(today.getDate());
      }
      setViewMode("DAYS");
    }
  }, [visible, initialDate]);

  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();

  const handleConfirm = () => {
    const safeDay = Math.min(selectedDay, daysInMonth);
    const mStr = String(selectedMonth + 1).padStart(2, "0");
    const dStr = String(safeDay).padStart(2, "0");
    const formatted = `${selectedYear}-${mStr}-${dStr}`;
    onSelectDate(formatted);
    onClose();
  };

  // Generate years list from 1940 to 2026
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({ length: currentYear - 1940 + 1 }, (_, i) => currentYear - i);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-3xl p-6 shadow-2xl max-h-[85%]">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <View className="flex-row items-center space-x-2">
              <View className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 items-center justify-center">
                <CalendarIcon size={16} color="#E05646" />
              </View>
              <Text className="text-base font-extrabold text-[#0F172A]">{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-slate-100 rounded-xl">
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Month & Year Bar Header */}
          <View className="flex-row items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-2.5 mb-4">
            <TouchableOpacity
              onPress={() => setSelectedMonth((prev) => (prev === 0 ? 11 : prev - 1))}
              className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm"
            >
              <ChevronLeft size={16} color="#0F172A" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode(viewMode === "YEARS" ? "DAYS" : "YEARS")}
              className="items-center px-4 py-1 rounded-xl bg-white border border-slate-200 shadow-sm"
            >
              <Text className="text-sm font-black text-[#0F172A]">
                {MONTHS[selectedMonth]} {selectedYear}
              </Text>
              <Text className="text-[10px] font-bold text-orange-600">
                {viewMode === "YEARS" ? "Tap for Calendar" : "Tap to Change Year"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedMonth((prev) => (prev === 11 ? 0 : prev + 1))}
              className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm"
            >
              <ChevronRight size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {viewMode === "YEARS" ? (
            /* Year Selector Grid */
            <ScrollView className="max-h-60 mb-4" showsVerticalScrollIndicator={false}>
              <View className="flex-row flex-wrap justify-between gap-2">
                {yearsList.map((y) => {
                  const isSel = selectedYear === y;
                  return (
                    <TouchableOpacity
                      key={y}
                      onPress={() => {
                        setSelectedYear(y);
                        setViewMode("DAYS");
                      }}
                      className={`w-[22%] py-2.5 rounded-xl border items-center justify-center ${
                        isSel
                          ? "bg-[#E05646] border-[#E05646] shadow-sm"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <Text className={`text-xs font-extrabold ${isSel ? "text-white" : "text-[#334155]"}`}>
                        {y}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          ) : (
            /* Days Selector Grid */
            <ScrollView className="max-h-64 mb-4" showsVerticalScrollIndicator={false}>
              {/* Month Quick Selector Pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
                <View className="flex-row space-x-1.5">
                  {MONTHS.map((m, idx) => {
                    const isSel = selectedMonth === idx;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setSelectedMonth(idx)}
                        className={`px-3 py-1.5 rounded-xl border ${
                          isSel ? "bg-[#202E4E] border-[#202E4E]" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <Text className={`text-xs font-bold ${isSel ? "text-white" : "text-slate-600"}`}>
                          {m.substring(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Day Grid 1-31 */}
              <View className="flex-row flex-wrap gap-2 justify-start">
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const isSel = selectedDay === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setSelectedDay(d)}
                      className={`w-[12.5%] aspect-square rounded-xl border items-center justify-center ${
                        isSel
                          ? "bg-[#E05646] border-[#E05646] shadow-md shadow-[#E05646]/20"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <Text className={`text-xs font-extrabold ${isSel ? "text-white" : "text-[#0F172A]"}`}>
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* Selected Date Preview Banner */}
          <View className="bg-[#202E4E] border border-slate-700 rounded-2xl px-4 py-2.5 mb-3 flex-row items-center justify-between shadow-sm">
            <Text className="text-xs font-bold text-slate-300">Selected Date:</Text>
            <Text className="text-xs font-extrabold text-orange-400">
              {MONTHS[selectedMonth]} {Math.min(selectedDay, daysInMonth)}, {selectedYear}
            </Text>
          </View>

          {/* Action Footer */}
          <View className="flex-row space-x-3 pt-1">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3.5 rounded-2xl bg-slate-100 border border-slate-200 items-center justify-center"
            >
              <Text className="text-xs font-bold text-slate-700">Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirm}
              className="flex-1 py-3.5 rounded-2xl bg-[#E05646] items-center justify-center flex-row space-x-1.5 shadow-md shadow-[#E05646]/20"
            >
              <Check size={16} color="#FFFFFF" />
              <Text className="text-xs font-extrabold text-white">Select Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
