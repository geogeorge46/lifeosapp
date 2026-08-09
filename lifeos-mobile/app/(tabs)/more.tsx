import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Users, MapPin, Landmark, Settings, ChevronRight, Lightbulb, BarChart2 } from "lucide-react-native";

export default function MoreScreen() {
  const router = useRouter();

  const menuItems = [
    {
      title: "Weekly Review",
      subtitle: "Conduct weekly audits, view rescheduling insights, and clear backlog commitments",
      icon: BarChart2,
      color: "#8b5cf6",
      route: "/weekly" as const,
    },
    {
      title: "Ideas Board",
      subtitle: "Brainstorm concepts, design notes, and project features blueprints",
      icon: Lightbulb,
      color: "#eab308",
      route: "/ideas" as const,
    },
    {
      title: "People CRM",
      subtitle: "Manage contacts, relationship tags, and place links",
      icon: Users,
      color: "#3b82f6",
      route: "/people" as const,
    },
    {
      title: "Places Directory",
      subtitle: "Configure locations pins, geofence scopes, and reminders",
      icon: MapPin,
      color: "#10b981",
      route: "/places" as const,
    },
    {
      title: "Transaction Ledger",
      subtitle: "Track double-entry cash flows, expenses, and pending balances",
      icon: Landmark,
      color: "#f59e0b",
      route: "/ledger" as const,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700", marginBottom: 8, paddingTop: 16 }}>
          LifeOS
        </Text>
        <Text style={{ color: "#888", fontSize: 16, marginBottom: 32 }}>
          Secondary modules & system preferences
        </Text>

        {/* Directory Links */}
        <View style={{ gap: 16, marginBottom: 32 }}>
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => router.push(item.route)}
                style={{
                  backgroundColor: "#0d0d0d",
                  borderRadius: 16,
                  padding: 20,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderWidth: 1,
                  borderColor: "#1e1e1e",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: `${item.color}20`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <Icon color={item.color} size={24} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600", marginBottom: 4 }}>
                      {item.title}
                    </Text>
                    <Text style={{ color: "#aaa", fontSize: 13, lineHeight: 18 }}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <ChevronRight color="#444" size={20} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Configuration Footer */}
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={{
            backgroundColor: "#0d0d0d",
            borderRadius: 16,
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#1e1e1e",
          }}
        >
          <Settings color="#666" size={24} style={{ marginRight: 16 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>System Settings</Text>
            <Text style={{ color: "#666", fontSize: 13, marginTop: 2 }}>Preferences, accounts & rules</Text>
          </View>
          <ChevronRight color="#444" size={20} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
