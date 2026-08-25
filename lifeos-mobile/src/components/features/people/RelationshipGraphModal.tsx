import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Network, Plus, Trash2, X, Link, User, Heart, ShieldAlert } from "lucide-react-native";
import { usePeopleStore } from "../../../store/peopleStore";
import { useRelationshipsStore } from "../../../store/relationshipsStore";

interface RelationshipGraphModalProps {
  visible: boolean;
  onClose: () => void;
}

const COMMON_RELATION_TYPES = ["Friend", "Colleague", "Family", "Spouse", "Partner", "Manager", "Client"];

export const RelationshipGraphModal: React.FC<RelationshipGraphModalProps> = ({ visible, onClose }) => {
  const { people } = usePeopleStore();
  const { relationships, isLoading, fetchRelationships, createRelationship, deleteRelationship } = useRelationshipsStore();

  const [personAId, setPersonAId] = useState<string>("");
  const [personBId, setPersonBId] = useState<string>("");
  const [relationType, setRelationType] = useState<string>("Friend");
  const [customRelationInput, setCustomRelationInput] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      fetchRelationships();
    }
  }, [visible]);

  const handleCreateLink = async () => {
    const finalType = customRelationInput.trim() || relationType;
    if (!personAId || !personBId) {
      Alert.alert("Selection Error", "Please select two contacts to link.");
      return;
    }

    if (personAId === personBId) {
      Alert.alert("Selection Error", "Cannot link a contact to themselves.");
      return;
    }

    if (!finalType) {
      Alert.alert("Validation Error", "Please specify a relationship type.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createRelationship(personAId, personBId, finalType);
      setPersonAId("");
      setPersonBId("");
      setCustomRelationInput("");
      Alert.alert("Success 🕸️", "Relationship link established successfully!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to establish relationship link.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    Alert.alert("Delete Link", "Are you sure you want to sever this relationship link?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRelationship(id);
        },
      },
    ]);
  };

  const getPersonName = (id: string) => {
    const match = people.find((p) => p.id === id);
    return match ? match.name : "Unknown Contact";
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View className="flex-1 bg-[#F0F4F8] px-5 py-6">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4 pt-6">
          <View className="flex-row items-center space-x-2">
            <View className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 items-center justify-center">
              <Network size={20} color="#6366F1" />
            </View>
            <View>
              <Text className="text-xl font-extrabold text-[#0F172A]">Relationship Network</Text>
              <Text className="text-xs text-[#64748B] font-semibold">Visual connection graph & pathways</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="p-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm"
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Create Connection Form */}
          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-5 mb-6 shadow-sm shadow-[#0F172A]/5">
            <Text className="text-sm font-extrabold text-[#0F172A] mb-3">🔗 Establish New Connection</Text>

            {/* Person A Selector */}
            <Text className="text-[10px] font-bold text-[#64748B] uppercase mb-1.5">First Contact</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row space-x-2">
                {people.map((p) => {
                  const isSel = personAId === p.id;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setPersonAId(p.id)}
                      className={`px-3 py-2 rounded-xl border flex-row items-center space-x-1.5 ${
                        isSel ? "bg-indigo-600 border-indigo-600" : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <User size={12} color={isSel ? "#FFFFFF" : "#64748B"} />
                      <Text className={`text-xs font-bold ${isSel ? "text-white" : "text-[#334155]"}`}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Person B Selector */}
            <Text className="text-[10px] font-bold text-[#64748B] uppercase mb-1.5">Second Contact</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row space-x-2">
                {people.map((p) => {
                  const isSel = personBId === p.id;
                  const isDisabled = p.id === personAId;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      disabled={isDisabled}
                      onPress={() => setPersonBId(p.id)}
                      className={`px-3 py-2 rounded-xl border flex-row items-center space-x-1.5 ${
                        isDisabled
                          ? "bg-slate-100 border-slate-200 opacity-40"
                          : isSel
                          ? "bg-indigo-600 border-indigo-600"
                          : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <User size={12} color={isSel ? "#FFFFFF" : "#64748B"} />
                      <Text className={`text-xs font-bold ${isSel ? "text-white" : "text-[#334155]"}`}>
                        {p.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Relationship Type Selector */}
            <Text className="text-[10px] font-bold text-[#64748B] uppercase mb-1.5">Relationship Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
              <View className="flex-row space-x-2">
                {COMMON_RELATION_TYPES.map((type) => {
                  const isSel = relationType === type && !customRelationInput.trim();
                  return (
                    <TouchableOpacity
                      key={type}
                      onPress={() => {
                        setRelationType(type);
                        setCustomRelationInput("");
                      }}
                      className={`px-3 py-1.5 rounded-lg border ${
                        isSel ? "bg-[#202E4E] border-[#202E4E]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                      }`}
                    >
                      <Text className={`text-xs font-bold ${isSel ? "text-white" : "text-[#64748B]"}`}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Custom Input */}
            <TextInput
              placeholder="Or specify custom relationship..."
              placeholderTextColor="#94A3B8"
              value={customRelationInput}
              onChangeText={setCustomRelationInput}
              className="text-xs text-[#0F172A] bg-[#F8FAFC] rounded-xl px-3.5 py-2.5 border border-[#E2E8F0] mb-4 font-semibold text-left"
            />

            <TouchableOpacity
              onPress={handleCreateLink}
              disabled={isSubmitting}
              className="bg-indigo-600 py-3.5 rounded-xl items-center justify-center flex-row space-x-2 shadow-md shadow-indigo-600/20"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Link size={14} color="#FFFFFF" />
                  <Text className="text-white text-xs font-extrabold">Connect Relationship Link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Active Relationship Links Section */}
          <View className="mb-6">
            <Text className="text-xs font-black text-[#64748B] uppercase tracking-wider mb-3">
              Active Connected Links ({relationships.length})
            </Text>

            {isLoading && relationships.length === 0 ? (
              <ActivityIndicator size="small" color="#6366F1" className="my-4" />
            ) : relationships.length === 0 ? (
              <View className="bg-white border border-[#E2E8F0] rounded-2xl py-8 px-4 items-center justify-center shadow-sm">
                <Network size={28} color="#94A3B8" style={{ marginBottom: 8 }} />
                <Text className="text-xs text-[#94A3B8] font-bold text-center">
                  No relationship connections created yet. Link two contacts above!
                </Text>
              </View>
            ) : (
              relationships.map((rel) => (
                <View
                  key={rel.id}
                  className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-2.5 flex-row justify-between items-center shadow-sm"
                >
                  <View className="flex-row items-center flex-1 pr-3 space-x-2">
                    {/* Node A */}
                    <View className="bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-xl">
                      <Text className="text-xs font-extrabold text-indigo-700">
                        {rel.personA?.name || getPersonName(rel.personAId)}
                      </Text>
                    </View>

                    <Text className="text-xs font-black color-[#94A3B8]">↔</Text>

                    {/* Node B */}
                    <View className="bg-indigo-50 border border-indigo-100 px-2.5 py-1.5 rounded-xl">
                      <Text className="text-xs font-extrabold text-indigo-700">
                        {rel.personB?.name || getPersonName(rel.personBId)}
                      </Text>
                    </View>

                    {/* Badge */}
                    <View className="bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-black text-amber-700 uppercase">
                        {rel.type}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteLink(rel.id)}
                    className="p-2 bg-red-50 border border-red-100 rounded-xl"
                  >
                    <Trash2 size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
