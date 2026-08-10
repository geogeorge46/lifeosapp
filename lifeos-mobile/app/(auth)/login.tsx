import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Shield, Mail, Lock, User as UserIcon } from "lucide-react-native";
import { supabase } from "../../src/services/supabase";
import { useAuthStore } from "../../src/store/authStore";

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Validation Error", "Please fill in all fields.");
      return;
    }

    if (isSignUp && !name.trim()) {
      Alert.alert("Validation Error", "Please enter your name.");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: name.trim(),
            },
          },
        });

        if (error) throw error;
        
        if (data.session) {
          await setAuth(data.session.access_token, data.user);
        } else {
          Alert.alert(
            "Success!",
            "Registration successful. Please verify your email if confirmation is enabled."
          );
          setIsSignUp(false);
        }
      } else {
        // Log In
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        if (data.session) {
          await setAuth(data.session.access_token, data.user);
        }
      }
    } catch (error: any) {
      Alert.alert("Authentication Failed", error.message || "Failed to complete authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F0F4F8]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
          <View className="items-center mb-8">
            <View className="bg-[#E05646] p-4 rounded-3xl mb-4 shadow-md shadow-[#E05646]/20">
              <Shield size={36} color="#FFFFFF" />
            </View>
            <Text className="text-3xl font-extrabold text-[#0F172A]">LifeOS</Text>
            <Text className="text-sm font-semibold text-[#64748B] mt-1 text-center">
              Your personal multi-tenant life administration portal
            </Text>
          </View>

          <View className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-sm shadow-[#0F172A]/5">
            <Text className="text-xl font-bold text-[#0F172A] mb-6">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </Text>

            {isSignUp && (
              <View className="mb-4">
                <Text className="text-xs font-bold text-[#0F172A] mb-2">FULL NAME</Text>
                <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1">
                  <UserIcon size={16} color="#64748B" style={{ marginRight: 8 }} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    placeholderTextColor="#94A3B8"
                    className="flex-1 text-[#0F172A] text-sm py-2.5 font-semibold"
                  />
                </View>
              </View>
            )}

            <View className="mb-4">
              <Text className="text-xs font-bold text-[#0F172A] mb-2">EMAIL ADDRESS</Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1">
                <Mail size={16} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="name@example.com"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-[#0F172A] text-sm py-2.5 font-semibold"
                />
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-xs font-bold text-[#0F172A] mb-2">PASSWORD</Text>
              <View className="flex-row items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-1">
                <Lock size={16} color="#64748B" style={{ marginRight: 8 }} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  placeholder="••••••••"
                  placeholderTextColor="#94A3B8"
                  className="flex-1 text-[#0F172A] text-sm py-2.5 font-semibold"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAuth}
              disabled={loading}
              className="bg-[#E05646] py-3.5 rounded-xl items-center justify-center shadow-md shadow-[#E05646]/20"
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-white text-sm font-extrabold">
                  {isSignUp ? "GET STARTED" : "LOG IN"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSignUp(!isSignUp)}
              className="mt-6 align-center items-center font-bold"
            >
              <Text className="text-xs font-bold text-[#64748B]">
                {isSignUp ? "Already have an account? " : "New to LifeOS? "}
                <Text className="text-[#E05646]">
                  {isSignUp ? "Log In" : "Sign Up"}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
