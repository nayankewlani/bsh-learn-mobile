import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, TextInput, Modal, Animated, Alert, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, User } from "../stores/authStore";
import { useThemeStore, ThemeColors } from "../stores/themeStore";
import { RAZORPAY_KEY_ID } from "../constants";
import client from "../api/client";
import { blockIOSPurchase } from "../lib/paymentGate";

const _rzpMod = (() => { try { return require("react-native-razorpay"); } catch { return null; } })();
const RazorpayCheckout: {
  open: (o: Record<string, unknown>) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>;
} | null = _rzpMod?.default?.open ? _rzpMod.default : _rzpMod?.open ? _rzpMod : null;

const bshLogoImg  = require("../assets/BSH-logo-02.png");
const slide1Img   = require("../assets/slide-1.png");
const geetaImg    = require("../assets/geeta-makhijani.png");
const slide4Img   = require("../assets/slide-4.png");

// ── Types ─────────────────────────────────────────────────────────────────────
interface DBTrainer {
  _id: string; name: string; avatar: string; isOnline: boolean;
  trainerRole: string; trainerColor: string; specialties: string[];
  experience: string; sessionsDisplay: string; rating: number;
  followers: number; trainerLanguages: string[]; isVerifiedBadge: boolean;
  sessionPricePaise: number; sessionRazorpayLink: string;
  canOfferSessions: boolean; hasPayBooking: boolean; hasApplyBooking: boolean;
}
interface Expert {
  _id: string; name: string; role: string; subject: string;
  color: string; localImg: number | null; avatarUrl: string;
  exp: string; sessions: string; rating: number; followers: number;
  languages: string[]; verified: boolean; isOnline: boolean;
  sessionPricePaise: number; hasPayBooking: boolean; hasApplyBooking: boolean;
}

// ── Static image map ──────────────────────────────────────────────────────────
const LOCAL_IMGS: Record<string, number> = {
  "dr. pradeep kumar": slide1Img,
  "geeta makhijani":   geetaImg,
  "bsh faculty":       slide4Img,
};

const SPECIALTIES = ["All","Hypnotherapy","Shadow Work","NLP Coaching","Spiritual Healing",
  "Mind Wellness","Emotional Healing","Vastu Shastra","Autism Healing","Corporate Training"];
const LANGUAGES = ["English","Hindi","Telugu"];

const PS_ISSUE_TAGS = [
  "Anxiety & Stress","Depression","Relationship Issues","Trauma & Wounds",
  "Sleep Problems","Fear & Phobias","Anger Management","Low Confidence",
  "Career Block","Grief & Loss","Childhood Healing","Spiritual Growth",
  "Physical Pain","Addiction","Exam Fear","Family Conflict",
];
const PS_TIME_SLOTS = ["Morning (8–12)","Afternoon (12–5)","Evening (5–9)"];

