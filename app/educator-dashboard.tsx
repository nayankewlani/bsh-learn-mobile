import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, Modal, RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../stores/authStore";
import { COLORS } from "../constants";
import client from "../api/client";

type Tab = "applications" | "sessions" | "messages" | "earnings";

interface Analytics { totalStudents: number; totalRevenuePaise: number; totalLiveClasses: number; }
interface MyApplication {
  _id: string; clientName: string; clientPhone: string; clientEmail?: string;
  issue: string; preferredTime?: string; message?: string;
  status: string; proposedSchedule?: string; agoraChannel?: string; createdAt: string;
}
interface SessionBooking {
  _id: string; client: { name: string; email: string };
  amount: number; status: string; clientNote?: string;
  confirmedSlot?: { datetime: string; duration: number }; createdAt: string;
}
interface Payout {
  _id: string; course: { title: string }; student: { name: string; email: string };
  totalPaise: number; gstPaise: number; netPaise: number; trainerSharePaise: number;
  status: "pending" | "paid"; paidAt?: string; createdAt: string;
}
interface Conversation {
  _id: string; user: { _id: string; name: string; isOnline?: boolean };
  lastMessage?: { text: string; createdAt: string }; unread: number;
}
interface ChatMsg { _id: string; sender: { _id: string; name: string }; text: string; createdAt: string; }
interface MyLiveClass { _id: string; title: string; status: string; scheduledAt: string; educator: { _id: string } | string; }

