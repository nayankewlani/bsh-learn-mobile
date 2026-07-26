import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
} from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { COLORS } from "../../constants";
import client from "../../api/client";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const { width: SCREEN_W } = Dimensions.get("window");
const CARD_W = SCREEN_W - 32; // full-width card with 16px padding each side

// ── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalStudents: number;
  totalTrainers: number;
  totalCourses: number;
  publishedCourses: number;
  totalRevenuePaise: number;
  pendingSessions: number;
  liveNow: number;
  thisMonthRevenuePaise: number;
}

interface Session {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  type: "private" | "free_call";
  issues: string[];
  detail?: string;
  status: "pending" | "contacted" | "scheduled" | "completed" | "cancelled";
  createdAt: string;
  adminNotes?: string;
}

interface SeriesPoint  { label: string; value: number; }
interface BaseSeries   { data: SeriesPoint[]; total: number; change: number; }
interface EnrollSeries extends BaseSeries { topCourses: { title: string; count: number }[]; }
interface LiveSeries   extends BaseSeries { totalAttendees: number; recentClasses: { title: string; scheduledAt: string; attendees: number; status: string }[]; }

interface AnalyticsData {
  students?:          BaseSeries;
  courses?:           BaseSeries;
  sessions?:          BaseSeries;
  revenue?:           BaseSeries;
  courseEnrollments?: EnrollSeries;
  liveClasses?:       LiveSeries;
}

type Period = "1d" | "2d" | "1w" | "1m" | "3m" | "6m" | "1y";
const PERIODS: Period[] = ["1d", "2d", "1w", "1m", "3m", "6m", "1y"];
const PERIOD_LABEL: Record<Period, string> = { "1d":"1D","2d":"2D","1w":"1W","1m":"1M","3m":"3M","6m":"6M","1y":"1Y" };

