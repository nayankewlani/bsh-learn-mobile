// ── Profile — View & Edit Account ────────────────────────────────────────────
import React, { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuthStore } from "../stores/authStore";
import client from "../api/client";

const C = {
  bg: "#0a0914", card: "#12101f", border: "#1e1a3a", surface: "#181628",
  accent: "#7c3aed", accentSoft: "rgba(124,58,237,0.12)",
  text: "#e2e8f0", muted: "#64748b", green: "#22c55e", red: "#ef4444",
  gold: "#f59e0b",
};

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline, editable = true }: {
  label: string; value: string; onChangeText?: (v: string) => void;
  placeholder?: string; keyboardType?: any; multiline?: boolean; editable?: boolean;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ""}
        placeholderTextColor={C.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        style={[s.input, !editable && { opacity: 0.5 }, multiline && { height: 80, textAlignVertical: "top" }]}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuthStore();

  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name:   user?.name   || "",
    phone:  user?.phone  || "",
    bio:    user?.bio    || "",
    avatar: user?.avatar || "",
    dob:    user?.dob    || "",
  });

  // Email change state
  const [emailTab,    setEmailTab]    = useState<"idle" | "enter" | "otp">("idle");
  const [newEmail,    setNewEmail]    = useState("");
  const [otp,         setOtp]         = useState("");
  const [emailLoading,setEmailLoading]= useState(false);
  const [emailErr,    setEmailErr]    = useState("");
  const [emailOk,     setEmailOk]     = useState("");

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert("Error", "Name cannot be empty"); return; }
    setSaving(true);
    try {
      await updateProfile(form);
      setEditing(false);
      Alert.alert("Success", "Profile updated!");
    } catch {
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const sendOtp = async () => {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailErr("Enter a valid email address"); return;
    }
    setEmailLoading(true); setEmailErr(""); setEmailOk("");
    try {
      await client.post("/auth/request-email-change", { newEmail: newEmail.trim() });
      setEmailTab("otp");
      setEmailOk("OTP sent! Check your new email inbox.");
    } catch (e: any) {
      setEmailErr(e.response?.data?.message || "Failed to send OTP");
    } finally { setEmailLoading(false); }
  };

  const confirmEmail = async () => {
    if (!otp.trim() || otp.length !== 6) { setEmailErr("Enter the 6-digit OTP"); return; }
    setEmailLoading(true); setEmailErr(""); setEmailOk("");
    try {
      const { data } = await client.post("/auth/confirm-email-change", { newEmail: newEmail.trim(), code: otp.trim() });
      await updateProfile(data.user);
      setEmailTab("idle"); setNewEmail(""); setOtp("");
      setEmailOk("Email updated successfully!");
      setTimeout(() => setEmailOk(""), 3000);
    } catch (e: any) {
      setEmailErr(e.response?.data?.message || "Verification failed");
    } finally { setEmailLoading(false); }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "Type confirmation: your account will be deleted immediately.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await client.delete("/auth/account");
                      logout();
                      router.replace("/(auth)/login");
                    } catch {
                      Alert.alert("Error", "Failed to delete account. Please try again.");
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (!user) return null;

  const fmtDob = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Profile</Text>
        {editing
          ? <TouchableOpacity onPress={() => setEditing(false)}><Text style={{ color: C.muted, fontSize: 14 }}>Cancel</Text></TouchableOpacity>
          : <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="pencil-outline" size={20} color={C.accent} />
            </TouchableOpacity>
        }
      </View>

      <KeyboardAwareScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 60 }} enableOnAndroid>

        {/* Avatar & name row */}
        <View style={s.avatarRow}>
          <View style={s.avatarBox}>
            <Text style={{ fontSize: 30 }}>{user.name?.charAt(0)?.toUpperCase() || "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: "800", fontSize: 18, color: C.text }}>{user.name}</Text>
            <Text style={{ fontSize: 12, color: C.accent, marginTop: 2 }}>{user.role === "educator" ? "👨‍🏫 Educator" : "🎓 Student"}</Text>
            <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{user.email}</Text>
          </View>
        </View>

        {/* ── Profile section ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Personal Information</Text>

          {editing ? (
            <>
              <Field label="Full Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />
              <Field label="Phone" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} keyboardType="phone-pad" placeholder="+91 ..." />
              <Field label="Bio" value={form.bio} onChangeText={v => setForm(f => ({ ...f, bio: v }))} multiline placeholder="Tell others about yourself..." />
              <Field label="Avatar URL" value={form.avatar} onChangeText={v => setForm(f => ({ ...f, avatar: v }))} placeholder="https://..." keyboardType="url" />
              <Field label="Date of Birth (YYYY-MM-DD)" value={form.dob} onChangeText={v => setForm(f => ({ ...f, dob: v }))} placeholder="1990-01-25" keyboardType="numbers-and-punctuation" />

              <TouchableOpacity style={[s.btn, { backgroundColor: C.accent }]} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Save Changes</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {[
                ["Email",         user.email],
                ["Phone",         user.phone || "—"],
                ["Date of Birth", fmtDob(user.dob)],
                ["Bio",           user.bio || "—"],
              ].map(([l, v]) => (
                <View key={l} style={s.infoRow}>
                  <Text style={s.infoLabel}>{l}</Text>
                  <Text style={s.infoValue} numberOfLines={l === "Bio" ? 3 : 1}>{v}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        {/* ── Email change section ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Change Email Address</Text>
          <Text style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
            Current: <Text style={{ color: C.text, fontWeight: "600" }}>{user.email}</Text>
          </Text>

          {emailErr ? <Text style={s.errTxt}>{emailErr}</Text> : null}
          {emailOk  ? <Text style={s.okTxt}>{emailOk}</Text>  : null}

          {emailTab === "idle" && (
            <TouchableOpacity style={[s.btn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}
              onPress={() => { setEmailTab("enter"); setEmailErr(""); setEmailOk(""); }} activeOpacity={0.8}>
              <Text style={[s.btnTxt, { color: C.accent }]}>Change Email</Text>
            </TouchableOpacity>
          )}

          {emailTab === "enter" && (
            <>
              <Field label="New Email Address" value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" placeholder="new@example.com" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={[s.btn, { backgroundColor: C.accent, flex: 1 }]} onPress={sendOtp} disabled={emailLoading} activeOpacity={0.8}>
                  {emailLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Send OTP</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}
                  onPress={() => { setEmailTab("idle"); setEmailErr(""); setNewEmail(""); }} activeOpacity={0.8}>
                  <Text style={[s.btnTxt, { color: C.muted }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {emailTab === "otp" && (
            <>
              <Text style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
                Enter the 6-digit OTP sent to <Text style={{ color: C.text, fontWeight: "600" }}>{newEmail}</Text>
              </Text>
              <Field label="OTP Code" value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="123456" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={[s.btn, { backgroundColor: C.accent, flex: 1 }]} onPress={confirmEmail} disabled={emailLoading} activeOpacity={0.8}>
                  {emailLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnTxt}>Verify & Update</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.btn, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border }]}
                  onPress={() => { setEmailTab("enter"); setEmailErr(""); setOtp(""); }} activeOpacity={0.8}>
                  <Text style={[s.btnTxt, { color: C.muted }]}>Resend</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Delete Account */}
        <TouchableOpacity style={[s.btn, { backgroundColor: "rgba(239,68,68,0.06)", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)", marginTop: 8 }]}
          onPress={handleDeleteAccount} disabled={deleting} activeOpacity={0.8}>
          {deleting
            ? <ActivityIndicator color={C.red} />
            : <>
                <Ionicons name="trash-outline" size={16} color={C.red} style={{ marginRight: 8 }} />
                <Text style={[s.btnTxt, { color: C.red }]}>Delete Account</Text>
              </>
          }
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={[s.btn, { backgroundColor: "rgba(239,68,68,0.1)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", marginTop: 8 }]}
          onPress={() => Alert.alert("Log Out", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: () => { logout(); router.replace("/(auth)/login"); } },
          ])} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={16} color={C.red} style={{ marginRight: 8 }} />
          <Text style={[s.btnTxt, { color: C.red }]}>Log Out</Text>
        </TouchableOpacity>

      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.border },
  backBtn:     { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  avatarRow:   { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  avatarBox:   { width: 60, height: 60, borderRadius: 30, backgroundColor: C.accentSoft, borderWidth: 2, borderColor: C.accent, alignItems: "center", justifyContent: "center" },
  section:     { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 16 },
  sectionTitle:{ fontSize: 13, fontWeight: "800", color: C.text, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldLabel:  { fontSize: 11, fontWeight: "700", color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 },
  input:       { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 10, color: C.text, padding: 12, fontSize: 14 },
  infoRow:     { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 1, borderColor: C.border, gap: 12 },
  infoLabel:   { fontSize: 12, color: C.muted, minWidth: 110 },
  infoValue:   { flex: 1, fontSize: 13, color: C.text, fontWeight: "500" },
  btn:         { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 16, marginTop: 10 },
  btnTxt:      { color: "#fff", fontSize: 14, fontWeight: "700" },
  errTxt:      { color: C.red,   fontSize: 12, marginBottom: 10, fontWeight: "600" },
  okTxt:       { color: C.green, fontSize: 12, marginBottom: 10, fontWeight: "600" },
});
