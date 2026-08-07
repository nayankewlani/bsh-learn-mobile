import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Alert, Linking, ActivityIndicator, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { RAZORPAY_KEY_ID } from "../../constants";
import client from "../../api/client";
import { blockIOSPurchase } from "../../lib/paymentGate";

const _rzpMod = (() => { try { return require("react-native-razorpay"); } catch { return null; } })();
const RazorpayCheckout: {
  open: (o: Record<string, unknown>) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>;
} | null = _rzpMod?.default?.open ? _rzpMod.default : _rzpMod?.open ? _rzpMod : null;

const { width: SW } = Dimensions.get("window");
const advHypnosisImg = require("../../assets/advanced-hypnosis.png");
const hypnosis2Img   = require("../../assets/hypnosis-2.png");
const reikiImg       = require("../../assets/reiki.png");

// ── Static program content (matches web) ────────────────────────────────────
type Module = { num: string; title: string; desc: string; icon: string };
type Plan = { id: string; label: string; pricePaise: number; originalPaise: number | null; badge: string | null; badgeColor: string; desc: string; features: string[] };

interface ProgramDetail {
  title: string;
  titleAccent?: string;
  subtitle: string;
  badges: { label: string; icon: string; color: string }[];
  description: string;
  topics: string[];
  stats: { icon: string; value: string; label: string }[];
  img: ReturnType<typeof require>;
  accentColor: string;
  certificationLabel?: string;
  certificationTitle?: string;
  programId: string;
  isSubscription: boolean;
  pricePaise?: number;
  modules?: Module[];
  masterySubtitle?: string;
  plans?: Plan[];
  planFeatures?: string[];
  educator: string;
}

const PROGRAMS: Record<string, ProgramDetail> = {
  "healing-tools": {
    title: "BSH Healing Tools",
    titleAccent: "Healing Tools",
    subtitle: "Full Access — One-Time",
    badges: [
      { label: "20 Premium Tools", icon: "🧰", color: "#d97706" },
      { label: "Lifetime Access",  icon: "♾",  color: "#22c55e" },
      { label: "Instant Unlock",   icon: "⚡",  color: "#7c3aed" },
    ],
    description: "Unlock all 20 expert-crafted healing tools — guided hypnosis sessions, sleep meditations, brainwave audios, breathing exercises, and focus timers. One payment, lifetime access, no subscriptions.",
    topics: [
      "4-7-8 Sleep Breathing", "Inner Child Healing", "Fear Release Hypnosis",
      "Deep Sleep Hypnosis", "Night Affirmations", "Stress Detox Meditation",
      "Exam Confidence Hypnosis", "Memory Activation", "Alpha Frequency Meditation",
      "Chakra Balancing", "Self Confidence Builder", "Anger Release Therapy",
      "Concentration Visualization", "Study Hypnosis Session", "Past Life Regression",
      "Alternate Nostril Breathing", "Gratitude Meditation", "Box Breathing",
    ],
    stats: [
      { icon: "🧰", value: "20",       label: "Tools"      },
      { icon: "🎧", value: "5",        label: "Categories" },
      { icon: "⏱",  value: "200+",     label: "Minutes"    },
      { icon: "♾",  value: "Lifetime", label: "Access"     },
    ],
    img: reikiImg,
    accentColor: "#d97706",
    programId: "healing-tools",
    isSubscription: false,
    pricePaise: 9900,
    educator: "Dr. Pradeep Kumar",
  },

  "advance-hypnosis": {
    title: "Advanced Hypnosis",
    titleAccent: "Hypnosis",
    subtitle: "Diploma",
    badges: [
      { label: "Best Seller",       icon: "🏆", color: "#f59e0b" },
      { label: "Certified Program", icon: "✦",  color: "#22c55e" },
      { label: "Live + Virtual",    icon: "⚡",  color: "#7c3aed" },
    ],
    description: "Master 7 hypnosis modalities — from self-hypnosis to Ericksonian techniques — through live Zoom sessions, weekend batches, and a vibrant practice community.",
    topics: ["Self Hypnosis", "Hetero Hypnosis", "Street Hypnosis", "Instant Hypnosis", "Stage Hypnosis", "Ericksonian Hypnosis", "Non-Verbal Hypnosis"],
    stats: [
      { icon: "📅", value: "6 Months",    label: "Duration" },
      { icon: "🎬", value: "60+ Videos",  label: "Lessons"  },
      { icon: "⏱",  value: "80+ Hours",   label: "Learning" },
      { icon: "🧠", value: "25+",         label: "Modalities" },
    ],
    img: advHypnosisImg,
    accentColor: "#7c3aed",
    certificationLabel: "CERTIFICATION",
    certificationTitle: "Advanced Diploma in Clinical Hypnotherapy",
    programId: "advance-hypnosis",
    isSubscription: false,
    pricePaise: 2999900,
    masterySubtitle: "Progress through 7 distinct hypnosis modalities, from foundational self-mastery to professional-grade induction techniques",
    modules: [
      { num: "01", title: "Self Hypnosis",      desc: "Master self-induction & deepening techniques",         icon: "🧘" },
      { num: "02", title: "Hetero Hypnosis",    desc: "Guide others into deep therapeutic trance",            icon: "👥" },
      { num: "03", title: "Street Hypnosis",    desc: "Rapid inductions in everyday environments",            icon: "🏙" },
      { num: "04", title: "Instant Hypnosis",   desc: "Split-second hypnotic induction mastery",              icon: "⚡" },
      { num: "05", title: "Stage Hypnosis",     desc: "Perform group hypnosis with confidence & control",     icon: "🎭" },
      { num: "06", title: "Ericksonian Hypnosis", desc: "Indirect suggestion & metaphor-based healing",       icon: "🌀" },
      { num: "07", title: "Non-Verbal Hypnosis",  desc: "Body language, anchoring & non-verbal inductions",  icon: "🤝" },
    ],
    educator: "Dr. Pradeep Kumar",
  },

  "hypnosis-2": {
    title: "Hypnosis 2.0",
    titleAccent: "2.0",
    subtitle: "Live Subscription Programme",
    badges: [
      { label: "Live Subscription",     icon: "🔴", color: "#ef4444" },
      { label: "40+ Classes / Month",   icon: "📅", color: "#7c3aed" },
      { label: "Full Archive Access",   icon: "🗂",  color: "#0d9488" },
    ],
    description: "India's most active hypnotherapy subscription — 40+ expert-led live classes every month, full past recordings library, and a hands-on practice community to turn you into a truly efficient practitioner.",
    topics: ["Self Hypnosis", "Ericksonian Hypnosis", "NLP Integration", "Past Life Regression", "Street Hypnosis", "Stage Hypnosis", "Non-Verbal Hypnosis", "Instant Induction", "Parts Therapy", "Inner Child Work", "Trauma Release", "Age Regression"],
    stats: [
      { icon: "📺", value: "40+",      label: "Live / Month" },
      { icon: "🗂",  value: "Full",     label: "Archive Access" },
      { icon: "👥", value: "Community", label: "Practice Group" },
      { icon: "📜", value: "Monthly",  label: "Certificate" },
    ],
    img: hypnosis2Img,
    accentColor: "#7c3aed",
    programId: "hypnosis-2",
    isSubscription: true,
    educator: "Dr. Pradeep Kumar",
    planFeatures: [
      "40+ Live Classes / Month",
      "Full Past Recordings",
      "Practice Group Access",
      "Expert Q&A Sessions",
      "Monthly Certificate",
    ],
    plans: [
      {
        id: "monthly", label: "1 MONTH", pricePaise: 99900, originalPaise: null,
        badge: null, badgeColor: "",
        desc: "Perfect to explore and experience the full power of live hypnotherapy sessions.",
        features: ["40+ Live Classes / Month", "Full Past Recordings", "Practice Group Access", "Expert Q&A Sessions", "Monthly Certificate"],
      },
      {
        id: "quarterly", label: "3 MONTHS", pricePaise: 279900, originalPaise: 299700,
        badge: "Most Popular", badgeColor: "#7c3aed",
        desc: "Build real practice depth with three months of continuous expert-led training.",
        features: ["40+ Live Classes / Month", "Full Past Recordings", "Practice Group Access", "Expert Q&A Sessions", "Monthly Certificate"],
      },
      {
        id: "biannual", label: "6 MONTHS", pricePaise: 540100, originalPaise: 599400,
        badge: "Best Value", badgeColor: "#f59e0b",
        desc: "Full transformation journey — master multiple modalities with maximum savings.",
        features: ["40+ Live Classes / Month", "Full Past Recordings", "Practice Group Access", "Expert Q&A Sessions", "Monthly Certificate"],
      },
    ],
  },
};

