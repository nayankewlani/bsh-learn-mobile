import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, StyleSheet,
  Modal, Alert, Animated, Easing, Dimensions, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, Stack, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Speech from "expo-speech";
import Svg, { Circle } from "react-native-svg";
import { useAuthStore } from "../stores/authStore";
import client from "../api/client";

const { width: W } = Dimensions.get("window");
const CARD_W = (W - 16 * 2 - 12) / 2;

// ── Tool data ─────────────────────────────────────────────────────────────────
interface HealTool {
  id: number; category: string; title: string; desc: string;
  icon: string; duration: string; type: string; free: boolean;
  g1: string; g2: string; interactive?: "breathing" | "pomodoro";
}

const HEAL_TOOLS: HealTool[] = [
  { id:1,  category:"Breathing", title:"Box Breathing",              desc:"4-4-4-4 for instant calm",         icon:"lungs",                  duration:"5 min",  type:"INTERACTIVE", free:true,  g1:"#4facfe", g2:"#00f2fe", interactive:"breathing" },
  { id:2,  category:"Breathing", title:"Deep Belly Breathing",       desc:"Activate deep calm naturally",     icon:"weather-windy",          duration:"7 min",  type:"GUIDED",      free:true,  g1:"#43e97b", g2:"#38f9d7" },
  { id:3,  category:"Focus",     title:"Pomodoro Focus Timer",       desc:"25+5 deep work cycles",            icon:"timer-sand",             duration:"25 min", type:"TIMER",       free:true,  g1:"#fa709a", g2:"#fee140", interactive:"pomodoro" },
  { id:4,  category:"Healing",   title:"Gratitude Meditation",       desc:"5-min heart-opening practice",     icon:"hand-heart",             duration:"5 min",  type:"AUDIO",       free:true,  g1:"#f6d365", g2:"#fda085" },
  { id:5,  category:"Breathing", title:"4-7-8 Sleep Breathing",      desc:"Fall asleep in minutes",           icon:"weather-night",          duration:"10 min", type:"GUIDED",      free:false, g1:"#667eea", g2:"#764ba2" },
  { id:6,  category:"Breathing", title:"Alternate Nostril",          desc:"Balance left-right brain",         icon:"yin-yang",               duration:"8 min",  type:"GUIDED",      free:false, g1:"#f093fb", g2:"#f5576c" },
  { id:7,  category:"Healing",   title:"Inner Child Healing",        desc:"Heal childhood wounds deeply",     icon:"baby-face-outline",      duration:"20 min", type:"HYPNOSIS",    free:false, g1:"#4facfe", g2:"#43e97b" },
  { id:8,  category:"Healing",   title:"Fear Release Hypnosis",      desc:"Build courage from the inside",    icon:"shield-star",            duration:"15 min", type:"HYPNOSIS",    free:false, g1:"#43e97b", g2:"#38f9d7" },
  { id:9,  category:"Sleep",     title:"Deep Sleep Hypnosis",        desc:"Guided sleep induction",           icon:"sleep",                  duration:"30 min", type:"HYPNOSIS",    free:false, g1:"#a18cd1", g2:"#fbc2eb" },
  { id:10, category:"Sleep",     title:"Night Affirmations",         desc:"Program success while you sleep",  icon:"creation",               duration:"12 min", type:"AUDIO",       free:false, g1:"#667eea", g2:"#764ba2" },
  { id:11, category:"Healing",   title:"Stress Detox Meditation",    desc:"Deep nervous system reset",        icon:"leaf",                   duration:"18 min", type:"GUIDED",      free:false, g1:"#a8edea", g2:"#fed6e3" },
  { id:12, category:"Student",   title:"Exam Confidence Hypnosis",   desc:"Peak performance before exams",    icon:"trophy",                 duration:"18 min", type:"HYPNOSIS",    free:false, g1:"#fa709a", g2:"#fee140" },
  { id:13, category:"Student",   title:"Memory Activation Audio",    desc:"Alpha waves for retention",        icon:"brain",                  duration:"10 min", type:"AUDIO",       free:false, g1:"#30cfd0", g2:"#330867" },
  { id:14, category:"Focus",     title:"Alpha Frequency Meditation", desc:"8-12Hz brainwave sync",            icon:"headphones",             duration:"20 min", type:"AUDIO",       free:false, g1:"#667eea", g2:"#764ba2" },
  { id:15, category:"Healing",   title:"Chakra Balancing",           desc:"7-chakra energy alignment",        icon:"infinity",               duration:"25 min", type:"AUDIO",       free:false, g1:"#f6d365", g2:"#fda085" },
  { id:16, category:"Healing",   title:"Self Confidence Builder",    desc:"Hypnotic confidence boost",        icon:"account-heart-outline",  duration:"15 min", type:"HYPNOSIS",    free:false, g1:"#fa709a", g2:"#fee140" },
  { id:17, category:"Healing",   title:"Anger Release Therapy",      desc:"Safe emotional release practice",  icon:"fire",                   duration:"12 min", type:"GUIDED",      free:false, g1:"#43e97b", g2:"#38f9d7" },
  { id:18, category:"Focus",     title:"Concentration Visualization",desc:"Sharpen mental clarity",           icon:"eye-circle-outline",     duration:"15 min", type:"GUIDED",      free:false, g1:"#a18cd1", g2:"#fbc2eb" },
  { id:19, category:"Student",   title:"Study Hypnosis Session",     desc:"Enter flow state in minutes",      icon:"head-lightbulb",         duration:"22 min", type:"HYPNOSIS",    free:false, g1:"#4facfe", g2:"#00f2fe" },
  { id:20, category:"Healing",   title:"Past Life Regression",       desc:"Deep soul-level healing journey",  icon:"compass",                duration:"40 min", type:"HYPNOSIS",    free:false, g1:"#fa709a", g2:"#764ba2" },
];