const STATUS_COLOR: Record<string, string> = {
  pending:"#f59e0b", contacted:"#60a5fa", scheduled:"#a78bfa", completed:"#4ade80", cancelled:"#ef4444",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (paise: number) => {
  const rs = paise / 100;
  return rs >= 100000 ? `₹${(rs / 100000).toFixed(1)}L` : `₹${rs.toLocaleString("en-IN")}`;
};

// ── SVG Area Sparkline ────────────────────────────────────────────────────────

const AreaSparkline: React.FC<{ data: SeriesPoint[]; color: string; w: number; h: number }> = ({ data, color, w, h }) => {
  if (!data || data.length < 2) return (
    <View style={{ width: w, height: h, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#475569", fontSize: 11 }}>No data</Text>
    </View>
  );

  const max = Math.max(...data.map(d => d.value), 1);
  const step = w / (data.length - 1);
  const pad = h * 0.08;

  const pts = data.map((d, i) => ({
    x: i * step,
    y: h - pad - (d.value / max) * (h - 2 * pad),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1].x.toFixed(1)},${h} L 0,${h} Z`;
  const gid  = `g${color.replace("#", "")}`;

  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={color} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#${gid})`} />
      <Path d={line}  stroke={color} strokeWidth={2} fill="none" />
    </Svg>
  );
};

// ── Chart Block ───────────────────────────────────────────────────────────────

interface ChartBlockProps {
  icon: string;
  label: string;
  color: string;
  series: BaseSeries | undefined;
  period: Period;
  onPeriodChange: (p: Period) => void;
  currency?: boolean;
  extraContent?: React.ReactNode;
  loading: boolean;
}

const ChartBlock: React.FC<ChartBlockProps> = ({
  icon, label, color, series, period, onPeriodChange, currency, extraContent, loading,
}) => {
  const [expanded, setExpanded] = useState(false);
  const change   = series?.change ?? 0;
  const positive = change >= 0;
  const total    = series?.total ?? 0;
  const data     = series?.data ?? [];
  const chartH   = expanded ? 160 : 80;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => setExpanded(e => !e)}
      style={[styles.chartBlock, { borderColor: expanded ? color : "#2a2a5a" }]}
    >
      {/* Accent top bar */}
      <View style={[styles.chartAccent, { backgroundColor: color }]} />

      {/* Header row */}
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartLabel}>{icon} {label}</Text>
          <Text style={[styles.chartTotal, { color }]}>
            {currency ? fmt(total) : total.toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[styles.changePill, { backgroundColor: positive ? "#22c55e22" : "#ef444422" }]}>
            <Text style={[styles.changeText, { color: positive ? "#22c55e" : "#ef4444" }]}>
              {positive ? "▲" : "▼"} {Math.abs(change)}%
            </Text>
          </View>
          <Text style={styles.vsPrev}>vs prev period</Text>
        </View>
      </View>

      {/* Period selector */}
      <View style={styles.periodRow} onStartShouldSetResponder={() => true}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            onPress={(e) => { e.stopPropagation?.(); onPeriodChange(p); }}
            style={[styles.periodBtn, period === p && { backgroundColor: color }]}
          >
            <Text style={[styles.periodTxt, period === p && { color: "#fff" }]}>{PERIOD_LABEL[p]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Sparkline */}
      {loading ? (
        <View style={{ height: chartH, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="small" color={color} />
        </View>
      ) : (
        <AreaSparkline data={data} color={color} w={CARD_W - 32} h={chartH} />
      )}

      {/* Extra content when expanded */}
      {expanded && extraContent && (
        <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: "#2a2a5a", paddingTop: 12 }}>
          {extraContent}
        </View>
      )}

      {/* Collapse hint */}
      <Text style={styles.expandHint}>{expanded ? "▲ collapse" : "▼ expand"}</Text>
    </TouchableOpacity>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color, sub, onPress }: {
  icon: IoniconName; label: string; value: string | number; color: string; sub?: string; onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderColor: color + "44" }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.statIconBox, { backgroundColor: color + "22" }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
      {onPress && <Ionicons name="chevron-forward" size={12} color={color} style={{ marginTop: 4 }} />}
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const [stats,     setStats]     = useState<AdminStats | null>(null);
  const [sessions,  setSessions]  = useState<Session[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [period,    setPeriod]    = useState<Period>("1m");
  const [loading,   setLoading]   = useState(true);
  const [aLoading,  setALoading]  = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg,  setErrorMsg]  = useState<string | null>(null);

  const loadAnalytics = useCallback(async (p: Period) => {
    setALoading(true);
    try {
      const r = await client.get("/admin/analytics", { params: { period: p } });
      setAnalytics(r.data);
    } catch {
      // non-fatal
    } finally {
      setALoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setErrorMsg(null);
    try {
      const statsRes = await client.get("/admin/stats");
      setStats(statsRes.data);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Failed to load stats";
      setErrorMsg(`Stats error (${e?.response?.status ?? "network"}): ${msg}`);
    }
    try {
      const sessRes = await client.get("/admin/private-sessions?status=pending");
      setSessions(sessRes.data?.sessions ?? sessRes.data ?? []);
    } catch { /* non-fatal */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAnalytics(period); }, [period, loadAnalytics]);

  const onRefresh = () => { setRefreshing(true); load(); loadAnalytics(period); };

  const initials = user?.name
    ?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "AD";

  // ── Extra content for Course Enrollments card ──
  const enrollExtra = (() => {
    const ce = analytics?.courseEnrollments;
    if (!ce?.topCourses?.length) return null;
    const max = Math.max(...ce.topCourses.map(c => c.count), 1);
    return (
      <View>
        <Text style={styles.extraTitle}>Top Courses by Enrollment</Text>
        {ce.topCourses.map((c, i) => (
          <View key={i} style={styles.barRow}>
            <Text style={styles.barLabel} numberOfLines={1}>{c.title}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round((c.count / max) * 100)}%` as any, backgroundColor: "#06b6d4" }]} />
            </View>
            <Text style={[styles.barCount, { color: "#06b6d4" }]}>{c.count}</Text>
          </View>
        ))}
      </View>
    );
  })();

  // ── Extra content for Live Classes card ──
  const liveExtra = (() => {
    const lc = analytics?.liveClasses;
    if (!lc) return null;
    return (
      <View>
        <View style={styles.liveStats}>
          <View>
            <Text style={styles.liveStatVal}>{lc.total}</Text>
            <Text style={styles.liveStatLbl}>Classes</Text>
          </View>
          <View>
            <Text style={[styles.liveStatVal, { color: "#f97316" }]}>{lc.totalAttendees ?? 0}</Text>
            <Text style={styles.liveStatLbl}>Total Attendees</Text>
          </View>
        </View>
        {lc.recentClasses?.length > 0 && (
          <>
            <Text style={[styles.extraTitle, { marginTop: 10 }]}>Recent Classes</Text>
            {lc.recentClasses.map((c, i) => (
              <View key={i} style={styles.classRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.className} numberOfLines={1}>{c.title}</Text>
                  <Text style={styles.classDate}>
                    {new Date(c.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={styles.classAttendees}>👥 {c.attendees}</Text>
                  <View style={[styles.statusPill, {
                    backgroundColor: c.status === "live" ? "#ef444422" : c.status === "scheduled" ? "#3b82f622" : "#64748b22",
                    borderColor:     c.status === "live" ? "#ef444455" : c.status === "scheduled" ? "#3b82f655" : "#64748b55",
                  }]}>
                    <Text style={[styles.statusText, {
                      color: c.status === "live" ? "#ef4444" : c.status === "scheduled" ? "#3b82f6" : "#94a3b8",
                    }]}>{c.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    );
  })();

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
        <Text style={styles.loadingText}>Loading admin data…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSub}>BSH Platform Control</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={13} color="#4ade80" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 44 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryLight} />}
      >
        {/* Error banner */}
        {errorMsg && (
          <TouchableOpacity
            style={styles.errorBanner}
            onPress={() => { setLoading(true); load(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="warning-outline" size={16} color="#ef4444" />
            <Text style={styles.errorText} numberOfLines={3}>{errorMsg}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        )}

        {/* Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard icon="people"   label="Students"         value={stats?.totalStudents ?? 0}    color="#a78bfa" onPress={() => router.push("/admin/students")} />
          <StatCard icon="mic"      label="Trainers"         value={stats?.totalTrainers ?? 0}    color="#60a5fa" onPress={() => router.push("/admin/trainers")} />
          <StatCard icon="book"     label="Courses"          value={stats?.publishedCourses ?? 0} color="#4ade80" sub={`${stats?.totalCourses ?? 0} total`} onPress={() => router.push("/admin/courses")} />
          <StatCard icon="calendar" label="Pending Sessions" value={stats?.pendingSessions ?? 0}  color="#f59e0b" onPress={() => router.push("/admin/sessions")} />
        </View>

        {/* Revenue Row */}
        <View style={styles.revenueRow}>
          <View style={[styles.revenueCard, { flex: 1, marginRight: 10 }]}>
            <Ionicons name="trending-up" size={20} color="#4ade80" />
            <Text style={styles.revenueValue}>{fmt(stats?.totalRevenuePaise ?? 0)}</Text>
            <Text style={styles.revenueLabel}>Total Revenue</Text>
          </View>
          <View style={[styles.revenueCard, { flex: 1 }]}>
            <Ionicons name="stats-chart" size={20} color="#a78bfa" />
            <Text style={styles.revenueValue}>{fmt(stats?.thisMonthRevenuePaise ?? 0)}</Text>
            <Text style={styles.revenueLabel}>This Month</Text>
          </View>
        </View>

        {/* ── Analytics Charts ── */}
        <Text style={styles.sectionTitle}>Analytics Charts</Text>
        <Text style={styles.chartHint}>Tap any card to expand • period selector inside each card</Text>

        <ChartBlock
          icon="👥" label="New Students" color="#3b82f6"
          series={analytics?.students} period={period}
          onPeriodChange={setPeriod} loading={aLoading}
        />
        <ChartBlock
          icon="📚" label="New Courses" color="#22c55e"
          series={analytics?.courses} period={period}
          onPeriodChange={setPeriod} loading={aLoading}
        />
        <ChartBlock
          icon="📋" label="Sessions" color="#a855f7"
          series={analytics?.sessions} period={period}
          onPeriodChange={setPeriod} loading={aLoading}
        />
        <ChartBlock
          icon="💰" label="Revenue" color="#f59e0b"
          series={analytics?.revenue} period={period}
          onPeriodChange={setPeriod} loading={aLoading} currency
        />
        <ChartBlock
          icon="🎓" label="Course Enrollments" color="#06b6d4"
          series={analytics?.courseEnrollments} period={period}
          onPeriodChange={setPeriod} loading={aLoading}
          extraContent={enrollExtra}
        />
        <ChartBlock
          icon="📡" label="Live Classes" color="#ef4444"
          series={analytics?.liveClasses} period={period}
          onPeriodChange={setPeriod} loading={aLoading}
          extraContent={liveExtra}
        />

        {/* Pending Sessions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pending Sessions</Text>
          {(stats?.pendingSessions ?? 0) > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{stats?.pendingSessions}</Text>
            </View>
          )}
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-circle-outline" size={36} color="#4b5563" />
            <Text style={styles.emptyText}>No pending sessions</Text>
          </View>
        ) : (
          sessions.map((s) => (
            <View key={s._id} style={styles.sessionCard}>
              <View style={styles.sessionTop}>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionName}>{s.name}</Text>
                  <Text style={styles.sessionEmail}>{s.email}</Text>
                  {s.phone && <Text style={styles.sessionPhone}>{s.phone}</Text>}
                </View>
                <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[s.status] + "22", borderColor: STATUS_COLOR[s.status] + "55" }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[s.status] }]}>
                    {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                  </Text>
                </View>
              </View>
              <Text style={styles.sessionType}>
                {s.type === "free_call" ? "Free Call" : "Private Session"}
                {s.issues?.length > 0 ? ` · ${s.issues.slice(0, 2).join(", ")}` : ""}
              </Text>
              <Text style={styles.sessionDate}>
                {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
          ))
        )}

        {/* Quick Links */}
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {([
            { icon: "people-outline"   as IoniconName, label: "Students",    color: "#a78bfa", route: "/admin/students"     },
            { icon: "mic-outline"      as IoniconName, label: "Trainers",     color: "#60a5fa", route: "/admin/trainers"     },
            { icon: "book-outline"     as IoniconName, label: "Courses",      color: "#4ade80", route: "/admin/courses"      },
            { icon: "card-outline"     as IoniconName, label: "Transactions", color: "#f59e0b", route: "/admin/transactions" },
            { icon: "radio-outline"    as IoniconName, label: "Live Classes", color: "#ef4444", route: "/admin/live-classes" },
            { icon: "calendar-outline" as IoniconName, label: "Sessions",     color: "#c084fc", route: "/admin/sessions"     },
            { icon: "film-outline"     as IoniconName, label: "Home Classes",  color: "#8b5cf6", route: "/admin/home-classes"  },
          ] as { icon: IoniconName; label: string; color: string; route: string }[]).map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickCard}
              activeOpacity={0.75}
              onPress={() => router.push(q.route as any)}
            >
              <View style={[styles.quickIcon, { backgroundColor: q.color + "22" }]}>
                <Ionicons name={q.icon} size={22} color={q.color} />
              </View>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => Alert.alert("Log Out", "Are you sure you want to log out?", [
            { text: "Cancel", style: "cancel" },
            { text: "Log Out", style: "destructive", onPress: () => logout() },
          ])}
        >
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: COLORS.bg },
  center:      { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  loadingText: { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
  scroll:      { flex: 1 },
  content:     { paddingHorizontal: 16, paddingBottom: 20 },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 18, paddingBottom: 14, paddingTop: 12,
    backgroundColor: "#13122a", borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  headerTitle:     { color: COLORS.text, fontWeight: "900", fontSize: 20, letterSpacing: 0.5 },
  headerSub:       { color: "#a78bfa", fontSize: 11, fontWeight: "600", marginTop: 1 },
  headerRight:     { flexDirection: "row", alignItems: "center", gap: 10 },
  adminBadge:      {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#4ade8022", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#4ade8044",
  },
  adminBadgeText:  { color: "#4ade80", fontWeight: "700", fontSize: 11 },
  avatar:          {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#a78bfa44",
  },
  avatarText:      { color: "#fff", fontWeight: "800", fontSize: 13 },

  /* Sections */
  sectionTitle:  { color: COLORS.text, fontSize: 16, fontWeight: "800", marginTop: 18, marginBottom: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 10 },
  badge:         { backgroundColor: "#f59e0b", borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:     { color: "#000", fontSize: 11, fontWeight: "800" },
  chartHint:     { color: "#475569", fontSize: 11, marginBottom: 8, marginTop: -6 },

  /* Stats */
  statsGrid:   { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47.5%", backgroundColor: COLORS.surface, borderRadius: 14,
    padding: 14, borderWidth: 1, alignItems: "flex-start",
  },
  statIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  statValue:   { fontSize: 24, fontWeight: "900", marginBottom: 2 },
  statLabel:   { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  statSub:     { color: "#6b7280", fontSize: 10, marginTop: 2 },

  /* Revenue */
  revenueRow:   { flexDirection: "row", marginTop: 10 },
  revenueCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    alignItems: "flex-start", borderWidth: 1, borderColor: COLORS.surface2,
  },
  revenueValue: { color: COLORS.text, fontSize: 20, fontWeight: "900", marginTop: 6, marginBottom: 2 },
  revenueLabel: { color: COLORS.textMuted, fontSize: 12 },

  /* Chart blocks */
  chartBlock: {
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, padding: 16, marginBottom: 14,
    overflow: "hidden", position: "relative",
  },
  chartAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  chartLabel:  { fontSize: 11, color: "#64748b", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  chartTotal:  { fontSize: 24, fontWeight: "900" },
  changePill:  { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  changeText:  { fontSize: 11, fontWeight: "700" },
  vsPrev:      { fontSize: 10, color: "#475569" },
  periodRow:   { flexDirection: "row", gap: 4, marginBottom: 10, flexWrap: "wrap" },
  periodBtn:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  periodTxt:   { fontSize: 11, fontWeight: "600", color: "#64748b" },
  expandHint:  { textAlign: "right", fontSize: 10, color: "#475569", marginTop: 6 },

  /* Bar rows (enrollments) */
  barRow:   { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  barLabel: { color: COLORS.textMuted, fontSize: 11, width: 110, flexShrink: 0 },
  barTrack: { flex: 1, backgroundColor: "#1f1c3d", borderRadius: 4, height: 6, overflow: "hidden" },
  barFill:  { height: "100%", borderRadius: 4 },
  barCount: { fontSize: 11, fontWeight: "700", width: 22, textAlign: "right" },

  /* Extra content */
  extraTitle:  { color: "#94a3b8", fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  liveStats:   { flexDirection: "row", gap: 24, marginBottom: 4 },
  liveStatVal: { fontSize: 22, fontWeight: "900", color: "#ef4444" },
  liveStatLbl: { color: COLORS.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },

  /* Class rows */
  classRow:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#1e1b4b" },
  className:      { color: COLORS.text, fontSize: 13, fontWeight: "600", marginBottom: 2 },
  classDate:      { color: COLORS.textMuted, fontSize: 11 },
  classAttendees: { color: "#94a3b8", fontSize: 11 },

  /* Sessions */
  sessionCard: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.surface2, marginBottom: 10,
  },
  sessionTop:   { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  sessionInfo:  { flex: 1, marginRight: 10 },
  sessionName:  { color: COLORS.text, fontWeight: "700", fontSize: 15, marginBottom: 2 },
  sessionEmail: { color: COLORS.textMuted, fontSize: 12 },
  sessionPhone: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  sessionType:  { color: "#a78bfa", fontSize: 12, fontWeight: "600", marginBottom: 4 },
  sessionDate:  { color: "#6b7280", fontSize: 11 },
  statusPill:   { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText:   { fontSize: 11, fontWeight: "700" },

  /* Quick actions */
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: {
    width: "30.5%", backgroundColor: COLORS.surface, borderRadius: 14,
    paddingVertical: 16, alignItems: "center",
    borderWidth: 1, borderColor: COLORS.surface2,
  },
  quickIcon:  { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  quickLabel: { color: COLORS.text, fontSize: 11, fontWeight: "600", textAlign: "center" },

  /* Logout */
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#ef444415", borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: "#ef444430", marginTop: 20,
  },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 15 },

  emptyBox:  { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 14 },

  /* Error banner */
  errorBanner: {
    backgroundColor: "#ef444415",
    borderWidth: 1, borderColor: "#ef444440",
    borderRadius: 12, padding: 12, marginTop: 12,
    flexDirection: "row", alignItems: "flex-start", gap: 8,
  },
  errorText: { color: "#ef4444", fontSize: 12, flex: 1, lineHeight: 18 },
  retryText: { color: "#ef4444", fontSize: 11, fontWeight: "700", marginTop: 2 },
});
