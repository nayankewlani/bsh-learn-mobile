import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { useThemeStore } from "../stores/themeStore";
import { RAZORPAY_KEY_ID } from "../constants";
import client from "../api/client";
import { blockIOSPurchase } from "../lib/paymentGate";

const _rzpMod = (() => { try { return require("react-native-razorpay"); } catch { return null; } })();
const RazorpayCheckout: {
  open: (o: Record<string, unknown>) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>;
} | null = _rzpMod?.default?.open ? _rzpMod.default : _rzpMod?.open ? _rzpMod : null;

const FALLBACK_RATE = 86; // ₹86/min — used only when trainer has no price set
const SESSION_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10];
const DURATIONS = [60, 90, 120];

export default function BookSessionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { t } = useThemeStore();
  const params = useLocalSearchParams<{
    expertId: string; expertName: string; expertColor?: string; sessionPricePaise?: string;
  }>();

  const expertColor = params.expertColor || "#7c3aed";
  const dbSessionPricePaise = Number(params.sessionPricePaise || 0);
  const usePerSession = dbSessionPricePaise > 0;

  const [sessions, setSessions]         = useState(1);
  const [duration, setDuration]         = useState(60);
  const [preferredTime, setPreferredTime] = useState("");
  const [clientNote, setClientNote]     = useState("");
  const [paying, setPaying]             = useState(false);
  const [error, setError]               = useState("");
  const [booked, setBooked]             = useState(false);

  const bonusSessions         = sessions >= 5 ? Math.floor(sessions / 5) : 0;
  const effectiveSessions     = sessions + bonusSessions;
  const totalMins             = effectiveSessions * duration;
  const ratePerMin            = usePerSession ? dbSessionPricePaise / 100 : FALLBACK_RATE;
  const pricePerSessionRupees = ratePerMin * duration;
  const totalRupees           = sessions * pricePerSessionRupees;
  const totalPaise            = Math.round(totalRupees * 100);
  const savedRupees           = bonusSessions * pricePerSessionRupees;

  const handlePay = async () => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (blockIOSPurchase()) return;
    if (!RazorpayCheckout) {
      Alert.alert("Payment Not Available", "Payments require the full BSH app build (not Expo Go)."); return;
    }
    setError(""); setPaying(true);
    try {
      const { data } = await client.post("/consultation-bookings/create-order", {
        trainerName: params.expertName, trainerId: params.expertId,
        sessions, durationMins: duration, bonusSessions, totalPaise,
        clientNote, preferredTime,
      });
      const paymentData = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID, amount: String(data.order.amount), currency: "INR",
        name: "BSH Healers",
        description: `${sessions} session${sessions > 1 ? "s" : ""} with ${params.expertName}`,
        order_id: data.order.id,
        prefill: { name: user.name, email: user.email },
        theme: { color: expertColor },
      });
      await client.post("/consultation-bookings/verify", {
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });
      setBooked(true);
    } catch (err: unknown) {
      const e = err as { code?: number; description?: string; response?: { data?: { message?: string } }; message?: string };
      if (e?.code === 0) { setPaying(false); return; } // user cancelled checkout
      setError(e.response?.data?.message ?? e.description ?? e.message ?? "Failed to process payment");
    } finally { setPaying(false); }
  };

  if (booked) {
    return (
      <View style={[s.root, { backgroundColor:t.bg, paddingTop:insets.top, alignItems:"center", justifyContent:"center", padding:24 }]}>
        <View style={[s.doneCard, { backgroundColor:t.card, borderColor:t.border }]}>
          <Text style={{ fontSize:56, marginBottom:14, textAlign:"center" }}>🎉</Text>
          <Text style={[s.doneTitle, { color:t.text }]}>Sessions Booked!</Text>
          <Text style={[s.doneTxt, { color:t.textMuted }]}>
            Payment confirmed! <Text style={{ fontWeight:"800", color:t.text }}>{params.expertName}</Text> has been notified.
          </Text>
          <Text style={[s.doneTxt, { color:t.textMuted }]}>
            You've booked <Text style={{ fontWeight:"800", color:t.text }}>{sessions} session{sessions > 1 ? "s" : ""}</Text>
            {bonusSessions > 0 && <Text style={{ color:"#16a34a" }}> + {bonusSessions} FREE session{bonusSessions > 1 ? "s" : ""}</Text>} of{" "}
            <Text style={{ fontWeight:"800", color:t.text }}>{duration} minutes</Text> each.
          </Text>
          <Text style={[s.doneTxt, { color:t.textMuted, marginBottom:24 }]}>
            The trainer will propose a schedule. Once admin approves, you'll be notified with your session link.
          </Text>
          <TouchableOpacity style={[s.payBtn, { backgroundColor:"#7c3aed" }]} onPress={() => router.replace("/(tabs)/dashboard")}>
            <Text style={s.payBtnTxt}>Go to Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop:12 }} onPress={() => router.replace("/(tabs)/consultation")}>
            <Text style={{ color:t.textMuted, fontWeight:"600" }}>Browse Trainers</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor:t.bg }]}>
      <ScrollView contentContainerStyle={{ paddingTop:insets.top + 16, paddingBottom:40, paddingHorizontal:16 }}>
        <TouchableOpacity onPress={() => router.back()} style={s.backRow}>
          <Ionicons name="arrow-back" size={18} color={t.textMuted} />
          <Text style={{ color:t.textMuted, marginLeft:6, fontSize:14 }}>Back</Text>
        </TouchableOpacity>
        <Text style={[s.h1, { color:t.text }]}>Book Sessions</Text>
        <Text style={[s.h1Sub, { color:t.textMuted }]}>with {params.expertName}</Text>

        {/* Trainer summary */}
        <View style={[s.card, { backgroundColor:t.card, borderColor:t.border, flexDirection:"row", alignItems:"center", gap:14 }]}>
          <View style={[s.avatarWrap, { borderColor:expertColor, backgroundColor:expertColor }]}>
            <Text style={{ color:"#fff", fontWeight:"900", fontSize:20 }}>{(params.expertName || "?")[0]}</Text>
          </View>
          <View>
            <Text style={{ color:t.text, fontWeight:"800", fontSize:15 }}>{params.expertName}</Text>
            <Text style={{ color:"#7c3aed", fontSize:12, fontWeight:"700", marginTop:2 }}>₹{ratePerMin.toLocaleString("en-IN")}/min</Text>
          </View>
        </View>

        {/* Session count */}
        <View style={[s.card, { backgroundColor:t.card, borderColor:t.border }]}>
          <Text style={[s.cardLabel, { color:t.text }]}>Number of Sessions</Text>
          <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8 }}>
            {SESSION_OPTIONS.map(n => {
              const active = sessions === n;
              return (
                <TouchableOpacity key={n} onPress={() => setSessions(n)}
                  style={[s.sessBtn, { borderColor:active ? "#7c3aed" : t.border, backgroundColor:active ? "rgba(124,58,237,0.12)" : "transparent" }]}>
                  <Text style={{ color:active ? "#a78bfa" : t.text, fontWeight:active ? "800" : "500", fontSize:15 }}>{n}</Text>
                  {n >= 5 && n % 5 === 0 && (
                    <View style={s.freeBadge}><Text style={s.freeBadgeTxt}>FREE</Text></View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          {bonusSessions > 0 && (
            <View style={s.bonusBox}>
              <Text style={{ fontSize:18 }}>🎁</Text>
              <View style={{ marginLeft:8, flex:1 }}>
                <Text style={{ color:"#16a34a", fontWeight:"700", fontSize:13 }}>Buy {sessions} Get {bonusSessions} Free!</Text>
                <Text style={{ color:"#16a34a", fontSize:12 }}>You save ₹{savedRupees.toLocaleString("en-IN")} on {bonusSessions} free session{bonusSessions > 1 ? "s" : ""}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Duration */}
        <View style={[s.card, { backgroundColor:t.card, borderColor:t.border }]}>
          <Text style={[s.cardLabel, { color:t.text }]}>Session Duration</Text>
          <Text style={{ color:t.textMuted, fontSize:12, marginBottom:14 }}>Minimum 60 minutes per session</Text>
          <View style={{ flexDirection:"row", gap:10 }}>
            {DURATIONS.map(d => {
              const active = duration === d;
              return (
                <TouchableOpacity key={d} onPress={() => setDuration(d)}
                  style={[s.durBtn, { borderColor:active ? "#7c3aed" : t.border, backgroundColor:active ? "rgba(124,58,237,0.12)" : "transparent" }]}>
                  <Text style={{ color:active ? "#a78bfa" : t.text, fontWeight:active ? "800" : "500" }}>{d} min</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Preferred time */}
        <View style={[s.card, { backgroundColor:t.card, borderColor:t.border }]}>
          <Text style={[s.cardLabel, { color:t.text }]}>Convenient Time (Optional)</Text>
          <Text style={{ color:t.textMuted, fontSize:12, marginBottom:12 }}>Let the trainer know when you're usually free</Text>
          <TextInput value={preferredTime} onChangeText={setPreferredTime}
            placeholder="e.g. Weekday evenings 6-9 PM, Saturday mornings" placeholderTextColor={t.textMuted}
            style={[s.input, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />
        </View>

        {/* Note */}
        <View style={[s.card, { backgroundColor:t.card, borderColor:t.border }]}>
          <Text style={[s.cardLabel, { color:t.text }]}>What would you like to work on? (Optional)</Text>
          <TextInput value={clientNote} onChangeText={setClientNote} multiline numberOfLines={3}
            placeholder="Share what you'd like to focus on…" placeholderTextColor={t.textMuted}
            style={[s.input, s.textarea, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />
        </View>

        {/* Order summary */}
        <View style={[s.card, { backgroundColor:t.card, borderColor:t.border }]}>
          <Text style={[s.cardLabel, { color:t.text, marginBottom:14 }]}>Order Summary</Text>
          <View style={s.summaryRow}>
            <Text style={{ color:t.textMuted, fontSize:13, flex:1 }}>{sessions} session{sessions > 1 ? "s" : ""} × {duration} min × ₹{ratePerMin.toLocaleString("en-IN")}/min</Text>
            <Text style={{ color:t.text, fontWeight:"700", fontSize:13 }}>₹{totalRupees.toLocaleString("en-IN")}</Text>
          </View>
          {bonusSessions > 0 && (
            <View style={s.summaryRow}>
              <Text style={{ color:"#16a34a", fontSize:13, flex:1 }}>🎁 {bonusSessions} free session{bonusSessions > 1 ? "s" : ""} included</Text>
              <Text style={{ color:"#16a34a", fontWeight:"700", fontSize:13 }}>₹0</Text>
            </View>
          )}
          <View style={s.summaryRow}>
            <Text style={{ color:t.textMuted, fontSize:13, flex:1 }}>Total sessions × minutes</Text>
            <Text style={{ color:t.text, fontSize:13 }}>{effectiveSessions} sessions · {totalMins} min total</Text>
          </View>
          <View style={[s.summaryRow, { borderTopWidth:1, borderTopColor:t.border, paddingTop:12, marginTop:4 }]}>
            <Text style={{ color:t.text, fontWeight:"800", fontSize:16, flex:1 }}>Total</Text>
            <Text style={{ color:"#7c3aed", fontWeight:"900", fontSize:20 }}>₹{totalRupees.toLocaleString("en-IN")}</Text>
          </View>
        </View>

        {!!error && <Text style={s.errTxt}>⚠ {error}</Text>}

        <TouchableOpacity style={[s.payBtn, { backgroundColor:paying ? "#9ca3af" : "#7c3aed" }]} onPress={handlePay} disabled={paying}>
          {paying ? <ActivityIndicator color="#fff" /> : <Text style={s.payBtnTxt}>Pay ₹{totalRupees.toLocaleString("en-IN")}</Text>}
        </TouchableOpacity>
        <Text style={{ textAlign:"center", color:t.textMuted, fontSize:12, marginTop:12 }}>
          Secured by Razorpay · Trainer will schedule sessions after payment
        </Text>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex:1 },
  backRow:     { flexDirection:"row", alignItems:"center", marginBottom:14 },
  h1:          { fontSize:24, fontWeight:"900", marginBottom:4 },
  h1Sub:       { fontSize:14, marginBottom:20 },
  card:        { borderRadius:16, borderWidth:1, padding:18, marginBottom:14 },
  cardLabel:   { fontWeight:"800", fontSize:15, marginBottom:14 },
  avatarWrap:  { width:56, height:56, borderRadius:28, borderWidth:2, alignItems:"center", justifyContent:"center" },
  sessBtn:     { width:52, height:52, borderRadius:12, borderWidth:2, alignItems:"center", justifyContent:"center", position:"relative" },
  freeBadge:   { position:"absolute", top:-8, right:-6, backgroundColor:"#16a34a", borderRadius:6, paddingHorizontal:4, paddingVertical:2 },
  freeBadgeTxt:{ color:"#fff", fontSize:8, fontWeight:"900" },
  bonusBox:    { flexDirection:"row", alignItems:"center", marginTop:14, backgroundColor:"rgba(22,163,74,0.1)", borderWidth:1, borderColor:"rgba(22,163,74,0.3)", borderRadius:10, padding:12 },
  durBtn:      { flex:1, paddingVertical:14, borderRadius:12, borderWidth:2, alignItems:"center" },
  input:       { borderWidth:1.5, borderRadius:10, padding:12, fontSize:14 },
  textarea:    { minHeight:72, textAlignVertical:"top" },
  summaryRow:  { flexDirection:"row", justifyContent:"space-between", marginBottom:10, alignItems:"flex-start" },
  errTxt:      { color:"#f87171", fontSize:13, marginBottom:16, backgroundColor:"rgba(239,68,68,0.08)", padding:10, borderRadius:8, textAlign:"center" },
  payBtn:      { borderRadius:14, paddingVertical:16, alignItems:"center", justifyContent:"center", marginTop:8 },
  payBtnTxt:   { color:"#fff", fontWeight:"800", fontSize:17 },
  doneCard:    { borderRadius:20, borderWidth:1, padding:32, maxWidth:420, width:"100%" },
  doneTitle:   { fontSize:22, fontWeight:"900", marginBottom:12, textAlign:"center" },
  doneTxt:     { fontSize:14, lineHeight:21, marginBottom:8, textAlign:"center" },
});
