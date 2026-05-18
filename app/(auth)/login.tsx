import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Image } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { COLORS } from "../../constants";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    clearError();
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      Alert.alert("Login Failed", (err as Error).message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* BSH Logo */}
      <Image
        source={require("../../assets/logo-1.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to continue your journey</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#4b5563"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor="#4b5563"
            secureTextEntry={!showPass}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            <Text style={{ color: COLORS.primaryLight, fontSize: 13 }}>{showPass ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.mutedText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={{ color: COLORS.primaryLight, fontWeight: "700" }}>Sign up free</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: 160, height: 70, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 36 },
  form: { width: "100%", maxWidth: 380 },
  label: { color: "#c4b5fd", fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: COLORS.surface2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, color: COLORS.text, padding: 13, fontSize: 15, marginBottom: 16 },
  passRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 13 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 14, padding: 15, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  errorBox: { backgroundColor: "#450a0a", borderRadius: 10, padding: 10, marginBottom: 12 },
  errorText: { color: COLORS.red, fontSize: 13 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 22 },
  mutedText: { color: COLORS.textMuted, fontSize: 14 },
});