// ── Post types for member area ────────────────────────────────────────────────
interface Post {
  _id: string;
  type: "live_class" | "announcement";
  title?: string;
  content: string;
  scheduledAt?: string;
  links: { label: string; url: string }[];
  createdAt: string;
}

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-IN", {
    weekday: "short", day: "2-digit", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const timeFromNow = (s: string) => {
  const diff = new Date(s).getTime() - Date.now();
  if (diff < 0) return "passed";
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "in less than 1 hr";
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ProgramDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>("quarterly");
  const [apiRzpLink, setApiRzpLink] = useState<string | null>(null);

  // ── Access check ────────────────────────────────────────────────────────────
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "live_class" | "announcement">("all");

  const prog = PROGRAMS[slug ?? ""] ?? PROGRAMS["advance-hypnosis"];

  useEffect(() => {
    if (!user) { setHasAccess(false); return; }
    if (user.role === "admin") { setHasAccess(true); return; }
    client.get(`/payments/program-access/${prog.programId}`)
      .then(({ data }) => setHasAccess(data.hasAccess === true))
      .catch(() => setHasAccess(false));
  }, [user, prog.programId]);

  useEffect(() => {
    if (hasAccess !== true) return;
    if (prog.programId === "healing-tools") return;
    setPostsLoading(true);
    client.get(`/courses/programs/${prog.programId}/posts`)
      .then(({ data }) => setPosts((data as any).posts ?? []))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [hasAccess, prog.programId]);

  useEffect(() => {
    client.get("/courses/programs/public")
      .then(({ data }) => {
        const found = (data.programs ?? []).find((p: any) => p.programId === prog.programId);
        if (found?.razorpayPaymentLink) setApiRzpLink(found.razorpayPaymentLink);
      })
      .catch(() => {});
  }, [prog.programId]);

  const handleJoin = async (planId?: string) => {
    if (blockIOSPurchase()) return;
    if (prog.programId === "hypnosis-2") {
      Linking.openURL("https://lp.blessingsschoolofhypnosis.com/home--blessings-school-of-hypnosis").catch(() => {});
      return;
    }
    if (!user) {
      Alert.alert("Login Required", "Please log in to continue.",
        [{ text: "Log In", onPress: () => router.push("/(auth)/login") }, { text: "Cancel", style: "cancel" }]);
      return;
    }
    if (apiRzpLink) { Linking.openURL(apiRzpLink).catch(() => {}); return; }
    if (!RazorpayCheckout) {
      Alert.alert("Payment Not Available", "Payments require the full BSH app build. Please use our website to purchase.");
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const plan = prog.plans?.find(p => p.id === (planId ?? selectedPlan));
      const pricePaise = prog.isSubscription
        ? (plan?.pricePaise ?? prog.plans?.[0].pricePaise ?? 99900)
        : (prog.pricePaise ?? 2999900);

      const { data } = await client.post("/payments/create-order", {
        type: prog.isSubscription ? "subscription" : "program",
        programId: prog.programId,
        ...(prog.isSubscription ? { planId: planId ?? selectedPlan } : {}),
      });
      const order = data.order;
      const paymentData = await RazorpayCheckout.open({
        key: RAZORPAY_KEY_ID,
        amount: String(order.amount ?? pricePaise),
        currency: "INR",
        name: "BSH Healers",
        description: prog.isSubscription ? `Hypnosis 2.0 — ${plan?.label ?? "1 Month"}` : prog.title,
        order_id: order.id,
        prefill: { name: user.name, email: user.email },
        theme: { color: prog.accentColor ?? "#7c3aed" },
      });
      await client.post("/payments/verify", {
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpaySignature: paymentData.razorpay_signature,
      });
      setHasAccess(true);
      if (prog.programId === "healing-tools") {
        Alert.alert("Unlocked! 🎉", "All 20 Healing Tools are now available.",
          [{ text: "Open Tools", onPress: () => router.push("/(tabs)" as any) }]);
      } else {
        Alert.alert("Welcome! 🎉", `You now have full access to ${prog.title}.`,
          [{ text: "Start Learning", onPress: () => router.push("/(tabs)/explore") }]);
      }
    } catch (err: unknown) {
      const e = err as { code?: number; description?: string; response?: { data?: { message?: string } }; message?: string };
      if (e?.code === 0) return;
      Alert.alert("Payment Failed", e.response?.data?.message ?? e.description ?? e.message ?? "Payment failed. Please try again.");
    } finally { setLoading(false); }
  };

  // ── Loading access check ───────────────────────────────────────────────────
  if (hasAccess === null && !!user) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#7c3aed" size="large" />
        <Text style={{ color: "#a78bfa", marginTop: 14, fontSize: 14 }}>Checking your access…</Text>
      </View>
    );
  }

  // ── Healing Tools Unlocked Area ───────────────────────────────────────────
  if (hasAccess === true && prog.programId === "healing-tools") {
    const TOOL_CATS = [
      { label: "🌬 Breathing",   count: "4 tools",  color: "#4facfe" },
      { label: "😴 Sleep",       count: "2 tools",  color: "#a18cd1" },
      { label: "🎯 Focus",       count: "3 tools",  color: "#fa709a" },
      { label: "✨ Healing",     count: "8 tools",  color: "#f6d365" },
      { label: "📚 Student",     count: "3 tools",  color: "#43e97b" },
    ];
    return (
      <View style={[s.root, { backgroundColor: "#080614" }]}>
        <View style={[s.memberTopBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.memberTopTitle}>BSH Healing Tools</Text>
          </View>
          <View style={s.enrolledBadge}>
            <View style={s.greenDot} />
            <Text style={s.enrolledTxt}>Unlocked</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 48 }}>
          {/* Success card */}
          <View style={ht.successCard}>
            <Text style={{ fontSize: 48, textAlign: "center", marginBottom: 12 }}>🎉</Text>
            <Text style={ht.successTitle}>All 20 Tools Unlocked!</Text>
            <Text style={ht.successSub}>
              Your premium healing tools are now active in the Home tab. Tap the button below to start using them.
            </Text>
          </View>

          {/* Category breakdown */}
          <Text style={ht.sectionLabel}>WHAT'S INCLUDED</Text>
          {TOOL_CATS.map(cat => (
            <View key={cat.label} style={[ht.catRow, { borderLeftColor: cat.color }]}>
              <Text style={ht.catLabel}>{cat.label}</Text>
              <View style={[ht.catCountBadge, { backgroundColor: cat.color + "25" }]}>
                <Text style={[ht.catCountTxt, { color: cat.color }]}>{cat.count}</Text>
              </View>
            </View>
          ))}

          {/* Tool type info */}
          <View style={ht.infoRow}>
            {[
              { icon: "🧘", label: "Guided Hypnosis" },
              { icon: "🎵", label: "Brainwave Audio" },
              { icon: "🌬", label: "Breathing Tools" },
              { icon: "⏱",  label: "Focus Timers"   },
            ].map(item => (
              <View key={item.label} style={ht.infoChip}>
                <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                <Text style={ht.infoChipTxt}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Open tools CTA */}
          <TouchableOpacity style={ht.goBtn} onPress={() => router.push("/(tabs)" as any)}>
            <Text style={ht.goBtnTxt}>Open Healing Tools →</Text>
          </TouchableOpacity>

          <Text style={ht.hintTxt}>
            Scroll to the "Healing Tools" section on the home screen. All 20 tools are now available — tap any tool to begin.
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ── Member Area ────────────────────────────────────────────────────────────
  if (hasAccess === true) {
    const accent = prog.accentColor ?? "#7c3aed";
    const livePosts  = posts.filter(p => p.type === "live_class");
    const annPosts   = posts.filter(p => p.type === "announcement");
    const nextLive   = livePosts.find(p => p.scheduledAt && new Date(p.scheduledAt) > new Date());
    const visible    = filter === "all" ? posts : filter === "live_class" ? livePosts : annPosts;

    return (
      <View style={[s.root, { backgroundColor: "#080614" }]}>
        {/* Top bar */}
        <View style={[s.memberTopBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.memberTopTitle}>{prog.title}</Text>
            {user?.role === "admin" && (
              <Text style={s.memberAdminBadge}>Admin Preview</Text>
            )}
          </View>
          <View style={s.enrolledBadge}>
            <View style={s.greenDot} />
            <Text style={s.enrolledTxt}>Enrolled</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}>

          {/* Member area header */}
          <View style={s.memberHeader}>
            <Text style={{ fontSize: 22 }}>🔐</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.memberAreaTitle}>Member Area</Text>
              <Text style={s.memberAreaSub}>Live classes, links & updates — exclusive to enrolled members</Text>
            </View>
          </View>

          {/* Stats row */}
          {posts.length > 0 && (
            <View style={s.statsRow}>
              {[
                { label: "Total", value: posts.length, color: "#f1f5f9" },
                { label: "Live Classes", value: livePosts.length, color: accent },
                { label: "Announcements", value: annPosts.length, color: "#94a3b8" },
              ].map(st => (
                <View key={st.label} style={s.statCard}>
                  <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.statLbl}>{st.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Next live class featured */}
          {nextLive && (
            <View style={[s.liveCard, { borderColor: accent + "80" }]}>
              <View style={s.liveCardHeader}>
                <View style={s.redDot} />
                <Text style={s.liveCardLabel}>UPCOMING LIVE CLASS</Text>
              </View>
              {nextLive.title && <Text style={s.liveCardTitle}>{nextLive.title}</Text>}
              {nextLive.scheduledAt && (
                <Text style={[s.liveCardDate, { color: accent }]}>
                  📅 {fmtDateTime(nextLive.scheduledAt)}{"  "}
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>({timeFromNow(nextLive.scheduledAt)})</Text>
                </Text>
              )}
              {nextLive.content ? <Text style={s.liveCardContent}>{nextLive.content}</Text> : null}
              {nextLive.links?.length > 0 && nextLive.links.map((lk, i) => (
                <TouchableOpacity key={i} style={[s.joinClassBtn, { backgroundColor: accent }]}
                  onPress={() => Linking.openURL(lk.url).catch(() => {})}>
                  <Text style={s.joinClassTxt}>🎥 {lk.label || "Join Class"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {([["all", "All"], ["live_class", "🔴 Live"], ["announcement", "📢 Announcements"]] as const).map(([val, lbl]) => (
              <TouchableOpacity key={val} onPress={() => setFilter(val)}
                style={[s.filterTab, filter === val && { backgroundColor: accent + "25", borderColor: accent }]}>
                <Text style={[s.filterTabTxt, { color: filter === val ? accent : "#64748b" }]}>{lbl}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Posts list */}
          {postsLoading ? (
            <ActivityIndicator color={accent} style={{ marginTop: 32 }} />
          ) : visible.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Your trainer will post updates here soon.</Text>
            </View>
          ) : (
            visible.map(post => post.type === "live_class" ? (
              <View key={post._id} style={[s.postCard, { borderLeftColor: accent, borderLeftWidth: 3 }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View style={post.scheduledAt && new Date(post.scheduledAt) > new Date() ? s.redDot : s.greyDot} />
                  <Text style={{ color: "#94a3b8", fontSize: 11, fontWeight: "700", letterSpacing: 0.6 }}>
                    {post.scheduledAt && new Date(post.scheduledAt) > new Date() ? "LIVE CLASS" : "LIVE CLASS (ENDED)"}
                  </Text>
                </View>
                {post.scheduledAt && (
                  <Text style={[s.postDate, { color: accent }]}>📅 {fmtDateTime(post.scheduledAt)}</Text>
                )}
                {post.title && <Text style={s.postTitle}>{post.title}</Text>}
                {post.content ? <Text style={s.postContent}>{post.content}</Text> : null}
                {post.links?.map((lk, i) => (
                  <TouchableOpacity key={i} onPress={() => Linking.openURL(lk.url).catch(() => {})}
                    style={[s.postLinkBtn, { borderColor: accent + "60" }]}>
                    <Text style={[s.postLinkTxt, { color: accent }]}>🔗 {lk.label || "Join"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View key={post._id} style={s.postCard}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View style={[s.annBadge, { borderColor: accent + "50", backgroundColor: accent + "18" }]}>
                    <Text style={[s.annBadgeTxt, { color: accent }]}>📢 ANNOUNCEMENT</Text>
                  </View>
                </View>
                {post.title && <Text style={s.postTitle}>{post.title}</Text>}
                <Text style={s.postContent}>{post.content}</Text>
                {post.links?.map((lk, i) => (
                  <TouchableOpacity key={i} onPress={() => Linking.openURL(lk.url).catch(() => {})}
                    style={[s.postLinkBtn, { borderColor: accent + "60" }]}>
                    <Text style={[s.postLinkTxt, { color: accent }]}>🔗 {lk.label || "Open"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Marketing page (not enrolled) ─────────────────────────────────────────
  return (
    <View style={s.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* ── Hero ── */}
        <View style={[s.hero, { paddingTop: insets.top + 48 }]}>
          {/* Back button */}
          <TouchableOpacity style={[s.backBtn, { top: insets.top + 10 }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Breadcrumb */}
          <View style={s.breadcrumb}>
            <Text style={s.breadcrumbLink} onPress={() => router.push("/(tabs)/index" as any)}>Home</Text>
            <Text style={s.breadcrumbSep}> / </Text>
            <Text style={s.breadcrumbLink} onPress={() => router.push("/(tabs)/explore")}>Courses</Text>
            <Text style={s.breadcrumbSep}> / </Text>
            <Text style={s.breadcrumbCurrent}>{prog.title}</Text>
          </View>

          {/* Badges */}
          <View style={s.badgeRow}>
            {prog.badges.map(b => (
              <View key={b.label} style={[s.heroBadge, { borderColor: b.color + "55" }]}>
                <Text style={s.heroBadgeIcon}>{b.icon}</Text>
                <Text style={[s.heroBadgeTxt, { color: b.color }]}>{b.label}</Text>
              </View>
            ))}
          </View>

          {/* Title */}
          <Text style={s.heroTitle}>
            {prog.titleAccent
              ? prog.title.replace(prog.titleAccent, "").trim()
              : prog.title}{"\n"}
            <Text style={[s.heroTitleAccent, { color: prog.accentColor }]}>
              {prog.titleAccent ?? ""}
            </Text>
            {prog.subtitle ? "\n" + prog.subtitle : ""}
          </Text>

          {/* Description */}
          <Text style={s.heroDesc}>{prog.description}</Text>

          {/* Topic tags */}
          <View style={s.topicRow}>
            {prog.topics.map(t => (
              <View key={t} style={s.topicTag}>
                <Text style={s.topicTxt}>{t}</Text>
              </View>
            ))}
          </View>

          {/* Program image + cert card */}
          <View style={s.heroImgRow}>
            <Image source={prog.img as any} style={s.heroImg} resizeMode="cover" />
            {prog.certificationTitle && (
              <View style={s.certCard}>
                <Text style={s.certLabel}>{prog.certificationLabel}</Text>
                <Text style={s.certTitle}>{prog.certificationTitle}</Text>
              </View>
            )}
          </View>

          {/* Stats line */}
          <View style={s.statsLine}>
            {prog.stats.map(st => (
              <View key={st.label} style={s.statLineItem}>
                <Text style={s.statLineIcon}>{st.icon}</Text>
                <Text style={s.statLineVal}>{st.value}</Text>
              </View>
            ))}
          </View>

          {/* Price + CTA */}
          {!prog.isSubscription && (
            <View style={s.priceCta}>
              <View>
                <Text style={s.courseFeeLabel}>
                  {prog.programId === "healing-tools" ? "One-Time Access" : "Course Fee"}
                </Text>
                <Text style={s.heroPrice}>₹{Math.round((prog.pricePaise ?? 0) / 100).toLocaleString("en-IN")}</Text>
              </View>
              <TouchableOpacity
                style={[s.joinBtn, { opacity: loading ? 0.7 : 1, backgroundColor: prog.accentColor ?? "#7c3aed" }]}
                onPress={() => handleJoin()} disabled={loading}>
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.joinBtnTxt}>
                      {prog.programId === "healing-tools" ? "Unlock All Tools →" : "Join Now →"}
                    </Text>}
              </TouchableOpacity>
            </View>
          )}
          {prog.isSubscription && (
            <TouchableOpacity style={s.joinBtn} onPress={() => handleJoin(selectedPlan)} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.joinBtnTxt}>Join Now →</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Stats Strip ── */}
        <View style={s.statsStrip}>
          {prog.stats.map(st => (
            <View key={st.label} style={s.stripItem}>
              <Text style={s.stripIcon}>{st.icon}</Text>
              <Text style={s.stripVal}>{st.value}</Text>
              <Text style={s.stripLbl}>{st.label}</Text>
            </View>
          ))}
          {prog.programId !== "healing-tools" && (
            <View style={s.stripItem}>
              <Text style={s.stripIcon}>🔴</Text>
              <Text style={[s.stripVal, { color: "#ef4444" }]}>Live</Text>
              <Text style={s.stripLbl}>+ Virtual</Text>
            </View>
          )}
        </View>

        {/* ── What You Will Master (Advance Hypnosis) ── */}
        {prog.modules && prog.modules.length > 0 && (
          <View style={s.section}>
            <View style={s.sectionLabelRow}>
              <View style={s.sectionLabelPill}>
                <Text style={s.sectionLabelTxt}>MASTERY CATEGORIES</Text>
              </View>
            </View>
            <Text style={s.sectionTitle}>What You Will Master</Text>
            {prog.masterySubtitle && (
              <Text style={s.sectionSub}>{prog.masterySubtitle}</Text>
            )}
            <View style={s.modulesGrid}>
              {prog.modules.map(m => (
                <View key={m.num} style={s.moduleCard}>
                  <View style={s.moduleNumRow}>
                    <Text style={s.moduleNum}>{m.num}</Text>
                    <Text style={s.moduleIcon}>{m.icon}</Text>
                  </View>
                  <Text style={s.moduleTitle}>{m.title}</Text>
                  <Text style={s.moduleDesc}>{m.desc}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Choose Your Plan (Hypnosis 2.0) ── */}
        {prog.isSubscription && prog.plans && (
          <View style={s.section}>
            <View style={s.sectionLabelRow}>
              <View style={s.sectionLabelPill}>
                <Text style={s.sectionLabelTxt}>SUBSCRIPTION PLANS</Text>
              </View>
            </View>
            <Text style={s.sectionTitle}>Choose Your Plan</Text>
            <Text style={s.sectionSub}>
              All plans give full access to live classes and the entire recordings library. Save more with longer commitments.
            </Text>

            <View style={s.plansContainer}>
              {prog.plans.map(plan => {
                const selected = selectedPlan === plan.id;
                const priceRs = Math.round(plan.pricePaise / 100);
                const origRs = plan.originalPaise ? Math.round(plan.originalPaise / 100) : null;
                const saveRs = origRs ? origRs - priceRs : null;
                return (
                  <TouchableOpacity key={plan.id} onPress={() => setSelectedPlan(plan.id)}
                    style={[s.planCard, selected && s.planCardSelected]}>
                    {plan.badge && (
                      <View style={[s.planBadge, { backgroundColor: plan.badgeColor }]}>
                        <Text style={s.planBadgeTxt}>⭐ {plan.badge}</Text>
                      </View>
                    )}
                    <Text style={[s.planLabel, { color: selected ? "#7c3aed" : "#94a3b8" }]}>{plan.label}</Text>
                    <View style={s.planPriceRow}>
                      <Text style={[s.planPrice, { color: selected ? "#7c3aed" : "#f1f5f9" }]}>₹{priceRs.toLocaleString("en-IN")}</Text>
                      <Text style={s.planPeriod}> / {plan.id === "monthly" ? "month" : plan.id === "quarterly" ? "3 months" : "6 months"}</Text>
                    </View>
                    {origRs && saveRs && (
                      <Text style={s.planSave}>
                        <Text style={{ textDecorationLine: "line-through", color: "#64748b" }}>₹{origRs.toLocaleString("en-IN")}</Text>
                        {"  "}
                        <Text style={{ color: "#22c55e", fontWeight: "700" }}>Save ₹{saveRs}</Text>
                      </Text>
                    )}
                    <Text style={s.planDesc}>{plan.desc}</Text>
                    <View style={s.planDivider} />
                    {plan.features.map(f => (
                      <View key={f} style={s.planFeatureRow}>
                        <Ionicons name="checkmark" size={13} color="#22c55e" />
                        <Text style={s.planFeatureTxt}>{f}</Text>
                      </View>
                    ))}
                    <TouchableOpacity
                      style={[s.planJoinBtn, selected ? { backgroundColor: "#7c3aed" } : { backgroundColor: "transparent", borderWidth: 1.5, borderColor: "#334155" }]}
                      onPress={() => handleJoin(plan.id)}
                      disabled={loading}>
                      {loading && selected
                        ? <ActivityIndicator color={selected ? "#fff" : "#7c3aed"} />
                        : <Text style={[s.planJoinTxt, { color: selected ? "#fff" : "#7c3aed" }]}>Join Now →</Text>}
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Educator ── */}
        <View style={[s.section, s.educatorSection]}>
          <Text style={s.eduLabel}>YOUR EDUCATOR</Text>
          <Text style={s.eduName}>{prog.educator}</Text>
          <Text style={s.eduRole}>Founder & Chief Mentor, BSH Healers</Text>
          <Text style={s.eduDesc}>India's leading Clinical Hypnotherapist with 20+ years of experience, 5,000+ certified practitioners trained across 15+ countries.</Text>
          <TouchableOpacity style={s.eduProfileBtn} onPress={() => router.push("/educator/pradeep" as any)}>
            <Text style={s.eduProfileTxt}>View Full Profile →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Bottom CTA ── */}
        <View style={[s.section, { paddingBottom: 8 }]}>
          <TouchableOpacity style={[s.bigJoinBtn, { backgroundColor: prog.accentColor ?? "#7c3aed" }]}
            onPress={() => handleJoin(prog.isSubscription ? selectedPlan : undefined)}
            disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.bigJoinTxt}>
                  {prog.programId === "healing-tools"
                    ? `🔓 Unlock All 20 Tools — ₹${Math.round((prog.pricePaise ?? 0) / 100)}`
                    : prog.isSubscription ? "🔒 Join Now →" : `🔒 Enroll Now — ₹${Math.round((prog.pricePaise ?? 0) / 100).toLocaleString("en-IN")}`}
                </Text>}
          </TouchableOpacity>
          <TouchableOpacity style={s.consultLink} onPress={() => router.push("/(tabs)/consultation" as any)}>
            <Text style={s.consultLinkTxt}>Have questions? 📞 Talk to counsellor</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d0d1a" },

  hero: {
    backgroundColor: "#0f0a2e",
    paddingHorizontal: 20, paddingBottom: 28,
    borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  backBtn: {
    position: "absolute", left: 16, zIndex: 50,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center",
  },
  breadcrumb: { flexDirection: "row", alignItems: "center", marginBottom: 16, flexWrap: "wrap" },
  breadcrumbLink: { color: "#7c3aed", fontSize: 12, fontWeight: "600" },
  breadcrumbSep: { color: "#4b5563", fontSize: 12 },
  breadcrumbCurrent: { color: "#9ca3af", fontSize: 12 },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  heroBadgeIcon: { fontSize: 12 },
  heroBadgeTxt: { fontSize: 11, fontWeight: "700" },

  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "900", lineHeight: 40, marginBottom: 12 },
  heroTitleAccent: { fontWeight: "900" },
  heroDesc: { color: "rgba(255,255,255,0.7)", fontSize: 14, lineHeight: 22, marginBottom: 16 },

  topicRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  topicTag: {
    backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  topicTxt: { color: "#e2e8f0", fontSize: 12, fontWeight: "500" },

  heroImgRow: { marginBottom: 20 },
  heroImg: { width: "100%", height: 200, borderRadius: 16, marginBottom: 12 },
  certCard: {
    backgroundColor: "rgba(124,58,237,0.15)", borderRadius: 12,
    padding: 14, borderWidth: 1, borderColor: "#7c3aed44",
  },
  certLabel: { color: "#a78bfa", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 4 },
  certTitle: { color: "#fff", fontSize: 14, fontWeight: "800" },

  statsLine: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginBottom: 20 },
  statLineItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  statLineIcon: { fontSize: 14 },
  statLineVal: { color: "#e2e8f0", fontSize: 13, fontWeight: "600" },

  priceCta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  courseFeeLabel: { color: "#9ca3af", fontSize: 11, marginBottom: 2 },
  heroPrice: { color: "#fff", fontSize: 28, fontWeight: "900" },
  joinBtn: {
    backgroundColor: "#7c3aed", borderRadius: 14,
    paddingHorizontal: 28, paddingVertical: 14,
    flexDirection: "row", alignItems: "center",
  },
  joinBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },

  statsStrip: {
    flexDirection: "row", backgroundColor: "#f8f9ff",
    paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripIcon: { fontSize: 22, marginBottom: 4 },
  stripVal: { color: "#1e1b4b", fontSize: 16, fontWeight: "900" },
  stripLbl: { color: "#6b7280", fontSize: 10, marginTop: 2 },

  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionLabelRow: { alignItems: "center", marginBottom: 12 },
  sectionLabelPill: {
    backgroundColor: "#ede9fe", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  sectionLabelTxt: { color: "#7c3aed", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  sectionTitle: { color: "#0f0a2e", fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  sectionSub: { color: "#6b7280", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 24 },

  modulesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  moduleCard: {
    width: (SW - 52) / 2,
    backgroundColor: "#fff",
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "#e5e7eb",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  moduleNumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  moduleNum: { color: "#9ca3af", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  moduleIcon: { fontSize: 20 },
  moduleTitle: { color: "#0f0a2e", fontSize: 13, fontWeight: "800", marginBottom: 4 },
  moduleDesc: { color: "#6b7280", fontSize: 11, lineHeight: 16 },

  plansContainer: { gap: 16 },
  planCard: {
    backgroundColor: "#fff", borderRadius: 20, padding: 20,
    borderWidth: 2, borderColor: "#e5e7eb", position: "relative",
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  planCardSelected: { borderColor: "#7c3aed" },
  planBadge: {
    position: "absolute", top: -12, alignSelf: "center",
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
  },
  planBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  planLabel: { fontSize: 11, fontWeight: "800", letterSpacing: 1.5, marginBottom: 8, marginTop: 8 },
  planPriceRow: { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  planPrice: { fontSize: 32, fontWeight: "900" },
  planPeriod: { color: "#94a3b8", fontSize: 13 },
  planSave: { fontSize: 13, marginBottom: 10 },
  planDesc: { color: "#6b7280", fontSize: 12, lineHeight: 18, marginBottom: 14 },
  planDivider: { height: 1, backgroundColor: "#e5e7eb", marginBottom: 12 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  planFeatureTxt: { color: "#374151", fontSize: 13 },
  planJoinBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  planJoinTxt: { fontSize: 14, fontWeight: "800" },

  educatorSection: {
    backgroundColor: "#f8f9ff", marginHorizontal: 0, paddingHorizontal: 20,
    paddingBottom: 24, borderTopWidth: 1, borderTopColor: "#e5e7eb",
    marginTop: 28,
  },
  eduLabel: { color: "#7c3aed", fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 6 },
  eduName: { color: "#0f0a2e", fontSize: 22, fontWeight: "900", marginBottom: 2 },
  eduRole: { color: "#7c3aed", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  eduDesc: { color: "#6b7280", fontSize: 13, lineHeight: 20, marginBottom: 12 },
  eduProfileBtn: {},
  eduProfileTxt: { color: "#7c3aed", fontSize: 13, fontWeight: "700" },

  bigJoinBtn: {
    backgroundColor: "#7c3aed", borderRadius: 16, paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#7c3aed", shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  bigJoinTxt: { color: "#fff", fontSize: 16, fontWeight: "900" },
  consultLink: { alignItems: "center", paddingVertical: 14 },
  consultLinkTxt: { color: "#6b7280", fontSize: 13 },

  // ── Member area styles ────────────────────────────────────────────────────
  memberTopBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#0d0824", paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#1e1040",
  },
  memberTopTitle: { color: "#f1f5f9", fontSize: 15, fontWeight: "800" },
  memberAdminBadge: {
    color: "#f59e0b", fontSize: 10, fontWeight: "700",
    backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: 20, alignSelf: "flex-start", marginTop: 2,
  },
  enrolledBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  greenDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80", shadowColor: "#4ade80", shadowOpacity: 0.8, shadowRadius: 4 },
  enrolledTxt: { color: "#4ade80", fontSize: 12, fontWeight: "700" },
  memberHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    backgroundColor: "#0f0a2e", borderRadius: 14, padding: 16,
    marginTop: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#1e1b4b",
  },
  memberAreaTitle: { color: "#f1f5f9", fontWeight: "900", fontSize: 17, marginBottom: 3 },
  memberAreaSub: { color: "#64748b", fontSize: 12, lineHeight: 18 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: "#0f0a2e", borderRadius: 12,
    padding: 12, alignItems: "center",
    borderWidth: 1, borderColor: "#1e1b4b",
  },
  statVal: { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  statLbl: { color: "#64748b", fontSize: 11 },
  liveCard: {
    backgroundColor: "#0f0a2e", borderRadius: 16, padding: 18,
    borderWidth: 1.5, marginBottom: 14,
  },
  liveCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  liveCardLabel: { color: "#f87171", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  liveCardTitle: { color: "#f1f5f9", fontSize: 16, fontWeight: "800", marginBottom: 6 },
  liveCardDate: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  liveCardContent: { color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 12 },
  joinClassBtn: { borderRadius: 50, paddingVertical: 12, alignItems: "center" },
  joinClassTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", shadowColor: "#ef4444", shadowOpacity: 0.8, shadowRadius: 5 },
  greyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#6b7280" },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50,
    borderWidth: 1.5, borderColor: "#1e293b", marginRight: 8,
  },
  filterTabTxt: { fontSize: 13, fontWeight: "600" },
  emptyState: { paddingVertical: 52, alignItems: "center" },
  emptyTitle: { color: "#f1f5f9", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptySub: { color: "#64748b", fontSize: 13 },
  postCard: {
    backgroundColor: "#0f0a2e", borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: "#1e1b4b",
  },
  postDate: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  postTitle: { color: "#f1f5f9", fontSize: 15, fontWeight: "800", marginBottom: 6 },
  postContent: { color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 8 },
  postLinkBtn: {
    marginTop: 6, borderWidth: 1, borderRadius: 50,
    paddingVertical: 9, paddingHorizontal: 18, alignSelf: "flex-start",
  },
  postLinkTxt: { fontSize: 13, fontWeight: "700" },
  annBadge: { borderWidth: 1, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  annBadgeTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
});

// ── Healing Tools unlocked styles ─────────────────────────────────────────────
const ht = StyleSheet.create({
  successCard: {
    backgroundColor: "#0f0a2e", borderRadius: 20, padding: 24,
    borderWidth: 1.5, borderColor: "#d97706" + "50",
    alignItems: "center", marginBottom: 24,
  },
  successTitle: { color: "#fff", fontSize: 22, fontWeight: "900", textAlign: "center", marginBottom: 8 },
  successSub: { color: "#94a3b8", fontSize: 14, lineHeight: 22, textAlign: "center" },
  sectionLabel: {
    color: "#d97706", fontSize: 10, fontWeight: "800", letterSpacing: 1.5,
    marginBottom: 12,
  },
  catRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#0f0a2e", borderRadius: 12, padding: 14,
    borderLeftWidth: 3, marginBottom: 10,
    borderWidth: 1, borderColor: "#1e1b4b",
  },
  catLabel: { color: "#f1f5f9", fontSize: 14, fontWeight: "700" },
  catCountBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  catCountTxt: { fontSize: 12, fontWeight: "800" },
  infoRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 16, marginBottom: 24,
  },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  infoChipTxt: { color: "#e2e8f0", fontSize: 12, fontWeight: "600" },
  goBtn: {
    backgroundColor: "#d97706", borderRadius: 16, paddingVertical: 16,
    alignItems: "center", marginBottom: 16,
    shadowColor: "#d97706", shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  goBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "900" },
  hintTxt: { color: "#64748b", fontSize: 12, textAlign: "center", lineHeight: 18 },
});
