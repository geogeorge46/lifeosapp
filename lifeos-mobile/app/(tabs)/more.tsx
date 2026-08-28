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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F0F4F8" }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
        <Text style={{ color: "#0F172A", fontSize: 28, fontWeight: "900", letterSpacing: -1, marginBottom: 4, paddingTop: 16 }}>
          Synora
        </Text>
        <Text style={{ color: "#64748B", fontSize: 13, fontWeight: "600", marginBottom: 28 }}>
          Secondary modules & system preferences
        </Text>

        {/* Directory Links */}
        <View style={{ gap: 12, marginBottom: 20 }}>
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => router.push(item.route)}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderWidth: 1,
                  borderColor: "#E2E8F0",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.02,
                  shadowRadius: 6,
                  elevation: 2,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: `${item.color}15`,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 14,
                    }}
                  >
                    <Icon color={item.color} size={20} />
                  </View>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={{ color: "#0F172A", fontSize: 15, fontWeight: "800", marginBottom: 2 }}>
                      {item.title}
                    </Text>
                    <Text style={{ color: "#64748B", fontSize: 12, lineHeight: 16, fontWeight: "500" }}>
                      {item.subtitle}
                    </Text>
                  </View>
                </View>
                <ChevronRight color="#94A3B8" size={16} />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Configuration Footer */}
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 16,
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#E2E8F0",
            shadowColor: "#0F172A",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.02,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              backgroundColor: "rgba(100, 116, 139, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 14,
            }}
          >
            <Settings color="#64748B" size={20} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#0F172A", fontSize: 15, fontWeight: "800" }}>System Settings</Text>
            <Text style={{ color: "#64748B", fontSize: 12, marginTop: 2, fontWeight: "500" }}>Preferences, accounts & rules</Text>
          </View>
          <ChevronRight color="#94A3B8" size={16} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
