import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Image,
} from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { COLORS } from "../../constants";
import client from "../../api/client";

export default function RegisterScreen() {
  // ── Step 1 fields ──────────────────────────────────────────────────────────
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole]         = useState<"student" | "educator">("student");

  // ── Step management ────────────────────────────────────────────────────────
  const [step, setStep]         = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode]   = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");

  const { register } = useAuthStore();

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // ── Step 1: validate → send OTP ───────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!name.trim())  { setErr("Please enter your full name"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr("Enter a valid email address"); return; }
    if (password.length < 6) { setErr("Password must be at least 6 characters"); return; }
    setErr("");
    setLoading(true);
    try {
      await client.post("/auth/send-otp", { email: email.trim() });
      setStep("otp");
      startResendTimer();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to send code. Try again.");
    }
    setLoading(false);
  };

  // ── Step 2: verify OTP → register ─────────────────────────────────────────
  const handleVerifyAndRegister = async () => {
    if (otpCode.length !== 6) { setErr("Enter the 6-digit code from your email"); return; }
    setErr("");
    setLoading(true);
    try {
      const { data: v } = await client.post("/auth/verify-otp", { email: email.trim(), code: otpCode });
      await register(name.trim(), email.trim(), password, role, v.verificationId);
      router.replace("/(tabs)");
    } catch (e: any) {
      setErr(e?.response?.data?.message || e?.message || "Verification failed. Check your code and try again.");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setErr("");
    setLoading(true);
    try {
      await client.post("/auth/send-otp", { email: email.trim() });
      setOtpCode("");
      startResendTimer();
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to resend code.");
    }
    setLoading(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <Image source={require("../../assets/logo-1.png")} style={s.logo} resizeMode="contain" />

      {step === "form" ? (
        <>
          <Text style={s.title}>Create account</Text>
          <Text style={s.subtitle}>Join BSH Healers community</Text>

          <View style={s.roleRow}>
            {(["student", "educator"] as const).map(r => (
              <TouchableOpacity key={r} onPress={() => setRole(r)}
                style={[s.roleBtn, role === r && s.roleBtnActive]}>
                <Text style={[s.roleBtnText, role === r && { color: "#fff" }]}>
                  {r === "student" ? "🎓 Student" : "👨‍🏫 Educator"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={s.form}>
            <Text style={s.label}>Full Name</Text>
            <TextInput style={s.input} value={name} onChangeText={setName}
              placeholder="Your full name" placeholderTextColor="#4b5563" />

            <Text style={s.label}>Email</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail}
              placeholder="you@example.com" placeholderTextColor="#4b5563"
              keyboardType="email-address" autoCapitalize="none" />

            <Text style={s.label}>Password</Text>
            <View style={s.passRow}>
              <TextInput style={[s.input, { flex: 1, marginBottom: 0 }]}
                value={password} onChangeText={setPassword}
                placeholder="Min. 6 characters" placeholderTextColor="#4b5563"
                secureTextEntry={!showPass} />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={s.eyeBtn}>
                <Text style={{ color: COLORS.primaryLight, fontSize: 13 }}>{showPass ? "Hide" : "Show"}</Text>
              </TouchableOpacity>
            </View>

            {err ? <Text style={s.error}>{err}</Text> : null}

            <TouchableOpacity style={s.btn} onPress={handleSendOtp} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Send Verification Code →</Text>}
            </TouchableOpacity>

            <View style={s.row}>
              <Text style={s.mutedText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={{ color: COLORS.primaryLight, fontWeight: "700" }}>Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <>
          <Text style={s.title}>Verify your email</Text>
          <Text style={s.subtitle}>We sent a 6-digit code to</Text>
          <Text style={[s.subtitle, { color: COLORS.primaryLight, fontWeight: "700", marginBottom: 28 }]}>
            {email}
          </Text>

          <View style={s.form}>
            <Text style={s.label}>Verification Code</Text>
            <TextInput
              style={[s.input, s.otpInput]}
              value={otpCode}
              onChangeText={t => setOtpCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="· · · · · ·"
              placeholderTextColor="#374151"
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />

            {err ? <Text style={s.error}>{err}</Text> : null}

            <TouchableOpacity style={s.btn} onPress={handleVerifyAndRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>Verify & Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0}
              style={{ alignItems: "center", marginTop: 18 }}>
              <Text style={{ color: resendTimer > 0 ? "#4b5563" : COLORS.primaryLight, fontSize: 14, fontWeight: "600" }}>
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep("form"); setErr(""); setOtpCode(""); }}
              style={{ alignItems: "center", marginTop: 12 }}>
              <Text style={{ color: "#6b7280", fontSize: 13 }}>← Change email or details</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:     { flexGrow: 1, backgroundColor: COLORS.bg, alignItems: "center", padding: 24, paddingTop: 56 },
  logo:          { width: 160, height: 70, marginBottom: 16 },
  title:         { fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 4 },
  subtitle:      { fontSize: 14, color: COLORS.textMuted, marginBottom: 8, textAlign: "center" },
  roleRow:       { flexDirection: "row", gap: 8, marginBottom: 24, backgroundColor: "#0f0e1a", borderRadius: 12, padding: 4 },
  roleBtn:       { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  roleBtnActive: { backgroundColor: COLORS.primary },
  roleBtnText:   { color: COLORS.textMuted, fontWeight: "600", fontSize: 14 },
  form:          { width: "100%", maxWidth: 380 },
  label:         { color: "#c4b5fd", fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input:         { backgroundColor: COLORS.surface2, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, color: COLORS.text, padding: 12, fontSize: 15, marginBottom: 16 },
  otpInput:      { textAlign: "center", fontSize: 30, letterSpacing: 14, fontWeight: "800", paddingVertical: 18 },
  passRow:       { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  eyeBtn:        { paddingHorizontal: 12, paddingVertical: 12 },
  btn:           { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 8 },
  btnText:       { color: "#fff", fontWeight: "700", fontSize: 16 },
  error:         { color: COLORS.red, fontSize: 13, marginBottom: 10, backgroundColor: "#450a0a", padding: 10, borderRadius: 8 },
  row:           { flexDirection: "row", justifyContent: "center", marginTop: 20 },
  mutedText:     { color: COLORS.textMuted, fontSize: 14 },
});
