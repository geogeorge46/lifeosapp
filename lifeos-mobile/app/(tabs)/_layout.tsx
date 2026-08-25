import React, { useState } from "react";
import { View, TouchableOpacity, Text, Modal, TextInput, ActivityIndicator } from "react-native";
import { Tabs } from "expo-router";
import { Plus, Calendar, Inbox, Home, Menu, Mic, Square, Save } from "lucide-react-native";
import { useInboxStore } from "../../src/store/inboxStore";
import { AudioRecordingService } from "../../src/services/audio";

import { OfflineSyncBanner } from "../../src/components/common/OfflineSyncBanner";

const audioService = new AudioRecordingService();

export default function TabLayout() {
  const [modalVisible, setModalVisible] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { captureText, captureAudio, fetchInbox } = useInboxStore();

  const handleStartRecording = async () => {
    try {
      await audioService.startRecording();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start voice capture:", err);
    }
  };

  const handleStopRecording = async () => {
    try {
      const uri = await audioService.stopRecording();
      setIsRecording(false);
      if (uri) {
        setRecordingUri(uri);
      }
    } catch (err) {
      console.error("Failed to stop voice capture:", err);
    }
  };

  const handleSaveCapture = async () => {
    if (!inputText.trim() && !recordingUri) return;
    setIsSubmitting(true);
    try {
      if (recordingUri) {
        await captureAudio(recordingUri);
      } else {
        await captureText(inputText.trim());
      }
      setInputText("");
      setRecordingUri(null);
      setModalVisible(false);
      await fetchInbox();
    } catch (err) {
      console.error("Failed to save capture:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <OfflineSyncBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            bottom: 20,
            left: 16,
            right: 16,
            backgroundColor: "rgba(255, 255, 255, 0.94)",
            borderWidth: 1,
            borderColor: "rgba(226, 232, 240, 0.8)",
            height: 68,
            borderRadius: 24,
            paddingBottom: 8,
            paddingTop: 8,
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 8,
          },
          tabBarActiveTintColor: "#E05646",
          tabBarInactiveTintColor: "#94A3B8",
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: "700",
            marginTop: 2,
          }
        }}
      >
        <Tabs.Screen
          name="day"
          options={{
            title: "Today",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 12, backgroundColor: focused ? "rgba(224, 86, 70, 0.08)" : "transparent" }}>
                <Home size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 12, backgroundColor: focused ? "rgba(224, 86, 70, 0.08)" : "transparent" }}>
                <Calendar size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
              </View>
            ),
          }}
        />
        {/* Placeholder tab to leave space for the floating capture button */}
        <Tabs.Screen
          name="dummy-spacer"
          options={{
            title: "",
            tabBarButton: () => <View style={{ width: 64 }} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 12, backgroundColor: focused ? "rgba(224, 86, 70, 0.08)" : "transparent" }}>
                <Inbox size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 12, backgroundColor: focused ? "rgba(224, 86, 70, 0.08)" : "transparent" }}>
                <Menu size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
              </View>
            ),
          }}
        />
        {/* Hide secondary screens from tab bar navigation */}
        <Tabs.Screen
          name="people"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="places"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="ledger"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Floating Center Capture Button */}
      <View
        style={{
          position: "absolute",
          bottom: 42,
          left: "50%",
          transform: [{ translateX: -26 }],
          zIndex: 100,
        }}
      >
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: "#E05646",
            alignItems: "center",
            justifyContent: "center",
            elevation: 8,
            shadowColor: "#E05646",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            borderWidth: 3,
            borderColor: "#FFFFFF",
          }}
        >
          <Plus color="#FFFFFF" size={24} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* Capture Modal Overlay */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(15, 23, 42, 0.3)",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              padding: 24,
              minHeight: 320,
              borderTopWidth: 1,
              borderTopColor: "#E2E8F0",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: -10 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
              elevation: 24,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ color: "#0F172A", fontSize: 18, fontWeight: "800", letterSpacing: -0.5 }}>Brain Dump Capture</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12 }}>
                <Text style={{ color: "#64748B", fontSize: 12, fontWeight: "700" }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {!recordingUri ? (
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="What are you thinking about? (Type or hold Mic...)"
                placeholderTextColor="#94A3B8"
                multiline
                style={{
                  backgroundColor: "#F8FAFC",
                  color: "#0F172A",
                  borderRadius: 20,
                  padding: 18,
                  height: 120,
                  textAlignVertical: "top",
                  fontSize: 14,
                  fontWeight: "600",
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  textAlign: "left",
                }}
              />
            ) : (
              <View
                style={{
                  backgroundColor: "#FEF2F2",
                  borderRadius: 20,
                  padding: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  height: 120,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#FCA5A5",
                }}
              >
                <Text style={{ color: "#E05646", fontSize: 14, fontWeight: "800", textAlign: "center" }}>
                  🎙️ Voice recording captured successfully!
                </Text>
                <TouchableOpacity onPress={() => setRecordingUri(null)} style={{ marginTop: 8 }}>
                  <Text style={{ color: "#EF4444", fontSize: 12, fontWeight: "700" }}>Delete and record again</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              {/* Mic Action */}
              {!recordingUri && (
                <TouchableOpacity
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: isRecording ? "#EF4444" : "#F8FAFC",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isRecording ? "#EF4444" : "#E2E8F0",
                    shadowColor: isRecording ? "#EF4444" : "#0F172A",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  {isRecording ? <Square color="#FFFFFF" size={18} /> : <Mic color="#0F172A" size={18} />}
                </TouchableOpacity>
              )}

              {/* Save Action */}
              <TouchableOpacity
                onPress={handleSaveCapture}
                disabled={isSubmitting || (!inputText.trim() && !recordingUri)}
                style={{
                  flex: 1,
                  height: 52,
                  backgroundColor: (inputText.trim() || recordingUri) ? "#E05646" : "#F8FAFC",
                  borderWidth: (inputText.trim() || recordingUri) ? 0 : 1,
                  borderColor: "#E2E8F0",
                  borderRadius: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: (inputText.trim() || recordingUri) ? "#E05646" : "transparent",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: (inputText.trim() || recordingUri) ? 4 : 0,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Save color={(inputText.trim() || recordingUri) ? "#FFFFFF" : "#94A3B8"} size={18} style={{ marginRight: 8 }} />
                    <Text style={{ color: (inputText.trim() || recordingUri) ? "#FFFFFF" : "#94A3B8", fontSize: 14, fontWeight: "700" }}>Save to Inbox</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
