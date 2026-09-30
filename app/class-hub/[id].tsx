import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import client from "../../api/client";
import { COLORS } from "../../constants";

// ── types ─────────────────────────────────────────────────────────────────────

interface ProgramInfo {
  programId: string;
  title: string;
  thumbnail: string;
  enrolledAt: string;
  expiresAt: string | null;
}

interface LiveClass {
  _id: string;
  title: string;
  educator: { name: string; avatar?: string } | string;
  scheduledAt: string;
  duration: number;
  status: "live" | "scheduled" | "ended" | "pending_approval" | "rejected";
  maxParticipants?: number;
  recordingGcsKey?: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const educatorName = (e: LiveClass["educator"]): string =>
  typeof e === "string" ? e : (e as any)?.name ?? "";

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const fmtDateFull = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const startOf = (d: Date): Date => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
const endOf   = (d: Date): Date => { const n = new Date(d); n.setHours(23, 59, 59, 999); return n; };

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Build 6-row × 7-col calendar grid for a given year/month
function buildCalendarGrid(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function ClassHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const insets   = useSafeAreaInsets();

  const TODAY = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);

  const [program,    setProgram]    = useState<ProgramInfo | null>(null);
  const [classes,    setClasses]    = useState<LiveClass[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState("");

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);
  const [calMonth,     setCalMonth]     = useState(TODAY.getMonth());
  const [calYear,      setCalYear]      = useState(TODAY.getFullYear());

  // Pulse animation for "Live" dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── fetch classes for a given date ─────────────────────────────────────────

  const fetchClasses = useCallback(async (date: Date) => {
    const isPast   = date < TODAY && !sameDay(date, TODAY);
    const isFuture = date > TODAY && !sameDay(date, TODAY);

    let query: string;
    if (sameDay(date, TODAY)) {
      // Today: live + scheduled + ended from midnight onwards (matches live.tsx)
      query = `/live-classes?status=live,scheduled,ended&from=${startOf(date).toISOString()}&limit=100`;
    } else if (isPast) {
      // Past day: only ended classes that day
      query = `/live-classes?status=ended&from=${startOf(date).toISOString()}&to=${endOf(date).toISOString()}&limit=100`;
    } else {
      // Future day: only scheduled
      query = `/live-classes?status=scheduled&from=${startOf(date).toISOString()}&to=${endOf(date).toISOString()}&limit=100`;
    }

    const { data } = await client.get(query);
    // Filter to group sessions only (maxParticipants > 2)
    return (data.classes ?? []).filter((c: LiveClass) => (c.maxParticipants ?? 99) > 2) as LiveClass[];
  }, [TODAY]);

