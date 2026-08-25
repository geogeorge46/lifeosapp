import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  User,
  Phone,
  Tag,
  MapPin,
  Plus,
  Trash2,
  Heart,
  ChevronDown,
  ChevronUp,
  Landmark,
  ListTodo,
  Lightbulb,
  FileText,
  Network,
  Gift,
} from "lucide-react-native";
import { useRouter } from "expo-router";
import { usePeopleStore } from "../../src/store/peopleStore";
import { usePlacesStore } from "../../src/store/placesStore";
import { useLedgerStore } from "../../src/store/ledgerStore";
import { useSettingsStore } from "../../src/store/settingsStore";
import { useOccasionsStore } from "../../src/store/occasionsStore";
import { Transaction } from "../../src/services/api";

import { RelationshipGraphModal } from "../../src/components/features/people/RelationshipGraphModal";

export default function PeopleScreen() {
  const router = useRouter();
  const { people, isLoading, fetchPeople, addPerson, deletePerson, linkPlace, unlinkPlace, addTag } =
    usePeopleStore();
  const { places, fetchPlaces } = usePlacesStore();
  const { personBalances, fetchPersonBalance } = useLedgerStore();
  const { currencySymbol } = useSettingsStore();
  const { occasions, fetchOccasions, addOccasion, deleteOccasion } = useOccasionsStore();

  const [graphModalVisible, setGraphModalVisible] = useState(false);

  // Create Occasion Form states
  const [occasionTitle, setOccasionTitle] = useState("");
  const [occasionDate, setOccasionDate] = useState(new Date().toISOString().split("T")[0]);
  const [occasionType, setOccasionType] = useState("interview");
  const [occasionOffsets, setOccasionOffsets] = useState<number[]>([0]);

  // Create Person Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [relationship, setRelationship] = useState("");
  const [birthday, setBirthday] = useState("");
  const [tagInput, setTagInput] = useState("");

  // Relational picker configurations
  const [activePersonId, setActivePersonId] = useState<string | null>(null);
  const [customTagVal, setCustomTagVal] = useState("");

  // Relational expand-collapse sub-tabs states
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"tasks" | "money" | "dumps" | "ideas" | "occasions">("tasks");

  useEffect(() => {
    fetchPeople();
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (expandedPersonId) {
      fetchOccasions(expandedPersonId).catch(() => {});
    }
  }, [expandedPersonId]);

  useEffect(() => {
    if (people.length > 0) {
      people.forEach((p) => {
        fetchPersonBalance(p.id).catch(() => {});
      });
    }
  }, [people]);

  const handleCreateContact = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name is a required field.");
      return;
    }

    if (birthday.trim() && !birthday.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
      Alert.alert("Validation Error", "Birthday must be in YYYY-MM-DD format.");
      return;
    }

    const tagsArray = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    try {
      await addPerson(
        name.trim(),
        phone.trim() || undefined,
        relationship.trim() || undefined,
        birthday.trim() || undefined,
        tagsArray
      );
      setName("");
      setPhone("");
      setRelationship("");
      setBirthday("");
      setTagInput("");
      Alert.alert("Success", "Contact added successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create contact");
    }
  };

  const handleLinkLocation = async (personId: string, placeId: string) => {
    try {
      await linkPlace(personId, placeId);
      Alert.alert("Success", "Location linked to contact!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to link location");
    }
  };

  const handleUnlinkLocation = async (personId: string, placeId: string) => {
    try {
      await unlinkPlace(personId, placeId);
      Alert.alert("Success", "Location unlinked from contact!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to unlink location");
    }
  };

  const handleAddCustomTag = async (personId: string) => {
    if (!customTagVal.trim()) return;
    try {
      await addTag(personId, customTagVal.trim());
      setCustomTagVal("");
      Alert.alert("Success", "Tag added!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add tag");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }} className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-6 pt-4 px-4">
          <View>
            <Text className="text-3xl font-extrabold text-[#0F172A]">People</Text>
            <Text className="text-xs text-[#64748B] mt-1 font-semibold">
              Manage personal CRM, ties & places
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setGraphModalVisible(true)}
            className="flex-row items-center space-x-1.5 bg-indigo-50 border border-indigo-100 px-3.5 py-2.5 rounded-xl shadow-sm"
          >
            <Network size={16} color="#6366F1" />
            <Text className="text-xs font-bold text-indigo-600">Graph</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Add Contact Panel */}
        <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 mx-4 shadow-sm shadow-[#0F172A]/5">
          <Text className="text-base font-extrabold text-[#0F172A] mb-3">Add New Contact</Text>

          {/* Name input */}
          <TextInput
            placeholder="Full Name (e.g. Alice Smith)"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={setName}
            className="text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 mb-3 border border-[#E2E8F0] text-left font-semibold"
          />

          {/* Grid inputs for Phone and Connection */}
          <View className="flex-row space-x-3 mb-3">
            <TextInput
              placeholder="Phone number"
              placeholderTextColor="#94A3B8"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-left font-semibold"
            />
            <TextInput
              placeholder="Relationship (e.g. Client)"
              placeholderTextColor="#94A3B8"
              value={relationship}
              onChangeText={setRelationship}
              className="flex-1 text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 border border-[#E2E8F0] text-left font-semibold"
            />
          </View>

          {/* Birthday Input */}
          <TextInput
            placeholder="Birthday (YYYY-MM-DD)"
            placeholderTextColor="#94A3B8"
            value={birthday}
            onChangeText={setBirthday}
            className="text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 mb-3 border border-[#E2E8F0] text-left font-semibold"
          />

          {/* Tags */}
          <TextInput
            placeholder="Tags (separated by comma, e.g. Work, Tech)"
            placeholderTextColor="#94A3B8"
            value={tagInput}
            onChangeText={setTagInput}
            className="text-[#0F172A] text-sm bg-[#F8FAFC] rounded-xl px-4 py-3 mb-4 border border-[#E2E8F0] text-left font-semibold"
          />

          {/* Submit trigger */}
          <TouchableOpacity
            onPress={handleCreateContact}
            className="bg-[#E05646] p-3.5 rounded-2xl flex-row items-center justify-center shadow-md shadow-[#E05646]/20"
          >
            <Plus size={18} color="#FFFFFF" />
            <Text className="text-white text-sm font-bold ml-1.5">Create Contact Card</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Contacts Directory List */}
        <View className="mb-6 px-4">
          <View className="flex-row items-center space-x-1.5 mb-3">
            <User size={14} color="#64748B" />
            <Text className="text-[10px] font-black text-[#64748B] uppercase tracking-wider">
              Contacts Directory ({people.length})
            </Text>
          </View>

          {isLoading ? (
            <ActivityIndicator size="small" color="#E05646" className="my-6" />
          ) : people.length === 0 ? (
            <View className="bg-white border border-[#E2E8F0] border-dashed rounded-3xl py-10 px-4 flex items-center justify-center shadow-sm shadow-[#0F172A]/5">
              <User size={24} color="#94A3B8" />
              <Text className="text-xs font-bold text-[#0F172A] mt-2">No contacts saved</Text>
              <Text className="text-[10px] text-[#64748B] mt-1 text-center max-w-[280px]">Create contacts to connect transactions and locations.</Text>
            </View>
          ) : (
            people.map((person) => (
              <View
                key={person.id}
                className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-3 shadow-sm shadow-[#0F172A]/5"
              >
                <TouchableOpacity
                  onPress={() => {
                    setExpandedPersonId(expandedPersonId === person.id ? null : person.id);
                  }}
                  activeOpacity={0.7}
                  className="flex-row items-start justify-between"
                >
                  {/* Left contact details */}
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center space-x-2">
                      <Text className="text-[#0F172A] font-bold text-base">{person.name}</Text>
                      {expandedPersonId === person.id ? (
                        <ChevronUp size={12} color="#64748B" />
                      ) : (
                        <ChevronDown size={12} color="#64748B" />
                      )}
                      
                      {/* Running Net Balance Badge */}
                      {(() => {
                        const balanceInfo = personBalances[person.id];
                        if (!balanceInfo || balanceInfo.netBalance === 0) return null;
                        const isOwed = balanceInfo.netBalance > 0;
                        const absAmt = Math.abs(balanceInfo.netBalance).toFixed(2);
                        return (
                          <View
                            className={`px-2 py-0.5 rounded border ${
                              isOwed ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"
                            }`}
                          >
                            <Text className={`text-[8px] font-extrabold ${isOwed ? "text-emerald-700" : "text-red-700"}`}>
                              {isOwed ? `owes you ${currencySymbol}${absAmt}` : `you owe ${currencySymbol}${absAmt}`}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>

                    {/* Metadata items */}
                    <View className="flex-row items-center flex-wrap gap-2 mt-1.5">
                      {person.relationship && (
                        <View className="flex-row items-center bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                          <Heart size={10} color="#6366F1" />
                          <Text className="text-[9px] font-bold text-indigo-700 ml-1">
                            {person.relationship}
                          </Text>
                        </View>
                      )}
                      {person.phone && (
                        <View className="flex-row items-center bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          <Phone size={10} color="#64748B" />
                          <Text className="text-[9px] font-bold text-[#0F172A] ml-1">
                            {person.phone}
                          </Text>
                        </View>
                      )}
                      {person.birthday && (
                        <View className="flex-row items-center bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                          <Text style={{ fontSize: 10 }}>🎂</Text>
                          <Text className="text-[9px] font-bold text-amber-700 ml-1">
                            {new Date(person.birthday).toLocaleDateString([], { month: "short", day: "numeric" })}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Linked Places */}
                    {person.linkedPlaces && person.linkedPlaces.length > 0 && (
                      <View className="flex-row items-center flex-wrap gap-2 mt-2">
                        {person.linkedPlaces.map((link) => (
                          <TouchableOpacity
                            key={link.place.id}
                            onPress={() => handleUnlinkLocation(person.id, link.place.id)}
                            className="bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex-row items-center"
                          >
                            <MapPin size={9} color="#10B981" />
                            <Text className="text-[9px] text-emerald-700 font-medium ml-1">
                              {link.place.name}
                            </Text>
                            <Text className="text-[8px] text-emerald-600 font-bold ml-1.5">×</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Tags List */}
                    {person.tags && person.tags.length > 0 && (
                      <View className="flex-row items-center flex-wrap gap-1.5 mt-2.5">
                        {person.tags.map((pt) => (
                          <View
                            key={pt.tag.id}
                            className="bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200"
                          >
                            <Text className="text-[9px] text-[#64748B]">#{pt.tag.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>

                  {/* Right Action Tray */}
                  <TouchableOpacity
                    onPress={() => deletePerson(person.id)}
                    className="p-2 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <Trash2 size={13} color="#EF4444" />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Relational Tabs Panel when expanded */}
                {expandedPersonId === person.id && (
                  <View className="mt-4 pt-4 border-t border-[#E2E8F0]">
                    <View className="flex-row bg-[#F8FAFC] p-1 rounded-xl border border-[#E2E8F0] mb-3 justify-between">
                      {[
                        { id: "tasks", label: "Tasks", icon: ListTodo, color: "#E05646" },
                        { id: "money", label: "Money", icon: Landmark, color: "#F59E0B" },
                        { id: "dumps", label: "Dumps", icon: FileText, color: "#64748B" },
                        { id: "ideas", label: "Ideas", icon: Lightbulb, color: "#F59E0B" },
                        { id: "occasions", label: "Occasions", icon: Gift, color: "#EC4899" }
                      ].map((tab) => {
                        const TabIcon = tab.icon;
                        const isActive = activeSubTab === tab.id;
                        return (
                          <TouchableOpacity
                            key={tab.id}
                            onPress={() => setActiveSubTab(tab.id as any)}
                            className={`flex-1 py-1.5 rounded-lg flex-row items-center justify-center space-x-1 ${
                              isActive ? "bg-white shadow-sm border border-[#E2E8F0]" : ""
                            }`}
                          >
                            <TabIcon size={10} color={isActive ? tab.color : "#64748B"} />
                            <Text className={`text-[9px] font-bold ${isActive ? "text-[#0F172A]" : "text-[#64748B]"}`}>
                              {tab.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {activeSubTab === "tasks" && (
                      <View className="mb-2">
                        {!person.tasks || person.tasks.length === 0 ? (
                          <Text className="text-[10px] text-[#64748B] italic py-1 text-center">No tasks linked to this contact.</Text>
                        ) : (
                          person.tasks.map((task) => (
                            <View key={task.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 mb-1.5 flex-row justify-between items-center">
                              <Text className="text-[#0F172A] text-xs font-bold flex-1 mr-2">{task.title}</Text>
                              <View className="bg-white px-1.5 py-0.5 rounded border border-[#E2E8F0]">
                                <Text className="text-[8px] font-extrabold text-[#64748B] uppercase">{task.priority}</Text>
                              </View>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {activeSubTab === "money" && (
                      <View className="mb-2">
                        {(() => {
                          const balanceInfo = personBalances[person.id];
                          const txs = balanceInfo ? balanceInfo.transactions : [];
                          if (txs.length === 0) {
                            return <Text className="text-[10px] text-[#64748B] italic py-1 text-center">No money transactions logged.</Text>;
                          }
                          return txs.map((tx: Transaction) => {
                            const isLent = tx.type === "LENT";
                            const isPending = tx.status === "PENDING";
                            return (
                              <View key={tx.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 mb-1.5 flex-row justify-between items-center">
                                <View className="flex-1 mr-2">
                                  <Text className="text-[#0F172A] text-xs font-bold">{tx.description}</Text>
                                  <View className="flex-row items-center gap-1.5 mt-1">
                                    {!isPending && (
                                      <View className="bg-[#E2E8F0] px-1 py-0.2 rounded">
                                        <Text className="text-[7px] text-[#64748B] font-extrabold uppercase">Settled</Text>
                                      </View>
                                    )}
                                    {tx.dueDate && isPending && (
                                      <Text className="text-[8px] text-amber-600 font-bold">Due: {new Date(tx.dueDate).toLocaleDateString()}</Text>
                                    )}
                                  </View>
                                </View>
                                <Text className={`text-xs font-black ${isLent ? "text-emerald-600" : "text-rose-600"}`}>
                                  {isLent ? "+" : "-"}{currencySymbol}{parseFloat(tx.amount).toFixed(2)}
                                </Text>
                              </View>
                            );
                          });
                        })()}
                      </View>
                    )}

                    {activeSubTab === "dumps" && (
                      <View className="mb-2">
                        {!person.brainDumps || person.brainDumps.length === 0 ? (
                          <Text className="text-[10px] text-[#64748B] italic py-1 text-center">No captured thoughts linked.</Text>
                        ) : (
                          person.brainDumps.map((dump) => (
                            <View key={dump.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 mb-1.5">
                              <Text className="text-[#334155] text-xs leading-relaxed italic font-medium">
                                "{dump.content || dump.rawText}"
                              </Text>
                              <Text className="text-[8px] text-[#94A3B8] font-bold uppercase tracking-wider mt-1.5">
                                Captured: {new Date(dump.createdAt).toLocaleDateString()}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {activeSubTab === "ideas" && (
                      <View className="mb-2">
                        {!person.ideas || person.ideas.length === 0 ? (
                          <Text className="text-[10px] text-[#64748B] italic py-1 text-center">No refined concepts logged.</Text>
                        ) : (
                          person.ideas.map((idea) => (
                            <View key={idea.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 mb-1.5">
                              <Text className="text-[#0F172A] text-xs font-bold">{idea.title}</Text>
                              <Text className="text-[8px] font-bold text-amber-700 uppercase tracking-widest mt-1">
                                Category: {idea.category}
                              </Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}

                    {activeSubTab === "occasions" && (
                      <View className="mb-2">
                        {/* List occasions with countdown */}
                        {(() => {
                          const list = occasions[person.id] || [];
                          if (list.length === 0) {
                            return <Text className="text-[10px] text-[#64748B] italic py-1 text-center">No custom occasions mapped.</Text>;
                          }
                          return list.map((occ) => {
                            const target = new Date(occ.date);
                            const now = new Date();
                            target.setHours(0, 0, 0, 0);
                            now.setHours(0, 0, 0, 0);
                            const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                            const countdownText =
                              diffDays === 0
                                ? "🎉 Today!"
                                : diffDays > 0
                                ? `⏳ In ${diffDays} day${diffDays > 1 ? "s" : ""}`
                                : `Passed ${Math.abs(diffDays)}d ago`;

                            return (
                              <View key={occ.id} className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-2.5 mb-1.5 flex-row justify-between items-center">
                                <View className="flex-1 mr-2">
                                  <View className="flex-row items-center space-x-2">
                                    <Text className="text-[#0F172A] text-xs font-bold">{occ.title}</Text>
                                    <View className="bg-pink-100 px-2 py-0.5 rounded-md">
                                      <Text className="text-[9px] font-black text-pink-700">{countdownText}</Text>
                                    </View>
                                  </View>
                                  <Text className="text-[8px] font-extrabold text-pink-600 uppercase tracking-widest mt-1">
                                    {occ.type} | Date: {new Date(occ.date).toLocaleDateString()}
                                  </Text>
                                </View>
                                <TouchableOpacity
                                  onPress={() => deleteOccasion(person.id, occ.id)}
                                  className="p-2 bg-red-50 border border-red-100 rounded-lg"
                                >
                                  <Trash2 size={11} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            );
                          });
                        })()}

                        {/* Add Occasion form */}
                        <View className="mt-4 pt-4 border-t border-[#E2E8F0]">
                          <Text className="text-xs font-bold text-[#0F172A] mb-2">Schedule Custom Occasion</Text>
                          <TextInput
                            placeholder="Occasion Title (e.g. Birthday, Anniversary)"
                            placeholderTextColor="#94A3B8"
                            value={occasionTitle}
                            onChangeText={setOccasionTitle}
                            className="text-[#0F172A] text-xs bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#E2E8F0] text-left mb-2"
                          />
                          <View className="flex-row space-x-2 mb-2">
                            <TextInput
                              placeholder="YYYY-MM-DD"
                              placeholderTextColor="#94A3B8"
                              value={occasionDate}
                              onChangeText={setOccasionDate}
                              className="flex-1 text-[#0F172A] text-xs bg-[#F8FAFC] rounded-lg px-3 py-2 border border-[#E2E8F0] text-left"
                            />
                            
                            {/* Occasion type selector pills */}
                            <View className="flex-row space-x-1 flex-1 items-center justify-between">
                              {["birthday", "anniversary", "interview", "custom"].map((t) => {
                                const isSel = occasionType === t;
                                return (
                                  <TouchableOpacity
                                    key={t}
                                    onPress={() => setOccasionType(t)}
                                    className={`flex-1 py-2 rounded-lg border items-center justify-center ${
                                      isSel ? "bg-pink-500 border-pink-500" : "bg-[#F8FAFC] border-[#E2E8F0]"
                                    }`}
                                  >
                                    <Text className={`text-[8px] font-extrabold uppercase ${isSel ? "text-white" : "text-[#64748B]"}`}>
                                      {t}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          {/* Triggers Offsets */}
                          <Text className="text-[10px] text-[#64748B] mb-1.5 font-bold">Configure Multi-Stage Reminders</Text>
                          <View className="flex-row flex-wrap gap-1.5 mb-3">
                            {[
                              { label: "7 Days Before", value: -10080 },
                              { label: "1 Day Before", value: -1440 },
                              { label: "On the Day", value: 0 },
                            ].map((offsetItem) => {
                              const isChecked = occasionOffsets.includes(offsetItem.value);
                              return (
                                <TouchableOpacity
                                  key={offsetItem.value}
                                  onPress={() => {
                                    if (isChecked) {
                                      setOccasionOffsets(occasionOffsets.filter((o) => o !== offsetItem.value));
                                    } else {
                                      setOccasionOffsets([...occasionOffsets, offsetItem.value]);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded-md border ${
                                    isChecked
                                      ? "bg-pink-500 border-pink-500"
                                      : "bg-[#F8FAFC] border-[#E2E8F0]"
                                  }`}
                                >
                                  <Text className={`text-[9px] ${isChecked ? "text-white font-bold" : "text-[#64748B]"}`}>
                                    {offsetItem.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          <TouchableOpacity
                            onPress={async () => {
                              if (!occasionTitle.trim()) {
                                Alert.alert("Validation Error", "Title is required.");
                                return;
                              }
                              if (!occasionDate.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
                                Alert.alert("Validation Error", "Date must be YYYY-MM-DD.");
                                return;
                              }
                              try {
                                await addOccasion(person.id, occasionTitle, occasionDate, occasionType, occasionOffsets);
                                setOccasionTitle("");
                                Alert.alert("Success", "Custom occasion scheduled!");
                              } catch (err: any) {
                                Alert.alert("Error", err.message || "Failed to add occasion.");
                              }
                            }}
                            className="bg-[#E05646] py-2 rounded-xl items-center shadow-sm"
                          >
                            <Text className="text-white text-xs font-bold">Schedule Occasion</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Sub Panel for Linking Location and Adding Tag */}
                <View className="mt-3 pt-3 border-t border-[#E2E8F0] flex-row justify-between items-center">
                  {/* Select Location to Link */}
                  {places.length > 0 && (
                    <View className="flex-1 mr-4">
                      <Text className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                        Link Place:
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                        {places.map((place) => (
                          <TouchableOpacity
                            key={place.id}
                            onPress={() => handleLinkLocation(person.id, place.id)}
                            className="bg-[#F8FAFC] border border-[#E2E8F0] px-2.5 py-1 rounded-lg mr-1.5"
                          >
                            <Text className="text-[10px] text-[#0F172A] font-bold">{place.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* Inline Tag appender */}
                  <View className="w-28">
                    <Text className="text-[9px] font-bold text-[#64748B] uppercase tracking-wider mb-1">
                      Add Tag:
                    </Text>
                    <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pr-1">
                      <TextInput
                        placeholder="Tag"
                        placeholderTextColor="#94A3B8"
                        value={activePersonId === person.id ? customTagVal : ""}
                        onChangeText={(val) => {
                          setActivePersonId(person.id);
                          setCustomTagVal(val);
                        }}
                        onSubmitEditing={() => handleAddCustomTag(person.id)}
                        className="flex-1 text-[10px] text-[#0F172A] px-2 py-1 text-left"
                      />
                      <TouchableOpacity onPress={() => handleAddCustomTag(person.id)}>
                        <Plus size={10} color="#E05646" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <RelationshipGraphModal
        visible={graphModalVisible}
        onClose={() => setGraphModalVisible(false)}
      />
    </SafeAreaView>
  );
}