const CATS = ["All", "Breathing", "Focus", "Sleep", "Healing", "Student"];
const CAT_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  All: "apps-outline", Breathing: "pulse-outline", Focus: "hourglass-outline",
  Sleep: "moon-outline", Healing: "heart-outline", Student: "school-outline",
};

const PLAYER_SCRIPTS: Record<string, string[]> = {
  HYPNOSIS: [
    "Find a comfortable position and gently close your eyes…",
    "Take three slow, deep breaths — in through the nose, out through the mouth…",
    "Let every muscle begin to soften and release…",
    "Feel a wave of calm spreading from your head all the way to your toes…",
    "Your mind is clear, open, and completely at ease…",
    "Allow the healing to flow through every part of your being…",
    "You are safe, deeply relaxed, and at total peace…",
    "Rest here as long as you need. The healing continues…",
  ],
  AUDIO: [
    "Find a quiet space and settle in comfortably…",
    "Take a deep breath in… hold gently… and slowly release…",
    "Let these words wash over you like gentle waves…",
    "Your mind is open and receptive to positive change…",
    "Breathe naturally — let the session guide you deeper…",
    "You are doing beautifully. Stay with this feeling…",
    "Let this energy fill every corner of your being…",
    "Carry this peace and clarity with you all day…",
  ],
  GUIDED: [
    "Settle into a comfortable seated or lying position…",
    "Close your eyes and take three cleansing breaths…",
    "Notice the natural rhythm of your breath — no need to change it…",
    "With each exhale, release any tension you're holding…",
    "Your body knows how to heal itself. Trust the process…",
    "Deepen your awareness with every breath cycle…",
    "You are whole. You are well. You are at peace…",
    "Gently return to the room whenever you feel ready…",
  ],
};

const BREATH_PHASES: Array<{ phase: "inhale"|"hold1"|"exhale"|"hold2"; dur: number }> = [
  { phase:"inhale", dur:4 }, { phase:"hold1", dur:4 },
  { phase:"exhale", dur:4 }, { phase:"hold2", dur:4 },
];

