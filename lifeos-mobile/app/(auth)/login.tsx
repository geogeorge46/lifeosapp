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
import { Shield, Mail, Lock, User as UserIcon, Chrome } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../../src/services/supabase";
import { useAuthStore } from "../../src/store/authStore";

// Complete auth session handles for web browser redirect sheets
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // 1. Generate deep link redirect URL back to the root of the app
      const redirectUrl = Linking.createURL("/");

      // 2. Request Google OAuth authorization URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error("Failed to receive Google OAuth authorization URL from server.");
      }

      // 3. Open the secure browser authentication session
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      console.log("➡️ Google Sign-In WebBrowser result:", JSON.stringify(result, null, 2));

      // 4. Extract token details on success
      if (result.type === "success" && result.url) {
        // Try parsing from hash fragment (standard OAuth format)
        let access_token: string | null = null;
        let refresh_token: string | null = null;

        const hashSplit = result.url.split("#");
        if (hashSplit.length > 1) {
          const params = new URLSearchParams(hashSplit[1]);
          access_token = params.get("access_token");
          refresh_token = params.get("refresh_token");
        }

        // Fallback: Try parsing from query parameters
        if (!access_token || !refresh_token) {
          const querySplit = result.url.split("?");
          if (querySplit.length > 1) {
            const params = new URLSearchParams(querySplit[1]);
            access_token = params.get("access_token");
            refresh_token = params.get("refresh_token");
          }
        }

        console.log("🔑 Extracted access token:", access_token ? "FOUND (valid length)" : "MISSING");
        console.log("🔑 Extracted refresh token:", refresh_token ? "FOUND (valid length)" : "MISSING");

        if (access_token && refresh_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) throw sessionError;

          if (sessionData.session) {
            console.log("✅ Supabase OAuth Session successfully established for user:", sessionData.session.user?.email);
            await setAuth(sessionData.session.access_token, sessionData.session.user);
          } else {
            console.warn("⚠️ Supabase setSession succeeded, but no session object returned.");
          }
        } else {
          Alert.alert("Authentication Failed", "No access token found in the redirect URL.");
        }
      } else {
        console.log("⚠️ WebBrowser session did not return success type.");
      }
    } catch (error: any) {
      console.error("❌ Google Sign-In Error:", error);
      Alert.alert("Google Sign-In Failed", error.message || "Failed to complete Google authentication.");
    } finally {
      setLoading(false);
    }
  };

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
        
        console.log("📝 Supabase SignUp returned user:", data.user?.email, "Session exists:", !!data.session);

        if (data.session) {
          console.log("✅ Establishing session for newly signed up user...");
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
        console.log("🔑 Attempting Email/Password Login for:", email.trim());
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        console.log("📝 Supabase SignIn returned session details. User:", data.user?.email);

        if (data.session) {
          console.log("✅ Establishing login session...");
          await setAuth(data.session.access_token, data.user);
        } else {
          console.warn("⚠️ SignIn completed but no session object returned.");
        }
      }
    } catch (error: any) {
      console.error("❌ Email Auth Error:", error);
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

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-[#E2E8F0]" />
              <Text className="text-xs font-bold text-[#64748B] mx-3">OR</Text>
              <View className="flex-1 h-[1px] bg-[#E2E8F0]" />
            </View>

            <TouchableOpacity
              onPress={handleGoogleSignIn}
              disabled={loading}
              className="flex-row bg-[#FFFFFF] border border-[#E2E8F0] py-3.5 rounded-xl items-center justify-center shadow-sm shadow-[#0F172A]/5"
            >
              <Chrome size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <Text className="text-[#0F172A] text-sm font-extrabold">
                CONTINUE WITH GOOGLE
              </Text>
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
