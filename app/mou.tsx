import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";
import client from "../api/client";

// Strip HTML tags to get readable text for native display
function stripHtml(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi,   "\n\n═══ $1 ═══\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi,   "\n\n── $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi,   "\n$1\n")
    .replace(/<th[^>]*>(.*?)<\/th>/gi,   "$1  |  ")
    .replace(/<td[^>]*>(.*?)<\/td>/gi,   "$1  |  ")
    .replace(/<tr[^>]*>/gi,              "\n  ")
    .replace(/<\/tr>/gi,                 "")
    .replace(/<li[^>]*>(.*?)<\/li>/gi,   "\n  • $1")
    .replace(/<br\s*\/?>/gi,             "\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "$1")
    .replace(/<[^>]+>/g,                 "")
    .replace(/&amp;/g,  "&")
    .replace(/&lt;/g,   "<")
    .replace(/&gt;/g,   ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function MouScreen() {
  const insets     = useSafeAreaInsets();
  const { user }   = useAuthStore();
  const { t } = useThemeStore();
  const colors = { ...t, background: t.bg, primary: t.accent, textSecondary: t.textSec };

  const [loading, setLoading]       = useState(true);
  const [mou, setMou]               = useState<any>(null);
  const [mouText, setMouText]       = useState("");
  const [phase, setPhase]           = useState<"read" | "sign" | "done">("read");

  // Sign state
  const [agreed, setAgreed]                   = useState(false);
  const [profileAccurate, setProfileAccurate] = useState(false);
  const [privacyConsent, setPrivacyConsent]   = useState(false);
  const [otp, setOtp]                         = useState("");
  const [masked, setMasked]                   = useState("");
  const [otpSent, setOtpSent]                 = useState(false);
  const [sending, setSending]                 = useState(false);
  const [signing, setSigning]                 = useState(false);

  useEffect(() => { fetchMou(); }, []);

  async function fetchMou() {
    setLoading(true);
    try {
      const { data } = await client.get("/mou/my");
      setMou(data.mou);
      setMouText(stripHtml(data.mou.mouContentHtml || ""));
      if (data.mou.status === "signed") setPhase("done");
    } catch (e: any) {
      if (e?.response?.status !== 404) {
        Alert.alert("Error", "Could not load your agreement.");
      }
    } finally { setLoading(false); }
  }

  async function handleRequestOtp() {
    setSending(true);
    try {
      const { data } = await client.post("/mou/sign/request-otp");
      setMasked(data.masked || "your registered number");
      setOtpSent(true);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Could not send OTP. Ensure your phone number is saved in your profile.");
    } finally { setSending(false); }
  }

  async function handleSign() {
    if (!agreed || !profileAccurate || !privacyConsent) {
      Alert.alert("Required", "Please check all three confirmation boxes.");
      return;
    }
    if (!otp || otp.length !== 6) {
      Alert.alert("Required", "Enter the 6-digit OTP sent to your phone.");
      return;
    }
    setSigning(true);
    try {
      const { data } = await client.post("/mou/sign", {
        otp,
        checkboxAgreed:           agreed,
        checkboxProfileAccurate:  profileAccurate,
        checkboxPrivacyConsent:   privacyConsent,
      });
      setPhase("done");
      Alert.alert(
        "Agreement Signed",
        `Your membership agreement has been successfully signed.\n\nAgreement ID: ${data.agreementId}`,
        [{ text: "Continue", onPress: () => router.back() }],
      );
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message || "Signing failed. Please check your OTP and try again.");
    } finally { setSigning(false); }
  }

  const allChecked = agreed && profileAccurate && privacyConsent;

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );

  if (!mou) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <Ionicons name="document-outline" size={52} color={colors.textSecondary} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No Agreement Found</Text>
      <Text style={[s.emptySub, { color: colors.textSecondary }]}>Contact BSH admin to generate your membership agreement.</Text>
      <TouchableOpacity style={[s.bigBtn, { backgroundColor: "#0c2461", marginTop: 20 }]} onPress={() => router.back()}>
        <Text style={s.bigBtnTxt}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );

  const TIER_LABEL: Record<string, string> = { golden: "Golden", diamond: "Diamond", platinum: "Platinum" };
  const TIER_COLOR: Record<string, string> = { golden: "#d97706", diamond: "#818cf8", platinum: "#22d3ee" };
  const tierColor = TIER_COLOR[mou.tier] || "#818cf8";

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.back}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.text }]}>Membership Agreement</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
            <View style={[s.tierPill, { backgroundColor: tierColor + "22", borderColor: tierColor }]}>
              <Text style={[s.tierPillTxt, { color: tierColor }]}>{TIER_LABEL[mou.tier] || mou.tier}</Text>
            </View>
            <Text style={[s.agreementId, { color: colors.textSecondary }]}>{mou.agreementId}</Text>
          </View>
        </View>
        {mou.status === "signed" && (
          <View style={s.signedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
            <Text style={s.signedTxt}>Signed</Text>
          </View>
        )}
      </View>

      {/* ── DONE ── */}
      {phase === "done" && (
        <View style={[s.center, { backgroundColor: colors.background }]}>
          <Ionicons name="checkmark-circle" size={72} color="#22c55e" />
          <Text style={[s.doneTitle, { color: colors.text }]}>Agreement Signed</Text>
          <Text style={[s.doneSub, { color: colors.textSecondary }]}>
            Your membership agreement has been submitted to BSH.{"\n\n"}Agreement ID: {mou.agreementId}
          </Text>
          {mou.signedAt && (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Signed on {new Date(mou.signedAt).toLocaleString("en-IN")}
            </Text>
          )}
          <TouchableOpacity style={[s.bigBtn, { backgroundColor: "#0c2461", marginTop: 24 }]} onPress={() => router.back()}>
            <Text style={s.bigBtnTxt}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── READ ── */}
      {phase === "read" && (
        <View style={{ flex: 1 }}>
          <View style={[s.readBanner, { backgroundColor: tierColor + "18", borderBottomColor: tierColor + "44" }]}>
            <Ionicons name="information-circle-outline" size={16} color={tierColor} />
            <Text style={[s.readBannerTxt, { color: tierColor }]}>
              Read the full agreement carefully before proceeding to sign.
            </Text>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator>
            <Text style={[s.mouText, { color: colors.text }]}>{mouText}</Text>
          </ScrollView>
          <View style={[s.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity style={[s.bigBtn, { backgroundColor: "#0c2461" }]} onPress={() => setPhase("sign")}>
              <Text style={s.bigBtnTxt}>I Have Read — Proceed to Sign</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── SIGN ── */}
      {phase === "sign" && (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>

          <Text style={[s.signTitle, { color: colors.text }]}>Electronic Signature</Text>
          <Text style={[s.signSub, { color: colors.textSecondary }]}>
            Your OTP on your registered mobile number is a valid digital signature under the IT Act 2000 (Section 5).
          </Text>

          {/* Checkboxes */}
          <View style={[s.checkCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <CheckRow checked={agreed} onToggle={() => setAgreed(v => !v)} colors={colors}>
              I have read and agree to the Master Educator Membership Agreement and the applicable Membership Schedule.
            </CheckRow>
            <View style={[s.sep, { backgroundColor: colors.border }]} />
            <CheckRow checked={profileAccurate} onToggle={() => setProfileAccurate(v => !v)} colors={colors}>
              I confirm that the information in my educator profile is accurate and complete.
            </CheckRow>
            <View style={[s.sep, { backgroundColor: colors.border }]} />
            <CheckRow checked={privacyConsent} onToggle={() => setPrivacyConsent(v => !v)} colors={colors}>
              I consent to BSH processing my information for onboarding, agreement administration, payments and platform access.
            </CheckRow>
          </View>

          {/* OTP section */}
          <View style={[s.otpCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.primary} />
              <Text style={[s.otpTitle, { color: colors.text }]}>OTP Verification</Text>
            </View>
            <Text style={[s.otpSub, { color: colors.textSecondary }]}>
              {otpSent
                ? `OTP sent to ${masked}. Enter it below.`
                : "An OTP will be sent to your registered mobile number to confirm your signature."}
            </Text>

            {!otpSent ? (
              <TouchableOpacity
                style={[s.otpSendBtn, { backgroundColor: "#0c2461", opacity: sending ? 0.6 : 1 }]}
                onPress={handleRequestOtp}
                disabled={sending}
              >
                {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.otpSendTxt}>Send OTP to My Phone</Text>}
              </TouchableOpacity>
            ) : (
              <View>
                <TextInput
                  style={[s.otpInput, { borderColor: colors.border, color: colors.text, backgroundColor: colors.background }]}
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter OTP"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
                <TouchableOpacity onPress={handleRequestOtp} style={{ alignSelf: "flex-end", marginTop: 6 }}>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>Resend OTP</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Sign button */}
          <TouchableOpacity
            style={[s.signBtn, { backgroundColor: (allChecked && otpSent) ? "#16a34a" : "#334155", opacity: signing ? 0.7 : 1 }]}
            onPress={handleSign}
            disabled={!allChecked || !otpSent || signing}
          >
            {signing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={s.signBtnTxt}>Sign Agreement</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.backLink} onPress={() => setPhase("read")}>
            <Ionicons name="arrow-back" size={14} color={colors.textSecondary} />
            <Text style={[s.backLinkTxt, { color: colors.textSecondary }]}>Back to read agreement</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

const CheckRow: React.FC<{
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  colors: any;
}> = ({ checked, onToggle, children, colors }) => (
  <TouchableOpacity style={s.checkRow} onPress={onToggle} activeOpacity={0.8}>
    <View style={[s.checkbox, { borderColor: checked ? "#22c55e" : colors.border, backgroundColor: checked ? "#22c55e" : "transparent" }]}>
      {checked && <Ionicons name="checkmark" size={14} color="#fff" />}
    </View>
    <Text style={[s.checkTxt, { color: colors.text }]}>{children}</Text>
  </TouchableOpacity>
);

const s = StyleSheet.create({
  center:       { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  emptyTitle:   { fontSize: 18, fontWeight: "800", marginTop: 16 },
  emptySub:     { fontSize: 13, textAlign: "center", marginTop: 8, lineHeight: 20 },
  header:       { flexDirection: "row", alignItems: "center", padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  back:         { marginRight: 12, padding: 2 },
  headerTitle:  { fontSize: 16, fontWeight: "800" },
  tierPill:     { borderRadius: 50, paddingHorizontal: 10, paddingVertical: 2, borderWidth: 1 },
  tierPillTxt:  { fontSize: 11, fontWeight: "700" },
  agreementId:  { fontSize: 11 },
  signedBadge:  { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#052e16", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50 },
  signedTxt:    { color: "#22c55e", fontSize: 11, fontWeight: "700" },
  readBanner:   { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  readBannerTxt:{ fontSize: 12, flex: 1, lineHeight: 18 },
  mouText:      { fontSize: 13, lineHeight: 22 },
  footer:       { padding: 16, borderTopWidth: 1 },
  bigBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 50, paddingVertical: 15, paddingHorizontal: 24 },
  bigBtnTxt:    { color: "#fff", fontWeight: "800", fontSize: 15 },
  doneTitle:    { fontSize: 24, fontWeight: "900", marginTop: 20, marginBottom: 8 },
  doneSub:      { fontSize: 14, textAlign: "center", lineHeight: 22 },
  signTitle:    { fontSize: 20, fontWeight: "900", marginBottom: 6 },
  signSub:      { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  checkCard:    { borderRadius: 14, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  checkRow:     { flexDirection: "row", alignItems: "flex-start", padding: 16, gap: 12 },
  checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  checkTxt:     { flex: 1, fontSize: 13, lineHeight: 20 },
  sep:          { height: 1, marginHorizontal: 16 },
  otpCard:      { borderRadius: 14, borderWidth: 1, padding: 18, marginBottom: 20 },
  otpTitle:     { fontSize: 15, fontWeight: "700" },
  otpSub:       { fontSize: 13, lineHeight: 20, marginBottom: 14, color: "#94a3b8" },
  otpSendBtn:   { borderRadius: 50, paddingVertical: 13, alignItems: "center" },
  otpSendTxt:   { color: "#fff", fontWeight: "700", fontSize: 14 },
  otpInput:     { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 24, fontWeight: "800", textAlign: "center", letterSpacing: 10 },
  signBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 50, paddingVertical: 16 },
  signBtnTxt:   { color: "#fff", fontSize: 16, fontWeight: "900" },
  backLink:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, paddingVertical: 8 },
  backLinkTxt:  { fontSize: 13 },
});