const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// ── Main screen ───────────────────────────────────────────────────────────────
export default function HealingToolsScreen() {
  const insets  = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [hasAccess, setHasAccess]   = useState(false);
  const [cat, setCat]               = useState("All");
  const [query, setQuery]           = useState("");

  // Player
  const [healPlayer, setHealPlayer]     = useState<HealTool | null>(null);
  const [playerRunning, setPlayerRunning] = useState(false);
  const [playerElapsed, setPlayerElapsed] = useState(0);
  const playerIvRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerGlowAnim = useRef(new Animated.Value(0.85)).current;
  const playerOrb1Anim = useRef(new Animated.Value(0)).current;
  const playerOrb2Anim = useRef(new Animated.Value(0)).current;
  const glowLoop = useRef<Animated.CompositeAnimation | null>(null);
  const orb1Loop = useRef<Animated.CompositeAnimation | null>(null);
  const orb2Loop = useRef<Animated.CompositeAnimation | null>(null);

  // Breathing
  const [breathOpen, setBreathOpen]   = useState(false);
  const [breathPhase, setBreathPhase] = useState<"inhale"|"hold1"|"exhale"|"hold2">("inhale");
  const [breathSecs, setBreathSecs]   = useState(4);
  const [breathCycles, setBreathCycles] = useState(0);
  const breathAnim     = useRef(new Animated.Value(0.7)).current;
  const breathIvRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathIdxRef   = useRef(0);
  const breathSecsRef  = useRef(4);

  // Pomodoro
  const [pomOpen, setPomOpen]       = useState(false);
  const [pomPhase, setPomPhase]     = useState<"focus"|"shortBreak"|"longBreak">("focus");
  const [pomSecs, setPomSecs]       = useState(25 * 60);
  const [pomSession, setPomSession] = useState(1);
  const [pomRunning, setPomRunning] = useState(false);
  const pomIvRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const pomSecsRef    = useRef(25 * 60);
  const pomPhaseRef   = useRef<"focus"|"shortBreak"|"longBreak">("focus");
  const pomSessionRef = useRef(1);
  const POM_DURATIONS = { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 };
  const POM_COLORS    = { focus: "#0c2461", shortBreak: "#059669", longBreak: "#d97706" };

  // ── Access check ─────────────────────────────────────────────────────────
  const checkAccess = useCallback(() => {
    if (!user) return;
    AsyncStorage.getItem("bsh_healing_unlocked").then(flag => {
      if (flag === "1") setHasAccess(true);
    }).catch(() => {});
    client.get("/payments/program-access/healing-tools")
      .then(({ data }) => {
        const ok = data.hasAccess === true;
        setHasAccess(ok);
        if (ok) AsyncStorage.setItem("bsh_healing_unlocked", "1").catch(() => {});
      })
      .catch(() => {});
  }, [user?._id]);

  useEffect(() => { checkAccess(); }, [checkAccess]);
  useFocusEffect(useCallback(() => { checkAccess(); }, [checkAccess]));

  // ── Breathing logic ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!breathOpen) {
      clearInterval(breathIvRef.current!);
      breathAnim.stopAnimation();
      breathIdxRef.current = 0; breathSecsRef.current = 4;
      setBreathPhase("inhale"); setBreathSecs(4); setBreathCycles(0);
      breathAnim.setValue(0.7); return;
    }
    Animated.timing(breathAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
    breathIvRef.current = setInterval(() => {
      breathSecsRef.current--;
      if (breathSecsRef.current <= 0) {
        breathIdxRef.current = (breathIdxRef.current + 1) % BREATH_PHASES.length;
        if (breathIdxRef.current === 0) setBreathCycles(c => c + 1);
        breathSecsRef.current = BREATH_PHASES[breathIdxRef.current].dur;
        const next = BREATH_PHASES[breathIdxRef.current].phase;
        setBreathPhase(next);
        const toVal = next === "inhale" || next === "hold1" ? 1 : 0.7;
        Animated.timing(breathAnim, { toValue: toVal, duration: BREATH_PHASES[breathIdxRef.current].dur * 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }).start();
      }
      setBreathSecs(breathSecsRef.current);
    }, 1000);
    return () => { clearInterval(breathIvRef.current!); breathAnim.stopAnimation(); };
  }, [breathOpen]);

  // ── Pomodoro logic ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pomOpen) { clearInterval(pomIvRef.current!); setPomRunning(false); setPomPhase("focus"); setPomSecs(25 * 60); setPomSession(1); pomSecsRef.current = 25 * 60; pomPhaseRef.current = "focus"; pomSessionRef.current = 1; return; }
  }, [pomOpen]);

  useEffect(() => {
    if (!pomRunning) { clearInterval(pomIvRef.current!); return; }
    pomIvRef.current = setInterval(() => {
      const next = pomSecsRef.current - 1;
      if (next > 0) { setPomSecs(next); pomSecsRef.current = next; return; }
      setPomRunning(false);
      const ph = pomPhaseRef.current; const sess = pomSessionRef.current;
      if (ph === "focus") {
        const nextPh: "shortBreak"|"longBreak" = sess % 4 === 0 ? "longBreak" : "shortBreak";
        pomPhaseRef.current = nextPh; pomSecsRef.current = POM_DURATIONS[nextPh];
        setPomPhase(nextPh); setPomSecs(POM_DURATIONS[nextPh]);
      } else {
        const nextSess = sess + 1; pomSessionRef.current = nextSess; setPomSession(nextSess);
        pomPhaseRef.current = "focus"; pomSecsRef.current = POM_DURATIONS.focus;
        setPomPhase("focus"); setPomSecs(POM_DURATIONS.focus);
      }
    }, 1000);
    return () => clearInterval(pomIvRef.current!);
  }, [pomRunning]);

  // ── Player logic ──────────────────────────────────────────────────────────
  useEffect(() => {
    glowLoop.current?.stop(); orb1Loop.current?.stop(); orb2Loop.current?.stop();
    if (!healPlayer) { setPlayerRunning(false); setPlayerElapsed(0); clearInterval(playerIvRef.current!); playerGlowAnim.stopAnimation(() => playerGlowAnim.setValue(0.85)); return; }
    glowLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(playerGlowAnim, { toValue: 1.18, duration: 1800, useNativeDriver: true }),
      Animated.timing(playerGlowAnim, { toValue: 0.82, duration: 1800, useNativeDriver: true }),
    ]));
    glowLoop.current.start();
    orb1Loop.current = Animated.loop(Animated.sequence([
      Animated.timing(playerOrb1Anim, { toValue: 1, duration: 4200, useNativeDriver: true }),
      Animated.timing(playerOrb1Anim, { toValue: 0, duration: 4200, useNativeDriver: true }),
    ]));
    orb1Loop.current.start();
    orb2Loop.current = Animated.loop(Animated.sequence([
      Animated.timing(playerOrb2Anim, { toValue: 1, duration: 5600, useNativeDriver: true }),
      Animated.timing(playerOrb2Anim, { toValue: 0, duration: 5600, useNativeDriver: true }),
    ]));
    orb2Loop.current.start();
    setPlayerRunning(true);
    return () => { glowLoop.current?.stop(); orb1Loop.current?.stop(); orb2Loop.current?.stop(); };
  }, [healPlayer]);

  useEffect(() => {
    if (!playerRunning) { clearInterval(playerIvRef.current!); return; }
    playerIvRef.current = setInterval(() => setPlayerElapsed(e => e + 1), 1000);
    return () => clearInterval(playerIvRef.current!);
  }, [playerRunning]);

  const playerDurationSecs = useMemo(() => healPlayer ? (parseInt(healPlayer.duration) || 10) * 60 : 600, [healPlayer]);
  const playerPhases       = useMemo(() => PLAYER_SCRIPTS[healPlayer?.type ?? "AUDIO"] ?? PLAYER_SCRIPTS.AUDIO, [healPlayer]);
  const phaseInterval      = useMemo(() => Math.floor(playerDurationSecs / playerPhases.length), [playerDurationSecs, playerPhases]);
  const currentPhaseIdx    = Math.min(Math.floor(playerElapsed / Math.max(phaseInterval, 1)), playerPhases.length - 1);
  const currentPhaseText   = playerPhases[currentPhaseIdx];
  const playerProgress     = Math.min(playerElapsed / playerDurationSecs, 1);

  useEffect(() => {
    if (!healPlayer || !playerRunning) { Speech.stop(); return; }
    Speech.stop();
    Speech.speak(currentPhaseText, { language: "en-IN", pitch: 0.88, rate: 0.80 });
    return () => { Speech.stop(); };
  }, [currentPhaseText, playerRunning, healPlayer?.id]);

  const CIRC_R    = 88;
  const CIRC_C    = 2 * Math.PI * CIRC_R;
  const dashOff   = CIRC_C * (1 - playerProgress);
  const orb1Y     = playerOrb1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const orb2Y     = playerOrb2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });

  // ── Tap handler ───────────────────────────────────────────────────────────
  const handleTap = (tool: HealTool) => {
    if (!tool.free && !hasAccess) {
      Alert.alert("🔒 Premium Tool",
        `${tool.title} is part of the Healing Tools pack.\n\nUnlock all 20 tools for just ₹99 (one-time).`,
        [
          { text: "Unlock ₹99", onPress: () => router.push("/program/healing-tools" as any) },
          { text: "Maybe Later", style: "cancel" },
        ]);
      return;
    }
    if (tool.interactive === "breathing") setBreathOpen(true);
    else if (tool.interactive === "pomodoro") setPomOpen(true);
    else setHealPlayer(tool);
  };

  const filtered = useMemo(() =>
    HEAL_TOOLS.filter(t =>
      (cat === "All" || t.category === cat) &&
      (!query || t.title.toLowerCase().includes(query.toLowerCase()))
    ), [cat, query]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>BSH Healing Tools</Text>
          <Text style={s.headerSub}>
            {hasAccess ? "✓ All 20 tools unlocked" : "4 free · Unlock all 20 for ₹99"}
          </Text>
        </View>
        {hasAccess && (
          <View style={s.unlockedBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
            <Text style={s.unlockedTxt}>Unlocked</Text>
          </View>
        )}
      </View>

      {/* Category filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {CATS.map(c => {
          const active = cat === c;
          return (
            <TouchableOpacity key={c} onPress={() => setCat(c)}
              style={[s.catTab, active && s.catTabActive]}>
              <Ionicons name={CAT_ICONS[c]} size={12} color={active ? "#93c5fd" : "#64748b"} />
              <Text style={[s.catTabTxt, { color: active ? "#93c5fd" : "#64748b" }]}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        columnWrapperStyle={{ gap: 12, marginBottom: 12 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: tool }) => {
          const locked = !tool.free && !hasAccess;
          return (
            <TouchableOpacity style={[s.card, { width: CARD_W }]} onPress={() => handleTap(tool)} activeOpacity={0.82}>
              {/* Top gradient area */}
              <View style={[s.cardTop, { backgroundColor: locked ? "#1e293b" : tool.g1 }]}>
                <MaterialCommunityIcons
                  name={tool.icon as any}
                  size={38}
                  color={locked ? "#475569" : "#fff"}
                />
                <View style={[s.typePill, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
                  <Text style={s.typePillTxt}>{tool.type}</Text>
                </View>
                {tool.free
                  ? <View style={[s.badge2, { backgroundColor: "#22c55e33", borderColor: "#22c55e66" }]}>
                      <Text style={[s.badge2Txt, { color: "#4ade80" }]}>FREE</Text>
                    </View>
                  : hasAccess
                    ? <View style={[s.badge2, { backgroundColor: "#22c55e22", borderColor: "#22c55e44" }]}>
                        <Text style={[s.badge2Txt, { color: "#4ade80" }]}>✓</Text>
                      </View>
                    : <View style={[s.badge2, { backgroundColor: "rgba(0,0,0,0.5)", borderColor: "#334155" }]}>
                        <Text style={[s.badge2Txt, { color: "#94a3b8" }]}>🔒 ₹99</Text>
                      </View>}
              </View>

              {/* Body */}
              <View style={s.cardBody}>
                <Text style={s.cardTitle} numberOfLines={2}>{tool.title}</Text>
                <Text style={s.cardDesc} numberOfLines={2}>{tool.desc}</Text>
                <View style={s.cardFoot}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                    <Ionicons name="time-outline" size={10} color={locked ? "#475569" : tool.g1} />
                    <Text style={[s.durTxt, { color: locked ? "#475569" : tool.g1 }]}>{tool.duration}</Text>
                  </View>
                  <View style={[s.ctaBtn, { backgroundColor: locked ? "#1e293b" : tool.g1 + "30", borderColor: locked ? "#334155" : tool.g1 + "60" }]}>
                    <Text style={[s.ctaTxt, { color: locked ? "#475569" : tool.g1 }]}>
                      {locked ? "Unlock" : tool.interactive ? "Start →" : "Play →"}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListFooterComponent={!hasAccess ? (
          <TouchableOpacity style={s.unlockBar} onPress={() => router.push("/program/healing-tools" as any)}>
            <Ionicons name="lock-open-outline" size={16} color="#60a5fa" />
            <Text style={s.unlockBarTxt}>Unlock all 20 premium tools — just ₹99 one-time</Text>
            <Ionicons name="chevron-forward" size={16} color="#60a5fa" />
          </TouchableOpacity>
        ) : null}
      />

      {/* ── Breathing Modal ─────────────────────────────────────────────────── */}
      <Modal visible={breathOpen} transparent animationType="fade" onRequestClose={() => setBreathOpen(false)}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { paddingTop: 28, paddingBottom: 32, paddingHorizontal: 24 }]}>
            <TouchableOpacity style={s.modalClose} onPress={() => setBreathOpen(false)}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Box Breathing</Text>
            <Text style={s.modalSub}>4-4-4-4 · Cycle {breathCycles + 1}</Text>

            <View style={{ alignItems: "center", marginVertical: 28 }}>
              <Animated.View style={[s.breathCircle, { transform: [{ scale: breathAnim }] }]}>
                <Text style={s.breathPhase}>
                  {{ inhale:"Inhale", hold1:"Hold", exhale:"Exhale", hold2:"Hold" }[breathPhase]}
                </Text>
                <Text style={s.breathSecs}>{breathSecs}s</Text>
              </Animated.View>
            </View>

            <Text style={s.breathInstruct}>
              {{ inhale:"Breathe in slowly through your nose…", hold1:"Hold gently, stay still…", exhale:"Exhale slowly through your mouth…", hold2:"Rest before the next breath…" }[breathPhase]}
            </Text>
            <View style={s.breathStats}>
              <View style={s.breathStat}><Text style={s.breathStatVal}>{breathCycles}</Text><Text style={s.breathStatLbl}>Cycles</Text></View>
              <View style={s.breathStat}><Text style={s.breathStatVal}>{breathCycles * 4} min</Text><Text style={s.breathStatLbl}>Approx.</Text></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Pomodoro Modal ──────────────────────────────────────────────────── */}
      <Modal visible={pomOpen} transparent animationType="fade" onRequestClose={() => { setPomOpen(false); setPomRunning(false); }}>
        <View style={s.modalBg}>
          <View style={[s.modalCard, { paddingTop: 28, paddingBottom: 32, paddingHorizontal: 24 }]}>
            <TouchableOpacity style={s.modalClose} onPress={() => { setPomOpen(false); setPomRunning(false); }}>
              <Ionicons name="close" size={22} color="#94a3b8" />
            </TouchableOpacity>
            <Text style={s.modalTitle}>Pomodoro Timer</Text>
            <Text style={[s.modalSub, { color: POM_COLORS[pomPhase] }]}>
              {{ focus:"Focus Session", shortBreak:"Short Break", longBreak:"Long Break" }[pomPhase]} · #{pomSession}
            </Text>

            <View style={{ alignItems: "center", marginVertical: 28 }}>
              <View style={[s.pomCircle, { borderColor: POM_COLORS[pomPhase] + "60" }]}>
                <Text style={[s.pomTime, { color: POM_COLORS[pomPhase] }]}>{fmtTime(pomSecs)}</Text>
                <Text style={s.pomLabel}>{{ focus:"FOCUS", shortBreak:"BREAK", longBreak:"LONG BREAK" }[pomPhase]}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity style={[s.pomBtn, { backgroundColor: POM_COLORS[pomPhase] }]}
                onPress={() => setPomRunning(r => !r)}>
                <Ionicons name={pomRunning ? "pause" : "play"} size={18} color="#fff" />
                <Text style={s.pomBtnTxt}>{pomRunning ? "Pause" : "Start"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.pomBtn, { backgroundColor: "#1e293b", flex: 0.6 }]}
                onPress={() => { setPomRunning(false); setPomSecs(POM_DURATIONS[pomPhase]); pomSecsRef.current = POM_DURATIONS[pomPhase]; }}>
                <Ionicons name="refresh" size={16} color="#94a3b8" />
                <Text style={[s.pomBtnTxt, { color: "#94a3b8" }]}>Reset</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Player Modal ────────────────────────────────────────────────────── */}
      <Modal visible={healPlayer !== null} transparent animationType="fade" onRequestClose={() => { setHealPlayer(null); Speech.stop(); }}>
        {healPlayer && (
          <View style={s.modalBg}>
            <View style={[s.modalCard, { paddingTop: 24, paddingBottom: 36 }]}>
              <TouchableOpacity style={s.modalClose} onPress={() => { setHealPlayer(null); Speech.stop(); }}>
                <Ionicons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>

              <Text style={[s.modalTitle, { fontSize: 17 }]} numberOfLines={2}>{healPlayer.title}</Text>
              <Text style={[s.modalSub, { color: healPlayer.g1 }]}>{healPlayer.type} · {healPlayer.duration}</Text>

              {/* Orb player */}
              <View style={{ alignItems: "center", marginVertical: 24, height: 210 }}>
                <View style={{ position: "absolute", width: 200, height: 200, alignItems: "center", justifyContent: "center" }}>
                  <Animated.View style={[s.playerOrb, s.playerOrb1, { backgroundColor: healPlayer.g1 + "18", transform: [{ translateY: orb1Y }] }]} />
                  <Animated.View style={[s.playerOrb, s.playerOrb2, { backgroundColor: (healPlayer.g2 || healPlayer.g1) + "12", transform: [{ translateY: orb2Y }] }]} />
                </View>
                <Animated.View style={[s.playerGlow, { backgroundColor: healPlayer.g1 + "22", transform: [{ scale: playerGlowAnim }] }]} />
                <Svg width={200} height={200} style={{ position: "absolute" }}>
                  <Circle cx={100} cy={100} r={CIRC_R} stroke={healPlayer.g1 + "30"} strokeWidth={6} fill="none" />
                  <Circle cx={100} cy={100} r={CIRC_R} stroke={healPlayer.g1} strokeWidth={6} fill="none"
                    strokeDasharray={`${CIRC_C}`} strokeDashoffset={dashOff}
                    strokeLinecap="round" transform="rotate(-90, 100, 100)" />
                </Svg>
                <View style={s.playerCenter}>
                  <MaterialCommunityIcons name={healPlayer.icon as any} size={36} color={healPlayer.g1} />
                  <Text style={[s.playerTime, { color: healPlayer.g1 }]}>{fmtTime(playerElapsed)}</Text>
                </View>
              </View>

              <View style={s.playerPhaseBox}>
                <Text style={[s.playerPhaseText, { color: "#cbd5e1" }]}>{currentPhaseText}</Text>
              </View>

              <TouchableOpacity style={[s.playerPlayBtn, { backgroundColor: healPlayer.g1 }]}
                onPress={() => setPlayerRunning(r => !r)}>
                <Ionicons name={playerRunning ? "pause" : "play"} size={22} color="#fff" />
                <Text style={s.playerPlayTxt}>{playerRunning ? "Pause" : "Start Session"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:          { flex: 1, backgroundColor: "#080614" },
  header:        { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 14, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: "#1e1040" },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  headerTitle:   { color: "#f1f5f9", fontSize: 18, fontWeight: "900" },
  headerSub:     { color: "#64748b", fontSize: 12, marginTop: 1 },
  unlockedBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#052e16", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  unlockedTxt:   { color: "#4ade80", fontSize: 11, fontWeight: "700" },
  catScroll:     { maxHeight: 48, paddingVertical: 8, marginBottom: 2 },
  catTab:        { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50, borderWidth: 1, borderColor: "#1e293b", marginRight: 0 },
  catTabActive:  { borderColor: "#1e40af", backgroundColor: "rgba(30,64,175,0.15)" },
  catTabTxt:     { fontSize: 12, fontWeight: "600" },
  card:          { borderRadius: 14, overflow: "hidden", backgroundColor: "#0f0a2e", borderWidth: 1, borderColor: "#1e293b" },
  cardTop:       { height: 100, alignItems: "center", justifyContent: "center", position: "relative" },
  typePill:      { position: "absolute", top: 8, left: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typePillTxt:   { color: "#fff", fontSize: 8, fontWeight: "700", letterSpacing: 0.5 },
  badge2:        { position: "absolute", top: 8, right: 8, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  badge2Txt:     { fontSize: 8, fontWeight: "800", letterSpacing: 0.5 },
  cardBody:      { padding: 10 },
  cardTitle:     { color: "#f1f5f9", fontSize: 12, fontWeight: "800", lineHeight: 17, marginBottom: 3 },
  cardDesc:      { color: "#64748b", fontSize: 11, lineHeight: 15, marginBottom: 8 },
  cardFoot:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  durTxt:        { fontSize: 10, fontWeight: "600" },
  ctaBtn:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1 },
  ctaTxt:        { fontSize: 10, fontWeight: "700" },
  unlockBar:     { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#0f0a2e", borderRadius: 14, padding: 16, marginTop: 4, borderWidth: 1, borderColor: "#1e293b" },
  unlockBarTxt:  { flex: 1, color: "#93c5fd", fontSize: 13, fontWeight: "600" },

  // Modals
  modalBg:       { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard:     { width: "100%", maxWidth: 380, backgroundColor: "#0f0a2e", borderRadius: 24, borderWidth: 1, borderColor: "#1e1040", overflow: "hidden" },
  modalClose:    { position: "absolute", top: 14, right: 16, zIndex: 10, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  modalTitle:    { color: "#f1f5f9", fontSize: 20, fontWeight: "900", textAlign: "center", marginBottom: 4, paddingHorizontal: 40 },
  modalSub:      { color: "#64748b", fontSize: 13, textAlign: "center", marginBottom: 4 },

  // Breathing
  breathCircle:  { width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(79,172,254,0.12)", borderWidth: 2, borderColor: "#4facfe44", alignItems: "center", justifyContent: "center" },
  breathPhase:   { color: "#f1f5f9", fontSize: 18, fontWeight: "800" },
  breathSecs:    { color: "#4facfe", fontSize: 32, fontWeight: "900", marginTop: 4 },
  breathInstruct:{ color: "#94a3b8", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 20, paddingHorizontal: 16 },
  breathStats:   { flexDirection: "row", justifyContent: "center", gap: 32 },
  breathStat:    { alignItems: "center" },
  breathStatVal: { color: "#f1f5f9", fontSize: 18, fontWeight: "800" },
  breathStatLbl: { color: "#64748b", fontSize: 11 },

  // Pomodoro
  pomCircle:     { width: 170, height: 170, borderRadius: 85, borderWidth: 3, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.03)" },
  pomTime:       { fontSize: 38, fontWeight: "900" },
  pomLabel:      { color: "#64748b", fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 4 },
  pomBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14 },
  pomBtnTxt:     { color: "#fff", fontSize: 15, fontWeight: "700" },

  // Player
  playerOrb:     { position: "absolute", borderRadius: 80 },
  playerOrb1:    { width: 140, height: 140 },
  playerOrb2:    { width: 110, height: 110 },
  playerGlow:    { width: 170, height: 170, borderRadius: 85, position: "absolute" },
  playerCenter:  { width: 200, height: 200, alignItems: "center", justifyContent: "center", gap: 6 },
  playerTime:    { fontSize: 22, fontWeight: "900", marginTop: 4 },
  playerPhaseBox:{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 16, marginHorizontal: 16, marginBottom: 20, minHeight: 60, alignItems: "center", justifyContent: "center" },
  playerPhaseText:{ fontSize: 14, textAlign: "center", lineHeight: 22, fontStyle: "italic" },
  playerPlayBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginHorizontal: 16, borderRadius: 50, paddingVertical: 14 },
  playerPlayTxt: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
