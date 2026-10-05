import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Animated, Alert, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent, Switch,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, User } from "../../stores/authStore";
import { useThemeStore, ThemeColors } from "../../stores/themeStore";
import { showTabBar, hideTabBar } from "../../stores/tabBarStore";
import client from "../../api/client";

const bshLogoImg = require("../../assets/BSH-logo-02.png");
const slide1Img  = require("../../assets/slide-1.png");
const geetaImg   = require("../../assets/geeta-makhijani.png");
const slide4Img  = require("../../assets/slide-4.png");

// ── Predefined consultation categories (mirrors server) ───────────────────────
const CONSULTATION_CATEGORIES = [
  { slug: "stress-anxiety",       name: "Stress & Anxiety",                  emoji: "🧠" },
  { slug: "depression-low-mood",  name: "Depression & Low Mood",             emoji: "🌧️" },
  { slug: "relationship-healing", name: "Relationship Healing",              emoji: "❤️" },
  { slug: "self-love-confidence", name: "Self-Love & Confidence",            emoji: "🌟" },
  { slug: "career-growth",        name: "Career & Career Growth",            emoji: "📈" },
  { slug: "money-abundance",      name: "Money & Abundance",                 emoji: "💰" },
  { slug: "emotional-healing",    name: "Emotional Healing",                 emoji: "🌿" },
  { slug: "anger-management",     name: "Anger Management",                  emoji: "🔥" },
  { slug: "fear-phobias",         name: "Fear & Phobias",                    emoji: "🛡️" },
  { slug: "sleep-relaxation",     name: "Sleep & Relaxation",                emoji: "🌙" },
  { slug: "focus-productivity",   name: "Focus & Productivity",              emoji: "🎯" },
  { slug: "procrastination",      name: "Procrastination",                   emoji: "⏳" },
  { slug: "grief-loss",           name: "Grief & Loss",                      emoji: "🌸" },
  { slug: "trauma-healing",       name: "Trauma Healing",                    emoji: "🩹" },
  { slug: "child-teen-support",   name: "Child & Teen Support",              emoji: "👧" },
  { slug: "family-parenting",     name: "Family & Parenting",                emoji: "👨‍👩‍👧" },
  { slug: "health-wellness",      name: "Health & Wellness",                 emoji: "💪" },
  { slug: "habit-addiction",      name: "Habit Change & Addiction Support",  emoji: "🚭" },
  { slug: "nlp-coaching",         name: "NLP Coaching",                      emoji: "🧬" },
  { slug: "spiritual-healing",    name: "Spiritual Healing",                 emoji: "🔮" },
  { slug: "past-life-regression", name: "Past Life Regression",              emoji: "☯️" },
  { slug: "energy-chakras",       name: "Energy Healing & Chakras",          emoji: "🧘" },
  { slug: "tarot-guidance",       name: "Tarot & Intuitive Guidance",        emoji: "🃏" },
  { slug: "vastu-healing",        name: "Home & Space Healing (Vastu)",      emoji: "🏠" },
  { slug: "womens-wellness",      name: "Women's Wellness & Womb Healing",   emoji: "♀️" },
  { slug: "mens-wellness",        name: "Men's Wellness & Performance",      emoji: "♂️" },
  { slug: "life-purpose",         name: "Life Purpose & Inner Growth",       emoji: "🌱" },
];

const LANGUAGES = ["English", "Hindi", "Telugu"];

interface Category { slug: string; name: string; emoji: string; expertCount: number; }

interface DBTrainer {
  _id: string; name: string; avatar: string; isOnline: boolean;
  trainerRole: string; trainerColor: string; specialties: string[];
  consultationCategories: string[];
  experience: string; sessionsDisplay: string; rating: number;
  followers: number; trainerLanguages: string[]; isVerifiedBadge: boolean;
  sessionPricePaise: number; sessionRazorpayLink: string;
  canOfferSessions: boolean; hasPayBooking: boolean; hasApplyBooking: boolean;
}
interface Expert {
  _id: string; name: string; role: string; subject: string;
  consultationCategories: string[];
  color: string; localImg: number | null; avatarUrl: string;
  exp: string; sessions: string; rating: number; followers: number;
  languages: string[]; verified: boolean; isOnline: boolean;
  sessionPricePaise: number; hasPayBooking: boolean; hasApplyBooking: boolean;
}

const LOCAL_IMGS: Record<string, number> = {
  "dr. pradeep kumar": slide1Img,
  "geeta makhijani":   geetaImg,
  "bsh faculty":       slide4Img,
};

interface ChatMsg { _id: string; sender: { _id: string; name: string; role: string }; text: string; createdAt: string; }