  const loadAll = useCallback(async (date: Date, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError("");
    try {
      const [fetchedClasses, programsRes] = await Promise.all([
        fetchClasses(date),
        user
          ? client.get("/my-programs")
          : Promise.resolve({ data: { programs: [] } }),
      ]);
      const allPrograms: ProgramInfo[] = programsRes.data.programs || [];
      setProgram(allPrograms.find(p => p.programId === id) || null);
      setClasses(fetchedClasses);
    } catch {
      setError("Couldn't load classes. Pull down to refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, user, fetchClasses]);

  // Initial load
  useEffect(() => { loadAll(selectedDate); }, []);

  const onRefresh = () => { setRefreshing(true); loadAll(selectedDate, true); };

  // When user taps a calendar day
  const selectDay = (date: Date) => {
    setSelectedDate(date);
    setLoading(true);
    loadAll(date);
  };

  // Calendar grid for current view month
  const calGrid = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth]);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // ── class grouping ─────────────────────────────────────────────────────────

  const liveNow  = classes.filter(c => c.status === "live");
  const scheduled = classes.filter(c => c.status === "scheduled");
  const ended    = classes.filter(c => c.status === "ended");

  const joinClass = (classId: string) => {
    if (!user) {
      router.push({
        pathname: "/(auth)/login" as any,
        params: { redirectTo: "/live-room", redirectParams: JSON.stringify({ classId }) },
      });
      return;
    }
    router.push({ pathname: "/live-room" as any, params: { classId } });
  };

  const isToday    = sameDay(selectedDate, TODAY);
  const isPastDate = selectedDate < TODAY && !isToday;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />
      }
    >
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Class Hub</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Program Card ── */}
      <View style={styles.programCard}>
        {program?.thumbnail ? (
          <Image source={{ uri: program.thumbnail }} style={styles.programThumb} contentFit="cover" />
        ) : (
          <View style={[styles.programThumb, styles.thumbFallback]}>
            <Text style={{ fontSize: 28 }}>🎓</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.programTitle} numberOfLines={2}>
            {program?.title || "Live Classes"}
          </Text>
          {program ? (
            <Text style={styles.programMeta}>
              Enrolled {fmtDateFull(program.enrolledAt)}
              {program.expiresAt
                ? `  ·  Till ${fmtDateFull(program.expiresAt)}`
                : "  ·  Lifetime access"}
            </Text>
          ) : (
            <Text style={styles.programMeta}>Browse live sessions by date</Text>
          )}
        </View>
      </View>

      {/* ── Calendar ── */}
      <View style={styles.calendarCard}>
        {/* Month nav header */}
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
            <Ionicons name="chevron-back" size={18} color={COLORS.primaryLight} />
          </TouchableOpacity>
          <Text style={styles.calMonthLabel}>
            {MONTH_NAMES[calMonth]} {calYear}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
            <Ionicons name="chevron-forward" size={18} color={COLORS.primaryLight} />
          </TouchableOpacity>
        </View>

        {/* Day-of-week labels */}
        <View style={styles.calDayRow}>
          {DAY_LABELS.map(d => (
            <View key={d} style={styles.calDayCell}>
              <Text style={styles.calDayLabel}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Date grid */}
        {calGrid.map((row, ri) => (
          <View key={ri} style={styles.calDayRow}>
            {row.map((date, ci) => {
              if (!date) return <View key={ci} style={styles.calDayCell} />;
              const isSelected = sameDay(date, selectedDate);
              const isTodayCell = sameDay(date, TODAY);
              const isPast = date < TODAY && !isTodayCell;
              return (
                <TouchableOpacity
                  key={ci}
                  style={[styles.calDayCell, isSelected && styles.calDayCellSelected]}
                  onPress={() => selectDay(date)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.calDayNum,
                    isSelected   && styles.calDayNumSelected,
                    isTodayCell  && !isSelected && styles.calDayNumToday,
                    isPast       && !isSelected && styles.calDayNumPast,
                  ]}>
                    {date.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* ── Date label ── */}
      <Text style={styles.dateBanner}>
        {isToday
          ? "Today's Classes"
          : selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </Text>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primaryLight} size="large" />
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          {/* Live Now (today only) */}
          {liveNow.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeadRow}>
                <Animated.View style={[styles.liveDot, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={styles.sectionTitle}>LIVE NOW</Text>
              </View>
              {liveNow.map(cls => (
                <View key={cls._id} style={styles.liveCard}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.classTitle} numberOfLines={2}>{cls.title}</Text>
                    <Text style={styles.classMeta}>by {educatorName(cls.educator)}</Text>
                  </View>
                  <TouchableOpacity style={styles.joinBtn} onPress={() => joinClass(cls._id)} activeOpacity={0.8}>
                    <Text style={styles.joinBtnText}>Join Now</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Scheduled (upcoming today or future date) */}
          {scheduled.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitlePlain}>UPCOMING</Text>
              {scheduled.map(cls => (
                <View key={cls._id} style={styles.upcomingCard}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeText}>{fmtTime(cls.scheduledAt)}</Text>
                    <Text style={styles.durationText}>{cls.duration}m</Text>
                  </View>
                  <View style={styles.vertDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.classTitle} numberOfLines={2}>{cls.title}</Text>
                    <Text style={styles.classMeta}>by {educatorName(cls.educator)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Ended (recordings available) */}
          {ended.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitlePlain}>
                {isPastDate ? "CLASSES" : "COMPLETED TODAY"}
              </Text>
              {ended.map(cls => (
                <View key={cls._id} style={styles.endedCard}>
                  <View style={styles.timeBlock}>
                    <Text style={[styles.timeText, { color: COLORS.textMuted }]}>{fmtTime(cls.scheduledAt)}</Text>
                    <Text style={styles.durationText}>{cls.duration}m</Text>
                  </View>
                  <View style={styles.vertDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.classTitle, { color: COLORS.textMuted }]} numberOfLines={2}>{cls.title}</Text>
                    <Text style={styles.classMeta}>by {educatorName(cls.educator)}</Text>
                  </View>
                  {cls.recordingGcsKey ? (
                    <TouchableOpacity
                      style={styles.watchBtn}
                      onPress={() => router.push({ pathname: "/live-room" as any, params: { classId: cls._id, replay: "1" } })}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play-circle" size={14} color="#fff" />
                      <Text style={styles.watchBtnText}>Watch</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.endedBadge}>
                      <Text style={styles.endedBadgeText}>Ended</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Empty state */}
          {liveNow.length === 0 && scheduled.length === 0 && ended.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 14 }}>📅</Text>
              <Text style={styles.emptyTitle}>
                {isToday ? "No Classes Today" : "No Classes on This Day"}
              </Text>
              <Text style={styles.emptyMeta}>
                {isToday
                  ? "You'll be notified when the next class starts."
                  : "Try selecting a different date from the calendar above."}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bg },
  center:      { paddingVertical: 48, alignItems: "center" },

  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  backBtn:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  // Program card
  programCard:   { flexDirection: "row", alignItems: "center", gap: 14, marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  programThumb:  { width: 60, height: 60, borderRadius: 10, flexShrink: 0 },
  thumbFallback: { backgroundColor: "rgba(96,165,250,0.1)", alignItems: "center", justifyContent: "center" },
  programTitle:  { fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 4, lineHeight: 20 },
  programMeta:   { fontSize: 11, color: COLORS.textMuted, lineHeight: 15 },

  // Calendar
  calendarCard:   { marginHorizontal: 16, marginBottom: 16, backgroundColor: COLORS.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: COLORS.border },
  calHeader:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calNavBtn:      { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  calMonthLabel:  { fontSize: 14, fontWeight: "800", color: COLORS.text },
  calDayRow:      { flexDirection: "row" },
  calDayCell:     { flex: 1, alignItems: "center", paddingVertical: 5 },
  calDayCellSelected: { backgroundColor: COLORS.primaryLight, borderRadius: 20 },
  calDayLabel:    { fontSize: 10, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase" },
  calDayNum:      { fontSize: 13, fontWeight: "600", color: COLORS.text },
  calDayNumSelected: { color: COLORS.bg, fontWeight: "900" },
  calDayNumToday:    { color: COLORS.primaryLight, fontWeight: "900" },
  calDayNumPast:     { color: COLORS.textMuted },

  dateBanner:  { fontSize: 12, fontWeight: "700", color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1, marginHorizontal: 16, marginBottom: 14 },

  // Sections
  section:         { marginBottom: 20 },
  sectionHeadRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginBottom: 10 },
  sectionTitle:    { fontSize: 11, fontWeight: "800", color: COLORS.text, letterSpacing: 1 },
  sectionTitlePlain: { fontSize: 11, fontWeight: "800", color: COLORS.textMuted, letterSpacing: 1, marginHorizontal: 16, marginBottom: 10 },
  liveDot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red },

  // Live card
  liveCard:  {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: "rgba(239,68,68,0.07)", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
  },
  joinBtn:      { backgroundColor: COLORS.red, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  joinBtnText:  { color: "#fff", fontWeight: "800", fontSize: 12 },

  // Upcoming card
  upcomingCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  timeBlock:    { alignItems: "center", minWidth: 48 },
  timeText:     { fontSize: 12, fontWeight: "800", color: COLORS.primaryLight },
  durationText: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  vertDivider:  { width: 1, height: 36, backgroundColor: COLORS.border, alignSelf: "center" },

  // Ended card
  endedCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, opacity: 0.85,
  },
  watchBtn:       { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  watchBtnText:   { color: "#fff", fontSize: 11, fontWeight: "700" },
  endedBadge:     { backgroundColor: "rgba(100,116,139,0.15)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  endedBadgeText: { fontSize: 10, color: COLORS.textMuted, fontWeight: "600" },

  classTitle:  { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 3, lineHeight: 18 },
  classMeta:   { fontSize: 11, color: COLORS.textMuted },

  // Empty state
  emptyState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  emptyMeta:  { fontSize: 13, color: COLORS.textMuted, textAlign: "center", lineHeight: 20 },

  errorText: { color: COLORS.red, textAlign: "center", margin: 24, fontSize: 13 },
});
