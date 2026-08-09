import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Line, Text as SvgText, G } from "react-native-svg";
import { ArrowLeft, Plus, Network, Info, Trash2, HelpCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import { usePeopleStore } from "../src/store/peopleStore";
import { useRelationshipStore } from "../src/store/relationshipStore";

export default function RelationshipGraphScreen() {
  const router = useRouter();
  const { people, fetchPeople } = usePeopleStore();
  const {
    relationships,
    connections,
    isLoading,
    fetchRelationships,
    addRelationship,
    deleteRelationship,
    fetchConnections,
  } = useRelationshipStore();

  // Selected node in the SVG Graph
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Form states
  const [personAId, setPersonAId] = useState("");
  const [personBId, setPersonBId] = useState("");
  const [relationType, setRelationType] = useState("friend");

  // Modal selector visible states
  const [showPersonAPicker, setShowPersonAPicker] = useState(false);
  const [showPersonBPicker, setShowPersonBPicker] = useState(false);

  // Load data on mount
  useEffect(() => {
    fetchPeople();
    fetchRelationships();
  }, []);

  // Fetch traversal pathways when selected node changes
  useEffect(() => {
    if (selectedPersonId) {
      fetchConnections(selectedPersonId);
    }
  }, [selectedPersonId, relationships]);

  const handleAddLink = async () => {
    if (!personAId || !personBId) {
      Alert.alert("Validation Error", "Please select two different contacts to link.");
      return;
    }
    if (personAId === personBId) {
      Alert.alert("Validation Error", "A contact cannot be linked to themselves.");
      return;
    }

    try {
      await addRelationship(personAId, personBId, relationType);
      Alert.alert("Success", "Relationship connection established successfully!");
      // Reset picker states optionally
      setPersonBId("");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save relationship.");
    }
  };

  const handleDeleteLink = async (id: string) => {
    Alert.alert(
      "Remove Link",
      "Are you sure you want to delete this relationship? This will also remove the mirrored connection.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteRelationship(id);
              if (selectedPersonId) {
                fetchConnections(selectedPersonId);
              }
            } catch (err: any) {
              Alert.alert("Error", err.message || "Failed to delete link.");
            }
          },
        },
      ]
    );
  };

  // Layout geometry for SVG Node Circle Map
  const svgSize = 320;
  const center = svgSize / 2;
  const radius = 100; // Radius of circular layout

  // Map each person to a coordinate position on a circle
  const nodePositions: Record<string, { x: number; y: number; index: number }> = {};
  people.forEach((p, index) => {
    const angle = (2 * Math.PI * index) / Math.max(people.length, 1);
    nodePositions[p.id] = {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
      index,
    };
  });

  // Unique relationship pairs list (to show in the deletion list without showing both A->B and B->A mirrors)
  const seenPairKeys = new Set<string>();
  const uniqueRelationships = relationships.filter((r) => {
    const key1 = `${r.personAId}-${r.personBId}-${r.type}`;
    const key2 = `${r.personBId}-${r.personAId}`; // check if opposite is already seen
    if (seenPairKeys.has(key1) || seenPairKeys.has(key2)) {
      return false;
    }
    seenPairKeys.add(key1);
    return true;
  });

  return (
    <SafeAreaView className="flex-1 bg-black px-4 pt-4" edges={["top", "left", "right"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl"
        >
          <ArrowLeft size={16} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Relationship Graph</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        {/* Visual SVG Map */}
        <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-4 items-center mb-6">
          <View className="flex-row items-center space-x-1.5 self-start mb-3">
            <Network size={14} color="#818CF8" />
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Interactive Network Map
            </Text>
          </View>

          {people.length === 0 ? (
            <View className="py-20 items-center justify-center">
              <HelpCircle size={32} color="#525252" />
              <Text className="text-xs font-bold text-neutral-500 mt-2">No contacts saved yet</Text>
              <Text className="text-[9px] text-neutral-600 mt-1">Create contacts first to map relationships.</Text>
            </View>
          ) : (
            <View style={{ width: svgSize, height: svgSize, position: "relative" }}>
              <Svg width={svgSize} height={svgSize}>
                {/* 1. Draw connection lines */}
                {relationships.map((rel) => {
                  const posA = nodePositions[rel.personAId];
                  const posB = nodePositions[rel.personBId];
                  if (!posA || !posB) return null;

                  const isHighlighted =
                    selectedPersonId === rel.personAId || selectedPersonId === rel.personBId;

                  return (
                    <Line
                      key={rel.id}
                      x1={posA.x}
                      y1={posA.y}
                      x2={posB.x}
                      y2={posB.y}
                      stroke={isHighlighted ? "#818CF8" : "#262626"}
                      strokeWidth={isHighlighted ? 2.5 : 1.2}
                      opacity={isHighlighted ? 0.9 : 0.4}
                    />
                  );
                })}

                {/* 2. Draw nodes */}
                {people.map((person) => {
                  const pos = nodePositions[person.id];
                  if (!pos) return null;

                  const isSelected = selectedPersonId === person.id;
                  const initials = person.name.charAt(0).toUpperCase();

                  return (
                    <G key={person.id} onPress={() => setSelectedPersonId(isSelected ? null : person.id)}>
                      {/* Node circle */}
                      <Circle
                        cx={pos.x}
                        cy={pos.y}
                        r={18}
                        fill={isSelected ? "#312E81" : "#171717"}
                        stroke={isSelected ? "#818CF8" : "#404040"}
                        strokeWidth={2}
                      />
                      {/* Initials Text */}
                      <SvgText
                        x={pos.x}
                        y={pos.y + 4}
                        fontSize="10"
                        fontWeight="bold"
                        fill={isSelected ? "#818CF8" : "#A3A3A3"}
                        textAnchor="middle"
                      >
                        {initials}
                      </SvgText>
                      {/* Label Text below node */}
                      <SvgText
                        x={pos.x}
                        y={pos.y + 28}
                        fontSize="8"
                        fontWeight="bold"
                        fill={isSelected ? "#FFFFFF" : "#737373"}
                        textAnchor="middle"
                      >
                        {person.name.split(" ")[0]}
                      </SvgText>
                    </G>
                  );
                })}
              </Svg>
            </View>
          )}

          <Text className="text-[9px] text-neutral-500 text-center mt-2 italic">
            💡 Tap contacts on the circle map above to inspect paths and linkages.
          </Text>
        </View>

        {/* Selected Node Connection Path Inspector */}
        {selectedPersonId && (
          <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6">
            <View className="flex-row items-center space-x-1.5 mb-3">
              <Info size={14} color="#818CF8" />
              <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Connection Inspector for {people.find((p) => p.id === selectedPersonId)?.name}
              </Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color="#818cf8" className="py-4" />
            ) : Object.keys(connections).length === 0 ? (
              <Text className="text-xs text-neutral-500 italic">No connection paths to other contacts mapped yet.</Text>
            ) : (
              <View className="space-y-3">
                {Object.entries(connections).map(([targetId, path]) => {
                  const targetName = people.find((p) => p.id === targetId)?.name || "Unknown";
                  return (
                    <View key={targetId} className="bg-neutral-950 p-3 rounded-2xl border border-neutral-850">
                      <View className="flex-row items-center justify-between">
                        <Text className="text-xs font-bold text-white">{targetName}</Text>
                        <View className="bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900">
                          <Text className="text-[8px] font-extrabold text-indigo-400 uppercase">
                            {path.length} {path.length === 1 ? "degree" : "degrees"}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row flex-wrap items-center mt-2 gap-1.5">
                        <Text className="text-[10px] text-neutral-500 font-bold">You</Text>
                        {path.map((step, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <Text className="text-[10px] text-neutral-600">➔</Text>
                            <View className="bg-neutral-900 border border-neutral-800 px-1.5 py-0.5 rounded">
                              <Text className="text-[9px] text-neutral-300">
                                {step.name} ({step.relation})
                              </Text>
                            </View>
                          </React.Fragment>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Establish New Link Builder */}
        {people.length > 1 && (
          <View className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 mb-6">
            <Text className="text-base font-bold text-white mb-3">Establish Linkage Connection</Text>

            {/* Person A Selector */}
            <Text className="text-xs text-neutral-400 mb-1">Subject Contact (Person A)</Text>
            <TouchableOpacity
              onPress={() => setShowPersonAPicker(true)}
              className="bg-neutral-950 border border-neutral-850 rounded-xl mb-3 px-4 py-3.5 flex-row justify-between items-center"
            >
              <Text className="text-white text-sm">
                {people.find((p) => p.id === personAId)?.name || "Select first contact..."}
              </Text>
              <Text className="text-neutral-500 text-xs">▼</Text>
            </TouchableOpacity>

            {/* Person B Selector */}
            <Text className="text-xs text-neutral-400 mb-1">Object Contact (Person B)</Text>
            <TouchableOpacity
              onPress={() => setShowPersonBPicker(true)}
              className="bg-neutral-950 border border-neutral-850 rounded-xl mb-3 px-4 py-3.5 flex-row justify-between items-center"
            >
              <Text className="text-white text-sm">
                {people.find((p) => p.id === personBId)?.name || "Select second contact..."}
              </Text>
              <Text className="text-neutral-500 text-xs">▼</Text>
            </TouchableOpacity>

            {/* Relation Type Pills Grid */}
            <Text className="text-xs text-neutral-400 mb-2">Relationship Connection Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {[
                { label: "Friend", value: "friend" },
                { label: "Spouse", value: "spouse" },
                { label: "Sibling", value: "sibling" },
                { label: "Cousin", value: "cousin" },
                { label: "Colleague", value: "colleague" },
                { label: "Parent", value: "parent" },
                { label: "Child", value: "child" },
                { label: "Manager", value: "manager" },
                { label: "Reports To", value: "reports_to" },
              ].map((item) => {
                const isSel = relationType === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setRelationType(item.value)}
                    className={`px-3 py-1.5 rounded-lg border ${
                      isSel ? "bg-indigo-600 border-indigo-500" : "bg-neutral-950 border-neutral-850"
                    }`}
                  >
                    <Text className="text-xs font-bold text-white">{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleAddLink}
              className="bg-indigo-600 py-3.5 rounded-2xl flex-row items-center justify-center shadow-lg"
            >
              <Plus size={16} color="#fff" />
              <Text className="text-white text-sm font-bold ml-1.5">Establish Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Existing Connections Management List */}
        <View className="mb-6">
          <Text className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
            Linkage Registry Directory ({uniqueRelationships.length})
          </Text>

          {uniqueRelationships.length === 0 ? (
            <View className="bg-neutral-950 border border-neutral-900 border-dashed rounded-2xl py-8 px-4 flex items-center justify-center">
              <Text className="text-xs font-bold text-neutral-500 text-center">No linkage records registered</Text>
              <Text className="text-[9px] text-neutral-600 text-center mt-1">Connect contacts above to start build your social graph.</Text>
            </View>
          ) : (
            uniqueRelationships.map((rel) => (
              <View
                key={rel.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 mb-2.5 flex-row items-center justify-between"
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center flex-wrap gap-1.5">
                    <Text className="text-white text-xs font-bold">{rel.personA?.name}</Text>
                    <View className="bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900">
                      <Text className="text-[8px] font-extrabold text-indigo-400 uppercase">
                        {rel.type}
                      </Text>
                    </View>
                    <Text className="text-neutral-400 text-xs font-medium">of</Text>
                    <Text className="text-white text-xs font-bold">{rel.personB?.name}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => handleDeleteLink(rel.id)}
                  className="p-2 bg-red-950/40 border border-red-900/60 rounded-xl"
                >
                  <Trash2 size={12} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Person A Selector Modal */}
      <Modal visible={showPersonAPicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-6 min-h-[300px]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-white">Select Subject Contact</Text>
              <TouchableOpacity onPress={() => setShowPersonAPicker(false)}>
                <Text className="text-neutral-400 text-sm">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-[300px]">
              {people.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    setPersonAId(p.id);
                    setShowPersonAPicker(false);
                  }}
                  className="py-3.5 border-b border-neutral-850 flex-row justify-between items-center"
                >
                  <Text className="text-white text-sm font-medium">{p.name}</Text>
                  {personAId === p.id && <Text className="text-indigo-400 font-bold">✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Person B Selector Modal */}
      <Modal visible={showPersonBPicker} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/75">
          <View className="bg-neutral-900 border-t border-neutral-800 rounded-t-3xl p-6 min-h-[300px]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-base font-bold text-white">Select Object Contact</Text>
              <TouchableOpacity onPress={() => setShowPersonBPicker(false)}>
                <Text className="text-neutral-400 text-sm">Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-[300px]">
              {people.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => {
                    setPersonBId(p.id);
                    setShowPersonBPicker(false);
                  }}
                  className="py-3.5 border-b border-neutral-850 flex-row justify-between items-center"
                >
                  <Text className="text-white text-sm font-medium">{p.name}</Text>
                  {personBId === p.id && <Text className="text-indigo-400 font-bold">✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
