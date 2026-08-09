import React, { useState } from "react";
import { View, TouchableOpacity, Text, Modal, TextInput, ActivityIndicator } from "react-native";
import { Tabs } from "expo-router";
import { Plus, Calendar, Inbox, Home, Menu, Mic, Square, Save } from "lucide-react-native";
import { useInboxStore } from "../../src/store/inboxStore";
import { AudioRecordingService } from "../../src/services/audio";

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
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0d0d0d",
            borderTopColor: "#1e1e1e",
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#666",
        }}
      >
        <Tabs.Screen
          name="day"
          options={{
            title: "Today",
            tabBarIcon: ({ color }) => <Home size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            tabBarIcon: ({ color }) => <Calendar size={22} color={color} />,
          }}
        />
        {/* Placeholder tab to leave space for the floating capture button */}
        <Tabs.Screen
          name="dummy-spacer"
          options={{
            title: "",
            tabBarButton: () => <View style={{ width: 60 }} />,
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: "Inbox",
            tabBarIcon: ({ color }) => <Inbox size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: "More",
            tabBarIcon: ({ color }) => <Menu size={22} color={color} />,
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
          bottom: 12,
          left: "50%",
          transform: [{ translateX: -28 }],
          zIndex: 100,
        }}
      >
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#2563eb",
            alignItems: "center",
            justifyContent: "center",
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            borderWidth: 3,
            borderColor: "#0d0d0d",
          }}
        >
          <Plus color="#fff" size={28} />
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
            backgroundColor: "rgba(0,0,0,0.7)",
          }}
        >
          <View
            style={{
              backgroundColor: "#161616",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              minHeight: 300,
              borderTopWidth: 1,
              borderTopColor: "#2a2a2a",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 16 }}>
              <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>Brain Dump Capture</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ color: "#999", fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {!recordingUri ? (
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="What are you thinking about? (Type or hold Mic...)"
                placeholderTextColor="#666"
                multiline
                style={{
                  backgroundColor: "#222",
                  color: "#fff",
                  borderRadius: 12,
                  padding: 16,
                  height: 100,
                  textAlignVertical: "top",
                  fontSize: 16,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#333",
                }}
              />
            ) : (
              <View
                style={{
                  backgroundColor: "#222",
                  borderRadius: 12,
                  padding: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  height: 100,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#3b82f6",
                }}
              >
                <Text style={{ color: "#3b82f6", fontSize: 16, fontWeight: "500" }}>
                  🎙️ Voice recording captured successfully!
                </Text>
                <TouchableOpacity onPress={() => setRecordingUri(null)} style={{ marginTop: 8 }}>
                  <Text style={{ color: "#ef4444", fontSize: 14 }}>Delete and record again</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "center" }}>
              {/* Mic Action */}
              {!recordingUri && (
                <TouchableOpacity
                  onPress={isRecording ? handleStopRecording : handleStartRecording}
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: isRecording ? "#ef4444" : "#222",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: isRecording ? "#ef4444" : "#333",
                  }}
                >
                  {isRecording ? <Square color="#fff" size={24} /> : <Mic color="#fff" size={24} />}
                </TouchableOpacity>
              )}

              {/* Save Action */}
              <TouchableOpacity
                onPress={handleSaveCapture}
                disabled={isSubmitting || (!inputText.trim() && !recordingUri)}
                style={{
                  flex: 1,
                  height: 50,
                  backgroundColor: (inputText.trim() || recordingUri) ? "#2563eb" : "#333",
                  borderRadius: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  marginLeft: !recordingUri ? 16 : 0,
                }}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Save color="#fff" size={20} style={{ marginRight: 8 }} />
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Save to Inbox</Text>
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
