import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput,
  ActivityIndicator, Alert, Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../constants";
import client from "../api/client";

type AccessType = "free" | "course" | "session";

interface Course { _id: string; title: string; }
interface LiveClassInfo { status: string; agoraChannel?: string; }
interface ConsultBooking {
  _id: string; trainerName: string; sessions: number; bonusSessions: number;
  durationMins: number; totalPaise: number; status: string; clientNote?: string;
  preferredTime?: string; createdAt: string;
  client?: { name: string; email: string };
  liveClassId?: LiveClassInfo;
}
interface LivePermission {
  status: "pending" | "approved" | "rejected" | "expired";
  expiresAt?: string;
}

const ACCESS_OPTIONS: { key: AccessType; icon: string; title: string; desc: string }[] = [
  { key: "free",    icon: "🌍", title: "Free for Everyone", desc: "Open to all — great for demos" },
  { key: "course",  icon: "🔒", title: "Course Students",   desc: "Enrolled students only" },
  { key: "session", icon: "👤", title: "1:1 Sessions",      desc: "Booked sessions" },
];

export default function ScheduleLiveScreen() {
  const insets = useSafeAreaInsets();
  const [accessType, setAccessType] = useState<AccessType>("free");
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("60");
  const [startNow, setStartNow] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(""); // "YYYY-MM-DD HH:mm"
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [bookings, setBookings] = useState<ConsultBooking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [sessionDates, setSessionDates] = useState<Record<string, string>>({});

  const [livePermission, setLivePermission] = useState<LivePermission | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permChecking, setPermChecking] = useState(true);
  const [permReason, setPermReason] = useState("");

  useEffect(() => {
    client.get("/educator/courses").then(r => setCourses(r.data.courses ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (accessType !== "session") return;
    setBookingsLoading(true);
    client.get("/consultation-bookings/for-trainer").then(r => setBookings(r.data.bookings ?? [])).catch(() => {}).finally(() => setBookingsLoading(false));
  }, [accessType]);

  const loadPermission = () => {
    setPermChecking(true);
    client.get("/educator/live-permission-status").then(r => setLivePermission(r.data.permission)).catch(() => {}).finally(() => setPermChecking(false));
  };

  useEffect(() => {
    if (accessType === "free") loadPermission();
  }, [accessType]);

  const hasFreeAccess = !!(livePermission?.status === "approved" && livePermission.expiresAt && new Date(livePermission.expiresAt) > new Date());

  const requestPermission = async () => {
    setPermLoading(true);
    try {
      const { data } = await client.post("/educator/request-live-permission", { reason: permReason.trim() });
      setLivePermission(data.permission);
      Alert.alert("Request Submitted", "Admin has been notified. You'll get a notification once approved.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to submit request");
    } finally { setPermLoading(false); }
  };

  const handleSubmit = async () => {
    setError("");
    if (!title.trim()) { setError("Title is required"); return; }
    if (accessType === "course" && !courseId) { setError("Please select a course"); return; }
    if (!startNow && !scheduledAt.trim()) { setError("Please enter a scheduled date & time"); return; }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        duration: Number(duration) || 60,
        scheduledAt: startNow ? new Date().toISOString() : new Date(scheduledAt).toISOString(),
      };
      if (accessType === "course" && courseId) payload.course = courseId;
      await client.post("/live-classes", payload);
      setSubmitted(true);
    } catch (err: any) {
      const code = err?.response?.data?.code;
      if (code === "FREE_LIVE_PERMISSION_REQUIRED") {
        setError("Free live classes need admin permission first. Request it, then try again.");
      } else {
        setError(err?.response?.data?.message ?? "Failed to schedule class");
      }
    } finally { setSubmitting(false); }
  };

  const requestLive = async (booking: ConsultBooking) => {
    setRequestingId(booking._id);
    try {
      const dateStr = sessionDates[booking._id];
      const { data } = await client.post(`/consultation-bookings/${booking._id}/request-live`, {
        title: `1:1 Session — ${booking.trainerName} × ${booking.client?.name ?? "Client"}`,
        scheduledAt: dateStr ? new Date(dateStr).toISOString() : undefined,
      });
      setBookings(prev => prev.map(b => b._id === booking._id ? { ...b, status: "scheduled", liveClassId: data.liveClass } : b));
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to request live class");
    } finally { setRequestingId(null); }
  };

  const pillFor = (b: ConsultBooking) => {
    const lc = b.liveClassId;
    if (!lc) return b.status === "paid" ? { label: "Paid – Awaiting Schedule", color: "#f59e0b" } : { label: b.status, color: COLORS.textMuted };
    if (lc.status === "pending_approval") return { label: "⏳ Pending Admin Approval", color: "#f59e0b" };
    if (lc.status === "scheduled") return { label: "✅ Ready – Approved", color: "#22c55e" };
    if (lc.status === "live") return { label: "🔴 Live Now", color: "#ef4444" };
    if (lc.status === "ended") return { label: "Ended", color: COLORS.textMuted };
    if (lc.status === "rejected") return { label: "Rejected", color: "#ef4444" };
    return { label: lc.status, color: COLORS.textMuted };
  };

  if (submitted) {
    return (
      <View style={[s.center, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 56, marginBottom: 16 }}>⏳</Text>
        <Text style={s.successTitle}>Request Submitted!</Text>
        <Text style={s.successTxt}>Your live class request has been sent to the admin for approval. You'll be able to start it once approved.</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace("/(tabs)/live" as any)}>
          <Text style={s.primaryBtnTxt}>View My Classes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBack}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Request Live Class</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        <Text style={s.sub}>Schedule a live class — admin will approve before you can go live</Text>

        <Text style={s.label}>Who can join?</Text>
        <View style={s.accessRow}>
          {ACCESS_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key} style={[s.accessCard, accessType === opt.key && s.accessCardActive]} onPress={() => setAccessType(opt.key)}>
              <Text style={{ fontSize: 18 }}>{opt.icon}</Text>
              <Text style={s.accessTitle}>{opt.title}</Text>
              <Text style={s.accessDesc}>{opt.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {accessType === "session" ? (
          bookingsLoading ? <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 30 }} /> :
          bookings.length === 0 ? (
            <View style={s.emptyBox}><Text style={{ fontSize: 36 }}>📭</Text><Text style={s.emptyTxt}>No paid consultation sessions yet.</Text></View>
          ) : (
            bookings.map(b => {
              const pill = pillFor(b);
              const canRequest = b.status === "paid" && !b.liveClassId;
              const canGoLive = b.liveClassId?.status === "scheduled";
              return (
                <View key={b._id} style={s.card}>
                  <View style={s.cardTopRow}>
                    <Text style={s.cardName}>{b.client?.name ?? "Client"}</Text>
                    <View style={[s.statusPill, { backgroundColor: pill.color + "22" }]}>
                      <Text style={[s.statusPillTxt, { color: pill.color }]}>{pill.label}</Text>
                    </View>
                  </View>
                  <Text style={s.cardMeta}>{b.client?.email} · {b.sessions} session{b.sessions > 1 ? "s" : ""} · {b.durationMins}min · ₹{(b.totalPaise / 100).toLocaleString("en-IN")}</Text>
                  {!!b.preferredTime && <Text style={s.cardMeta}>Preferred: {b.preferredTime}</Text>}
                  {canRequest && (
                    <View style={{ marginTop: 8 }}>
                      <TextInput value={sessionDates[b._id] ?? ""} onChangeText={v => setSessionDates(prev => ({ ...prev, [b._id]: v }))}
                        placeholder="e.g. 2026-07-05 17:00" placeholderTextColor={COLORS.textMuted} style={s.input} />
                      <TouchableOpacity style={s.primaryBtnSm} disabled={requestingId === b._id} onPress={() => requestLive(b)}>
                        {requestingId === b._id ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>📅 Schedule Class / Request Live</Text>}
                      </TouchableOpacity>
                    </View>
                  )}
                  {canGoLive && (
                    <TouchableOpacity style={[s.primaryBtnSm, { backgroundColor: "#16a34a" }]} onPress={() => router.push("/(tabs)/live" as any)}>
                      <Text style={s.primaryBtnTxt}>🔴 Go Live</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )
        ) : accessType === "free" && permChecking ? (
          <ActivityIndicator color={COLORS.primaryLight} style={{ marginTop: 30 }} />
        ) : accessType === "free" && !hasFreeAccess ? (
          <View>
            <Text style={s.sub}>Free live sessions require admin approval each time. Once approved, permission is valid for 4 hours.</Text>
            {livePermission?.status === "pending" ? (
              <View style={s.permBanner}>
                <Text style={s.permBannerTitlePending}>Request Pending Review</Text>
                <Text style={s.permBannerTxt}>Admin has been notified. You'll get a notification once approved.</Text>
              </View>
            ) : (
              <View>
                {livePermission?.status === "rejected" && (
                  <View style={[s.permBanner, { borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.08)" }]}>
                    <Text style={[s.permBannerTxt, { color: "#f87171" }]}>Previous request was declined. You can submit a new request.</Text>
                  </View>
                )}
                <Text style={s.label}>Reason for going live (optional)</Text>
                <TextInput value={permReason} onChangeText={setPermReason} placeholder="e.g. Demo session for new students"
                  placeholderTextColor={COLORS.textMuted} style={s.input} />
                <TouchableOpacity style={s.primaryBtn} disabled={permLoading} onPress={requestPermission}>
                  {permLoading ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>Apply — Request Permission to Go Live</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <>
            {accessType === "free" && hasFreeAccess && (
              <View style={[s.permBanner, { borderColor: "rgba(34,197,94,0.3)", backgroundColor: "rgba(34,197,94,0.1)" }]}>
                <Text style={s.permBannerTitleApproved}>Permission Granted!</Text>
                <Text style={s.permBannerTxt}>Valid until {new Date(livePermission!.expiresAt!).toLocaleTimeString("en-IN")}. Go live now or schedule a class.</Text>
              </View>
            )}
            {accessType === "course" && (
              <View style={{ marginBottom: 16 }}>
                <Text style={s.label}>Select Course *</Text>
                {courses.length === 0 ? (
                  <Text style={{ color: "#f87171", fontSize: 13 }}>You have no courses yet.</Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {courses.map(c => (
                      <TouchableOpacity key={c._id} style={[s.courseChip, courseId === c._id && s.courseChipActive]} onPress={() => setCourseId(c._id)}>
                        <Text style={[s.courseChipTxt, courseId === c._id && s.courseChipTxtActive]}>{c.title}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            <Text style={s.label}>Class Title *</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="e.g. Introduction to Hypnosis — Q&A Session"
              placeholderTextColor={COLORS.textMuted} style={s.input} />

            <Text style={s.label}>Description (optional)</Text>
            <TextInput value={description} onChangeText={setDescription} placeholder="What will you cover in this class?"
              placeholderTextColor={COLORS.textMuted} multiline numberOfLines={3} style={[s.input, s.textarea]} />

            <Text style={s.label}>Duration (minutes)</Text>
            <TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="60"
              placeholderTextColor={COLORS.textMuted} style={[s.input, { width: 120 }]} />

            <View style={s.startNowBox}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.startNowTitle}>🔴 Go Live Now</Text>
                  <Text style={s.startNowSub}>Start broadcasting immediately after submitting</Text>
                </View>
                <Switch value={startNow} onValueChange={setStartNow} trackColor={{ false: COLORS.border, true: "#7c3aed" }} thumbColor="#fff" />
              </View>
              {!startNow && (
                <View style={{ marginTop: 12 }}>
                  <Text style={s.label}>Scheduled Date & Time</Text>
                  <TextInput value={scheduledAt} onChangeText={setScheduledAt} placeholder="e.g. 2026-07-05 19:00"
                    placeholderTextColor={COLORS.textMuted} style={s.input} />
                </View>
              )}
            </View>

            {!!error && <Text style={s.errTxt}>⚠️ {error}</Text>}

            <TouchableOpacity style={[s.primaryBtn, { marginTop: 8 }]} disabled={submitting} onPress={handleSubmit}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryBtnTxt}>{startNow ? "🔴 Go Live Now" : "📅 Schedule Class"}</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", padding: 32 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerBack: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800" },
  sub: { color: COLORS.textMuted, fontSize: 13, marginBottom: 20 },
  label: { color: COLORS.primaryLight, fontSize: 13, fontWeight: "700", marginBottom: 8 },

  accessRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  accessCard: { flex: 1, borderWidth: 2, borderColor: COLORS.border, borderRadius: 12, padding: 12, backgroundColor: COLORS.surface },
  accessCardActive: { borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.12)" },
  accessTitle: { color: COLORS.text, fontSize: 11, fontWeight: "700", marginTop: 6 },
  accessDesc: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },

  input: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 11, fontSize: 14, color: COLORS.text, backgroundColor: COLORS.surface, marginBottom: 16 },
  textarea: { minHeight: 72, textAlignVertical: "top" },

  startNowBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 16, marginBottom: 16 },
  startNowTitle: { color: COLORS.text, fontSize: 14, fontWeight: "700" },
  startNowSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

  errTxt: { color: "#f87171", backgroundColor: "rgba(239,68,68,0.1)", padding: 10, borderRadius: 8, fontSize: 13, marginBottom: 12 },
  permBanner: { borderWidth: 1.5, borderColor: "rgba(245,158,11,0.3)", backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 12, padding: 14, marginBottom: 14 },
  permBannerTitlePending: { color: "#d97706", fontWeight: "700", fontSize: 14 },
  permBannerTitleApproved: { color: "#22c55e", fontWeight: "700", fontSize: 14 },
  permBannerTxt: { color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
  primaryBtn: { backgroundColor: "#7c3aed", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  primaryBtnSm: { backgroundColor: "#7c3aed", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 8 },
  primaryBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },

  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardName: { color: COLORS.text, fontWeight: "800", fontSize: 14 },
  cardMeta: { color: COLORS.textMuted, fontSize: 12 },
  statusPill: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusPillTxt: { fontSize: 10, fontWeight: "800" },

  courseChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: COLORS.surface },
  courseChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  courseChipTxt: { color: COLORS.textMuted, fontSize: 12 },
  courseChipTxtActive: { color: "#fff" },

  emptyBox: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTxt: { color: COLORS.textMuted, fontSize: 13 },

  successTitle: { color: COLORS.text, fontSize: 20, fontWeight: "800", marginBottom: 12 },
  successTxt: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 21, marginBottom: 28 },
});