const fmt = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function EducatorDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<Tab>("applications");
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(!!(user as any)?.isOnline);
  const [togglingOnline, setTogglingOnline] = useState(false);

  const [myApps, setMyApps] = useState<MyApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [proposingAppId, setProposingAppId] = useState<string | null>(null);
  const [appSchedule, setAppSchedule] = useState("");
  const [appNote, setAppNote] = useState("");
  const [appSubmitting, setAppSubmitting] = useState(false);

  const [sessionBookings, setSessionBookings] = useState<SessionBooking[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [proposingId, setProposingId] = useState<string | null>(null);
  const [slotDate, setSlotDate] = useState("");
  const [slotDuration, setSlotDuration] = useState(60);
  const [proposing, setProposing] = useState(false);

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [earningsTab, setEarningsTab] = useState<"pending" | "paid">("pending");
  const [pendingTotal, setPendingTotal] = useState(0);
  const [paidTotal, setPaidTotal] = useState(0);
  const [earningsLoading, setEarningsLoading] = useState(false);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openChat, setOpenChat] = useState<{ id: string; name: string; online: boolean } | null>(null);

  const [myLiveClasses, setMyLiveClasses] = useState<MyLiveClass[]>([]);
  const [myClassesLoading, setMyClassesLoading] = useState(false);

  const loadAnalytics = useCallback(() => {
    setLoading(true);
    client.get("/educator/analytics").then(r => setAnalytics(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const loadApps = useCallback(() => {
    setAppsLoading(true);
    client.get("/session-applications/for-trainer").then(r => setMyApps(r.data.applications ?? [])).catch(() => {}).finally(() => setAppsLoading(false));
  }, []);

  const loadMyLiveClasses = useCallback(() => {
    setMyClassesLoading(true);
    Promise.all([client.get("/live-classes?status=scheduled"), client.get("/live-classes?status=live")])
      .then(([scheduled, live]) => {
        const all: MyLiveClass[] = [...(live.data.classes ?? []), ...(scheduled.data.classes ?? [])];
        const mine = all.filter(c => {
          const eduId = typeof c.educator === "object" ? c.educator._id : c.educator;
          return eduId === user?._id;
        });
        setMyLiveClasses(mine);
      })
      .catch(() => {})
      .finally(() => setMyClassesLoading(false));
  }, [user?._id]);

  const goLive = async (classId: string) => {
    router.push({ pathname: "/live-room" as any, params: { classId } });
  };

  const loadSessions = useCallback(() => {
    setSessionsLoading(true);
    client.get("/session-bookings/for-me").then(r => setSessionBookings(r.data.bookings ?? [])).catch(() => {}).finally(() => setSessionsLoading(false));
  }, []);

  const loadEarnings = useCallback(() => {
    setEarningsLoading(true);
    client.get("/educator/earnings").then(r => {
      setPayouts(r.data.payouts ?? []); setPendingTotal(r.data.pendingTotal ?? 0); setPaidTotal(r.data.paidTotal ?? 0);
    }).catch(() => {}).finally(() => setEarningsLoading(false));
  }, []);

  const loadConversations = useCallback(() => {
    setConvsLoading(true);
    client.get("/chat/conversations").then(r => setConversations(r.data.conversations ?? [])).catch(() => {}).finally(() => setConvsLoading(false));
  }, []);

  const refreshUnread = useCallback(() => {
    client.get("/chat/unread-count").then(r => setUnreadCount(r.data.count ?? 0)).catch(() => {});
  }, []);

  useEffect(() => { loadAnalytics(); loadApps(); loadMyLiveClasses(); refreshUnread(); }, []);

  useEffect(() => {
    if (activeTab === "sessions") loadSessions();
    if (activeTab === "earnings") loadEarnings();
    if (activeTab === "messages") loadConversations();
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
    loadMyLiveClasses();
    if (activeTab === "applications") loadApps();
    if (activeTab === "sessions") loadSessions();
    if (activeTab === "earnings") loadEarnings();
    if (activeTab === "messages") loadConversations();
    setTimeout(() => setRefreshing(false), 600);
  };

  const toggleOnline = async () => {
    setTogglingOnline(true);
    const next = !isOnline;
    try {
      await client.put("/educator/online-status", { isOnline: next });
      setIsOnline(next);
    } catch { Alert.alert("Error", "Could not update online status."); }
    finally { setTogglingOnline(false); }
  };

  const proposeAppSchedule = async (appId: string) => {
    if (!appSchedule.trim()) return;
    setAppSubmitting(true);
    try {
      await client.patch(`/session-applications/${appId}/propose`, { proposedSchedule: appSchedule.trim(), trainerNote: appNote.trim() });
      setProposingAppId(null); setAppSchedule(""); setAppNote("");
      loadApps();
    } catch (e: any) { Alert.alert("Error", e?.response?.data?.message ?? "Failed to propose schedule"); }
    finally { setAppSubmitting(false); }
  };

  const proposeSlot = async (bookingId: string) => {
    if (!slotDate.trim()) return;
    setProposing(true);
    try {
      await client.post(`/session-bookings/${bookingId}/propose`, { slots: [{ datetime: slotDate.trim(), duration: slotDuration }] });
      await client.post(`/session-bookings/${bookingId}/share`);
      setProposingId(null); setSlotDate(""); setSlotDuration(60);
      loadSessions();
    } catch (e: any) { Alert.alert("Error", e?.response?.data?.message ?? "Failed to propose slot"); }
    finally { setProposing(false); }
  };

  if (!user || user.role !== "educator") {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: COLORS.textMuted }}>Educator access only.</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}><Text style={s.backBtnTxt}>Go Back</Text></TouchableOpacity>
      </View>
    );
  }

  const stats = analytics ? [
    { label: "Total Students", value: String(analytics.totalStudents), icon: "people-outline" as const, color: "#a78bfa" },
    { label: "Pending Income", value: fmt(pendingTotal), icon: "cash-outline" as const, color: "#4ade80" },
    { label: "Live Classes", value: String(analytics.totalLiveClasses), icon: "videocam-outline" as const, color: "#f59e0b" },
  ] : [];

  const filteredPayouts = payouts.filter(p => p.status === earningsTab);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Educator Dashboard</Text>
          <Text style={s.headerSub}>Hello, {user.name}</Text>
        </View>
        <TouchableOpacity style={s.scheduleBtn} onPress={() => router.push("/schedule-live" as any)}>
          <Text style={s.scheduleBtnTxt}>Schedule Live</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.onlineBtn, { borderColor: isOnline ? "#22c55e" : "#6b7280" }]} onPress={toggleOnline} disabled={togglingOnline}>
          <View style={[s.onlineDot, { backgroundColor: isOnline ? "#22c55e" : "#9ca3af" }]} />
          <Text style={[s.onlineTxt, { color: isOnline ? "#22c55e" : "#9ca3af" }]}>
            {togglingOnline ? "…" : isOnline ? "Online" : "Go Online"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}>
        {loading ? (
          <ActivityIndicator color={COLORS.primaryLight} size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={s.statsRow}>
              {stats.map(st => (
                <View key={st.label} style={s.statCard}>
                  <Ionicons name={st.icon} size={20} color={st.color} />
                  <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.statLabel}>{st.label}</Text>
                </View>
              ))}
            </View>

            {!myClassesLoading && myLiveClasses.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
                <Text style={s.liveClassesTitle}>My Live Classes</Text>
                {myLiveClasses.map(cls => (
                  <View key={cls._id} style={s.liveClassRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.liveClassTitle} numberOfLines={1}>{cls.title}</Text>
                      <Text style={s.cardMeta}>
                        {cls.status === "live" ? "🔴 Live now" : new Date(cls.scheduledAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                      </Text>
                    </View>
                    <TouchableOpacity style={[s.goLiveBtn, cls.status === "live" && { backgroundColor: "#ef4444" }]} onPress={() => goLive(cls._id)}>
                      <Text style={s.goLiveBtnTxt}>{cls.status === "live" ? "Resume" : "Go Live"}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabRow}>
              {([
                { key: "applications", label: `✋ Applications${myApps.filter(a => a.status === "pending").length > 0 ? ` (${myApps.filter(a => a.status === "pending").length})` : ""}` },
                { key: "sessions", label: "📅 Sessions" },
                { key: "messages", label: `💬 Messages${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
                { key: "earnings", label: "💰 Earnings" },
              ] as const).map(t => (
                <TouchableOpacity key={t.key} style={[s.tabChip, activeTab === t.key && s.tabChipActive]} onPress={() => setActiveTab(t.key)}>
                  <Text style={[s.tabChipTxt, activeTab === t.key && s.tabChipTxtActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ padding: 16 }}>
              {activeTab === "applications" && (
                appsLoading ? <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 30 }} /> :
                myApps.length === 0 ? <EmptyBox icon="hand-left-outline" text="No 1:1 session applications yet." /> :
                myApps.map(a => {
                  const statusColor = a.status === "approved" ? "#22c55e" : a.status === "rejected" ? "#ef4444" : a.status === "trainer_proposed" ? "#f59e0b" : "#60a5fa";
                  return (
                    <View key={a._id} style={s.card}>
                      <View style={s.cardTopRow}>
                        <Text style={s.cardName}>{a.clientName}</Text>
                        <View style={[s.statusPill, { backgroundColor: statusColor + "22" }]}>
                          <Text style={[s.statusPillTxt, { color: statusColor }]}>{a.status.replace("_", " ")}</Text>
                        </View>
                      </View>
                      <Text style={s.cardMeta}>{a.clientPhone}{a.clientEmail ? ` · ${a.clientEmail}` : ""}</Text>
                      <View style={s.issueBox}>
                        <Text style={s.issueLabel}>WHAT THEY WANT TO WORK ON</Text>
                        <Text style={s.issueTxt}>{a.issue}</Text>
                        {!!a.preferredTime && <Text style={s.issueSub}>Preferred time: {a.preferredTime}</Text>}
                      </View>
                      {a.status === "trainer_proposed" && (
                        <Text style={s.proposedNote}>⏳ Proposed: {a.proposedSchedule} — awaiting admin approval</Text>
                      )}
                      {a.status === "approved" && (
                        <Text style={[s.proposedNote, { color: "#22c55e" }]}>✅ Approved — use the web dashboard to start this live session.</Text>
                      )}
                      {a.status === "pending" && (
                        proposingAppId === a._id ? (
                          <View>
                            <TextInput value={appSchedule} onChangeText={setAppSchedule} placeholder="e.g. Saturday 5 PM – 6 PM IST"
                              placeholderTextColor={COLORS.textMuted} style={s.input} />
                            <TextInput value={appNote} onChangeText={setAppNote} placeholder="Note to admin (optional)"
                              placeholderTextColor={COLORS.textMuted} style={s.input} />
                            <View style={{ flexDirection: "row", gap: 8 }}>
                              <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} disabled={appSubmitting || !appSchedule.trim()} onPress={() => proposeAppSchedule(a._id)}>
                                {appSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Submit to Admin</Text>}
                              </TouchableOpacity>
                              <TouchableOpacity style={s.ghostBtn} onPress={() => { setProposingAppId(null); setAppSchedule(""); setAppNote(""); }}>
                                <Text style={s.ghostBtnTxt}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity style={s.outlineBtn} onPress={() => { setProposingAppId(a._id); setAppSchedule(""); setAppNote(""); }}>
                            <Text style={s.outlineBtnTxt}>📅 Propose Schedule → Send to Admin</Text>
                          </TouchableOpacity>
                        )
                      )}
                    </View>
                  );
                })
              )}

              {activeTab === "sessions" && (
                sessionsLoading ? <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 30 }} /> :
                sessionBookings.length === 0 ? <EmptyBox icon="calendar-outline" text="No 1:1 sessions booked yet." /> :
                sessionBookings.map(b => (
                  <View key={b._id} style={s.card}>
                    <View style={s.cardTopRow}>
                      <Text style={s.cardName}>{b.client.name}</Text>
                      <View style={[s.statusPill, { backgroundColor: "#7c3aed22" }]}>
                        <Text style={[s.statusPillTxt, { color: "#a78bfa" }]}>{b.status.replace(/_/g, " ")}</Text>
                      </View>
                    </View>
                    <Text style={s.cardMeta}>{b.client.email} · ₹{(b.amount / 100).toLocaleString("en-IN")}</Text>
                    {!!b.clientNote && <Text style={s.cardMeta}>Note: {b.clientNote}</Text>}
                    {b.confirmedSlot && (
                      <Text style={[s.proposedNote, { color: "#22c55e" }]}>
                        ✅ Confirmed: {new Date(b.confirmedSlot.datetime).toLocaleString("en-IN")} · {b.confirmedSlot.duration} min
                      </Text>
                    )}
                    {b.status === "paid" && (
                      proposingId === b._id ? (
                        <View>
                          <TextInput value={slotDate} onChangeText={setSlotDate} placeholder="e.g. 2026-07-05 17:00"
                            placeholderTextColor={COLORS.textMuted} style={s.input} />
                          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                            {[30, 45, 60, 90, 120].map(d => (
                              <TouchableOpacity key={d} style={[s.durChip, slotDuration === d && s.durChipActive]} onPress={() => setSlotDuration(d)}>
                                <Text style={[s.durChipTxt, slotDuration === d && s.durChipTxtActive]}>{d}m</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity style={[s.primaryBtn, { flex: 1 }]} disabled={proposing || !slotDate.trim()} onPress={() => proposeSlot(b._id)}>
                              {proposing ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Propose & Send to Admin</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={s.ghostBtn} onPress={() => setProposingId(null)}>
                              <Text style={s.ghostBtnTxt}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity style={s.outlineBtn} onPress={() => { setProposingId(b._id); setSlotDate(""); setSlotDuration(60); }}>
                          <Text style={s.outlineBtnTxt}>Propose Time Slot</Text>
                        </TouchableOpacity>
                      )
                    )}
                  </View>
                ))
              )}

              {activeTab === "messages" && (
                convsLoading ? <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 30 }} /> :
                conversations.length === 0 ? <EmptyBox icon="chatbubble-outline" text="No messages yet. Go online so students can message you." /> :
                conversations.map(c => (
                  <TouchableOpacity key={c._id} style={s.convRow}
                    onPress={() => setOpenChat({ id: c.user._id, name: c.user.name, online: !!c.user.isOnline })}>
                    <View style={s.convAvatar}><Text style={s.convAvatarTxt}>{c.user.name?.[0]?.toUpperCase() ?? "?"}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.convName}>{c.user.name}</Text>
                      <Text style={s.convLast} numberOfLines={1}>{c.lastMessage?.text ?? "No messages yet"}</Text>
                    </View>
                    {c.unread > 0 && <View style={s.unreadBadge}><Text style={s.unreadBadgeTxt}>{c.unread}</Text></View>}
                  </TouchableOpacity>
                ))
              )}

              {activeTab === "earnings" && (
                <View>
                  <View style={s.earningsInfo}>
                    <Text style={s.earningsInfoTxt}>Sale price → 18% GST deducted → remaining split 50% to you + 50% to admin</Text>
                    <View style={{ flexDirection: "row", gap: 20, marginTop: 10 }}>
                      <View><Text style={s.earnLabel}>Pending</Text><Text style={[s.earnVal, { color: "#4ade80" }]}>{fmt(pendingTotal)}</Text></View>
                      <View><Text style={s.earnLabel}>Received</Text><Text style={[s.earnVal, { color: "#60a5fa" }]}>{fmt(paidTotal)}</Text></View>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    {(["pending", "paid"] as const).map(t => (
                      <TouchableOpacity key={t} style={[s.tabChip, earningsTab === t && s.tabChipActive]} onPress={() => setEarningsTab(t)}>
                        <Text style={[s.tabChipTxt, earningsTab === t && s.tabChipTxtActive]}>{t === "pending" ? "⏳ Pending" : "✅ Received"}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {earningsLoading ? <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 30 }} /> :
                  filteredPayouts.length === 0 ? <EmptyBox icon="cash-outline" text={earningsTab === "pending" ? "No pending payments." : "No received payments yet."} /> :
                  filteredPayouts.map(p => (
                    <View key={p._id} style={s.card}>
                      <Text style={s.cardName}>{p.course.title}</Text>
                      <Text style={s.cardMeta}>{p.student.name} · {p.student.email}</Text>
                      <View style={s.payoutRow}>
                        <Text style={s.payoutLabel}>Sale: {fmt(p.totalPaise)}</Text>
                        <Text style={[s.payoutLabel, { color: "#f87171" }]}>−GST {fmt(p.gstPaise)}</Text>
                      </View>
                      <Text style={s.payoutShare}>Your share: {fmt(p.trainerSharePaise)}</Text>
                      <Text style={s.cardMeta}>{p.status === "paid" && p.paidAt ? `Paid ${new Date(p.paidAt).toLocaleDateString("en-IN")}` : new Date(p.createdAt).toLocaleDateString("en-IN")}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {openChat && (
        <TrainerChatModal expert={openChat} onClose={() => { setOpenChat(null); loadConversations(); refreshUnread(); }} />
      )}
    </View>
  );
}

const EmptyBox: React.FC<{ icon: React.ComponentProps<typeof Ionicons>["name"]; text: string }> = ({ icon, text }) => (
  <View style={s.emptyBox}>
    <Ionicons name={icon} size={36} color={COLORS.textMuted} />
    <Text style={s.emptyTxt}>{text}</Text>
  </View>
);

const TrainerChatModal: React.FC<{ expert: { id: string; name: string; online: boolean }; onClose: () => void }> = ({ expert, onClose }) => {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try { const { data } = await client.get(`/chat/messages/${expert.id}`); setMessages(data.messages ?? []); } catch {} finally { setLoading(false); }
  }, [expert.id]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchMessages]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try { const { data } = await client.post(`/chat/messages/${expert.id}`, { text: text.trim() }); setMessages(prev => [...prev, data.message]); setText(""); } catch {} finally { setSending(false); }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={cm.backdrop}>
        <View style={cm.sheet}>
          <View style={cm.header}>
            <View style={cm.headerAvatar}><Text style={cm.headerAvatarTxt}>{expert.name[0]}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={cm.headerName}>{expert.name}</Text>
              <Text style={cm.headerStatus}>{expert.online ? "Online" : "Offline"}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={cm.closeBtn}><Ionicons name="close" size={18} color="#fff" /></TouchableOpacity>
          </View>
          <ScrollView ref={scrollRef} style={cm.body} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
            {loading && <Text style={{ textAlign: "center", color: COLORS.textMuted, marginTop: 32 }}>Loading...</Text>}
            {!loading && messages.length === 0 && <Text style={{ textAlign: "center", color: COLORS.textMuted, marginTop: 32 }}>No messages yet</Text>}
            {messages.map(m => {
              const isMe = m.sender?._id === user?._id;
              return (
                <View key={m._id} style={{ flexDirection: "row", justifyContent: isMe ? "flex-end" : "flex-start", marginBottom: 8 }}>
                  <View style={[cm.bubble, { backgroundColor: isMe ? "#7c3aed" : COLORS.surface2 }]}>
                    <Text style={{ color: "#fff", fontSize: 13 }}>{m.text}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          <View style={cm.inputRow}>
            <TextInput value={text} onChangeText={setText} placeholder="Type a reply…" placeholderTextColor={COLORS.textMuted} style={cm.input} />
            <TouchableOpacity onPress={send} disabled={sending || !text.trim()} style={[cm.sendBtn, { backgroundColor: text.trim() ? "#7c3aed" : COLORS.border }]}>
              <Ionicons name="send" size={15} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", gap: 14 },
  backBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnTxt: { color: COLORS.primaryLight, fontWeight: "700" },

  header: { flexDirection: "row", alignItems: "center", gap: 10, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerBack: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  headerSub: { color: COLORS.textMuted, fontSize: 12 },
  scheduleBtn: { backgroundColor: COLORS.surface2, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  scheduleBtnTxt: { color: COLORS.primaryLight, fontWeight: "700", fontSize: 12 },
  onlineBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  onlineTxt: { fontSize: 12, fontWeight: "700" },

  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 16 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, alignItems: "flex-start", gap: 6 },
  statVal: { fontSize: 18, fontWeight: "900" },
  statLabel: { color: COLORS.textMuted, fontSize: 11 },

  liveClassesTitle: { color: COLORS.text, fontWeight: "800", fontSize: 14, marginBottom: 8, marginTop: 4 },
  liveClassRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 12, marginBottom: 8 },
  liveClassTitle: { color: COLORS.text, fontWeight: "700", fontSize: 13 },
  goLiveBtn: { backgroundColor: "#7c3aed", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  goLiveBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 12 },
  tabRow: { paddingHorizontal: 16, paddingTop: 16, gap: 8 },
  tabChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  tabChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  tabChipTxt: { color: COLORS.textMuted, fontSize: 12, fontWeight: "700" },
  tabChipTxtActive: { color: "#fff" },

  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardName: { color: COLORS.text, fontWeight: "800", fontSize: 14 },
  cardMeta: { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusPillTxt: { fontSize: 10, fontWeight: "800" },
  issueBox: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 10 },
  issueLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 0.5, marginBottom: 4 },
  issueTxt: { color: COLORS.text, fontSize: 13 },
  issueSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 6 },
  proposedNote: { color: "#f59e0b", fontSize: 12, backgroundColor: "rgba(245,158,11,0.08)", padding: 8, borderRadius: 8, marginTop: 4 },

  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, fontSize: 13, color: COLORS.text, backgroundColor: COLORS.bg, marginBottom: 8 },
  primaryBtn: { backgroundColor: "#7c3aed", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  primaryBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  ghostBtn: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11 },
  ghostBtnTxt: { color: COLORS.textMuted, fontWeight: "600", fontSize: 13 },
  outlineBtn: { borderWidth: 1, borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.1)", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 4 },
  outlineBtnTxt: { color: COLORS.primaryLight, fontWeight: "700", fontSize: 13 },
  durChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  durChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  durChipTxt: { color: COLORS.textMuted, fontSize: 12 },
  durChipTxtActive: { color: "#fff" },

  convRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 14, marginBottom: 8 },
  convAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" },
  convAvatarTxt: { color: "#fff", fontWeight: "800" },
  convName: { color: COLORS.text, fontWeight: "700", fontSize: 14 },
  convLast: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  unreadBadge: { backgroundColor: "#ef4444", borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "800" },

  earningsInfo: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginBottom: 16 },
  earningsInfoTxt: { color: COLORS.primaryLight, fontSize: 12, lineHeight: 18 },
  earnLabel: { color: COLORS.textMuted, fontSize: 11 },
  earnVal: { fontSize: 17, fontWeight: "800" },
  payoutRow: { flexDirection: "row", gap: 14, marginTop: 4 },
  payoutLabel: { color: COLORS.textMuted, fontSize: 12 },
  payoutShare: { color: COLORS.primaryLight, fontWeight: "800", fontSize: 14, marginTop: 4, marginBottom: 4 },

  emptyBox: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyTxt: { color: COLORS.textMuted, fontSize: 13, textAlign: "center", paddingHorizontal: 20 },
});

const cm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { height: "75%", backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, backgroundColor: "#6d28d9" },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  headerAvatarTxt: { color: "#fff", fontWeight: "800" },
  headerName: { color: "#fff", fontWeight: "800", fontSize: 15 },
  headerStatus: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, padding: 14 },
  bubble: { maxWidth: "78%", paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16 },
  inputRow: { flexDirection: "row", gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text, fontSize: 13 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
});
