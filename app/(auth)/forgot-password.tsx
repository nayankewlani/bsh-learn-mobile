import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Image } from "react-native";
import { router } from "expo-router";
import { COLORS } from "../../constants";
import client from "../../api/client";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (val: string) => {
    if (!val) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "Enter a valid email";
    return "";
  };

  const handleSubmit = async () => {
    setTouched(true);
    const err = validate(email);
    setError(err);
    if (err) return;
    setIsLoading(true);
    try {
      await client.post("/auth/forgot-password", { email });
    } catch {}
    setIsLoading(false);
    setSuccess(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Image
        source={require("../../assets/logo-1.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      {!success ? (
        <View style={styles.card}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backCircle}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Forgot Password</Text>
          <Text style={styles.subtitle}>Enter your registered email to receive a reset link.</Text>

          <View style={[styles.inputRow, touched && error ? styles.inputError : null]}>
            <Text style={styles.inputIcon}>✉</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={(val) => { setEmail(val); if (touched) setError(validate(val)); }}
              onBlur={() => { setTouched(true); setError(validate(email)); }}
              placeholder="name@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          {touched && !!error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.btn, isLoading && { backgroundColor: "#9ca3af" }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Send Reset Link</Text>
            }
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.successIconBox}>
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Email Sent!</Text>
          <Text style={styles.successSub}>
            We've sent a recovery link to{"\n"}<Text style={{ fontWeight: "700", color: COLORS.text }}>{email}</Text>.{"\n"}Check your inbox or spam folder.
          </Text>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => setSuccess(false)}>
            <Text style={styles.outlineBtnText}>Try another email</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Remembered your password? </Text>
        <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
          <Text style={styles.footerLink}>Login here</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", padding: 24 },
  logo: { width: 160, height: 70, marginBottom: 24 },
  card: { width: "100%", maxWidth: 380, backgroundColor: "#fff", borderRadius: 24, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  backArrow: { fontSize: 18, color: "#555" },
  title: { fontSize: 22, fontWeight: "800", color: "#111", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#f9fafb", borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 2, marginBottom: 6 },
  inputError: { borderColor: "#ef4444" },
  inputIcon: { fontSize: 16, color: "#9ca3af", marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: "#111", paddingVertical: 12 },
  errorText: { color: "#ef4444", fontSize: 12, marginBottom: 12, marginLeft: 4 },
  btn: { backgroundColor: "#7c3aed", borderRadius: 12, padding: 15, alignItems: "center", marginTop: 16 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  successIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#dcfce7", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 16 },
  successIcon: { fontSize: 32, color: "#22c55e" },
  successTitle: { fontSize: 22, fontWeight: "800", color: "#111", textAlign: "center", marginBottom: 10 },
  successSub: { fontSize: 14, color: "#666", textAlign: "center", lineHeight: 22, marginBottom: 20 },
  outlineBtn: { borderWidth: 1.5, borderColor: "#7c3aed", borderRadius: 10, padding: 11, alignItems: "center" },
  outlineBtnText: { color: "#7c3aed", fontWeight: "600", fontSize: 14 },
  footer: { flexDirection: "row", marginTop: 24 },
  footerText: { color: COLORS.textMuted, fontSize: 14 },
  footerLink: { color: COLORS.primaryLight, fontWeight: "700", fontSize: 14 },
});