// ── Apply 1:1 Modal ───────────────────────────────────────────────────────────
const ApplyModal: React.FC<{
  expert: Expert; t: ThemeColors; user: User | null; onClose: ()=>void;
}> = ({ expert, t, user, onClose }) => {
  const [name, setName]     = useState(user?.name ?? "");
  const [phone, setPhone]   = useState(user?.phone ?? "");
  const [email, setEmail]   = useState(user?.email ?? "");
  const [issue, setIssue]   = useState("");
  const [pref, setPref]     = useState("");
  const [msg, setMsg]       = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [err, setErr]       = useState("");

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !issue.trim()) {
      Alert.alert("Missing Info","Please fill in name, phone, and what you'd like to work on."); return;
    }
    setLoading(true); setErr("");
    try {
      await client.post("/session-applications", {
        trainerId: expert._id, trainerName: expert.name,
        clientId: user?._id, clientName: name.trim(),
        clientEmail: email.trim(), clientPhone: phone.trim(),
        issue: issue.trim(), preferredTime: pref.trim(), message: msg.trim(),
      });
      setDone(true);
    } catch (e: any) {
      setErr(e.response?.data?.message || "Failed to submit. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={am.backdrop}>
        <View style={[am.sheet, { backgroundColor: t.card }]}>
          {/* Header */}
          <View style={[am.header, { backgroundColor: expert.color + "cc" }]}>
            {expert.localImg
              ? <Image source={expert.localImg} style={am.headerImg} />
              : <View style={[am.headerImgFallback, { backgroundColor: expert.color }]}>
                  <Text style={am.headerInitial}>{expert.name[0]}</Text>
                </View>
            }
            <View style={{ flex:1 }}>
              <Text style={am.headerName}>{expert.name}</Text>
              <Text style={am.headerSub}>Apply for 1:1 Private Session</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={am.closeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={am.body} showsVerticalScrollIndicator={false}>
            {done ? (
              <View style={am.doneBox}>
                <Text style={am.doneEmoji}>✅</Text>
                <Text style={[am.doneTitle, { color: t.text }]}>Application Sent!</Text>
                <Text style={[am.doneSub, { color: t.textMuted }]}>
                  <Text style={{ color: expert.color, fontWeight:"800" }}>{expert.name}</Text> will reach out within 24 hours.
                </Text>
                <TouchableOpacity style={[am.submitBtn, { backgroundColor: expert.color }]} onPress={onClose}>
                  <Text style={am.submitBtnTxt}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={am.row2}>
                  <TextInput value={name} onChangeText={setName} placeholder="Full Name *"
                    placeholderTextColor={t.textMuted} style={[am.inp, { color:t.text, borderColor:t.border, backgroundColor:t.surface, flex:1 }]} />
                  <TextInput value={phone} onChangeText={setPhone} placeholder="Phone *" keyboardType="phone-pad"
                    placeholderTextColor={t.textMuted} style={[am.inp, { color:t.text, borderColor:t.border, backgroundColor:t.surface, flex:1 }]} />
                </View>
                <TextInput value={email} onChangeText={setEmail} placeholder="Email (optional)"
                  placeholderTextColor={t.textMuted} style={[am.inp, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />
                <TextInput value={issue} onChangeText={setIssue} placeholder="What would you like to work on? *"
                  placeholderTextColor={t.textMuted} multiline numberOfLines={3}
                  style={[am.inp, am.textarea, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />
                <TextInput value={pref} onChangeText={setPref} placeholder="Preferred time (e.g. Weekday evenings 7–9 PM)"
                  placeholderTextColor={t.textMuted} style={[am.inp, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />
                <TextInput value={msg} onChangeText={setMsg} placeholder="Anything else to share (optional)"
                  placeholderTextColor={t.textMuted} multiline numberOfLines={2}
                  style={[am.inp, am.textarea, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />
                {!!err && <Text style={am.errTxt}>⚠ {err}</Text>}
                <TouchableOpacity
                  style={[am.submitBtn, { backgroundColor: (!name.trim()||!phone.trim()||!issue.trim()) ? t.textMuted : expert.color }]}
                  onPress={submit} disabled={loading || !name.trim() || !phone.trim() || !issue.trim()}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={am.submitBtnTxt}>✋ Submit Application</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const am = StyleSheet.create({
  backdrop:    { flex:1, backgroundColor:"rgba(4,3,14,0.88)", justifyContent:"flex-end" },
  sheet:       { borderTopLeftRadius:24, borderTopRightRadius:24, overflow:"hidden", maxHeight:"90%" },
  header:      { flexDirection:"row", alignItems:"center", gap:14, padding:20 },
  headerImg:   { width:52, height:52, borderRadius:26, borderWidth:2, borderColor:"rgba(255,255,255,0.6)" },
  headerImgFallback: { width:52, height:52, borderRadius:26, alignItems:"center", justifyContent:"center" },
  headerInitial: { color:"#fff", fontSize:22, fontWeight:"900" },
  headerName:  { color:"#fff", fontWeight:"800", fontSize:16 },
  headerSub:   { color:"rgba(255,255,255,0.8)", fontSize:12 },
  closeBtn:    { width:30, height:30, borderRadius:15, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  body:        { padding:20 },
  row2:        { flexDirection:"row", gap:10 },
  inp:         { borderWidth:1.5, borderRadius:10, padding:12, fontSize:14, marginBottom:12 },
  textarea:    { minHeight:72, textAlignVertical:"top" },
  errTxt:      { color:"#f87171", fontSize:12, marginBottom:12, backgroundColor:"rgba(239,68,68,0.08)", padding:10, borderRadius:8 },
  submitBtn:   { borderRadius:12, paddingVertical:14, alignItems:"center", justifyContent:"center", marginBottom:16 },
  submitBtnTxt:{ color:"#fff", fontWeight:"800", fontSize:15 },
  doneBox:     { alignItems:"center", paddingVertical:32 },
  doneEmoji:   { fontSize:48, marginBottom:12 },
  doneTitle:   { fontSize:18, fontWeight:"800", marginBottom:8 },
  doneSub:     { fontSize:13, textAlign:"center", lineHeight:20, marginBottom:24, paddingHorizontal:16 },
});

// ── Free Chat Modal ───────────────────────────────────────────────────────────
const ChatModal: React.FC<{
  expert: Expert; t: ThemeColors; user: User | null; onClose: ()=>void;
}> = ({ expert, t, user, onClose }) => {
  const [name, setName]   = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [issues, setIssues] = useState<string[]>([]);
  const [detail, setDetail] = useState("");
  const [slot, setSlot]   = useState("");
  const [step, setStep]   = useState<"form"|"loading"|"success">("form");

  const toggle = (tag: string) =>
    setIssues(prev => prev.includes(tag) ? prev.filter(i=>i!==tag) : [...prev, tag]);

  const submit = async () => {
    if (!name.trim() || !email.trim() || issues.length === 0) {
      Alert.alert("Missing Info","Please fill Name, Email, and select at least one concern."); return;
    }
    setStep("loading");
    try {
      await client.post("/private-sessions", {
        name: name.trim(), email: email.trim(), phone: phone.trim(),
        issues, detail: detail.trim(), timeSlot: slot, type: "free_call",
      });
      setStep("success");
    } catch {
      setStep("form");
      Alert.alert("Submission Failed","Could not send your request. Please try again.");
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={am.backdrop}>
        <View style={[am.sheet, { backgroundColor: t.card }]}>
          <View style={[am.header, { backgroundColor:"#22c55e99" }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#fff" />
            <View style={{ flex:1 }}>
              <Text style={am.headerName}>💬 Free Chat Consultation</Text>
              {expert && <Text style={am.headerSub}>with {expert.name}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={am.closeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {step === "success" ? (
            <View style={[am.body, { alignItems:"center", paddingVertical:32 }]}>
              <Text style={{ fontSize:48, marginBottom:12 }}>🙏</Text>
              <Text style={[{ fontSize:18, fontWeight:"800", marginBottom:8, color:t.text }]}>Request Sent!</Text>
              <Text style={[{ fontSize:13, textAlign:"center", lineHeight:20, marginBottom:24, color:t.textMuted }]}>
                Our team will contact you within 24 hours to schedule your free session.
              </Text>
              <TouchableOpacity style={[am.submitBtn, { backgroundColor:"#22c55e", paddingHorizontal:32 }]} onPress={onClose}>
                <Text style={am.submitBtnTxt}>Got it!</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView style={am.body} showsVerticalScrollIndicator={false}>
              <View style={am.row2}>
                <TextInput value={name} onChangeText={setName} placeholder="Full Name *"
                  placeholderTextColor={t.textMuted} style={[am.inp, { color:t.text, borderColor:t.border, backgroundColor:t.surface, flex:1 }]} />
                <TextInput value={email} onChangeText={setEmail} placeholder="Email *" keyboardType="email-address"
                  placeholderTextColor={t.textMuted} style={[am.inp, { color:t.text, borderColor:t.border, backgroundColor:t.surface, flex:1 }]} />
              </View>
              <TextInput value={phone} onChangeText={setPhone} placeholder="Phone Number"
                keyboardType="phone-pad" placeholderTextColor={t.textMuted}
                style={[am.inp, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />

              <Text style={[cm.secLabel, { color:t.textMuted }]}>Select Your Concerns *</Text>
              <View style={cm.tagWrap}>
                {PS_ISSUE_TAGS.map(tag => {
                  const sel = issues.includes(tag);
                  return (
                    <TouchableOpacity key={tag} onPress={() => toggle(tag)}
                      style={[cm.tag, { borderColor:sel?"#7c3aed":t.border, backgroundColor:sel?"rgba(124,58,237,0.12)":"transparent" }]}>
                      <Text style={[cm.tagTxt, { color:sel?"#a78bfa":t.textMuted }]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput value={detail} onChangeText={setDetail} placeholder="Tell us a bit more about what you're going through (optional)"
                placeholderTextColor={t.textMuted} multiline numberOfLines={3}
                style={[am.inp, am.textarea, { color:t.text, borderColor:t.border, backgroundColor:t.surface }]} />

              <Text style={[cm.secLabel, { color:t.textMuted }]}>Preferred Time</Text>
              <View style={cm.tagWrap}>
                {PS_TIME_SLOTS.map(s => {
                  const sel = slot === s;
                  return (
                    <TouchableOpacity key={s} onPress={() => setSlot(sel ? "" : s)}
                      style={[cm.tag, { borderColor:sel?"#22c55e":t.border, backgroundColor:sel?"rgba(34,197,94,0.1)":"transparent" }]}>
                      <Text style={[cm.tagTxt, { color:sel?"#22c55e":t.textMuted }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[am.submitBtn, { backgroundColor:(!name.trim()||!email.trim()||issues.length===0)?"#6b7280":"#22c55e" }]}
                onPress={submit} disabled={step==="loading"||!name.trim()||!email.trim()||issues.length===0}>
                {step === "loading"
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={am.submitBtnTxt}>💬 Request Free Session</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ── Expert Card ───────────────────────────────────────────────────────────────
const ExpertCard: React.FC<{
  expert: Expert; t: ThemeColors; isDark: boolean;
  onApply: ()=>void; onChat: ()=>void; onBook: ()=>void;
}> = ({ expert, t, isDark, onApply, onChat, onBook }) => {
  const stars = Math.round(expert.rating);
  const priceRs = expert.sessionPricePaise > 0 ? Math.round(expert.sessionPricePaise / 100) : 0;

  return (
    <View style={[ec.card, { backgroundColor:t.card, borderColor:t.border }]}>
      {/* Photo + info */}
      <View style={ec.topRow}>
        <View style={ec.avatarWrap}>
          {expert.localImg
            ? <Image source={expert.localImg} style={[ec.avatar, { borderColor:expert.color }]} />
            : expert.avatarUrl
              ? <Image source={{ uri:expert.avatarUrl }} style={[ec.avatar, { borderColor:expert.color }]} />
              : <View style={[ec.avatarFallback, { backgroundColor:expert.color, borderColor:expert.color }]}>
                  <Text style={ec.avatarInitial}>{expert.name[0]}</Text>
                </View>
          }
          <View style={[ec.onlineDot, { backgroundColor:expert.isOnline ? "#ef4444":"#94a3b8",
            shadowColor:expert.isOnline?"#ef4444":"transparent", shadowOpacity:0.7, shadowRadius:4 }]} />
        </View>
        <View style={{ flex:1, minWidth:0 }}>
          <View style={{ flexDirection:"row", alignItems:"center", gap:4, marginBottom:2 }}>
            <Text style={[ec.name, { color:t.text }]} numberOfLines={1}>{expert.name}</Text>
            {expert.verified && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
          </View>
          <Text style={[ec.role, { color:t.textMuted }]} numberOfLines={1}>{expert.role}</Text>
          {!!expert.subject && (
            <View style={[ec.subjectChip, { backgroundColor:expert.color+"20", borderColor:expert.color+"50" }]}>
              <Text style={[ec.subjectTxt, { color:expert.color }]}>{expert.subject}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={[ec.statsRow, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>⏱ {expert.exp||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>👥 {expert.sessions||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>🌐 {expert.languages.slice(0,2).join(", ")||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>❤ {expert.followers>0?(expert.followers/1000).toFixed(1)+"k":"—"}</Text></View>
      </View>

      {/* Rating + Price */}
      <View style={ec.ratingRow}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:2 }}>
          {Array.from({ length:5 }).map((_,i)=>(
            <Ionicons key={i} name={i < stars ? "star" : "star-outline"} size={12} color={i < stars ? "#f59e0b" : t.border} />
          ))}
          <Text style={[{ color:t.textMuted, fontSize:12, marginLeft:3 }]}>{expert.rating}</Text>
        </View>
        {expert.hasPayBooking && priceRs > 0 ? (
          <View style={{ alignItems:"flex-end" }}>
            <Text style={[{ color:t.text, fontWeight:"800", fontSize:15 }]}>₹{priceRs}</Text>
            <Text style={[{ color:t.textMuted, fontSize:10 }]}>/min</Text>
          </View>
        ) : (
          <View style={{ flexDirection:"row", alignItems:"center", gap:4 }}>
            <View style={[{ width:7, height:7, borderRadius:4, backgroundColor:expert.isOnline?"#ef4444":"#94a3b8" }]} />
            <Text style={[{ color:expert.isOnline?"#ef4444":t.textMuted, fontSize:11, fontWeight:"600" }]}>
              {expert.isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        )}
      </View>

      {/* Action buttons */}
      <View style={ec.actions}>
        {expert.hasApplyBooking && (
          <TouchableOpacity style={[ec.applyBtn, { backgroundColor:expert.color }]} onPress={onApply}>
            <Text style={ec.applyBtnTxt}>✋ Apply for 1:1</Text>
          </TouchableOpacity>
        )}
        {(!expert.hasApplyBooking || expert.hasPayBooking) && (
          <View style={ec.btnRow}>
            <TouchableOpacity
              style={[ec.chatBtn, { borderColor:expert.isOnline?"#ef4444":t.border,
                backgroundColor:expert.isOnline?"rgba(239,68,68,0.08)":"transparent" }]}
              onPress={onChat}>
              <Ionicons name="chatbubble-outline" size={13} color={expert.isOnline?"#ef4444":t.textMuted} />
              <Text style={[ec.chatBtnTxt, { color:expert.isOnline?"#ef4444":t.textMuted }]}>
                {expert.isOnline ? "Chat (Online)" : "Chat Free"}
              </Text>
            </TouchableOpacity>
            {expert.hasPayBooking && priceRs > 0 && (
              <TouchableOpacity style={ec.bookBtn} onPress={onBook}>
                <Ionicons name="calendar-outline" size={13} color="#fff" />
                <Text style={ec.bookBtnTxt}>Book</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const ec = StyleSheet.create({
  card:        { borderRadius:16, padding:16, marginBottom:14, borderWidth:1 },
  topRow:      { flexDirection:"row", gap:12, marginBottom:12 },
  avatarWrap:  { position:"relative", width:64, height:64 },
  avatar:      { width:62, height:62, borderRadius:31, borderWidth:2.5 },
  avatarFallback: { width:62, height:62, borderRadius:31, borderWidth:2.5, alignItems:"center", justifyContent:"center" },
  avatarInitial: { color:"#fff", fontSize:24, fontWeight:"900" },
  onlineDot:   { position:"absolute", bottom:2, right:2, width:13, height:13, borderRadius:7, borderWidth:2, borderColor:"#fff", shadowOffset:{width:0,height:0} },
  name:        { fontWeight:"800", fontSize:14, flex:1 },
  role:        { fontSize:11, marginBottom:4 },
  subjectChip: { alignSelf:"flex-start", borderRadius:20, paddingHorizontal:8, paddingVertical:2, borderWidth:1 },
  subjectTxt:  { fontSize:10, fontWeight:"700" },
  statsRow:    { flexDirection:"row", borderRadius:10, padding:"8px 10px" as any, marginBottom:10, paddingVertical:8, paddingHorizontal:10 },
  statCell:    { flex:1, alignItems:"center" },
  statVal:     { fontSize:10, fontWeight:"600", textAlign:"center" },
  ratingRow:   { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  actions:     { gap:8 },
  applyBtn:    { borderRadius:50, paddingVertical:10, alignItems:"center" },
  applyBtnTxt: { color:"#fff", fontWeight:"700", fontSize:13 },
  btnRow:      { flexDirection:"row", gap:8 },
  chatBtn:     { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, borderWidth:1.5, borderRadius:50, paddingVertical:9 },
  chatBtnTxt:  { fontWeight:"700", fontSize:12 },
  bookBtn:     { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, backgroundColor:"#7c3aed", borderRadius:50, paddingVertical:9 },
  bookBtnTxt:  { color:"#fff", fontWeight:"700", fontSize:12 },
});

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ConsultationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark, t } = useThemeStore();

  const HEADER_H = 120 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [experts, setExperts]       = useState<Expert[]>([]);
  const [loading, setLoading]       = useState(true);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [activeSpec, setActiveSpec] = useState("All");
  const [activeLang, setActiveLang] = useState("All");
  const [applying, setApplying]     = useState<Expert | null>(null);
  const [chatting, setChatting]     = useState<Expert | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.4, duration:700, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1,   duration:700, useNativeDriver:true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    client.get("/chat/online-educators")
      .then(r => {
        const mapped: Expert[] = (r.data.educators || []).map((e: DBTrainer) => ({
          _id:               e._id,
          name:              e.name,
          role:              e.trainerRole || "",
          subject:           e.specialties?.[0] || "",
          color:             e.trainerColor || "#7c3aed",
          localImg:          LOCAL_IMGS[e.name.toLowerCase()] ?? null,
          avatarUrl:         e.avatar || "",
          exp:               e.experience || "",
          sessions:          e.sessionsDisplay || "",
          rating:            e.rating || 0,
          followers:         e.followers || 0,
          languages:         e.trainerLanguages?.length ? e.trainerLanguages : ["English"],
          verified:          e.isVerifiedBadge || false,
          isOnline:          e.isOnline || false,
          sessionPricePaise: e.sessionPricePaise || 0,
          hasPayBooking:     e.hasPayBooking ?? true,
          hasApplyBooking:   e.hasApplyBooking ?? false,
        }));
        setExperts(mapped.sort((a,b) => Number(b.isOnline) - Number(a.isOnline)));
      })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;
    if (y < 60) {
      if (headerHiddenRef.current) {
        headerHiddenRef.current = false;
        Animated.spring(headerTranslateY, { toValue:0, tension:100, friction:12, useNativeDriver:true }).start();
      }
      return;
    }
    if (delta > 4 && !headerHiddenRef.current) {
      headerHiddenRef.current = true;
      Animated.timing(headerTranslateY, { toValue:-HEADER_H, duration:220, useNativeDriver:true }).start();
    } else if (delta < -4 && headerHiddenRef.current) {
      headerHiddenRef.current = false;
      Animated.timing(headerTranslateY, { toValue:0, duration:200, useNativeDriver:true }).start();
    }
  };

  const allSpecs = useMemo(() => {
    const fromExperts = experts.map(e => e.subject).filter(Boolean);
    return ["All", ...Array.from(new Set([...SPECIALTIES.slice(1), ...fromExperts]))];
  }, [experts]);

  const filtered = useMemo(() => {
    return experts.filter(e => {
      if (activeSpec !== "All" && e.subject !== activeSpec) return false;
      if (activeLang !== "All" && !e.languages.includes(activeLang)) return false;
      if (onlineOnly && !e.isOnline) return false;
      return true;
    });
  }, [experts, activeSpec, activeLang, onlineOnly]);

  const onlineCount = experts.filter(e => e.isOnline).length;

  const handleApply = (expert: Expert) => {
    if (!user) {
      Alert.alert("Login Required","Please log in to apply for a session.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    setApplying(expert);
  };

  const handleBook = async (expert: Expert) => {
    if (!user) {
      Alert.alert("Login Required","Please log in to book a session.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    if (blockIOSPurchase()) return;
    if (!RazorpayCheckout) {
      Alert.alert("Payment Not Available","Payments require the full BSH app build (not Expo Go)."); return;
    }
    if (expert.sessionPricePaise <= 0) {
      Alert.alert("Not Available","This expert's booking is not available yet."); return;
    }
    if (bookLoading) return;
    setBookLoading(true);
    try {
      const { data } = await client.post("/payments/create-order", {
        type: "session", expertId: expert._id,
        amount: expert.sessionPricePaise,
      });
      const order = data.order;
      const paymentData = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID, amount: String(order.amount), currency: "INR",
        name: "BSH Healers", description: `Session with ${expert.name} — ₹${Math.round(expert.sessionPricePaise/100)}/min`,
        order_id: order.id, prefill: { name:user.name, email:user.email }, theme: { color:expert.color || "#7c3aed" },
      });
      await client.post("/payments/verify", {
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });
      Alert.alert("Booking Confirmed 🎉", `Your session with ${expert.name} is booked! They will contact you shortly.`);
    } catch (err: unknown) {
      const e = err as { code?:number; description?:string; response?:{data?:{message?:string}}; message?:string };
      if (e?.code === 0) return;
      Alert.alert("Payment Failed", e.response?.data?.message ?? e.description ?? e.message ?? "Payment failed. Please try again.");
    } finally { setBookLoading(false); }
  };

  return (
    <View style={[s.root, { backgroundColor:t.bg }]}>
      {/* ── Floating Header ── */}
      <Animated.View style={[s.header, { paddingTop:insets.top, backgroundColor:t.navBg, transform:[{translateY:headerTranslateY}] }]}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={()=>router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Image source={bshLogoImg} style={s.logo} resizeMode="contain" />
          <View style={{ flex:1 }}>
            <Text style={s.headerTitle}>Consultation</Text>
            <Text style={s.headerSub}>Talk to Expert Healers</Text>
          </View>
          {onlineCount > 0 && (
            <View style={s.onlineBadge}>
              <Animated.View style={[s.onlineDot, { transform:[{scale:pulseAnim}] }]} />
              <Text style={s.onlineTxt}>{onlineCount} Online</Text>
            </View>
          )}
          <TouchableOpacity onPress={() => router.push(user ? "/(tabs)/dashboard" : "/(auth)/login")}>
            {user?.avatar
              ? <Image source={{ uri:user.avatar }} style={s.avatar} />
              : <View style={s.avatarDefault}><Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text></View>
            }
          </TouchableOpacity>
        </View>

        {/* Filter bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={{ paddingHorizontal:16, gap:8, paddingBottom:12 }}>
          {/* Online Only toggle */}
          <TouchableOpacity
            style={[s.filterChip, onlineOnly && { backgroundColor:"rgba(239,68,68,0.15)", borderColor:"rgba(239,68,68,0.5)" }]}
            onPress={()=>setOnlineOnly(v=>!v)}>
            <View style={[s.filterDot, { backgroundColor:onlineOnly?"#ef4444":"#94a3b8" }]} />
            <Text style={[s.filterChipTxt, { color:onlineOnly?"#ef4444":"rgba(255,255,255,0.65)" }]}>Online Only</Text>
          </TouchableOpacity>
          {/* Language filters */}
          {LANGUAGES.map(lang=>(
            <TouchableOpacity key={lang}
              style={[s.filterChip, activeLang===lang && { backgroundColor:"rgba(124,58,237,0.2)", borderColor:"rgba(167,139,250,0.6)" }]}
              onPress={()=>setActiveLang(activeLang===lang ? "All" : lang)}>
              <Text style={[s.filterChipTxt, { color:activeLang===lang?"#a78bfa":"rgba(255,255,255,0.65)" }]}>{lang}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>

      <ScrollView
        style={{ flex:1 }} showsVerticalScrollIndicator={false}
        onScroll={handleScroll} scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop:HEADER_H+8, paddingBottom:100, paddingHorizontal:16 }}>

        {/* Hero */}
        <View style={[s.heroCard, { backgroundColor:isDark?"rgba(124,58,237,0.12)":"rgba(124,58,237,0.06)", borderColor:t.border }]}>
          <Text style={[s.heroTitle, { color:t.text }]}>
            Talk To{"\n"}
            <Text style={s.heroAccent}>Expert Healers</Text>
          </Text>
          <Text style={[s.heroSub, { color:t.textMuted }]}>
            India's finest hypnotherapists, shadow work experts & NLP coaches. Deeply personal. Completely confidential.
          </Text>
          <View style={s.heroTags}>
            {[["⭐","4.9 Rating"],["🔒","Confidential"],["⚡","24hr Response"],["💬","Chat Free"]].map(([ic,lb])=>(
              <View key={lb} style={[s.heroTag, { backgroundColor:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)" }]}>
                <Text style={[s.heroTagTxt, { color:t.textMuted }]}>{ic} {lb}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Specialty tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom:16 }} contentContainerStyle={{ gap:8, paddingVertical:4 }}>
          {allSpecs.map(spec => {
            const active = activeSpec === spec;
            return (
              <TouchableOpacity key={spec} onPress={()=>setActiveSpec(spec)}
                style={[s.specTab, active && { borderColor:"#7c3aed", backgroundColor:"rgba(124,58,237,0.14)" }]}>
                <Text style={[s.specTabTxt, { color:active?"#a78bfa":t.textMuted }]}>
                  {spec}{spec !== "All" && <Text style={{ opacity:0.6 }}> ({experts.filter(e=>e.subject===spec).length})</Text>}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Section heading */}
        <View style={s.secHeadRow}>
          <View>
            <Text style={[s.secHeadTitle, { color:t.text }]}>
              {activeSpec === "All" ? "All Expert Healers" : activeSpec}
            </Text>
            <Text style={[s.secHeadSub, { color:t.textMuted }]}>
              {filtered.length} experts · {filtered.filter(e=>e.isOnline).length} online now
            </Text>
          </View>
          <View style={s.liveCountBadge}>
            <Animated.View style={[s.liveCountDot, { transform:[{scale:pulseAnim}] }]} />
            <Text style={s.liveCountTxt}>{filtered.filter(e=>e.isOnline).length} Live</Text>
          </View>
        </View>

        {/* Expert cards */}
        {loading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator color="#7c3aed" size="large" />
            <Text style={[{ color:t.textMuted, marginTop:12, fontSize:13 }]}>Loading healers…</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={s.emptyBox}>
            <Text style={{ fontSize:40, marginBottom:12 }}>🔍</Text>
            <Text style={[{ color:t.textMuted, fontSize:15 }]}>No experts match your filters.</Text>
          </View>
        ) : (
          filtered.map(expert => (
            <ExpertCard
              key={expert._id}
              expert={expert}
              t={t}
              isDark={isDark}
              onApply={() => handleApply(expert)}
              onChat={() => setChatting(expert)}
              onBook={() => handleBook(expert)}
            />
          ))
        )}

        {/* Bottom CTA */}
        {!loading && filtered.length > 0 && (
          <View style={[s.ctaCard, { backgroundColor:isDark?"rgba(124,58,237,0.1)":"rgba(124,58,237,0.06)", borderColor:t.border }]}>
            <Text style={{ fontSize:32, marginBottom:8, textAlign:"center" }}>🙏</Text>
            <Text style={[s.ctaTitle, { color:t.text }]}>Not sure which expert is right?</Text>
            <Text style={[s.ctaSub, { color:t.textMuted }]}>Chat free and we'll match you with the perfect healer.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => { if (experts.length > 0) setChatting(experts[0]); }}>
              <Text style={s.ctaBtnTxt}>✨ Get Matched For Free</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {applying && (
        <ApplyModal expert={applying} t={t} user={user} onClose={() => setApplying(null)} />
      )}
      {chatting && (
        <ChatModal expert={chatting} t={t} user={user} onClose={() => setChatting(null)} />
      )}
    </View>
  );
}

// ── Shared styles for tag/chip helpers ───────────────────────────────────────
const cm = StyleSheet.create({
  secLabel: { fontSize:12, fontWeight:"700", textTransform:"uppercase", letterSpacing:0.8, marginBottom:8, marginTop:4 },
  tagWrap:  { flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:14 },
  tag:      { borderWidth:1, borderRadius:20, paddingHorizontal:10, paddingVertical:5 },
  tagTxt:   { fontSize:12, fontWeight:"600" },
});

const s = StyleSheet.create({
  root: { flex:1 },
  header: {
    position:"absolute", top:0, left:0, right:0, zIndex:100,
    elevation:10, shadowColor:"#000", shadowOpacity:0.3, shadowRadius:12, shadowOffset:{width:0,height:5},
    paddingHorizontal:16, paddingBottom:0,
  },
  headerRow: { flexDirection:"row", alignItems:"center", gap:10, paddingTop:10, marginBottom:10 },
  backBtn: { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.15)", alignItems:"center", justifyContent:"center" },
  logo: { width:34, height:34, borderRadius:8 },
  headerTitle: { color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub: { color:"rgba(255,255,255,0.65)", fontSize:11 },
  onlineBadge: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(239,68,68,0.18)", borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:"rgba(239,68,68,0.4)" },
  onlineDot: { width:7, height:7, borderRadius:4, backgroundColor:"#ef4444" },
  onlineTxt: { color:"#f87171", fontSize:10, fontWeight:"800" },
  avatar: { width:34, height:34, borderRadius:17, borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarDefault: { width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center", borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarInitial: { color:"#fff", fontWeight:"800", fontSize:14 },

  filterScroll: { borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.12)", paddingTop:10 },
  filterChip: { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
  filterDot: { width:7, height:7, borderRadius:4 },
  filterChipTxt: { fontSize:12, fontWeight:"600" },

  heroCard: { borderRadius:18, padding:20, marginBottom:20, borderWidth:1 },
  heroTitle: { fontSize:26, fontWeight:"900", lineHeight:32, marginBottom:8 },
  heroAccent: { color:"#7c3aed" },
  heroSub: { fontSize:13, lineHeight:20, marginBottom:14 },
  heroTags: { flexDirection:"row", flexWrap:"wrap", gap:8 },
  heroTag: { borderRadius:20, paddingHorizontal:10, paddingVertical:5 },
  heroTagTxt: { fontSize:11, fontWeight:"600" },

  specTab: { borderRadius:50, paddingHorizontal:14, paddingVertical:6, borderWidth:1.5, borderColor:"rgba(100,100,100,0.3)" },
  specTabTxt: { fontSize:12, fontWeight:"600" },

  secHeadRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:16 },
  secHeadTitle: { fontSize:17, fontWeight:"800" },
  secHeadSub: { fontSize:12, marginTop:2 },
  liveCountBadge: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(239,68,68,0.1)", borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:"rgba(239,68,68,0.3)" },
  liveCountDot: { width:6, height:6, borderRadius:3, backgroundColor:"#ef4444" },
  liveCountTxt: { color:"#ef4444", fontSize:10, fontWeight:"700" },

  loadingBox: { alignItems:"center", paddingVertical:48 },
  emptyBox: { alignItems:"center", paddingVertical:48 },

  ctaCard: { borderRadius:18, padding:24, marginTop:8, alignItems:"center", borderWidth:1 },
  ctaTitle: { fontSize:17, fontWeight:"800", marginBottom:8, textAlign:"center" },
  ctaSub: { fontSize:13, textAlign:"center", lineHeight:20, marginBottom:20 },
  ctaBtn: { backgroundColor:"#7c3aed", borderRadius:50, paddingHorizontal:28, paddingVertical:13 },
  ctaBtnTxt: { color:"#fff", fontWeight:"800", fontSize:14 },
});
