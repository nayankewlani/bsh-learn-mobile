import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert, Image } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { COLORS } from "../../constants";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole] = useState<"student" | "educator">("student");
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleRegister = async () => {
    clearError();
    try {
      await register(name, email, password, role);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      Alert.alert("Registration Failed", (err as Error).message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require("../../assets/logo-1.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Join millions of learners today</Text>

      <View style={styles.roleRow}>
        {(["student", "educator"] as const).map((r) => (
          <TouchableOpacity key={r} onPress={() => setRole(r)} style={[styles.roleBtn, role === r && styles.roleBtnActive]}>
            <Text style={[styles.roleBtnText, role === r && { color: "#fff" }]}>{r === "student" ? "🎓 Student" : "👨‍🏫 Educator"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your full name" placeholderTextColor="#4b5563" />
        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor="#4b5563" keyboardType="email-address" autoCapitalize="none" />
        <Text style={styles.label}>Password</Text>
        <View style={styles.passRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 6 characters"
            placeholderTextColor="#4b5563"
            secureTextEntry={!showPass}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
            <Text style={{ color: COLORS.primaryLight, fontSize: 13 }}>{showPass ? "Hide" : "Show"}</Text>
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={isLoading}>
          {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={styles.row}>
          <Text style={styles.mutedText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text style={{ color: COLORS.primaryLight, fontWeight: "700" }}>Log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.bg, alignItems: "center", padding: 24, paddingTop: 56 },
  logo: { width: 160, height: 70, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: 14, color: COLORS.textMuted, marginBottom: 24 },
  roleRow: { flexDirection: "row", gap: 8, marginBottom: 24, backgroundColor: "#0f0e1a", borderRadius: 12, padding: 4 },
  roleBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  roleBtnActive: { backgroundColor: COLORS.primary },
  roleBtnText: { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },
  form: { width: "100%", maxWidth: 380 },
  label: { color: "#c4b5fd", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: { backgroundColor: COLORS.surface2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, color: COLORS.text, padding: 12, fontSize: 15, marginBottom: 16 },
  passRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 10, backgroundColor: "#450a0a", padding: 10, borderRadius: 8 },
  row: { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  mutedText: { color: COLORS.textMuted, fontSize: 14 },
});
