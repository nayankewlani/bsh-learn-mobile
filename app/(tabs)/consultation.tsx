import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Modal, Animated, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
  NativeSyntheticEvent, NativeScrollEvent, Switch,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore, User } from "../../stores/authStore";
import { useThemeStore, ThemeColors } from "../../stores/themeStore";
import { showTabBar, hideTabBar } from "../../stores/tabBarStore";
import client from "../../api/client";

const bshLogoImg = require("../../assets/BSH-logo-02.png");
const slide1Img  = require("../../assets/slide-1.png");
const geetaImg   = require("../../assets/geeta-makhijani.png");
const slide4Img  = require("../../assets/slide-4.png");

const CATEGORY_PHOTOS: Record<string, any> = {
  "stress-anxiety":       require("../../assets/categories/stress-anxiety.jpg"),
  "depression-low-mood":  require("../../assets/categories/depression-low-mood.jpg"),
  "relationship-healing": require("../../assets/categories/relationship-healing.jpg"),
  "self-love-confidence": require("../../assets/categories/self-love-confidence.jpg"),
  "career-growth":        require("../../assets/categories/career-career-growth.jpg"),
  "money-abundance":      require("../../assets/categories/money-abundance.jpg"),
  "emotional-healing":    require("../../assets/categories/emotional-healing.jpg"),
  "anger-management":     require("../../assets/categories/anger-management.jpg"),
  "fear-phobias":         require("../../assets/categories/fear-phobias.jpg"),
  "sleep-relaxation":     require("../../assets/categories/sleep-relaxation.jpg"),
  "focus-productivity":   require("../../assets/categories/focus-productivity.jpg"),
  "procrastination":      require("../../assets/categories/procrastination.jpg"),
  "grief-loss":           require("../../assets/categories/grief-loss.jpg"),
  "trauma-healing":       require("../../assets/categories/trauma-healing.jpg"),
  "child-teen-support":   require("../../assets/categories/child-teen-support.jpg"),
  "family-parenting":     require("../../assets/categories/family-parenting.jpg"),
  "health-wellness":      require("../../assets/categories/health-wellness.jpg"),
  "habit-addiction":      require("../../assets/categories/habit-change-addiction-support.jpg"),
  "nlp-coaching":         require("../../assets/categories/nlp-coaching.jpg"),
  "spiritual-healing":    require("../../assets/categories/spiritual-healing.jpg"),
  "past-life-regression": require("../../assets/categories/past-life-regression.jpg"),
  "energy-chakras":       require("../../assets/categories/energy-healing-chakras.jpg"),
  "tarot-guidance":       require("../../assets/categories/tarot-intuitive-guidance.jpg"),
  "vastu-healing":        require("../../assets/categories/home-space-healing-vastu.jpg"),
  "womens-wellness":      require("../../assets/categories/womens-wellness-womb-healing.jpg"),
  "mens-wellness":        require("../../assets/categories/mens-wellness-performance.jpg"),
  "life-purpose":         require("../../assets/categories/life-purpose-inner-growth.jpg"),
};

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
  preferredByBsh?: boolean;
}
interface Expert {
  _id: string; name: string; role: string; subject: string;
  consultationCategories: string[];
  color: string; localImg: number | null; avatarUrl: string;
  exp: string; sessions: string; rating: number; followers: number;
  languages: string[]; verified: boolean; isOnline: boolean;
  sessionPricePaise: number; hasPayBooking: boolean; hasApplyBooking: boolean;
  preferredByBsh?: boolean;
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
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
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
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Live Chat Modal ────────────────────────────────────────────────────────────
const LiveChatModal: React.FC<{
  expert: Expert; t: ThemeColors;
  user: User | null; onClose: ()=>void;
}> = ({ expert, t, user, onClose }) => {
  const insets = useSafeAreaInsets();
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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
                  <View style={[lc.bubble, isMe ? lc.bubbleMe : lc.bubbleThem, !isMe && { backgroundColor:t.surface2 }]}>
                    <Text style={{ color:isMe?"#fff":t.text, fontSize:13, lineHeight:18 }}>{m.text}</Text>
                    <Text style={{ color:isMe?"rgba(255,255,255,0.65)":t.textMuted, fontSize:10, marginTop:3, textAlign:"right" }}>
                      {new Date(m.createdAt).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={[lc.inputRow, { borderTopColor:t.border, paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput value={text} onChangeText={setText} placeholder="Type a message…"
              placeholderTextColor={t.textMuted} style={[lc.input, { color:t.text, backgroundColor:t.surface }]} />
            <TouchableOpacity onPress={send} disabled={sending || !text.trim()}
              style={[lc.sendBtn, { backgroundColor:text.trim() ? "#0c2461" : t.border }]}>
              <Ionicons name="send" size={15} color={text.trim() ? "#fff" : t.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </KeyboardAvoidingView>
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

// ── Category Photo Card ───────────────────────────────────────────────────────
const CategoryCard: React.FC<{
  cat: Category; isSelected: boolean; onPress: () => void;
}> = React.memo(({ cat, isSelected, onPress }) => {
  const photo = CATEGORY_PHOTOS[cat.slug];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        cg.card,
        isSelected
          ? { borderColor: "#3b82f6", borderWidth: 2 }
          : { borderColor: "rgba(0,0,0,0.09)", borderWidth: 1 },
      ]}
    >
      <View style={cg.photoWrap}>
        {photo
          ? <Image source={photo} style={cg.photo} contentFit="cover" />
          : <View style={cg.photoFallback}>
              <Text style={{ fontSize: 26 }}>{cat.emoji}</Text>
            </View>
        }
      </View>
      <View style={cg.textWrap}>
        <Text style={[cg.catName, isSelected && { color: "#3b82f6" }]} numberOfLines={2}>{cat.name}</Text>
        <Text style={cg.catCount}>
          {cat.expertCount > 0
            ? `${cat.expertCount} Expert${cat.expertCount !== 1 ? "s" : ""}`
            : "Experts"}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ── Expert Card ───────────────────────────────────────────────────────────────
const ExpertCard: React.FC<{
  expert: Expert; t: ThemeColors; isDark: boolean;
  onApply: (e: Expert) => void; onChat: (e: Expert) => void; onBook: (e: Expert) => void;
}> = React.memo(({ expert, t, isDark, onApply, onChat, onBook }) => {
  const priceRs   = expert.sessionPricePaise > 0 ? Math.round(expert.sessionPricePaise / 100) : 0;
  const cats      = expert.consultationCategories.slice(0, 2);
  const extraCats = Math.max(0, expert.consultationCategories.length - 2);

  return (
    <View style={[ec.card, { backgroundColor: t.card, borderColor: t.border }]}>
      {/* Top — tappable → profile */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: "/educator/[slug]" as any, params: { slug: expert._id } })}
      >
        <View style={ec.topRow}>
          {/* Avatar */}
          <View style={ec.avatarWrap}>
            {expert.avatarUrl
              ? <Image source={{ uri: expert.avatarUrl }} style={ec.avatar} contentFit="cover" cachePolicy="disk" />
              : expert.localImg
                ? <Image source={expert.localImg} style={ec.avatar} contentFit="cover" />
                : <View style={[ec.avatarFallback, { backgroundColor: "#0c2461" }]}>
                    <Text style={ec.avatarInitial}>{expert.name[0]}</Text>
                  </View>
            }
            <View style={[ec.onlineDot, { backgroundColor: expert.isOnline ? "#22c55e" : "#94a3b8" }]} />
          </View>

          {/* Name / role / chips */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
                <Text style={[ec.name, { color: t.text }]} numberOfLines={1}>{expert.name}</Text>
                {expert.verified && <Ionicons name="checkmark-circle" size={14} color="#3b82f6" />}
              </View>
              <View style={[ec.onlinePill, {
                backgroundColor: expert.isOnline ? "rgba(34,197,94,0.10)" : "rgba(148,163,184,0.10)",
                borderColor:     expert.isOnline ? "rgba(34,197,94,0.38)" : "rgba(148,163,184,0.30)",
              }]}>
                <View style={[ec.onlinePillDot, { backgroundColor: expert.isOnline ? "#22c55e" : "#94a3b8" }]} />
                <Text style={[ec.onlinePillTxt, { color: expert.isOnline ? "#22c55e" : "#94a3b8" }]}>
                  {expert.isOnline ? "Online" : "Offline"}
                </Text>
              </View>
            </View>
            <Text style={[ec.role, { color: t.textMuted }]} numberOfLines={1}>{expert.role}</Text>
            {cats.length > 0 && (
              <View style={ec.chipsRow}>
                {cats.map((c, i) => (
                  <View key={i} style={ec.chip}>
                    <Text style={ec.chipTxt} numberOfLines={1}>{c}</Text>
                  </View>
                ))}
                {extraCats > 0 && (
                  <View style={ec.chip}>
                    <Text style={ec.chipTxt}>+{extraCats}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {/* Preferred by BSH badge */}
      {expert.preferredByBsh && (
        <View style={ec.preferredBanner}>
          <Text style={ec.preferredBannerTxt}>⭐ Preferred by BSH</Text>
        </View>
      )}

      {/* Badges */}
      <View style={ec.badgeRow}>
        {expert.rating > 0 && (
          <Text style={ec.badgeTxt}>
            ⭐ {expert.rating}{expert.followers > 0 ? ` (${expert.followers >= 1000 ? (expert.followers/1000).toFixed(1)+"k" : expert.followers})` : ""}
          </Text>
        )}
        <Text style={ec.badgeTxt}>🔒 Confidential</Text>
        <Text style={ec.badgeTxt}>⚡ 24hr Response</Text>
      </View>

      <View style={[ec.divider, { backgroundColor: t.border }]} />

      {/* Stats */}
      <View style={ec.statsRow}>
        <View style={ec.statCell}>
          <Ionicons name="calendar-outline" size={17} color="#0c2461" />
          <Text style={[ec.statVal, { color: t.text }]} numberOfLines={1}>{expert.exp || "—"}</Text>
          <Text style={[ec.statLbl, { color: t.textMuted }]}>Experience</Text>
        </View>
        <View style={[ec.statDivider, { backgroundColor: t.border }]} />
        <View style={ec.statCell}>
          <Ionicons name="people-outline" size={17} color="#0c2461" />
          <Text style={[ec.statVal, { color: t.text }]} numberOfLines={1}>{expert.sessions || "—"}</Text>
          <Text style={[ec.statLbl, { color: t.textMuted }]}>Sessions</Text>
        </View>
        <View style={[ec.statDivider, { backgroundColor: t.border }]} />
        <View style={ec.statCell}>
          <Ionicons name="globe-outline" size={17} color="#0c2461" />
          <Text style={[ec.statVal, { color: t.text }]} numberOfLines={1}>{expert.languages.slice(0, 2).join(", ") || "—"}</Text>
          <Text style={[ec.statLbl, { color: t.textMuted }]}>Languages</Text>
        </View>
      </View>

      {/* Price + buttons */}
      <View style={ec.bottomRow}>
        <View style={ec.priceWrap}>
          {priceRs > 0 ? (
            <>
              <Text style={[ec.priceAmt, { color: t.text }]}>₹{priceRs}</Text>
              <Text style={[ec.priceUnit, { color: t.textMuted }]}>/min</Text>
            </>
          ) : (
            <Text style={[ec.priceAmt, { color: "#22c55e", fontSize: 16 }]}>Free</Text>
          )}
        </View>
        <View style={ec.btnRow}>
          <TouchableOpacity
            style={[ec.chatBtn, {
              borderColor:     expert.isOnline ? "#22c55e" : t.border,
              backgroundColor: expert.isOnline ? "rgba(34,197,94,0.06)" : "transparent",
            }]}
            onPress={() => onChat(expert)}>
            <Ionicons name="chatbubble-outline" size={13} color={expert.isOnline ? "#22c55e" : t.textMuted} />
            <Text style={[ec.chatBtnTxt, { color: expert.isOnline ? "#22c55e" : t.textMuted }]}>
              {expert.isOnline ? "Chat (Online)" : "Chat Free"}
            </Text>
          </TouchableOpacity>
          {expert.hasPayBooking && priceRs > 0 && (
            <TouchableOpacity style={ec.bookBtn} onPress={() => onBook(expert)}>
              <Ionicons name="calendar-outline" size={13} color="#fff" />
              <Text style={ec.bookBtnTxt}>Book a Session</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {expert.hasApplyBooking && (
        <TouchableOpacity style={ec.applyBtn} onPress={() => onApply(expert)}>
          <Text style={ec.applyBtnTxt}>✋ Apply for 1:1 Private Session</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ConsultationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark, t } = useThemeStore();

  const HEADER_H = 112 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef   = useRef(0);
  const headerHiddenRef  = useRef(false);
  const pulseAnim        = useRef(new Animated.Value(1)).current;

  const { trainerId: focusTrainerId, autoChat } = useLocalSearchParams<{ trainerId?: string; autoChat?: string }>();
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
  const filteredLengthRef    = useRef(0);
  const categoryRowHeightRef = useRef(0);

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
      setCategories(CONSULTATION_CATEGORIES.map(c => ({ ...c, expertCount: 0 })));
    }
  }, []);

  const loadExperts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setLoadError(false);
    try {
      const r = await client.get("/consultation/healers");
      const mapped: Expert[] = (r.data.educators || []).map((e: DBTrainer) => ({
        _id:                    e._id,
        name:                   e.name,
        role:                   e.trainerRole || "",
        subject:                e.specialties?.[0] || "",
        consultationCategories: e.consultationCategories || [],
        color:                  e.trainerColor || "#0c2461",
        localImg:               LOCAL_IMGS[e.name.toLowerCase()] ?? null,
        avatarUrl:              e.avatar || "",
        exp:                    e.experience || "",
        sessions:               e.sessionsDisplay || "",
        rating:                 e.rating || 0,
        followers:              e.followers || 0,
        languages:              e.trainerLanguages?.length ? e.trainerLanguages : ["English"],
        verified:               e.isVerifiedBadge || false,
        isOnline:               e.isOnline || false,
        sessionPricePaise:      e.sessionPricePaise || 0,
        hasPayBooking:          e.hasPayBooking ?? true,
        hasApplyBooking:        e.hasApplyBooking ?? false,
        preferredByBsh:         e.preferredByBsh || false,
      }));
      // Platinum "Preferred by BSH" first, then online, then rest
      setExperts(mapped.sort((a, b) => {
        if (b.preferredByBsh !== a.preferredByBsh) return Number(b.preferredByBsh) - Number(a.preferredByBsh);
        return Number(b.isOnline) - Number(a.isOnline);
      }));
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

  useEffect(() => {
    const interval = setInterval(() => loadExperts(), 60000);
    return () => clearInterval(interval);
  }, [loadExperts]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y     = e.nativeEvent.contentOffset.y;
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

  useEffect(() => {
    if (!focusTrainerId || filtered.length === 0) return;
    const idx = filtered.findIndex(e => e._id === focusTrainerId);
    if (idx < 0) return;
    if (autoChat === "1") {
      setChatting(filtered[idx]);
    } else {
      setTimeout(() => {
        try { flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 }); } catch {}
      }, 400);
    }
  }, [focusTrainerId, autoChat, filtered]);

  const onlineCount  = experts.filter(e => e.isOnline).length;
  const filterCount  = filterLangs.length + (onlineOnly ? 1 : 0);
  const allActive    = !selectedCategory && !onlineOnly && filterLangs.length === 0;

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

  const handleChat = useCallback((expert: Expert) => { setChatting(expert); }, []);

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
        flatListRef.current?.scrollToOffset({ offset: categoryRowHeightRef.current, animated: true });
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
      {/* Category horizontal scroll */}
      <View
        style={s.catSection}
        onLayout={e => { categoryRowHeightRef.current = e.nativeEvent.layout.height; }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}
        >
          {displayCategories.map(cat => (
            <CategoryCard
              key={cat.slug}
              cat={cat}
              isSelected={selectedCategory === cat.slug}
              onPress={() => handleCategoryPress(cat.slug)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Filter chips row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.filterRow, { borderTopColor: t.border, borderBottomColor: t.border }]}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
      >
        {/* All */}
        <TouchableOpacity
          style={[s.fChip, { borderColor: allActive ? "#0c2461" : t.border, backgroundColor: allActive ? "#0c2461" : "transparent" }]}
          onPress={() => { setSelectedCategory(null); setOnlineOnly(false); setFilterLangs([]); }}
        >
          <Text style={[s.fChipTxt, { color: allActive ? "#fff" : t.text }]}>All</Text>
        </TouchableOpacity>

        {/* Online Only */}
        <TouchableOpacity
          style={[s.fChip, { borderColor: onlineOnly ? "rgba(34,197,94,0.5)" : t.border, backgroundColor: onlineOnly ? "rgba(34,197,94,0.1)" : "transparent" }]}
          onPress={() => setOnlineOnly(v => !v)}
        >
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: onlineOnly ? "#22c55e" : "#94a3b8" }} />
          <Text style={[s.fChipTxt, { color: onlineOnly ? "#22c55e" : t.text }]}>Online Only</Text>
        </TouchableOpacity>

        {/* Languages */}
        {LANGUAGES.map(lang => {
          const active = filterLangs.includes(lang);
          return (
            <TouchableOpacity
              key={lang}
              style={[s.fChip, { borderColor: active ? "rgba(59,130,246,0.5)" : t.border, backgroundColor: active ? "rgba(59,130,246,0.1)" : "transparent" }]}
              onPress={() => setFilterLangs(prev => active ? prev.filter(l => l !== lang) : [...prev, lang])}
            >
              <Text style={[s.fChipTxt, { color: active ? "#3b82f6" : t.text }]}>{lang}</Text>
            </TouchableOpacity>
          );
        })}

        {/* More */}
        <TouchableOpacity style={[s.fChip, { borderColor: filterCount > 0 ? "rgba(59,130,246,0.5)" : t.border, backgroundColor: filterCount > 0 ? "rgba(59,130,246,0.1)" : "transparent" }]} onPress={() => setShowFilter(true)}>
          <Text style={[s.fChipTxt, { color: filterCount > 0 ? "#3b82f6" : t.text }]}>More</Text>
          <Ionicons name="chevron-down" size={11} color={filterCount > 0 ? "#3b82f6" : t.textMuted} />
        </TouchableOpacity>
      </ScrollView>

      {/* Section heading */}
      <View style={s.secHeadRow}>
        <View>
          <Text style={[s.secHeadTitle, { color: t.text }]}>
            {selectedCategoryData
              ? `${selectedCategoryData.emoji} ${selectedCategoryData.name}`
              : "All Expert Healers"}
          </Text>
          <Text style={[s.secHeadSub, { color: t.textMuted }]}>
            {filtered.length} expert{filtered.length !== 1 ? "s" : ""} · {filtered.filter(e => e.isOnline).length} online now
          </Text>
        </View>
        <TouchableOpacity style={s.sortBtn} onPress={() => setShowFilter(true)}>
          <Ionicons name="swap-vertical-outline" size={14} color={t.textMuted} />
          <Text style={[s.sortBtnTxt, { color: t.textMuted }]}>Sort by</Text>
          <Ionicons name="chevron-down" size={12} color={t.textMuted} />
        </TouchableOpacity>
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
  ), [
    isDark, t, displayCategories, selectedCategory, selectedCategoryData,
    filtered, loading, loadError, searchQuery,
    onlineOnly, filterLangs, filterCount, allActive,
    handleCategoryPress, loadExperts,
  ]);

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
    <View style={[s.root, { backgroundColor: t.bg }]}>
      {/* ── Floating Header ── */}
      <Animated.View style={[s.header, { paddingTop: insets.top, backgroundColor: t.navBg, transform: [{ translateY: headerTranslateY }] }]}>
        <View style={s.headerRow}>
          <Image source={bshLogoImg} style={s.logo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle} numberOfLines={1}>BSH Consultation</Text>
            <Text style={s.headerSub} numberOfLines={1}>Talk to Expert Healers</Text>
          </View>
          {onlineCount > 0 && (
            <View style={s.onlineBadge}>
              <Animated.View style={[s.onlineDot, { transform: [{ scale: pulseAnim }] }]} />
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
              ? <Image source={{ uri: user.avatar }} style={s.avatar} contentFit="cover" cachePolicy="memory-disk" />
              : <View style={s.avatarDefault}><Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Search bar — white in light mode */}
        <View style={[s.searchBar, { backgroundColor: isDark ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.95)" }]}>
          <Ionicons name="search-outline" size={15} color={isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.38)"} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search healers by name, specialty or concern…"
            placeholderTextColor={isDark ? "rgba(255,255,255,0.35)" : "rgba(15,23,42,0.38)"}
            style={[s.searchInput, { color: isDark ? "#fff" : "#1e293b" }]}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top:8, bottom:8, left:8, right:8 }}>
              <Ionicons name="close-circle" size={16} color={isDark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.38)"} />
            </TouchableOpacity>
          )}
        </View>
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
        contentContainerStyle={{ paddingTop: HEADER_H + 8, paddingBottom: 130, paddingHorizontal: 16 }}
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

// ── Stylesheets ───────────────────────────────────────────────────────────────

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
  sheet:           { borderTopLeftRadius:24, borderTopRightRadius:24, overflow:"hidden", height:560 },
  header:          { flexDirection:"row", alignItems:"center", gap:12, padding:16, backgroundColor:"#0c2461" },
  headerAvatar:    { width:38, height:38, borderRadius:19, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  headerAvatarTxt: { color:"#fff", fontWeight:"800", fontSize:15 },
  headerName:      { color:"#fff", fontWeight:"800", fontSize:15 },
  headerStatus:    { color:"rgba(255,255,255,0.75)", fontSize:11 },
  body:            { flex:1, padding:14 },
  bubble:          { maxWidth:"78%", paddingHorizontal:13, paddingVertical:9, borderRadius:16 },
  bubbleMe:        { backgroundColor:"#0c2461", borderTopRightRadius:4, borderTopLeftRadius:16 },
  bubbleThem:      { backgroundColor:"#071528", borderTopRightRadius:16, borderTopLeftRadius:4 },
  inputRow:        { flexDirection:"row", alignItems:"center", gap:8, padding:12, borderTopWidth:1 },
  input:           { flex:1, borderRadius:20, paddingHorizontal:14, paddingVertical:10, fontSize:13 },
  sendBtn:         { width:38, height:38, borderRadius:19, alignItems:"center", justifyContent:"center" },
  loginBox:        { alignItems:"center", paddingVertical:36, paddingHorizontal:24 },
  loginTitle:      { fontSize:17, fontWeight:"800", marginBottom:6 },
  loginSub:        { fontSize:13, textAlign:"center" },
});

const am = StyleSheet.create({
  backdrop:          { flex:1, backgroundColor:"rgba(4,3,14,0.88)", justifyContent:"flex-end" },
  sheet:             { borderTopLeftRadius:24, borderTopRightRadius:24, overflow:"hidden", maxHeight:"90%" },
  header:            { flexDirection:"row", alignItems:"center", gap:14, padding:20 },
  headerImg:         { width:52, height:52, borderRadius:26, borderWidth:2, borderColor:"rgba(255,255,255,0.6)" },
  headerImgFallback: { width:52, height:52, borderRadius:26, alignItems:"center", justifyContent:"center" },
  headerInitial:     { color:"#fff", fontSize:22, fontWeight:"900" },
  headerName:        { color:"#fff", fontWeight:"800", fontSize:16 },
  headerSub:         { color:"rgba(255,255,255,0.8)", fontSize:12 },
  closeBtn:          { width:30, height:30, borderRadius:15, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  body:              { padding:20 },
  row2:              { flexDirection:"row", gap:10 },
  inp:               { borderWidth:1.5, borderRadius:10, padding:12, fontSize:14, marginBottom:12 },
  textarea:          { minHeight:72, textAlignVertical:"top" },
  errTxt:            { color:"#f87171", fontSize:12, marginBottom:12, backgroundColor:"rgba(239,68,68,0.08)", padding:10, borderRadius:8 },
  submitBtn:         { borderRadius:12, paddingVertical:14, alignItems:"center", justifyContent:"center", marginBottom:16 },
  submitBtnTxt:      { color:"#fff", fontWeight:"800", fontSize:15 },
  doneBox:           { alignItems:"center", paddingVertical:32 },
  doneEmoji:         { fontSize:48, marginBottom:12 },
  doneTitle:         { fontSize:18, fontWeight:"800", marginBottom:8 },
  doneSub:           { fontSize:13, textAlign:"center", lineHeight:20, marginBottom:24, paddingHorizontal:16 },
});

// Category photo card
const cg = StyleSheet.create({
  card:        { width: 104, borderRadius: 14, backgroundColor: "#fff", overflow: "hidden" },
  photoWrap:   { height: 84, width: "100%", backgroundColor: "#e2e8f0" },
  photo:       { width: "100%", height: "100%" },
  photoFallback: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#dde3ee" },
  textWrap:    { paddingHorizontal: 8, paddingTop: 7, paddingBottom: 9 },
  catName:     { fontSize: 11, fontWeight: "700", color: "#1e293b", lineHeight: 14, marginBottom: 3 },
  catCount:    { fontSize: 10, fontWeight: "500", color: "#94a3b8" },
});

// Expert card
const ec = StyleSheet.create({
  card:          { borderRadius: 14, padding: 10, marginBottom: 10, borderWidth: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  topRow:        { flexDirection: "row", gap: 8, marginBottom: 6 },
  avatarWrap:    { position: "relative" },
  avatar:        { width: 52, height: 52, borderRadius: 26 },
  avatarFallback:{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarInitial: { color: "#fff", fontSize: 18, fontWeight: "900" },
  onlineDot:     { position: "absolute", bottom: 1, left: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: "#fff" },
  name:          { fontWeight: "800", fontSize: 13, flex: 1 },
  role:          { fontSize: 10, marginBottom: 4 },
  onlinePill:    { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, borderWidth: 1 },
  onlinePillDot: { width: 5, height: 5, borderRadius: 3 },
  onlinePillTxt: { fontSize: 9, fontWeight: "700" },
  chipsRow:      { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip:          { backgroundColor: "rgba(12,36,97,0.07)", borderRadius: 20, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: "rgba(12,36,97,0.18)" },
  chipTxt:       { fontSize: 9, fontWeight: "600", color: "#0c2461" },
  preferredBanner:   { flexDirection: "row", alignItems: "center", backgroundColor: "#0c2461", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start", marginBottom: 6 },
  preferredBannerTxt:{ fontSize: 10, color: "#22d3ee", fontWeight: "800", letterSpacing: 0.3 },
  badgeRow:      { flexDirection: "row", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  badgeTxt:      { fontSize: 10, color: "#64748b", fontWeight: "500" },
  divider:       { height: 1, marginBottom: 8 },
  statsRow:      { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  statCell:      { flex: 1, alignItems: "center", gap: 1 },
  statVal:       { fontSize: 11, fontWeight: "800", textAlign: "center" },
  statLbl:       { fontSize: 8, textAlign: "center" },
  statDivider:   { width: 1, height: 26, marginHorizontal: 3 },
  bottomRow:     { flexDirection: "row", alignItems: "center", gap: 6 },
  priceWrap:     { flexDirection: "row", alignItems: "baseline", gap: 1, width: 58 },
  priceAmt:      { fontSize: 15, fontWeight: "900" },
  priceUnit:     { fontSize: 10, fontWeight: "500" },
  btnRow:        { flex: 1, flexDirection: "row", gap: 6 },
  chatBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, borderWidth: 1.5, borderRadius: 50, paddingVertical: 6 },
  chatBtnTxt:    { fontWeight: "700", fontSize: 10 },
  bookBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: "#0c2461", borderRadius: 50, paddingVertical: 6 },
  bookBtnTxt:    { color: "#fff", fontWeight: "700", fontSize: 10 },
  applyBtn:      { marginTop: 6, borderRadius: 50, paddingVertical: 6, alignItems: "center", backgroundColor: "rgba(12,36,97,0.07)", borderWidth: 1, borderColor: "rgba(12,36,97,0.18)" },
  applyBtnTxt:   { color: "#0c2461", fontWeight: "700", fontSize: 11 },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    elevation: 10, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width:0, height:5 },
    paddingHorizontal: 16, paddingBottom: 12, overflow: "hidden",
  },
  headerRow:   { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, marginBottom: 10 },
  logo:        { width: 34, height: 34, borderRadius: 8 },
  headerTitle: { color: "#fff", fontSize: 15, fontWeight: "800" },
  headerSub:   { color: "rgba(255,255,255,0.65)", fontSize: 10 },
  onlineBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(34,197,94,0.18)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(34,197,94,0.4)" },
  onlineDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: "#22c55e" },
  onlineTxt:   { color: "#4ade80", fontSize: 10, fontWeight: "800" },
  avatar:      { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarDefault: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 14 },
  filterBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)" },
  filterBtnActive:{ borderColor: "rgba(59,130,246,0.55)", backgroundColor: "rgba(59,130,246,0.15)" },
  filterBtnCount: { color: "#93c5fd", fontSize: 10, fontWeight: "800" },

  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 50, paddingHorizontal: 14, height: 44,
    borderWidth: 0,
  },
  searchInput: { flex: 1, fontSize: 13, height: 44 },

  // Category section
  catSection:  { marginHorizontal: -16, marginBottom: 0 },

  // Filter chips row (below categories, white bg)
  filterRow:   { borderTopWidth: 1, borderBottomWidth: 1, marginHorizontal: -16, marginBottom: 12 },
  fChip:       { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 50, borderWidth: 1 },
  fChipTxt:    { fontSize: 13, fontWeight: "600" },

  // Section heading
  secHeadRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  secHeadTitle: { fontSize: 18, fontWeight: "900" },
  secHeadSub:   { fontSize: 12, marginTop: 2 },
  sortBtn:      { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
  sortBtnTxt:   { fontSize: 12, fontWeight: "600" },

  loadingBox: { alignItems: "center", paddingVertical: 48 },
  emptyBox:   { alignItems: "center", paddingVertical: 48 },

  ctaCard:    { borderRadius: 18, padding: 24, marginTop: 8, alignItems: "center", borderWidth: 1 },
  ctaTitle:   { fontSize: 17, fontWeight: "800", marginBottom: 8, textAlign: "center" },
  ctaSub:     { fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  ctaBtn:     { backgroundColor: "#0c2461", borderRadius: 50, paddingHorizontal: 28, paddingVertical: 13 },
  ctaBtnTxt:  { color: "#fff", fontWeight: "800", fontSize: 14 },
});
