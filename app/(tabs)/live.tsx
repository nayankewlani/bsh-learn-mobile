import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, NativeSyntheticEvent, NativeScrollEvent, Alert, Modal, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { showTabBar, hideTabBar } from "../../stores/tabBarStore";
import client from "../../api/client";

const bshLogoImg = require("../../assets/BSH-logo-02.png");

type Tab = "oneOnOne" | "courseLive" | "freeAll";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CELL_W = 60;
const DATE_STRIP_H = 60;

interface LiveClass {
  _id: string;
  title: string;
  educator: { name: string; avatar?: string } | string;
  scheduledAt: string;
  duration: number;
  status: string;
  type?: string;
  maxParticipants?: number;
  recordingMuxPlaybackId?: string;
}

interface SessionApp {
  _id: string;
  trainerName: string;
  clientName: string;
  issue: string;
  preferredTime?: string;
  message?: string;
  status: "pending" | "trainer_proposed" | "approved" | "rejected" | "completed";
  proposedSchedule?: string;
  trainerNote?: string;
  liveClassId?: LiveClass | null;
  createdAt: string;
}

const educatorName = (e: LiveClass["educator"]): string =>
  typeof e === "string" ? e : (e as any)?.name ?? "";

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const appStatusColor = (s: SessionApp["status"]) => {
  if (s === "approved") return "#22c55e";
  if (s === "pending") return "#f59e0b";
  if (s === "trainer_proposed") return "#60a5fa";
  if (s === "completed") return "#6b7280";
  return "#ef4444";
};
const appStatusLabel = (s: SessionApp["status"]) => {
  if (s === "pending") return "Pending";
  if (s === "trainer_proposed") return "Schedule Proposed";
  if (s === "approved") return "Approved";
  if (s === "completed") return "Completed";
  return "Rejected";
};

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark, t } = useThemeStore();
  const params = useLocalSearchParams<{ tab?: string; educator?: string }>();

  // ── today reference (stable for the session) ───────────────────────────
  const TODAY = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  // dates array: today-7 … today+21 (29 days total, today at index 7)
  const DATES = useMemo<Date[]>(() => {
    const arr: Date[] = [];
    for (let i = -7; i <= 21; i++) {
      const d = new Date(TODAY); d.setDate(TODAY.getDate() + i); arr.push(d);
    }
    return arr;
  }, [TODAY]);
  const TODAY_IDX = 7;

  const getInitialTab = (): Tab => {
    if (params.educator) return "freeAll";
    if (params.tab === "oneOnOne") return "oneOnOne";
    if (params.tab === "courseLive") return "courseLive";
    if (params.tab === "freeAll") return "freeAll";
    return "freeAll";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());
  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);
  const [apiClasses, setApiClasses] = useState<LiveClass[]>([]);
  const [pastCache, setPastCache] = useState<Record<string, LiveClass[]>>({});
  const [myApplications, setMyApplications] = useState<SessionApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [pastLoading, setPastLoading] = useState(false);
  const [hasLiveNow, setHasLiveNow] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [watchingClass, setWatchingClass] = useState<LiveClass | null>(null);
  const [watchUrl, setWatchUrl] = useState("");
  const [watchLoading, setWatchLoading] = useState(false);

  const HEADER_BASE = 120 + insets.top;
  const HEADER_H = HEADER_BASE + DATE_STRIP_H; // always same height; date strip shows/hides inside it
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scrollRef = useRef<ScrollView>(null);
  const dateScrollRef = useRef<ScrollView>(null);
  const cardYRef = useRef<Record<string, number>>({});

  // ── pulse animation ────────────────────────────────────────────────────
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // ── reset header on tab switch ─────────────────────────────────────────
  useEffect(() => {
    headerHiddenRef.current = false;
    Animated.spring(headerTranslateY, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }).start();
    showTabBar();
  }, [activeTab]);

  // ── auto-scroll date strip to today ───────────────────────────────────
  useEffect(() => {
    if (activeTab === "oneOnOne") return;
    const t = setTimeout(() => {
      dateScrollRef.current?.scrollTo({ x: Math.max(0, (TODAY_IDX - 2)) * CELL_W, animated: false });
    }, 160);
    return () => clearTimeout(t);
  }, [activeTab]);

  // ── fetch upcoming + live + today's ended classes ────────────────────
  useEffect(() => {
    if (activeTab === "oneOnOne") return;
    setLoading(true);
    client.get(`/live-classes?status=live,scheduled,ended&from=${TODAY.toISOString()}&limit=100`)
      .then(({ data }) => {
        const classes: LiveClass[] = data.classes ?? [];
        setApiClasses(classes);
        setHasLiveNow(classes.some(c => c.status === "live" && (c.maxParticipants ?? 99) > 2));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTab, TODAY]);

  // ── fetch 1:1 data ────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "oneOnOne" || !user) return;
    setLoading(true);
    Promise.all([
      client.get("/session-applications/mine").then(({ data }) => setMyApplications(data.applications ?? [])).catch(() => {}),
      client.get(`/live-classes?status=live,scheduled,ended&from=${TODAY.toISOString()}&limit=50`).then(({ data }) => {
        const classes: LiveClass[] = data.classes ?? [];
        setApiClasses(classes);
        setHasLiveNow(classes.some(c => c.status === "live" && (c.maxParticipants ?? 99) <= 2));
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [activeTab, user, TODAY]);

  // ── load past day classes on demand ───────────────────────────────────
  const loadPastDay = useCallback(async (date: Date) => {
    const key = date.toISOString().slice(0, 10);
    if (pastCache[key] !== undefined) return;
    setPastLoading(true);
    const from = new Date(date); from.setHours(0, 0, 0, 0);
    const to   = new Date(date); to.setHours(23, 59, 59, 999);
    try {
      const { data } = await client.get(
        `/live-classes?status=ended&from=${from.toISOString()}&to=${to.toISOString()}&limit=50`
      );
      setPastCache(prev => ({ ...prev, [key]: data.classes ?? [] }));
    } catch {
      setPastCache(prev => ({ ...prev, [key]: [] }));
    } finally {
      setPastLoading(false);
    }
  }, [pastCache]);

  useEffect(() => {
    const isPast = selectedDate < TODAY && !sameDay(selectedDate, TODAY);
    if (isPast && activeTab !== "oneOnOne") loadPastDay(selectedDate);
  }, [selectedDate, activeTab]);

  // ── param-driven tab / educator scroll ────────────────────────────────
  useEffect(() => { if (params.tab) setActiveTab(getInitialTab()); }, [params.tab]);
  useEffect(() => { if (params.educator) setActiveTab("freeAll"); }, [params.educator]);
  useEffect(() => {
    if (!params.educator || loading || apiClasses.length === 0) return;
    const target = apiClasses.find(c =>
      educatorName(c.educator).toLowerCase().includes(params.educator!.toLowerCase())
    );
    if (target) {
      setHighlightedId(target._id);
      setTimeout(() => {
        const y = cardYRef.current[target._id];
        if (y != null) scrollRef.current?.scrollTo({ y: y - 20, animated: true });
      }, 400);
    }
  }, [apiClasses, loading, params.educator]);

  // ── scroll hide/show header ───────────────────────────────────────────
  const handleMainScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;
    if (y < 60) {
      if (headerHiddenRef.current) {
        headerHiddenRef.current = false;
        Animated.spring(headerTranslateY, { toValue: 0, tension: 100, friction: 12, useNativeDriver: true }).start();
      }
      return;
    }
    if (delta > 4 && !headerHiddenRef.current) {
      headerHiddenRef.current = true;
      hideTabBar();
      Animated.timing(headerTranslateY, { toValue: -HEADER_H, duration: 220, useNativeDriver: true }).start();
    } else if (delta < -4 && headerHiddenRef.current) {
      headerHiddenRef.current = false;
      showTabBar();
      Animated.timing(headerTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, []); // refs are stable — empty deps is intentional

  // ── helpers ───────────────────────────────────────────────────────────
  const getClassesForDay = useCallback((date: Date): LiveClass[] => {
    const isPast = date < TODAY && !sameDay(date, TODAY);
    const key = date.toISOString().slice(0, 10);
    const source = isPast ? (pastCache[key] || []) : apiClasses;
    return source.filter(c => new Date(c.scheduledAt).toDateString() === date.toDateString());
  }, [apiClasses, pastCache, TODAY]);

  const isPastDate = selectedDate < TODAY && !sameDay(selectedDate, TODAY);

  const dayClasses = useMemo(() => getClassesForDay(selectedDate), [selectedDate, getClassesForDay]);

  const filterForTab = useCallback((classes: LiveClass[]) => {
    if (activeTab === "courseLive") return classes.filter(c => c.type === "course");
    // Exclude 1:1 sessions (maxParticipants <= 2). Classes with no maxParticipants set
    // are treated as group/free-for-all (not 1:1).
    return classes.filter(c => c.type !== "course" && (c.maxParticipants == null || c.maxParticipants > 2));
  }, [activeTab]);

  const myLiveOneOnOne      = useMemo(() => apiClasses.filter(c => c.status === "live"      && c.maxParticipants != null && c.maxParticipants <= 2), [apiClasses]);
  const myScheduledOneOnOne = useMemo(() => apiClasses.filter(c => c.status === "scheduled" && c.maxParticipants != null && c.maxParticipants <= 2), [apiClasses]);

  const joinLiveClass = (cls: LiveClass) => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!cls._id) { Alert.alert("Demo", "This is a sample class."); return; }
    router.push({ pathname: "/live-room" as any, params: { classId: cls._id } });
  };

  const watchRecording = async (cls: LiveClass) => {
    if (!user) {
      Alert.alert("Login Required", "Please log in to watch recordings.", [
        { text: "Log In", onPress: () => router.push("/(auth)/login") },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    setWatchingClass(cls);
    setWatchUrl("");
    setWatchLoading(true);
    try {
      // Use cached playback ID if already available in the class data
      if (cls.recordingMuxPlaybackId) {
        setWatchUrl(`https://stream.mux.com/${cls.recordingMuxPlaybackId}.m3u8`);
        return;
      }
      // Otherwise poll the server — Mux may still be processing
      const { data } = await client.get(`/live-classes/${cls._id}/recording/status`);
      if (data.playbackId) {
        setWatchUrl(`https://stream.mux.com/${data.playbackId}.m3u8`);
      } else if (data.status === "recording") {
        Alert.alert("Still Recording", "This class is still being recorded. Try again after it ends.");
        setWatchingClass(null);
      } else {
        Alert.alert("Not Available", "No recording available for this class yet. It may still be processing — check back in a few minutes.");
        setWatchingClass(null);
      }
    } catch {
      Alert.alert("Error", "Could not load recording. Please try again.");
      setWatchingClass(null);
    } finally {
      setWatchLoading(false);
    }
  };

  const TAB_CONFIG = [
    { key: "oneOnOne" as Tab,   label: "1:1 Sessions", icon: "people-outline" as const,  color: "#FF1E56" },
    { key: "courseLive" as Tab, label: "Course Live",  icon: "school-outline" as const,  color: "#FF1E56" },
    { key: "freeAll" as Tab,    label: "Free for All", icon: "globe-outline" as const,   color: "#d97706" },
  ];

  // ── Date Strip ─────────────────────────────────────────────────────────
  const renderDateStrip = () => (
    <ScrollView
      ref={dateScrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={st.dateStrip}
      contentContainerStyle={{ paddingHorizontal: 6, paddingVertical: 6 }}
    >
      {DATES.map((date, idx) => {
        const isToday    = sameDay(date, TODAY);
        const isSelected = sameDay(date, selectedDate);
        const isPast     = date < TODAY && !isToday;
        const dc         = getClassesForDay(date);
        const hasLive    = dc.some(c => c.status === "live");
        const hasAny     = dc.length > 0;

        return (
          <TouchableOpacity
            key={idx}
            onPress={() => setSelectedDate(date)}
            style={[
              st.dateCell,
              isSelected && { backgroundColor: isToday ? "#ef4444" : "#0c2461" },
            ]}
          >
            <Text style={[
              st.dateDayName,
              isPast && !isSelected && { color: "rgba(255,255,255,0.28)" },
              isSelected && { color: "#fff", fontWeight: "800" },
            ]}>
              {isToday ? "Today" : DAY_NAMES[date.getDay()]}
            </Text>
            <Text style={[
              st.dateDayNum,
              isPast && !isSelected && { color: "rgba(255,255,255,0.28)" },
              isToday && !isSelected && { color: "#ef4444" },
              isSelected && { color: "#fff" },
            ]}>
              {date.getDate()}
            </Text>
            <View style={[
              st.dateDot,
              { backgroundColor: hasLive ? "#ef4444" : hasAny ? "#22c55e" : "transparent" },
            ]} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  // ── Class Card ────────────────────────────────────────────────────────
  const renderClassCard = (cls: LiveClass, accent: string, idx: number) => {
    const isLive    = cls.status === "live";
    const isEnded   = cls.status === "ended";
    const dt        = new Date(cls.scheduledAt);
    const isHilight = highlightedId === cls._id;

    return (
      <View
        key={cls._id ?? idx}
        onLayout={e => { if (cls._id) cardYRef.current[cls._id] = e.nativeEvent.layout.y; }}
        style={[
          st.scheduleCard,
          { borderLeftColor: isLive ? "#ef4444" : isEnded ? "#4b5563" : accent, backgroundColor: t.card, borderColor: t.border, opacity: isEnded ? 0.72 : 1 },
          isHilight && { borderColor: "#FF6B8A", borderWidth: 2, shadowColor: "#FF6B8A", shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
        ]}
      >
        {/* Left date/status column */}
        {isLive ? (
          <View style={[st.dateCol, { backgroundColor: "#ef444420" }]}>
            <Animated.View style={[st.dotSm, { transform: [{ scale: pulseAnim }], backgroundColor: "#ef4444", marginBottom: 4 }]} />
            <Text style={[st.dateDay, { color: "#ef4444" }]}>LIVE</Text>
          </View>
        ) : isEnded ? (
          <View style={[st.dateCol, { backgroundColor: "#4b556320" }]}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#4b5563" style={{ marginBottom: 4 }} />
            <Text style={[st.dateDay, { color: "#4b5563", fontSize: 9 }]}>ENDED</Text>
          </View>
        ) : (
          <View style={[st.dateCol, { backgroundColor: `${accent}20` }]}>
            <Text style={[st.dateDay, { color: accent }]}>
              {dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </Text>
            <Text style={[st.dateTime, { color: t.textMuted }]}>
              {dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
            </Text>
          </View>
        )}
        {/* Right content */}
        <View style={st.scheduleInfo}>
          <View style={st.scheduleTopRow}>
            <View style={[st.topicPill, { backgroundColor: `${accent}25` }]}>
              <Text style={[st.topicPillTxt, { color: accent }]}>{cls.type === "course" ? "Course" : "Live Class"}</Text>
            </View>
            <View style={st.durationPill}>
              <Ionicons name="time-outline" size={10} color={t.textMuted} />
              <Text style={[st.durationTxt, { color: t.textMuted }]}>{cls.duration} min</Text>
            </View>
          </View>
          <Text style={[st.scheduleTitle, { color: t.text }]} numberOfLines={2}>{cls.title}</Text>
          <View style={st.scheduleEduRow}>
            <Ionicons name="person-circle-outline" size={14} color="#FF6B8A" />
            <Text style={st.scheduleEduTxt}>{educatorName(cls.educator)}</Text>
          </View>
          {isEnded ? (
            <TouchableOpacity
              style={[st.joinSmallBtn, { borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.1)", marginTop: 8 }]}
              onPress={() => watchRecording(cls)}
            >
              <Ionicons name="play-circle-outline" size={13} color="#818cf8" style={{ marginRight: 4 }} />
              <Text style={[st.joinSmallTxt, { color: "#818cf8" }]}>Watch Recording</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[st.joinSmallBtn, { borderColor: isLive ? "#ef4444" : accent, backgroundColor: isLive ? "#ef444420" : `${accent}18`, marginTop: 8 }]}
              onPress={() => isLive ? joinLiveClass(cls) : Alert.alert("Not Live Yet", "This class hasn't started yet.")}
            >
              <Text style={[st.joinSmallTxt, { color: isLive ? "#f87171" : accent }]}>
                {isLive ? "Join Now →" : "Scheduled"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── Day label bar ─────────────────────────────────────────────────────
  const renderDayLabel = (accent: string) => {
    const liveToday = dayClasses.some(c => c.status === "live");
    const label = sameDay(selectedDate, TODAY)
      ? "Today"
      : selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
    return (
      <View style={st.dayLabelRow}>
        <Text style={[st.dayLabel, { color: t.text }]}>{label}</Text>
        {isPastDate && (
          <View style={[st.badge, { backgroundColor: "#4b556320" }]}>
            <Text style={[st.badgeTxt, { color: "#6b7280" }]}>Past</Text>
          </View>
        )}
        {liveToday && !isPastDate && (
          <View style={[st.badge, { backgroundColor: "#ef444420" }]}>
            <Animated.View style={[st.dotSm, { transform: [{ scale: pulseAnim }], backgroundColor: "#ef4444", marginRight: 4 }]} />
            <Text style={[st.badgeTxt, { color: "#ef4444" }]}>Live Now</Text>
          </View>
        )}
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={[st.root, { backgroundColor: t.bg }]}>

      {/* ── Floating Header ── */}
      <Animated.View style={[st.headerWrapper, { paddingTop: insets.top, backgroundColor: t.navBg, transform: [{ translateY: headerTranslateY }] }]}>
        <View style={st.headerRow}>
          <Image source={bshLogoImg} style={st.headerLogo} contentFit="contain" />
          <View style={st.brandArea}>
            <Text style={st.brandName}>BSH</Text>
            <Text style={st.brandSub}>Live Classes</Text>
          </View>
          <View style={st.headerActions}>
            {hasLiveNow && (
              <View style={st.liveIndicator}>
                <Animated.View style={[st.livePulse, { transform: [{ scale: pulseAnim }] }]} />
                <Text style={st.liveIndTxt}>LIVE NOW</Text>
              </View>
            )}
            <TouchableOpacity onPress={() => router.push(user ? "/(tabs)/dashboard" : "/(auth)/login")}>
              {user?.avatar
                ? <Image source={{ uri: user.avatar }} style={st.avatar} contentFit="cover" cachePolicy="memory-disk" />
                : <View style={st.avatarDefault}><Text style={st.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabScroll}>
          {TAB_CONFIG.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[st.tabBtn, active && { borderBottomColor: tab.color }]}
                onPress={() => setActiveTab(tab.key)}>
                <Ionicons name={tab.icon} size={14} color={active ? tab.color : "rgba(255,255,255,0.5)"} style={{ marginRight: 5 }} />
                <Text style={[st.tabTxt, active && { color: "#fff", fontWeight: "800" }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date strip — always rendered so header height is constant */}
        {activeTab !== "oneOnOne" ? renderDateStrip() : <View style={{ height: DATE_STRIP_H }} />}
      </Animated.View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_H + 8, paddingBottom: 80 }}
      >

        {/* ═══ FREE FOR ALL ═══ */}
        {activeTab === "freeAll" && (
          <View style={{ paddingHorizontal: 16 }}>
            {renderDayLabel("#d97706")}
            {pastLoading && <Text style={{ color: t.textMuted, textAlign: "center", marginVertical: 12, fontSize: 13 }}>Loading past classes…</Text>}

            {/* Live classes on selected day */}
            {filterForTab(dayClasses.filter(c => c.status === "live")).map((cls, idx) => (
              <View key={cls._id ?? idx} style={[st.onAirCard, { marginBottom: 16 }]}>
                <View style={st.onAirBadgeRow}>
                  <Animated.View style={[st.dotSm, { transform: [{ scale: pulseAnim }], backgroundColor: "#ef4444", marginRight: 5 }]} />
                  <Text style={st.onAirBadgeTxt}>ON AIR NOW</Text>
                </View>
                <Text style={st.onAirTitle}>{cls.title}</Text>
                <Text style={st.onAirSub}>{educatorName(cls.educator)}</Text>
                <TouchableOpacity style={st.onAirJoinBtn} onPress={() => joinLiveClass(cls)}>
                  <Ionicons name="radio-outline" size={16} color="#fff" />
                  <Text style={st.onAirJoinTxt}>Join Live Now</Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Scheduled + ended classes on selected day */}
            {filterForTab(dayClasses.filter(c => c.status !== "live")).map((cls, idx) =>
              renderClassCard(cls, "#d97706", idx)
            )}

            {!loading && !pastLoading && filterForTab(dayClasses).length === 0 && (
              <View style={[st.emptyState, { backgroundColor: t.surface }]}>
                <Ionicons name="calendar-outline" size={36} color="#d97706" />
                <Text style={[st.emptyTitle, { color: t.text }]}>
                  {isPastDate ? "No classes were held on this day" : "No classes scheduled"}
                </Text>
                <Text style={[st.emptySub, { color: t.textMuted }]}>
                  {isPastDate ? "Try a different day on the calendar." : "Check back soon — free classes appear here once scheduled."}
                </Text>
              </View>
            )}

            <View style={[st.infoStrip, { backgroundColor: t.surface, borderColor: t.border }]}>
              {([
                { icon: "wifi-outline" as const, label: "HD Live Stream" },
                { icon: "chatbubble-outline" as const, label: "Live Q&A" },
                { icon: "recording-outline" as const, label: "Recorded Access" },
              ]).map(f => (
                <View key={f.label} style={st.infoItem}>
                  <Ionicons name={f.icon} size={20} color="#FF6B8A" />
                  <Text style={[st.infoTxt, { color: t.textMuted }]}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══ COURSE LIVE ═══ */}
        {activeTab === "courseLive" && (
          <View style={{ paddingHorizontal: 16 }}>
            {renderDayLabel("#FF1E56")}

            {!user && (
              <View style={[st.emptyState, { backgroundColor: t.surface }]}>
                <Ionicons name="lock-closed-outline" size={36} color="#FF1E56" />
                <Text style={[st.emptyTitle, { color: t.text }]}>Login to see your classes</Text>
                <TouchableOpacity style={st.emptyBtn} onPress={() => router.push("/(auth)/login")}>
                  <Text style={st.emptyBtnTxt}>Log In</Text>
                </TouchableOpacity>
              </View>
            )}

            {user && pastLoading && <Text style={{ color: t.textMuted, textAlign: "center", marginVertical: 12, fontSize: 13 }}>Loading past classes…</Text>}

            {user && filterForTab(dayClasses).map((cls, idx) => renderClassCard(cls, "#FF1E56", idx))}

            {user && !loading && !pastLoading && filterForTab(dayClasses).length === 0 && (
              <View style={st.emptyState}>
                <View style={st.emptyIcon}><Ionicons name="school-outline" size={36} color="#FF1E56" /></View>
                <Text style={[st.emptyTitle, { color: t.text }]}>
                  {isPastDate ? "No course classes on this day" : "No live classes yet"}
                </Text>
                <Text style={[st.emptySub, { color: t.textMuted }]}>
                  {isPastDate ? "Try a different date." : "Enroll in a course to join its live sessions."}
                </Text>
                {!isPastDate && (
                  <TouchableOpacity style={[st.emptyBtn, { backgroundColor: "#FF1E56" }]} onPress={() => router.push("/(tabs)/explore")}>
                    <Text style={st.emptyBtnTxt}>Browse Courses</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* ═══ 1:1 SESSIONS ═══ */}
        {activeTab === "oneOnOne" && (
          <View style={{ paddingHorizontal: 16 }}>

            {!user && (
              <View style={[st.emptyState, { backgroundColor: t.surface }]}>
                <Ionicons name="lock-closed-outline" size={36} color="#FF1E56" />
                <Text style={[st.emptyTitle, { color: t.text, marginTop: 12 }]}>Login to see your sessions</Text>
                <TouchableOpacity style={st.emptyBtn} onPress={() => router.push("/(auth)/login")}>
                  <Text style={st.emptyBtnTxt}>Log In</Text>
                </TouchableOpacity>
              </View>
            )}

            {user && (
              <>
                {/* ── On Air NOW — only visible to the session's participant ── */}
                {myLiveOneOnOne.length > 0 && (
                  <View style={[st.onAirCard, { marginBottom: 20, borderColor: "rgba(239,68,68,0.5)", borderWidth: 1.5 }]}>
                    <View style={st.onAirBadgeRow}>
                      <Animated.View style={[st.dotSm, { transform: [{ scale: pulseAnim }], backgroundColor: "#ef4444", marginRight: 5 }]} />
                      <Text style={[st.onAirBadgeTxt, { letterSpacing: 1.2 }]}>YOUR SESSION IS LIVE NOW</Text>
                    </View>
                    {myLiveOneOnOne.map(cls => (
                      <View key={cls._id} style={{ marginTop: 10 }}>
                        <Text style={st.onAirTitle}>{cls.title}</Text>
                        <Text style={st.onAirSub}>with {educatorName(cls.educator)}</Text>
                        <TouchableOpacity style={st.onAirJoinBtn} onPress={() => joinLiveClass(cls)}>
                          <Ionicons name="radio-outline" size={18} color="#fff" />
                          <Text style={st.onAirJoinTxt}>Join Now</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* ── Upcoming scheduled 1:1 classes ── */}
                {myScheduledOneOnOne.length > 0 && (
                  <>
                    <View style={st.sectionHeaderRow}>
                      <Ionicons name="calendar-outline" size={16} color="#FF1E56" />
                      <Text style={[st.sectionTitle, { color: t.text }]}>Upcoming Sessions</Text>
                    </View>
                    {myScheduledOneOnOne.map((cls, idx) => {
                      const dt = new Date(cls.scheduledAt);
                      return (
                        <View key={cls._id ?? idx} style={[st.scheduleCard, { borderLeftColor: "#FF1E56", backgroundColor: t.card, borderColor: t.border }]}>
                          <View style={[st.dateCol, { backgroundColor: "#FF1E5620" }]}>
                            <Text style={[st.dateDay, { color: "#FF1E56" }]}>
                              {dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </Text>
                            <Text style={[st.dateTime, { color: t.textMuted }]}>
                              {dt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                            </Text>
                          </View>
                          <View style={st.scheduleInfo}>
                            <View style={[st.topicPill, { backgroundColor: "#FF1E5625", alignSelf: "flex-start", marginBottom: 6 }]}>
                              <Text style={[st.topicPillTxt, { color: "#FF1E56" }]}>1:1 Session</Text>
                            </View>
                            <Text style={[st.scheduleTitle, { color: t.text }]}>{cls.title}</Text>
                            <View style={st.scheduleEduRow}>
                              <Ionicons name="person-circle-outline" size={14} color="#FF6B8A" />
                              <Text style={st.scheduleEduTxt}>{educatorName(cls.educator)}</Text>
                            </View>
                            <Text style={[st.durationTxt, { color: t.textMuted, marginTop: 4 }]}>{cls.duration} min session</Text>
                          </View>
                        </View>
                      );
                    })}
                  </>
                )}

                {/* ── My Bookings (session applications) ── */}
                {myApplications.length > 0 && (
                  <>
                    <View style={[st.sectionHeaderRow, { marginTop: myScheduledOneOnOne.length > 0 ? 20 : 0 }]}>
                      <Ionicons name="documents-outline" size={16} color="#FF1E56" />
                      <Text style={[st.sectionTitle, { color: t.text }]}>My Bookings</Text>
                    </View>
                    {myApplications.map(app => {
                      const lc = app.liveClassId as (LiveClass & { status: string }) | null | undefined;
                      const lcIsLive      = lc && lc.status === "live";
                      const lcIsScheduled = lc && lc.status === "scheduled";
                      const schedAt       = lcIsScheduled && lc ? new Date((lc as any).scheduledAt) : null;

                      return (
                        <View key={app._id} style={[st.sessionCard, { backgroundColor: t.card, borderColor: t.border }]}>
                          <View style={st.sessionHeader}>
                            <View style={[st.badge, { backgroundColor: `${appStatusColor(app.status)}22` }]}>
                              <Text style={[st.badgeTxt, { color: appStatusColor(app.status) }]}>
                                {appStatusLabel(app.status)}
                              </Text>
                            </View>
                            {lcIsLive && (
                              <View style={[st.badge, { backgroundColor: "#ef444422", flexDirection: "row", alignItems: "center" }]}>
                                <Animated.View style={[st.dotSm, { transform: [{ scale: pulseAnim }], backgroundColor: "#ef4444", marginRight: 4, width: 6, height: 6 }]} />
                                <Text style={[st.badgeTxt, { color: "#ef4444" }]}>LIVE NOW</Text>
                              </View>
                            )}
                          </View>

                          <Text style={[{ color: t.text, fontSize: 14, fontWeight: "700", marginBottom: 4 }]}>
                            Session with {app.trainerName}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: 12, marginBottom: 4 }}>
                            Issue: {app.issue}
                          </Text>

                          {app.proposedSchedule ? (
                            <Text style={{ color: "#60a5fa", fontSize: 12, marginBottom: 4 }}>
                              📅 Proposed time: {app.proposedSchedule}
                            </Text>
                          ) : null}

                          {schedAt ? (
                            <Text style={{ color: "#22c55e", fontSize: 12, marginBottom: 4 }}>
                              📅 Scheduled:{" "}
                              {schedAt.toLocaleDateString("en-IN", { dateStyle: "medium" })}{" "}
                              at {schedAt.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                            </Text>
                          ) : null}

                          {app.trainerNote ? (
                            <Text style={{ color: t.textMuted, fontSize: 11, fontStyle: "italic", marginBottom: 6 }}>
                              "{app.trainerNote}"
                            </Text>
                          ) : null}

                          <Text style={{ color: t.textMuted, fontSize: 11 }}>
                            Booked: {new Date(app.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          </Text>

                          {lcIsLive && lc && (
                            <TouchableOpacity
                              style={[st.joinSmallBtn, { borderColor: "#ef4444", backgroundColor: "#ef444420", marginTop: 10 }]}
                              onPress={() => joinLiveClass(lc as LiveClass)}
                            >
                              <Text style={[st.joinSmallTxt, { color: "#f87171" }]}>Join Live Now →</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}

                {/* ── Empty state ── */}
                {!loading && myApplications.length === 0 && myLiveOneOnOne.length === 0 && myScheduledOneOnOne.length === 0 && (
                  <View style={st.emptyState}>
                    <View style={st.emptyIcon}><Ionicons name="people-outline" size={36} color="#FF1E56" /></View>
                    <Text style={[st.emptyTitle, { color: t.text }]}>No sessions booked yet</Text>
                    <Text style={[st.emptySub, { color: t.textMuted }]}>Book a private 1:1 healing session with our experts</Text>
                    <TouchableOpacity style={st.emptyBtn} onPress={() => router.push("/(tabs)/consultation" as any)}>
                      <Text style={st.emptyBtnTxt}>Book a Session</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* ── Book new CTA ── */}
                <TouchableOpacity style={[st.bookCta, { borderColor: "#FF1E56" }]} onPress={() => router.push("/(tabs)/consultation" as any)}>
                  <Ionicons name="add-circle-outline" size={20} color="#FF1E56" style={{ marginRight: 10 }} />
                  <Text style={{ color: "#FF1E56", fontSize: 14, fontWeight: "700" }}>Book a New 1:1 Session</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

      </ScrollView>

      {/* ── Recording Player Modal ── */}
      <Modal
        visible={!!watchingClass}
        animationType="slide"
        onRequestClose={() => { setWatchingClass(null); setWatchUrl(""); }}
      >
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          {/* Header bar */}
          <View style={{
            flexDirection: "row", alignItems: "center", paddingTop: insets.top + 8,
            paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#0a0a0a",
          }}>
            <TouchableOpacity onPress={() => { setWatchingClass(null); setWatchUrl(""); }} style={{ marginRight: 12 }}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
                {watchingClass?.title ?? "Recording"}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 1 }}>
                {watchingClass ? educatorName(watchingClass.educator) : ""}
              </Text>
            </View>
          </View>

          {/* Player area */}
          <View style={{ aspectRatio: 16 / 9, backgroundColor: "#111", justifyContent: "center", alignItems: "center" }}>
            {watchLoading && (
              <>
                <ActivityIndicator color="#6366f1" size="large" />
                <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 12, fontSize: 13 }}>
                  Loading recording…
                </Text>
              </>
            )}
            {!watchLoading && watchUrl ? (
              <Video
                source={{ uri: watchUrl }}
                style={{ width: "100%", height: "100%" }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={false}
              />
            ) : null}
            {!watchLoading && !watchUrl && watchingClass && (
              <View style={{ alignItems: "center", padding: 24 }}>
                <Ionicons name="videocam-off-outline" size={48} color="rgba(255,255,255,0.3)" />
                <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 12, textAlign: "center", fontSize: 14 }}>
                  Recording not available.{"\n"}It may still be processing — check back in a few minutes.
                </Text>
              </View>
            )}
          </View>

          {/* Class info */}
          {watchingClass && (
            <View style={{ padding: 20 }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18, marginBottom: 6 }}>
                {watchingClass.title}
              </Text>
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>
                {new Date(watchingClass.scheduledAt).toLocaleDateString("en-IN", { dateStyle: "long" })}
                {"  ·  "}
                {watchingClass.duration} min
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
                <Ionicons name="person-circle-outline" size={16} color="#818cf8" />
                <Text style={{ color: "#818cf8", fontSize: 13, marginLeft: 5, fontWeight: "600" }}>
                  {educatorName(watchingClass.educator)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1 },

  // Header
  headerWrapper: {
    paddingHorizontal: 16, paddingBottom: 0,
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    elevation: 10, shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
  },
  headerRow: { flexDirection: "row", alignItems: "center", paddingTop: 10, marginBottom: 10 },
  headerLogo: { width: 36, height: 36, marginRight: 10, borderRadius: 8 },
  brandArea: { flex: 1 },
  brandName: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5 },
  brandSub: { color: "rgba(255,255,255,0.65)", fontSize: 11 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  liveIndicator: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(239,68,68,0.2)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(239,68,68,0.4)" },
  livePulse: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444" },
  liveIndTxt: { color: "#f87171", fontSize: 10, fontWeight: "800" },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarDefault: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Tabs
  tabScroll: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.12)" },
  tabBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent", marginRight: 4 },
  tabTxt: { color: "rgba(255,255,255,0.5)", fontSize: 13, fontWeight: "600" },

  // Date strip
  dateStrip: { height: DATE_STRIP_H, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  dateCell: { width: CELL_W - 4, alignItems: "center", paddingVertical: 6, paddingHorizontal: 4, borderRadius: 10, marginHorizontal: 2 },
  dateDayName: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: "600", marginBottom: 2 },
  dateDayNum: { color: "rgba(255,255,255,0.9)", fontSize: 16, fontWeight: "700", marginBottom: 3 },
  dateDot: { width: 5, height: 5, borderRadius: 3 },

  // Day label bar
  dayLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  dayLabel: { fontSize: 16, fontWeight: "800", flex: 1 },
  badge: { flexDirection: "row", alignItems: "center", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeTxt: { fontSize: 10, fontWeight: "800" },

  // On-air card
  onAirCard: { backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 16, padding: 16 },
  onAirBadgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  onAirBadgeTxt: { color: "#ef4444", fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  onAirTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 2 },
  onAirSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 12 },
  onAirJoinBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ef4444", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 18, alignSelf: "flex-start" },
  onAirJoinTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },

  // Class cards
  scheduleCard: { flexDirection: "row", borderRadius: 14, marginBottom: 12, overflow: "hidden", borderLeftWidth: 4, borderWidth: 1 },
  dateCol: { width: 80, padding: 14, alignItems: "center", justifyContent: "center" },
  dateDay: { fontSize: 11, fontWeight: "800", textAlign: "center", marginBottom: 4 },
  dateTime: { fontSize: 10, textAlign: "center" },
  scheduleInfo: { flex: 1, padding: 14 },
  scheduleTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  topicPill: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  topicPillTxt: { fontSize: 10, fontWeight: "700" },
  durationPill: { flexDirection: "row", alignItems: "center", gap: 3 },
  durationTxt: { fontSize: 10 },
  scheduleTitle: { fontSize: 13, fontWeight: "700", lineHeight: 18, marginBottom: 6 },
  scheduleEduRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  scheduleEduTxt: { color: "#FF6B8A", fontSize: 11, fontWeight: "600" },
  joinSmallBtn: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5, flexDirection: "row", alignItems: "center" },
  joinSmallTxt: { fontSize: 12, fontWeight: "700" },

  // Section headers
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },

  // 1:1 session cards
  sessionCard: { borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  sessionHeader: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },

  // Info strip
  infoStrip: { flexDirection: "row", justifyContent: "space-around", marginTop: 16, borderRadius: 14, paddingVertical: 16, borderWidth: 1 },
  infoItem: { alignItems: "center", gap: 6 },
  infoTxt: { fontSize: 11, fontWeight: "600" },

  // Empty states
  emptyState: { alignItems: "center", paddingVertical: 48, borderRadius: 16, marginBottom: 16 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(255,30,86,0.10)", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginBottom: 8 },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 16 },
  emptyBtn: { backgroundColor: "#FF1E56", borderRadius: 12, paddingHorizontal: 24, paddingVertical: 11 },
  emptyBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },

  // Book CTA
  bookCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 14, paddingVertical: 14, borderWidth: 2, marginTop: 8 },

  // Shared dot
  dotSm: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444" },
});