// ── Apply 1:1 Modal ───────────────────────────────────────────────────────────
const ApplyModal: React.FC<{
  expert: Expert; t: ThemeColors;
  user: User | null; onClose: ()=>void;
}> = ({ expert, t, user, onClose }) => {
  const [name, setName]   = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [issue, setIssue] = useState("");
  const [pref, setPref]   = useState("");
  const [msg, setMsg]     = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState(false);
  const [err, setErr]     = useState("");

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
          <View style={[am.header, { backgroundColor: expert.color + "cc" }]}>
            {expert.avatarUrl
              ? <Image source={{ uri: expert.avatarUrl }} style={am.headerImg} contentFit="cover" cachePolicy="disk" />
              : expert.localImg
                ? <Image source={expert.localImg} style={am.headerImg} contentFit="cover" />
                : <View style={[am.headerImgFallback, { backgroundColor: expert.color }]}>
                    <Text style={am.headerInitial}>{expert.name[0]}</Text>
                  </View>}
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
                  style={[am.submitBtn, { backgroundColor:(!name.trim()||!phone.trim()||!issue.trim()) ? t.textMuted : expert.color }]}
                  onPress={submit} disabled={loading||!name.trim()||!phone.trim()||!issue.trim()}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={am.submitBtnTxt}>✋ Submit Application</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Live Chat Modal ────────────────────────────────────────────────────────────
const LiveChatModal: React.FC<{
  expert: Expert; t: ThemeColors;
  user: User | null; onClose: ()=>void;
}> = ({ expert, t, user, onClose }) => {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText]         = useState("");
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const { data } = await client.get(`/chat/messages/${expert._id}`);
      setMessages(data.messages ?? []);
    } catch {} finally { setLoading(false); }
  }, [expert._id]);

  useEffect(() => {
    if (!user) return;
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages, user]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const { data } = await client.post(`/chat/messages/${expert._id}`, { text: text.trim() });
      setMessages(prev => [...prev, data.message]);
      setText("");
    } catch {} finally { setSending(false); }
  };

  if (!user) {
    return (
      <Modal visible animationType="slide" transparent onRequestClose={onClose}>
        <View style={am.backdrop}>
          <View style={[am.sheet, { backgroundColor: t.card, paddingBottom:36 }]}>
            <View style={lc.loginBox}>
              <Text style={{ fontSize:36, marginBottom:10 }}>💬</Text>
              <Text style={[lc.loginTitle, { color:t.text }]}>Login to Chat</Text>
              <Text style={[lc.loginSub, { color:t.textMuted }]}>Sign in to chat with {expert.name}</Text>
              <TouchableOpacity style={[am.submitBtn, { backgroundColor:"#0c2461", marginTop:18, paddingHorizontal:32 }]}
                onPress={() => { onClose(); router.push("/(auth)/login"); }}>
                <Text style={am.submitBtnTxt}>Log In</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}><Text style={{ color:t.textMuted, marginTop:4 }}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={am.backdrop}>
        <View style={[lc.sheet, { backgroundColor: t.card }]}>
          <View style={lc.header}>
            <View style={lc.headerAvatar}><Text style={lc.headerAvatarTxt}>{expert.name[0]}</Text></View>
            <View style={{ flex:1 }}>
              <Text style={lc.headerName}>{expert.name}</Text>
              <View style={{ flexDirection:"row", alignItems:"center", gap:5, marginTop:2 }}>
                <View style={{ width:7, height:7, borderRadius:4, backgroundColor:expert.isOnline?"#22c55e":"#9ca3af" }} />
                <Text style={lc.headerStatus}>{expert.isOnline ? "Online" : "Offline · Will reply when back"}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={am.closeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} style={[lc.body, { backgroundColor:t.bg }]}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated:true })}>
            {loading && <Text style={{ textAlign:"center", color:t.textMuted, marginTop:32 }}>Loading...</Text>}
            {!loading && messages.length === 0 && (
              <View style={{ alignItems:"center", marginTop:40 }}>
                <Text style={{ fontSize:32, marginBottom:8 }}>👋</Text>
                <Text style={{ fontWeight:"700", color:t.text }}>Start a conversation</Text>
                <Text style={{ color:t.textMuted, fontSize:12, marginTop:4 }}>
                  {expert.isOnline ? "They're online and ready to help!" : "They're offline but will reply soon."}
                </Text>
              </View>
            )}
            {messages.map(m => {
              const isMe = m.sender?._id === user._id;
              return (
                <View key={m._id} style={{ flexDirection:"row", justifyContent:isMe?"flex-end":"flex-start", marginBottom:8 }}>
                  <View style={[lc.bubble, isMe ? lc.bubbleMe : lc.bubbleThem]}>
                    <Text style={{ color:isMe?"#fff":t.text, fontSize:13, lineHeight:18 }}>{m.text}</Text>
                    <Text style={{ color:isMe?"rgba(255,255,255,0.65)":t.textMuted, fontSize:10, marginTop:3, textAlign:"right" }}>
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={[lc.inputRow, { borderTopColor:t.border }]}>
            <TextInput value={text} onChangeText={setText} placeholder="Type a message…"
              placeholderTextColor={t.textMuted} style={[lc.input, { color:t.text, backgroundColor:t.surface }]} />
            <TouchableOpacity onPress={send} disabled={sending || !text.trim()}
              style={[lc.sendBtn, { backgroundColor:text.trim() ? "#0c2461" : t.border }]}>
              <Ionicons name="send" size={15} color={text.trim() ? "#fff" : t.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Filter Modal ──────────────────────────────────────────────────────────────
const FilterModal: React.FC<{
  visible: boolean; onClose: () => void;
  experts: Expert[];
  filterLangs: string[];
  onlineOnly: boolean;
  onToggleLang: (l: string) => void;
  onToggleOnline: () => void;
  onReset: () => void;
}> = ({ visible, onClose, experts, filterLangs, onlineOnly, onToggleLang, onToggleOnline, onReset }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <TouchableOpacity style={fm.backdrop} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity style={fm.sheet} activeOpacity={1} onPress={() => {}}>
        <View style={fm.handle} />
        <View style={fm.header}>
          <Text style={fm.title}>Filters</Text>
          <TouchableOpacity style={fm.resetBtn} onPress={onReset}>
            <Text style={fm.resetTxt}>Reset All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={fm.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={fm.body}>
          <View style={fm.section}>
            <View style={fm.onlineRow}>
              <Text style={fm.sectionTitle}>Online Only</Text>
              <Switch value={onlineOnly} onValueChange={onToggleOnline}
                trackColor={{ false:"#374151", true:"#ef4444" }} thumbColor="#fff" />
            </View>
          </View>
          <View style={fm.section}>
            <Text style={fm.sectionTitle}>Language</Text>
            {LANGUAGES.map(lang => {
              const count = experts.filter(e => e.languages.includes(lang)).length;
              const sel = filterLangs.includes(lang);
              return (
                <TouchableOpacity key={lang} style={fm.checkRow} onPress={() => onToggleLang(lang)}>
                  <View style={[fm.checkbox, sel && fm.checkboxSel]}>
                    {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
                  </View>
                  <Text style={[fm.checkLabel, sel && { color:"#93c5fd" }]}>{lang}</Text>
                  <Text style={fm.checkCount}>{count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

// ── Category Grid Item ────────────────────────────────────────────────────────
const CategoryItem: React.FC<{
  cat: Category; isSelected: boolean; isDark: boolean;
  onPress: () => void;
}> = React.memo(({ cat, isSelected, isDark, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[
      cg.cell,
      { backgroundColor: isDark ? (isSelected ? "rgba(12,36,97,0.45)" : "rgba(255,255,255,0.05)") : (isSelected ? "rgba(12,36,97,0.10)" : "#fff") },
      isSelected && { borderColor: "#3b82f6", borderWidth: 1.5 },
      !isSelected && { borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)", borderWidth: 1 },
    ]}>
    <Text style={cg.emoji}>{cat.emoji}</Text>
    <Text style={[cg.name, { color: isSelected ? "#3b82f6" : isDark ? "#e2e8f0" : "#1e293b" }]} numberOfLines={2}>{cat.name}</Text>
    <Text style={[cg.count, { color: isSelected ? "#60a5fa" : isDark ? "#64748b" : "#94a3b8" }]}>
      {cat.expertCount > 0 ? `${cat.expertCount} Expert${cat.expertCount !== 1 ? "s" : ""}` : "Experts"}
    </Text>
    <View style={[cg.arrow, { backgroundColor: isSelected ? "#3b82f6" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }]}>
      <Ionicons name="chevron-forward" size={10} color={isSelected ? "#fff" : isDark ? "#94a3b8" : "#64748b"} />
    </View>
  </TouchableOpacity>
));

// ── Expert Card ───────────────────────────────────────────────────────────────
const ExpertCard: React.FC<{
  expert: Expert; t: ThemeColors; isDark: boolean;
  onApply: (e: Expert)=>void; onChat: (e: Expert)=>void; onBook: (e: Expert)=>void;
}> = React.memo(({ expert, t, isDark, onApply, onChat, onBook }) => {
  const stars = Math.round(expert.rating);
  const priceRs = expert.sessionPricePaise > 0 ? Math.round(expert.sessionPricePaise / 100) : 0;

  return (
    <View style={[ec.card, { backgroundColor:t.card, borderColor:t.border }]}>
      <View style={ec.topRow}>
        <View style={ec.avatarWrap}>
          {expert.avatarUrl
            ? <Image source={{ uri:expert.avatarUrl }} style={[ec.avatar, { borderColor:"#0c2461" }]} contentFit="cover" cachePolicy="disk" />
            : expert.localImg
              ? <Image source={expert.localImg} style={[ec.avatar, { borderColor:"#0c2461" }]} contentFit="cover" />
              : <View style={[ec.avatarFallback, { backgroundColor:"#0c2461" }]}>
                  <Text style={ec.avatarInitial}>{expert.name[0]}</Text>
                </View>}
          <View style={[ec.onlineDot, {
            backgroundColor: expert.isOnline ? "#22c55e" : "#94a3b8",
            shadowColor: expert.isOnline ? "#22c55e" : "transparent",
            shadowOpacity: 0.8, shadowRadius: 4,
          }]} />
        </View>
        <View style={{ flex:1, minWidth:0 }}>
          <View style={{ flexDirection:"row", alignItems:"center", gap:4, marginBottom:2 }}>
            <Text style={[ec.name, { color:t.text }]} numberOfLines={1}>{expert.name}</Text>
            {expert.verified && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
          </View>
          <Text style={[ec.role, { color:t.textMuted }]} numberOfLines={1}>{expert.role}</Text>
          {!!expert.subject && (
            <View style={[ec.subjectChip, { backgroundColor:"rgba(12,36,97,0.12)", borderColor:"rgba(12,36,97,0.35)" }]}>
              <Text style={[ec.subjectTxt, { color:"#0c2461" }]}>{expert.subject}</Text>
            </View>
          )}
        </View>
        <View style={[ec.onlineStatus, { backgroundColor: expert.isOnline ? "rgba(34,197,94,0.1)" : "rgba(148,163,184,0.1)", borderColor: expert.isOnline ? "rgba(34,197,94,0.3)" : "rgba(148,163,184,0.3)" }]}>
          <View style={[ec.onlineStatusDot, { backgroundColor: expert.isOnline ? "#22c55e" : "#94a3b8" }]} />
          <Text style={[ec.onlineStatusTxt, { color: expert.isOnline ? "#22c55e" : "#94a3b8" }]}>
            {expert.isOnline ? "Online" : "Offline"}
          </Text>
        </View>
      </View>

      {/* Badge row */}
      <View style={ec.badgeRow}>
        {expert.rating > 0 && (
          <View style={ec.badge}>
            <Text style={ec.badgeTxt}>⭐ {expert.rating}</Text>
          </View>
        )}
        <View style={ec.badge}><Text style={ec.badgeTxt}>🔒 Confidential</Text></View>
        <View style={ec.badge}><Text style={ec.badgeTxt}>⚡ 24hr Response</Text></View>
        <View style={ec.badge}><Text style={ec.badgeTxt}>💬 Chat Free</Text></View>
      </View>

      <View style={[ec.statsRow, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>⏱ {expert.exp||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>👥 {expert.sessions||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>🌐 {expert.languages.slice(0,2).join(", ")||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>❤ {expert.followers>0?(expert.followers/1000).toFixed(1)+"k":"—"}</Text></View>
      </View>

      {expert.hasPayBooking && priceRs > 0 && (
        <View style={ec.priceRow}>
          <Text style={[ec.priceAmt, { color:t.text }]}>₹{priceRs}</Text>
          <Text style={[ec.priceUnit, { color:t.textMuted }]}>/min</Text>
        </View>
      )}

      <View style={ec.actions}>
        {expert.hasApplyBooking && (
          <TouchableOpacity style={[ec.applyBtn, { backgroundColor:"#0c2461" }]} onPress={() => onApply(expert)}>
            <Text style={ec.applyBtnTxt}>✋ Apply for 1:1</Text>
          </TouchableOpacity>
        )}
        <View style={ec.btnRow}>
          <TouchableOpacity
            style={[ec.chatBtn, {
              borderColor: expert.isOnline ? "#22c55e" : t.border,
              backgroundColor: expert.isOnline ? "rgba(34,197,94,0.08)" : "transparent",
            }]}
            onPress={() => onChat(expert)}>
            <Ionicons name="chatbubble-outline" size={13} color={expert.isOnline ? "#22c55e" : t.textMuted} />
            <Text style={[ec.chatBtnTxt, { color:expert.isOnline?"#22c55e":t.textMuted }]}>
              {expert.isOnline ? "Chat (Online)" : "Chat Free"}
            </Text>
          </TouchableOpacity>
          {expert.hasPayBooking && priceRs > 0 && (
            <TouchableOpacity style={ec.bookBtn} onPress={() => onBook(expert)}>
              <Ionicons name="calendar-outline" size={13} color="#fff" />
              <Text style={ec.bookBtnTxt}>Book</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ConsultationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark, t } = useThemeStore();

  const HEADER_H = 168 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [experts, setExperts]         = useState<Expert[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [loadError, setLoadError]     = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [onlineOnly, setOnlineOnly]   = useState(false);
  const [filterLangs, setFilterLangs] = useState<string[]>([]);
  const [showFilter, setShowFilter]   = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [applying, setApplying]       = useState<Expert | null>(null);
  const [chatting, setChatting]       = useState<Expert | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const filteredLengthRef = useRef(0);
  const categoryGridHeightRef = useRef(0);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.4, duration:700, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1,   duration:700, useNativeDriver:true }),
      ])
    ).start();
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const r = await client.get("/consultation/categories");
      setCategories(r.data.categories || []);
    } catch {
      // Fall back to static list with zero counts
      setCategories(CONSULTATION_CATEGORIES.map(c => ({ ...c, expertCount: 0 })));
    }
  }, []);

  const loadExperts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(false);
    try {
      const r = await client.get("/consultation/healers");
      const mapped: Expert[] = (r.data.educators || []).map((e: DBTrainer) => ({
        _id:                   e._id,
        name:                  e.name,
        role:                  e.trainerRole || "",
        subject:               e.specialties?.[0] || "",
        consultationCategories: e.consultationCategories || [],
        color:                 e.trainerColor || "#0c2461",
        localImg:              LOCAL_IMGS[e.name.toLowerCase()] ?? null,
        avatarUrl:             e.avatar || "",
        exp:                   e.experience || "",
        sessions:              e.sessionsDisplay || "",
        rating:                e.rating || 0,
        followers:             e.followers || 0,
        languages:             e.trainerLanguages?.length ? e.trainerLanguages : ["English"],
        verified:              e.isVerifiedBadge || false,
        isOnline:              e.isOnline || false,
        sessionPricePaise:     e.sessionPricePaise || 0,
        hasPayBooking:         e.hasPayBooking ?? true,
        hasApplyBooking:       e.hasApplyBooking ?? false,
      }));
      setExperts(mapped.sort((a,b) => Number(b.isOnline) - Number(a.isOnline)));
    } catch {
      setLoadError(true);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadExperts();
    loadCategories();
  }, [loadExperts, loadCategories]);

  // Auto-refresh online status every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => loadExperts(), 60000);
    return () => clearInterval(interval);
  }, [loadExperts]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;
    if (y < 60) {
      if (headerHiddenRef.current) {
        headerHiddenRef.current = false;
        showTabBar();
        Animated.spring(headerTranslateY, { toValue:0, tension:100, friction:12, useNativeDriver:true }).start();
      }
      return;
    }
    if (delta > 4 && !headerHiddenRef.current) {
      headerHiddenRef.current = true;
      hideTabBar();
      Animated.timing(headerTranslateY, { toValue:-HEADER_H, duration:220, useNativeDriver:true }).start();
    } else if (delta < -4 && headerHiddenRef.current) {
      headerHiddenRef.current = false;
      showTabBar();
      Animated.timing(headerTranslateY, { toValue:0, duration:200, useNativeDriver:true }).start();
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return experts.filter(e => {
      if (q && !e.name.toLowerCase().includes(q) && !e.role.toLowerCase().includes(q) && !e.subject.toLowerCase().includes(q)) return false;
      if (filterLangs.length > 0 && !e.languages.some(l => filterLangs.includes(l))) return false;
      if (onlineOnly && !e.isOnline) return false;
      if (selectedCategory) {
        const cat = CONSULTATION_CATEGORIES.find(c => c.slug === selectedCategory);
        if (cat && !e.consultationCategories.includes(cat.name)) return false;
      }
      return true;
    });
  }, [experts, searchQuery, filterLangs, onlineOnly, selectedCategory]);

  useEffect(() => { filteredLengthRef.current = filtered.length; }, [filtered]);

  const onlineCount = experts.filter(e => e.isOnline).length;
  const filterCount = filterLangs.length + (onlineOnly ? 1 : 0);

  // Displayed categories: use live counts from API, fallback to static
  const displayCategories = useMemo(() => {
    if (categories.length > 0) return categories;
    return CONSULTATION_CATEGORIES.map(c => ({ ...c, expertCount: 0 }));
  }, [categories]);

  const handleApply = useCallback((expert: Expert) => {
    if (!user) {
      Alert.alert("Login Required","Please log in to apply for a session.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    setApplying(expert);
  }, [user]);

  const handleChat = useCallback((expert: Expert) => {
    setChatting(expert);
  }, []);

  const handleBook = useCallback((expert: Expert) => {
    if (!user) {
      Alert.alert("Login Required","Please log in to book a session.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    if (expert.sessionPricePaise <= 0) {
      Alert.alert("Not Available","This expert's booking is not available yet."); return;
    }
    router.push({
      pathname: "/book-session" as any,
      params: {
        expertId: expert._id, expertName: expert.name,
        expertColor: expert.color, sessionPricePaise: String(expert.sessionPricePaise),
      },
    });
  }, [user]);

  const handleCategoryPress = useCallback((slug: string) => {
    const next = selectedCategory === slug ? null : slug;
    setSelectedCategory(next);
    if (next !== null) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: categoryGridHeightRef.current,
          animated: true,
        });
      }, 150);
    }
  }, [selectedCategory]);

  const renderItem = useCallback(({ item }: { item: Expert }) => (
    <ExpertCard key={item._id} expert={item} t={t} isDark={isDark}
      onApply={handleApply} onChat={handleChat} onBook={handleBook} />
  ), [t, isDark, handleApply, handleChat, handleBook]);

  const selectedCategoryData = useMemo(() =>
    selectedCategory ? CONSULTATION_CATEGORIES.find(c => c.slug === selectedCategory) : null,
  [selectedCategory]);

  const listHeader = useMemo(() => (
    <>
      {/* ── Explore Healing Support ── */}
      <View style={s.exploreSec} onLayout={e => { categoryGridHeightRef.current = e.nativeEvent.layout.height; }}>
        <View style={s.exploreHeader}>
          <View>
            <Text style={[s.exploreTitle, { color: t.text }]}>
              <Text>Explore </Text>
              <Text style={s.exploreTitleAccent}>Healing Support</Text>
            </Text>
            <Text style={[s.exploreSub, { color: t.textMuted }]}>
              Choose a category and connect with expert healers.
            </Text>
          </View>
          {selectedCategory && (
            <TouchableOpacity onPress={() => setSelectedCategory(null)} style={s.viewAllBtn}>
              <Text style={s.viewAllTxt}>View All</Text>
              <Ionicons name="chevron-forward" size={12} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>

        {/* 3-column category grid */}
        <View style={s.categoryGrid}>
          {displayCategories.map(cat => (
            <CategoryItem
              key={cat.slug}
              cat={cat}
              isSelected={selectedCategory === cat.slug}
              isDark={isDark}
              onPress={() => handleCategoryPress(cat.slug)}
            />
          ))}
        </View>
      </View>

      {/* ── All Expert Healers heading ── */}
      <View style={[s.secHeadRow, { marginTop: 8 }]}>
        <View>
          <Text style={[s.secHeadTitle, { color: t.text }]}>
            {selectedCategoryData
              ? `${selectedCategoryData.emoji} ${selectedCategoryData.name}`
              : "All Expert Healers"}
          </Text>
          <Text style={[s.secHeadSub, { color: t.textMuted }]}>
            {filtered.length} expert{filtered.length !== 1 ? "s" : ""} · {filtered.filter(e=>e.isOnline).length} online now
          </Text>
        </View>
        <View style={s.liveCountBadge}>
          <Animated.View style={[s.liveCountDot, { transform:[{scale:pulseAnim}] }]} />
          <Text style={s.liveCountTxt}>{filtered.filter(e=>e.isOnline).length} Live</Text>
        </View>
      </View>

      {loading && (
        <View style={s.loadingBox}>
          <ActivityIndicator color="#0c2461" size="large" />
          <Text style={[{ color:t.textMuted, marginTop:12, fontSize:13 }]}>Loading healers…</Text>
        </View>
      )}
      {!loading && loadError && (
        <View style={s.emptyBox}>
          <Text style={{ fontSize:40, marginBottom:12 }}>⚠️</Text>
          <Text style={[{ color:t.textMuted, fontSize:15, textAlign:"center", marginBottom:16 }]}>
            Could not load healers. Check your connection.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor:"#0c2461", borderRadius:50, paddingHorizontal:24, paddingVertical:10 }}
            onPress={() => loadExperts()}>
            <Text style={{ color:"#fff", fontWeight:"700", fontSize:14 }}>Tap to Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && !loadError && filtered.length === 0 && (
        <View style={s.emptyBox}>
          <Text style={{ fontSize:40, marginBottom:12 }}>🔍</Text>
          <Text style={[{ color:t.textMuted, fontSize:15, textAlign:"center" }]}>
            {searchQuery.trim()
              ? `No experts found for "${searchQuery.trim()}"`
              : selectedCategory
                ? "No experts assigned to this category yet."
                : "No experts match your filters."}
          </Text>
          {selectedCategory && (
            <TouchableOpacity onPress={() => setSelectedCategory(null)} style={{ marginTop:12 }}>
              <Text style={{ color:"#3b82f6", fontWeight:"700" }}>Show All Healers</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  ), [isDark, t, displayCategories, selectedCategory, selectedCategoryData, filtered, loading, loadError, pulseAnim, searchQuery, handleCategoryPress, loadExperts]);

  const listFooter = useMemo(() => !loading && filtered.length > 0 ? (
    <View style={[s.ctaCard, { backgroundColor:isDark?"rgba(12,36,97,0.10)":"rgba(12,36,97,0.06)", borderColor:t.border }]}>
      <Text style={{ fontSize:32, marginBottom:8, textAlign:"center" }}>🙏</Text>
      <Text style={[s.ctaTitle, { color:t.text }]}>Not sure which expert is right?</Text>
      <Text style={[s.ctaSub, { color:t.textMuted }]}>Chat free and we'll match you with the perfect healer.</Text>
      <TouchableOpacity style={s.ctaBtn} onPress={() => { if (experts.length > 0) handleApply(experts[0]); }}>
        <Text style={s.ctaBtnTxt}>✨ Get Matched For Free</Text>
      </TouchableOpacity>
    </View>
  ) : null, [isDark, t, loading, filtered.length, experts, handleApply]);

  return (
    <View style={[s.root, { backgroundColor:t.bg }]}>
      {/* ── Floating Header ── */}
      <Animated.View style={[s.header, { paddingTop:insets.top, backgroundColor:t.navBg, transform:[{translateY:headerTranslateY}] }]}>
        <View style={s.headerRow}>
          <Image source={bshLogoImg} style={s.logo} contentFit="contain" />
          <View style={{ flex:1 }}>
            <Text style={s.headerTitle}>BSH Consultation</Text>
            <Text style={s.headerSub}>Talk to Expert Healers</Text>
          </View>
          {onlineCount > 0 && (
            <View style={s.onlineBadge}>
              <Animated.View style={[s.onlineDot, { transform:[{scale:pulseAnim}] }]} />
              <Text style={s.onlineTxt}>{onlineCount} Online</Text>
            </View>
          )}
          <TouchableOpacity
            style={[s.filterBtn, filterCount > 0 && s.filterBtnActive]}
            onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={18} color={filterCount > 0 ? "#93c5fd" : "rgba(255,255,255,0.7)"} />
            {filterCount > 0 && <Text style={s.filterBtnCount}>{filterCount}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(user ? "/(tabs)/dashboard" : "/(auth)/login")}>
            {user?.avatar
              ? <Image source={{ uri:user.avatar }} style={s.avatar} contentFit="cover" cachePolicy="memory-disk" />
              : <View style={s.avatarDefault}><Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={s.searchBar}>
          <Ionicons name="search-outline" size={15} color="rgba(255,255,255,0.45)" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search healers by name, specialty or concern…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            style={s.searchInput}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.45)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.filterScroll} contentContainerStyle={{ paddingHorizontal:16, gap:8, paddingBottom:12 }}>
          <TouchableOpacity
            style={[s.filterChip, onlineOnly && { backgroundColor:"rgba(34,197,94,0.15)", borderColor:"rgba(34,197,94,0.5)" }]}
            onPress={() => setOnlineOnly(v=>!v)}>
            <View style={[s.filterDot, { backgroundColor:onlineOnly?"#22c55e":"#94a3b8" }]} />
            <Text style={[s.filterChipTxt, { color:onlineOnly?"#22c55e":"rgba(255,255,255,0.65)" }]}>Online Only</Text>
          </TouchableOpacity>
          {LANGUAGES.map(lang => {
            const active = filterLangs.includes(lang);
            return (
              <TouchableOpacity key={lang}
                style={[s.filterChip, active && { backgroundColor:"rgba(59,130,246,0.15)", borderColor:"rgba(59,130,246,0.55)" }]}
                onPress={() => setFilterLangs(prev => active ? prev.filter(l => l !== lang) : [...prev, lang])}>
                <Text style={[s.filterChipTxt, { color:active?"#93c5fd":"rgba(255,255,255,0.65)" }]}>{lang}</Text>
              </TouchableOpacity>
            );
          })}
          {selectedCategory && (
            <TouchableOpacity
              style={[s.filterChip, { backgroundColor:"rgba(59,130,246,0.2)", borderColor:"rgba(59,130,246,0.6)" }]}
              onPress={() => setSelectedCategory(null)}>
              <Ionicons name="close" size={11} color="#93c5fd" />
              <Text style={[s.filterChipTxt, { color:"#93c5fd" }]}>
                {CONSULTATION_CATEGORIES.find(c=>c.slug===selectedCategory)?.name ?? "Category"}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </Animated.View>

      <FlatList
        ref={flatListRef}
        data={filtered}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop:HEADER_H+8, paddingBottom:130, paddingHorizontal:16 }}
        windowSize={5}
        maxToRenderPerBatch={4}
        initialNumToRender={4}
        removeClippedSubviews
        refreshing={refreshing}
        onRefresh={() => { loadExperts(true); loadCategories(); }}
        onScrollToIndexFailed={() => {}}
      />

      {applying && <ApplyModal expert={applying} t={t} user={user} onClose={() => setApplying(null)} />}
      {chatting && <LiveChatModal expert={chatting} t={t} user={user} onClose={() => setChatting(null)} />}
      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        experts={experts}
        filterLangs={filterLangs}
        onlineOnly={onlineOnly}
        onToggleLang={lang => setFilterLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
        onToggleOnline={() => setOnlineOnly(v => !v)}
        onReset={() => { setFilterLangs([]); setOnlineOnly(false); setSelectedCategory(null); }}
      />
    </View>
  );
}

const fm = StyleSheet.create({
  backdrop:    { flex:1, backgroundColor:"rgba(4,3,14,0.85)", justifyContent:"flex-end" },
  sheet:       { backgroundColor:"#081428", borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:"80%", paddingBottom:32 },
  handle:      { width:40, height:4, borderRadius:2, backgroundColor:"rgba(255,255,255,0.2)", alignSelf:"center", marginTop:12, marginBottom:4 },
  header:      { flexDirection:"row", alignItems:"center", paddingHorizontal:20, paddingVertical:14, borderBottomWidth:1, borderBottomColor:"rgba(255,255,255,0.08)" },
  title:       { color:"#fff", fontSize:16, fontWeight:"800", flex:1 },
  resetBtn:    { paddingHorizontal:10, paddingVertical:4, backgroundColor:"rgba(239,68,68,0.15)", borderRadius:20, marginRight:8 },
  resetTxt:    { color:"#f87171", fontSize:12, fontWeight:"700" },
  closeBtn:    { width:30, height:30, borderRadius:15, backgroundColor:"rgba(255,255,255,0.15)", alignItems:"center", justifyContent:"center" },
  body:        { paddingHorizontal:20, paddingTop:8 },
  section:     { marginBottom:24 },
  sectionTitle:{ color:"#fff", fontSize:14, fontWeight:"800", marginBottom:10 },
  onlineRow:   { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  checkRow:    { flexDirection:"row", alignItems:"center", paddingVertical:9, gap:12 },
  checkbox:    { width:22, height:22, borderRadius:6, borderWidth:2, borderColor:"rgba(255,255,255,0.25)", alignItems:"center", justifyContent:"center" },
  checkboxSel: { backgroundColor:"#0c2461", borderColor:"#0c2461" },
  checkLabel:  { flex:1, color:"rgba(255,255,255,0.85)", fontSize:14, fontWeight:"600" },
  checkCount:  { color:"rgba(255,255,255,0.35)", fontSize:12, fontWeight:"600" },
});

const lc = StyleSheet.create({
  sheet:        { borderTopLeftRadius:24, borderTopRightRadius:24, overflow:"hidden", height:560 },
  header:       { flexDirection:"row", alignItems:"center", gap:12, padding:16, backgroundColor:"#0c2461" },
  headerAvatar: { width:38, height:38, borderRadius:19, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  headerAvatarTxt: { color:"#fff", fontWeight:"800", fontSize:15 },
  headerName:   { color:"#fff", fontWeight:"800", fontSize:15 },
  headerStatus: { color:"rgba(255,255,255,0.75)", fontSize:11 },
  body:         { flex:1, padding:14 },
  bubble:       { maxWidth:"78%", paddingHorizontal:13, paddingVertical:9, borderRadius:16 },
  bubbleMe:     { backgroundColor:"#0c2461", borderTopRightRadius:4, borderTopLeftRadius:16 },
  bubbleThem:   { backgroundColor:"#071528", borderTopRightRadius:16, borderTopLeftRadius:4 },
  inputRow:     { flexDirection:"row", alignItems:"center", gap:8, padding:12, borderTopWidth:1 },
  input:        { flex:1, borderRadius:20, paddingHorizontal:14, paddingVertical:10, fontSize:13 },
  sendBtn:      { width:38, height:38, borderRadius:19, alignItems:"center", justifyContent:"center" },
  loginBox:     { alignItems:"center", paddingVertical:36, paddingHorizontal:24 },
  loginTitle:   { fontSize:17, fontWeight:"800", marginBottom:6 },
  loginSub:     { fontSize:13, textAlign:"center" },
});

const am = StyleSheet.create({
  backdrop:      { flex:1, backgroundColor:"rgba(4,3,14,0.88)", justifyContent:"flex-end" },
  sheet:         { borderTopLeftRadius:24, borderTopRightRadius:24, overflow:"hidden", maxHeight:"90%" },
  header:        { flexDirection:"row", alignItems:"center", gap:14, padding:20 },
  headerImg:     { width:52, height:52, borderRadius:26, borderWidth:2, borderColor:"rgba(255,255,255,0.6)" },
  headerImgFallback: { width:52, height:52, borderRadius:26, alignItems:"center", justifyContent:"center" },
  headerInitial: { color:"#fff", fontSize:22, fontWeight:"900" },
  headerName:    { color:"#fff", fontWeight:"800", fontSize:16 },
  headerSub:     { color:"rgba(255,255,255,0.8)", fontSize:12 },
  closeBtn:      { width:30, height:30, borderRadius:15, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  body:          { padding:20 },
  row2:          { flexDirection:"row", gap:10 },
  inp:           { borderWidth:1.5, borderRadius:10, padding:12, fontSize:14, marginBottom:12 },
  textarea:      { minHeight:72, textAlignVertical:"top" },
  errTxt:        { color:"#f87171", fontSize:12, marginBottom:12, backgroundColor:"rgba(239,68,68,0.08)", padding:10, borderRadius:8 },
  submitBtn:     { borderRadius:12, paddingVertical:14, alignItems:"center", justifyContent:"center", marginBottom:16 },
  submitBtnTxt:  { color:"#fff", fontWeight:"800", fontSize:15 },
  doneBox:       { alignItems:"center", paddingVertical:32 },
  doneEmoji:     { fontSize:48, marginBottom:12 },
  doneTitle:     { fontSize:18, fontWeight:"800", marginBottom:8 },
  doneSub:       { fontSize:13, textAlign:"center", lineHeight:20, marginBottom:24, paddingHorizontal:16 },
});

// Category grid cell
const cg = StyleSheet.create({
  cell:   { width:"31%", marginHorizontal:"1.16%", marginBottom:10, borderRadius:12, padding:10, alignItems:"flex-start", minHeight:88 },
  emoji:  { fontSize:22, marginBottom:4 },
  name:   { fontSize:11, fontWeight:"700", lineHeight:14, marginBottom:3 },
  count:  { fontSize:10, fontWeight:"500" },
  arrow:  { width:18, height:18, borderRadius:9, alignItems:"center", justifyContent:"center", marginTop:6 },
});

const ec = StyleSheet.create({
  card:         { borderRadius:16, padding:16, marginBottom:14, borderWidth:1 },
  topRow:       { flexDirection:"row", gap:12, marginBottom:10 },
  avatarWrap:   { position:"relative", width:64, height:64 },
  avatar:       { width:62, height:62, borderRadius:31, borderWidth:2.5 },
  avatarFallback: { width:62, height:62, borderRadius:31, borderWidth:2.5, alignItems:"center", justifyContent:"center", borderColor:"transparent" },
  avatarInitial: { color:"#fff", fontSize:24, fontWeight:"900" },
  onlineDot:    { position:"absolute", bottom:2, right:2, width:13, height:13, borderRadius:7, borderWidth:2, borderColor:"#fff", shadowOffset:{width:0,height:0} },
  name:         { fontWeight:"800", fontSize:14, flex:1 },
  role:         { fontSize:11, marginBottom:4 },
  subjectChip:  { alignSelf:"flex-start", borderRadius:20, paddingHorizontal:8, paddingVertical:2, borderWidth:1 },
  subjectTxt:   { fontSize:10, fontWeight:"700" },
  onlineStatus: { flexDirection:"row", alignItems:"center", gap:4, paddingHorizontal:8, paddingVertical:4, borderRadius:20, borderWidth:1, alignSelf:"flex-start" },
  onlineStatusDot: { width:6, height:6, borderRadius:3 },
  onlineStatusTxt: { fontSize:10, fontWeight:"700" },
  badgeRow:     { flexDirection:"row", flexWrap:"wrap", gap:6, marginBottom:10 },
  badge:        { paddingHorizontal:8, paddingVertical:3, borderRadius:20, backgroundColor:"rgba(0,0,0,0.05)" },
  badgeTxt:     { fontSize:10, color:"#64748b" },
  statsRow:     { flexDirection:"row", borderRadius:10, paddingVertical:8, paddingHorizontal:10, marginBottom:10 },
  statCell:     { flex:1, alignItems:"center" },
  statVal:      { fontSize:10, fontWeight:"600", textAlign:"center" },
  priceRow:     { flexDirection:"row", alignItems:"baseline", gap:2, marginBottom:10 },
  priceAmt:     { fontWeight:"900", fontSize:18 },
  priceUnit:    { fontSize:11 },
  actions:      { gap:8 },
  applyBtn:     { borderRadius:50, paddingVertical:10, alignItems:"center" },
  applyBtnTxt:  { color:"#fff", fontWeight:"700", fontSize:13 },
  btnRow:       { flexDirection:"row", gap:8 },
  chatBtn:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, borderWidth:1.5, borderRadius:50, paddingVertical:9 },
  chatBtnTxt:   { fontWeight:"700", fontSize:12 },
  bookBtn:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, backgroundColor:"#0c2461", borderRadius:50, paddingVertical:9 },
  bookBtnTxt:   { color:"#fff", fontWeight:"700", fontSize:12 },
});

const s = StyleSheet.create({
  root: { flex:1 },
  header: {
    position:"absolute", top:0, left:0, right:0, zIndex:100,
    elevation:10, shadowColor:"#000", shadowOpacity:0.3, shadowRadius:12, shadowOffset:{width:0,height:5},
    paddingHorizontal:16, paddingBottom:0, overflow:"hidden",
  },
  headerRow:  { flexDirection:"row", alignItems:"center", gap:10, paddingTop:10, marginBottom:10 },
  logo:       { width:34, height:34, borderRadius:8 },
  headerTitle:{ color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:  { color:"rgba(255,255,255,0.65)", fontSize:11 },
  onlineBadge:{ flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(34,197,94,0.18)", borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:"rgba(34,197,94,0.4)" },
  onlineDot:  { width:7, height:7, borderRadius:4, backgroundColor:"#22c55e" },
  onlineTxt:  { color:"#4ade80", fontSize:10, fontWeight:"800" },
  avatar:     { width:34, height:34, borderRadius:17, borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarDefault: { width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center", borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarInitial: { color:"#fff", fontWeight:"800", fontSize:14 },

  searchBar: {
    flexDirection:"row", alignItems:"center", gap:8,
    marginHorizontal:16, marginBottom:8,
    backgroundColor:"rgba(255,255,255,0.10)", borderRadius:12,
    paddingHorizontal:12, paddingVertical:0, height:40,
    borderWidth:1, borderColor:"rgba(255,255,255,0.12)",
  },
  searchInput: { flex:1, color:"#fff", fontSize:13, height:40 },

  filterScroll: { borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.12)", paddingTop:10 },
  filterChip:    { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
  filterDot:     { width:7, height:7, borderRadius:4 },
  filterChipTxt: { fontSize:12, fontWeight:"600" },
  filterBtn:      { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:3, width:38, height:38, borderRadius:19, borderWidth:1.5, borderColor:"rgba(255,255,255,0.2)" },
  filterBtnActive:{ borderColor:"rgba(59,130,246,0.55)", backgroundColor:"rgba(59,130,246,0.15)" },
  filterBtnCount: { color:"#93c5fd", fontSize:10, fontWeight:"800" },

  // Explore section
  exploreSec:     { marginBottom:8, paddingTop:4 },
  exploreHeader:  { flexDirection:"row", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 },
  exploreTitle:   { fontSize:22, fontWeight:"900", lineHeight:28 },
  exploreTitleAccent: { color:"#3b82f6" },
  exploreSub:     { fontSize:12, lineHeight:17, marginTop:4 },
  viewAllBtn:     { flexDirection:"row", alignItems:"center", gap:3, paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(59,130,246,0.4)", backgroundColor:"rgba(59,130,246,0.08)" },
  viewAllTxt:     { color:"#3b82f6", fontSize:12, fontWeight:"700" },
  categoryGrid:   { flexDirection:"row", flexWrap:"wrap" },

  secHeadRow:    { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:16 },
  secHeadTitle:  { fontSize:17, fontWeight:"800" },
  secHeadSub:    { fontSize:12, marginTop:2 },
  liveCountBadge:{ flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(239,68,68,0.1)", borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:"rgba(239,68,68,0.3)" },
  liveCountDot:  { width:6, height:6, borderRadius:3, backgroundColor:"#ef4444" },
  liveCountTxt:  { color:"#ef4444", fontSize:10, fontWeight:"700" },

  loadingBox: { alignItems:"center", paddingVertical:48 },
  emptyBox:   { alignItems:"center", paddingVertical:48 },

  ctaCard:   { borderRadius:18, padding:24, marginTop:8, alignItems:"center", borderWidth:1 },
  ctaTitle:  { fontSize:17, fontWeight:"800", marginBottom:8, textAlign:"center" },
  ctaSub:    { fontSize:13, textAlign:"center", lineHeight:20, marginBottom:20 },
  ctaBtn:    { backgroundColor:"#0c2461", borderRadius:50, paddingHorizontal:28, paddingVertical:13 },
  ctaBtnTxt: { color:"#fff", fontWeight:"800", fontSize:14 },
});
