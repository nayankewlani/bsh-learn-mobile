import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, TextInput, Modal, Animated, Alert, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { showTabBar, hideTabBar } from "../../stores/tabBarStore";
import client from "../../api/client";

const bshLogoImg = require("../../assets/BSH-logo-02.png");
const slide1Img  = require("../../assets/slide-1.png");
const geetaImg   = require("../../assets/geeta-makhijani.png");
const slide4Img  = require("../../assets/slide-4.png");

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

const LOCAL_IMGS: Record<string, number> = {
  "dr. pradeep kumar": slide1Img,
  "geeta makhijani":   geetaImg,
  "bsh faculty":       slide4Img,
};

const SPECIALTIES = ["All","Hypnotherapy","Shadow Work","NLP Coaching","Spiritual Healing",
  "Mind Wellness","Emotional Healing","Vastu Shastra","Autism Healing","Corporate Training"];
const LANGUAGES = ["English","Hindi","Telugu"];

interface ChatMsg { _id: string; sender: { _id: string; name: string; role: string }; text: string; createdAt: string; }

// ── Apply 1:1 Modal ───────────────────────────────────────────────────────────
const ApplyModal: React.FC<{
  expert: Expert; t: ReturnType<typeof useThemeStore>["t"];
  user: ReturnType<typeof useAuthStore>["user"]; onClose: ()=>void;
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
            {expert.localImg
              ? <Image source={expert.localImg} style={am.headerImg} />
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

// ── Live Chat Modal (real two-way chat, mirrors web ChatPanel) ───────────────
const LiveChatModal: React.FC<{
  expert: Expert; t: ReturnType<typeof useThemeStore>["t"];
  user: ReturnType<typeof useAuthStore>["user"]; onClose: ()=>void;
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
    pollRef.current = setInterval(fetchMessages, 3000);
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
              <TouchableOpacity style={[am.submitBtn, { backgroundColor:"#7c3aed", marginTop:18, paddingHorizontal:32 }]}
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
                  <View style={[lc.bubble, {
                    backgroundColor: isMe ? "#7c3aed" : t.surface,
                    borderTopRightRadius: isMe ? 4 : 16, borderTopLeftRadius: isMe ? 16 : 4,
                  }]}>
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
              style={[lc.sendBtn, { backgroundColor:text.trim() ? "#7c3aed" : t.border }]}>
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
  allSpecs: string[]; experts: Expert[];
  filterSpecs: string[]; filterLangs: string[];
  onlineOnly: boolean;
  onToggleSpec: (s: string) => void;
  onToggleLang: (l: string) => void;
  onToggleOnline: () => void;
  onReset: () => void;
}> = ({ visible, onClose, allSpecs, experts, filterSpecs, filterLangs, onlineOnly, onToggleSpec, onToggleLang, onToggleOnline, onReset }) => {
  const filterableSpecs = allSpecs.filter(s => s !== "All");
  return (
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
                <Switch
                  value={onlineOnly} onValueChange={onToggleOnline}
                  trackColor={{ false:"#374151", true:"#ef4444" }} thumbColor="#fff" />
              </View>
            </View>
            <View style={fm.section}>
              <Text style={fm.sectionTitle}>Expertise</Text>
              {filterableSpecs.map(spec => {
                const count = experts.filter(e => e.subject === spec).length;
                const sel = filterSpecs.includes(spec);
                return (
                  <TouchableOpacity key={spec} style={fm.checkRow} onPress={() => onToggleSpec(spec)}>
                    <View style={[fm.checkbox, sel && fm.checkboxSel]}>
                      {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
                    </View>
                    <Text style={[fm.checkLabel, sel && { color:"#a78bfa" }]}>{spec}</Text>
                    <Text style={fm.checkCount}>{count}</Text>
                  </TouchableOpacity>
                );
              })}
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
                    <Text style={[fm.checkLabel, sel && { color:"#a78bfa" }]}>{lang}</Text>
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
};

// ── Expert Card ───────────────────────────────────────────────────────────────
const ExpertCard: React.FC<{
  expert: Expert; t: ReturnType<typeof useThemeStore>["t"]; isDark: boolean;
  onApply: ()=>void; onChat: ()=>void; onBook: ()=>void;
}> = ({ expert, t, isDark, onApply, onChat, onBook }) => {
  const stars = Math.round(expert.rating);
  const priceRs = expert.sessionPricePaise > 0 ? Math.round(expert.sessionPricePaise / 100) : 0;

  return (
    <View style={[ec.card, { backgroundColor:t.card, borderColor:t.border }]}>
      <View style={ec.topRow}>
        <View style={ec.avatarWrap}>
          {expert.localImg
            ? <Image source={expert.localImg} style={[ec.avatar, { borderColor:expert.color }]} />
            : expert.avatarUrl
              ? <Image source={{ uri:expert.avatarUrl }} style={[ec.avatar, { borderColor:expert.color }]} />
              : <View style={[ec.avatarFallback, { backgroundColor:expert.color }]}>
                  <Text style={ec.avatarInitial}>{expert.name[0]}</Text>
                </View>}
          <View style={[ec.onlineDot, {
            backgroundColor: expert.isOnline ? "#ef4444" : "#94a3b8",
            shadowColor: expert.isOnline ? "#ef4444" : "transparent",
            shadowOpacity: 0.7, shadowRadius: 4,
          }]} />
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

      <View style={[ec.statsRow, { backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }]}>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>⏱ {expert.exp||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>👥 {expert.sessions||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>🌐 {expert.languages.slice(0,2).join(", ")||"—"}</Text></View>
        <View style={ec.statCell}><Text style={[ec.statVal, { color:t.textMuted }]}>❤ {expert.followers>0?(expert.followers/1000).toFixed(1)+"k":"—"}</Text></View>
      </View>

      <View style={ec.ratingRow}>
        <View style={{ flexDirection:"row", alignItems:"center", gap:2 }}>
          {Array.from({ length:5 }).map((_,i) => (
            <Ionicons key={i} name={i < stars ? "star" : "star-outline"} size={12}
              color={i < stars ? "#f59e0b" : t.border} />
          ))}
          <Text style={{ color:t.textMuted, fontSize:12, marginLeft:3 }}>{expert.rating}</Text>
        </View>
        {expert.hasPayBooking && priceRs > 0 ? (
          <View style={{ alignItems:"flex-end" }}>
            <Text style={{ color:t.text, fontWeight:"800", fontSize:15 }}>₹{priceRs}</Text>
            <Text style={{ color:t.textMuted, fontSize:10 }}>/min</Text>
          </View>
        ) : (
          <View style={{ flexDirection:"row", alignItems:"center", gap:4 }}>
            <View style={{ width:7, height:7, borderRadius:4, backgroundColor:expert.isOnline?"#ef4444":"#94a3b8" }} />
            <Text style={{ color:expert.isOnline?"#ef4444":t.textMuted, fontSize:11, fontWeight:"600" }}>
              {expert.isOnline ? "Online" : "Offline"}
            </Text>
          </View>
        )}
      </View>

      <View style={ec.actions}>
        {expert.hasApplyBooking && (
          <TouchableOpacity style={[ec.applyBtn, { backgroundColor:expert.color }]} onPress={onApply}>
            <Text style={ec.applyBtnTxt}>✋ Apply for 1:1</Text>
          </TouchableOpacity>
        )}
        {(!expert.hasApplyBooking || expert.hasPayBooking) && (
          <View style={ec.btnRow}>
            <TouchableOpacity
              style={[ec.chatBtn, {
                borderColor: expert.isOnline ? "#ef4444" : t.border,
                backgroundColor: expert.isOnline ? "rgba(239,68,68,0.08)" : "transparent",
              }]}
              onPress={onChat}>
              <Ionicons name="chatbubble-outline" size={13} color={expert.isOnline ? "#ef4444" : t.textMuted} />
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ConsultationScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark, t } = useThemeStore();

  const HEADER_H = 120 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [experts, setExperts]         = useState<Expert[]>([]);
  const [loading, setLoading]         = useState(true);
  const [onlineOnly, setOnlineOnly]   = useState(false);
  const [filterSpecs, setFilterSpecs] = useState<string[]>([]);
  const [filterLangs, setFilterLangs] = useState<string[]>([]);
  const [showFilter, setShowFilter]   = useState(false);
  const [applying, setApplying]       = useState<Expert | null>(null);
  const [chatting, setChatting]     = useState<Expert | null>(null);

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

  const allSpecs = useMemo(() => {
    const fromExperts = experts.map(e => e.subject).filter(Boolean);
    return ["All", ...Array.from(new Set([...SPECIALTIES.slice(1), ...fromExperts]))];
  }, [experts]);

  const filtered = useMemo(() => {
    return experts.filter(e => {
      if (filterSpecs.length > 0 && !filterSpecs.includes(e.subject)) return false;
      if (filterLangs.length > 0 && !e.languages.some(l => filterLangs.includes(l))) return false;
      if (onlineOnly && !e.isOnline) return false;
      return true;
    });
  }, [experts, filterSpecs, filterLangs, onlineOnly]);

  const onlineCount = experts.filter(e => e.isOnline).length;
  const filterCount = filterSpecs.length + filterLangs.length + (onlineOnly ? 1 : 0);

  const handleApply = (expert: Expert) => {
    if (!user) {
      Alert.alert("Login Required","Please log in to apply for a session.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    setApplying(expert);
  };

  const handleBook = (expert: Expert) => {
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
  };

  return (
    <View style={[s.root, { backgroundColor:t.bg }]}>
      {/* ── Floating Header ── */}
      <Animated.View style={[s.header, { paddingTop:insets.top, backgroundColor:t.navBg, transform:[{translateY:headerTranslateY}] }]}>
        <View style={s.headerRow}>
          <Image source={bshLogoImg} style={s.logo} resizeMode="contain" />
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
            <Ionicons name="options-outline" size={18} color={filterCount > 0 ? "#a78bfa" : "rgba(255,255,255,0.7)"} />
            {filterCount > 0 && <Text style={s.filterBtnCount}>{filterCount}</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(user ? "/(tabs)/dashboard" : "/(auth)/login")}>
            {user?.avatar
              ? <Image source={{ uri:user.avatar }} style={s.avatar} />
              : <View style={s.avatarDefault}><Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Filter bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={s.filterScroll} contentContainerStyle={{ paddingHorizontal:16, gap:8, paddingBottom:12 }}>
          <TouchableOpacity
            style={[s.filterChip, onlineOnly && { backgroundColor:"rgba(239,68,68,0.15)", borderColor:"rgba(239,68,68,0.5)" }]}
            onPress={() => setOnlineOnly(v=>!v)}>
            <View style={[s.filterDot, { backgroundColor:onlineOnly?"#ef4444":"#94a3b8" }]} />
            <Text style={[s.filterChipTxt, { color:onlineOnly?"#ef4444":"rgba(255,255,255,0.65)" }]}>Online Only</Text>
          </TouchableOpacity>
          {LANGUAGES.map(lang => {
            const active = filterLangs.includes(lang);
            return (
              <TouchableOpacity key={lang}
                style={[s.filterChip, active && { backgroundColor:"rgba(124,58,237,0.2)", borderColor:"rgba(167,139,250,0.6)" }]}
                onPress={() => setFilterLangs(prev => active ? prev.filter(l => l !== lang) : [...prev, lang])}>
                <Text style={[s.filterChipTxt, { color:active?"#a78bfa":"rgba(255,255,255,0.65)" }]}>{lang}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      <ScrollView
        style={{ flex:1 }} showsVerticalScrollIndicator={false}
        onScroll={handleScroll} scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop:HEADER_H+8, paddingBottom:130, paddingHorizontal:16 }}>

        {/* Hero */}
        <View style={[s.heroCard, { backgroundColor:isDark?"rgba(124,58,237,0.12)":"rgba(124,58,237,0.06)", borderColor:t.border }]}>
          <Text style={[s.heroTitle, { color:t.text }]}>Talk To{"\n"}<Text style={s.heroAccent}>Expert Healers</Text></Text>
          <Text style={[s.heroSub, { color:t.textMuted }]}>
            India's finest hypnotherapists, shadow work experts & NLP coaches. Deeply personal. Completely confidential.
          </Text>
          <View style={s.heroTags}>
            {[["⭐","4.9 Rating"],["🔒","Confidential"],["⚡","24hr Response"],["💬","Chat Free"]].map(([ic,lb]) => (
              <View key={lb} style={[s.heroTag, { backgroundColor:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.05)" }]}>
                <Text style={[s.heroTagTxt, { color:t.textMuted }]}>{ic} {lb}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Specialty tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={{ marginBottom:16 }} contentContainerStyle={{ gap:8, paddingVertical:4 }}>
          {allSpecs.map(spec => {
            const active = spec === "All" ? filterSpecs.length === 0 : filterSpecs.includes(spec);
            return (
              <TouchableOpacity key={spec} onPress={() => {
                if (spec === "All") setFilterSpecs([]);
                else setFilterSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]);
              }}
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
              {filterSpecs.length === 0 ? "All Expert Healers" : filterSpecs.length === 1 ? filterSpecs[0] : `${filterSpecs.length} Specialties`}
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
            <ExpertCard key={expert._id} expert={expert} t={t} isDark={isDark}
              onApply={() => handleApply(expert)}
              onChat={() => setChatting(expert)}
              onBook={() => handleBook(expert)} />
          ))
        )}

        {/* Bottom CTA */}
        {!loading && filtered.length > 0 && (
          <View style={[s.ctaCard, { backgroundColor:isDark?"rgba(124,58,237,0.1)":"rgba(124,58,237,0.06)", borderColor:t.border }]}>
            <Text style={{ fontSize:32, marginBottom:8, textAlign:"center" }}>🙏</Text>
            <Text style={[s.ctaTitle, { color:t.text }]}>Not sure which expert is right?</Text>
            <Text style={[s.ctaSub, { color:t.textMuted }]}>Chat free and we'll match you with the perfect healer.</Text>
            <TouchableOpacity style={s.ctaBtn} onPress={() => { if (experts.length > 0) handleApply(experts[0]); }}>
              <Text style={s.ctaBtnTxt}>✨ Get Matched For Free</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {applying && <ApplyModal expert={applying} t={t} user={user} onClose={() => setApplying(null)} />}
      {chatting && <LiveChatModal expert={chatting} t={t} user={user} onClose={() => setChatting(null)} />}
      <FilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        allSpecs={allSpecs}
        experts={experts}
        filterSpecs={filterSpecs}
        filterLangs={filterLangs}
        onlineOnly={onlineOnly}
        onToggleSpec={spec => setFilterSpecs(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec])}
        onToggleLang={lang => setFilterLangs(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])}
        onToggleOnline={() => setOnlineOnly(v => !v)}
        onReset={() => { setFilterSpecs([]); setFilterLangs([]); setOnlineOnly(false); }}
      />
    </View>
  );
}

const fm = StyleSheet.create({
  backdrop:    { flex:1, backgroundColor:"rgba(4,3,14,0.85)", justifyContent:"flex-end" },
  sheet:       { backgroundColor:"#12112a", borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:"80%", paddingBottom:32 },
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
  checkboxSel: { backgroundColor:"#7c3aed", borderColor:"#7c3aed" },
  checkLabel:  { flex:1, color:"rgba(255,255,255,0.85)", fontSize:14, fontWeight:"600" },
  checkCount:  { color:"rgba(255,255,255,0.35)", fontSize:12, fontWeight:"600" },
});

const lc = StyleSheet.create({
  sheet:        { borderTopLeftRadius:24, borderTopRightRadius:24, overflow:"hidden", height:560 },
  header:       { flexDirection:"row", alignItems:"center", gap:12, padding:16, backgroundColor:"#6d28d9" },
  headerAvatar: { width:38, height:38, borderRadius:19, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  headerAvatarTxt: { color:"#fff", fontWeight:"800", fontSize:15 },
  headerName:   { color:"#fff", fontWeight:"800", fontSize:15 },
  headerStatus: { color:"rgba(255,255,255,0.75)", fontSize:11 },
  body:         { flex:1, padding:14 },
  bubble:       { maxWidth:"78%", paddingHorizontal:13, paddingVertical:9, borderRadius:16 },
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

const ec = StyleSheet.create({
  card:         { borderRadius:16, padding:16, marginBottom:14, borderWidth:1 },
  topRow:       { flexDirection:"row", gap:12, marginBottom:12 },
  avatarWrap:   { position:"relative", width:64, height:64 },
  avatar:       { width:62, height:62, borderRadius:31, borderWidth:2.5 },
  avatarFallback: { width:62, height:62, borderRadius:31, borderWidth:2.5, alignItems:"center", justifyContent:"center", borderColor:"transparent" },
  avatarInitial: { color:"#fff", fontSize:24, fontWeight:"900" },
  onlineDot:    { position:"absolute", bottom:2, right:2, width:13, height:13, borderRadius:7, borderWidth:2, borderColor:"#fff", shadowOffset:{width:0,height:0} },
  name:         { fontWeight:"800", fontSize:14, flex:1 },
  role:         { fontSize:11, marginBottom:4 },
  subjectChip:  { alignSelf:"flex-start", borderRadius:20, paddingHorizontal:8, paddingVertical:2, borderWidth:1 },
  subjectTxt:   { fontSize:10, fontWeight:"700" },
  statsRow:     { flexDirection:"row", borderRadius:10, paddingVertical:8, paddingHorizontal:10, marginBottom:10 },
  statCell:     { flex:1, alignItems:"center" },
  statVal:      { fontSize:10, fontWeight:"600", textAlign:"center" },
  ratingRow:    { flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:12 },
  actions:      { gap:8 },
  applyBtn:     { borderRadius:50, paddingVertical:10, alignItems:"center" },
  applyBtnTxt:  { color:"#fff", fontWeight:"700", fontSize:13 },
  btnRow:       { flexDirection:"row", gap:8 },
  chatBtn:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, borderWidth:1.5, borderRadius:50, paddingVertical:9 },
  chatBtnTxt:   { fontWeight:"700", fontSize:12 },
  bookBtn:      { flex:1, flexDirection:"row", alignItems:"center", justifyContent:"center", gap:5, backgroundColor:"#7c3aed", borderRadius:50, paddingVertical:9 },
  bookBtnTxt:   { color:"#fff", fontWeight:"700", fontSize:12 },
});

const s = StyleSheet.create({
  root: { flex:1 },
  header: {
    position:"absolute", top:0, left:0, right:0, zIndex:100,
    elevation:10, shadowColor:"#000", shadowOpacity:0.3, shadowRadius:12, shadowOffset:{width:0,height:5},
    paddingHorizontal:16, paddingBottom:0,
  },
  headerRow:  { flexDirection:"row", alignItems:"center", gap:10, paddingTop:10, marginBottom:10 },
  logo:       { width:34, height:34, borderRadius:8 },
  headerTitle:{ color:"#fff", fontSize:17, fontWeight:"800" },
  headerSub:  { color:"rgba(255,255,255,0.65)", fontSize:11 },
  onlineBadge:{ flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(239,68,68,0.18)", borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:"rgba(239,68,68,0.4)" },
  onlineDot:  { width:7, height:7, borderRadius:4, backgroundColor:"#ef4444" },
  onlineTxt:  { color:"#f87171", fontSize:10, fontWeight:"800" },
  avatar:     { width:34, height:34, borderRadius:17, borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarDefault: { width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center", borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarInitial: { color:"#fff", fontWeight:"800", fontSize:14 },

  filterScroll: { borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.12)", paddingTop:10 },
  filterChip:    { flexDirection:"row", alignItems:"center", gap:5, paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, borderColor:"rgba(255,255,255,0.2)" },
  filterDot:     { width:7, height:7, borderRadius:4 },
  filterChipTxt: { fontSize:12, fontWeight:"600" },
  filterBtn:      { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:3, width:38, height:38, borderRadius:19, borderWidth:1.5, borderColor:"rgba(255,255,255,0.2)" },
  filterBtnActive:{ borderColor:"rgba(167,139,250,0.6)", backgroundColor:"rgba(124,58,237,0.2)" },
  filterBtnCount: { color:"#a78bfa", fontSize:10, fontWeight:"800" },

  heroCard:  { borderRadius:18, padding:20, marginBottom:20, borderWidth:1 },
  heroTitle: { fontSize:26, fontWeight:"900", lineHeight:32, marginBottom:8 },
  heroAccent:{ color:"#7c3aed" },
  heroSub:   { fontSize:13, lineHeight:20, marginBottom:14 },
  heroTags:  { flexDirection:"row", flexWrap:"wrap", gap:8 },
  heroTag:   { borderRadius:20, paddingHorizontal:10, paddingVertical:5 },
  heroTagTxt:{ fontSize:11, fontWeight:"600" },

  specTab:    { borderRadius:50, paddingHorizontal:14, paddingVertical:6, borderWidth:1.5, borderColor:"rgba(100,100,100,0.3)" },
  specTabTxt: { fontSize:12, fontWeight:"600" },

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
  ctaBtn:    { backgroundColor:"#7c3aed", borderRadius:50, paddingHorizontal:28, paddingVertical:13 },
  ctaBtnTxt: { color:"#fff", fontWeight:"800", fontSize:14 },
});
