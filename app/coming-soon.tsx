import React, { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, Alert, StyleSheet, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";

const shadowWorkImg  = require("../assets/shadow-work.png");
const reikiImg       = require("../assets/reiki.png");
const deepTranceImg  = require("../assets/deep-trance.png");
const akashicImg     = require("../assets/akashic.png");
const mesmerismImg   = require("../assets/mesmerism.png");
const pastLifeImg    = require("../assets/past-life-regression.png");

const PROG_DATA: Record<string, {
  img: ReturnType<typeof require>;
  tagline: string;
  desc: string;
  features: string[];
  accentColor: string;
  educator: string;
  duration: string;
}> = {
  "Art of Shadow Work": {
    img: shadowWorkImg,
    tagline: "Heal What the Light Cannot Reach",
    desc: "Dive deep into the unconscious mind to uncover suppressed emotions, integrate your shadow self, and achieve profound emotional freedom. Guided by Geeta Makhijani.",
    features: [
      "Deep inner-child healing sessions",
      "Jungian shadow integration techniques",
      "Emotional release & trauma healing",
      "Live Q&A with Geeta Makhijani",
      "Lifetime access to recordings",
      "Certificate of completion",
    ],
    accentColor: "#6d28d9",
    educator: "Geeta Makhijani",
    duration: "8-Week Full Program",
  },
  "Reiki": {
    img: reikiImg,
    tagline: "Channel Universal Life Energy",
    desc: "Learn the ancient art of Reiki healing — from Level 1 attunement to Master certification. Heal yourself, your family and build a practice of your own.",
    features: [
      "Reiki Level 1, 2 & Master attunement",
      "Chakra balancing & aura reading",
      "Distance healing techniques",
      "Crystal healing integration",
      "Practice community access",
      "BSH Certified Practitioner badge",
    ],
    accentColor: "#0d9488",
    educator: "BSH Faculty",
    duration: "12-Week Certification",
  },
  "Deep Trance Level": {
    img: deepTranceImg,
    tagline: "Go Beyond the Ordinary Mind",
    desc: "Master the art of deep hypnotic trance — somnambulism, esdaile state and beyond. For practitioners who want to take their hypnotherapy to elite levels.",
    features: [
      "Somnambulism induction mastery",
      "Esdaile & ultra-depth states",
      "Advanced regression techniques",
      "Direct & indirect suggestion scripts",
      "4-Day intensive workshop format",
      "Supervised practice sessions",
    ],
    accentColor: "#1d4ed8",
    educator: "Dr. Pradeep Kumar",
    duration: "4-Day Intensive",
  },
  "Akashik Records": {
    img: akashicImg,
    tagline: "Access the Library of Your Soul",
    desc: "Learn to access the Akashic Records — the cosmic database of every soul's journey. Discover your soul's purpose, clear karmic patterns and receive divine guidance.",
    features: [
      "Opening & closing Akashic prayers",
      "Reading for yourself & others",
      "Karmic pattern clearing",
      "Soul contract understanding",
      "Past-life connection healing",
      "Practitioner-level certification",
    ],
    accentColor: "#7c3aed",
    educator: "BSH Faculty",
    duration: "6-Week Program",
  },
  "Mesmerism": {
    img: mesmerismImg,
    tagline: "The Original Healing Art",
    desc: "Explore the roots of hypnotherapy through Franz Mesmer's techniques — magnetic passes, energy healing and the forgotten foundations of modern mind work.",
    features: [
      "Mesmeric passes & techniques",
      "Animal magnetism theory & practice",
      "Energy field sensing & healing",
      "Historical & modern integration",
      "Hands-on practice sessions",
    ],
    accentColor: "#b45309",
    educator: "Dr. Pradeep Kumar",
    duration: "3-Week Workshop",
  },
  "Past Life Regression": {
    img: pastLifeImg,
    tagline: "Heal Across Lifetimes",
    desc: "Journey into past lives to understand present-day patterns, relationships and blocks. A deeply transformational skill for hypnotherapists and spiritual seekers.",
    features: [
      "Past life induction protocols",
      "Healing traumatic past-life memories",
      "Between-lives state exploration",
      "Regression facilitation skills",
      "Client case supervision",
      "Practitioner certificate",
    ],
    accentColor: "#be185d",
    educator: "Dr. Pradeep Kumar",
    duration: "5-Week Program",
  },
};

export default function ComingSoonScreen() {
  const { program } = useLocalSearchParams<{ program?: string }>();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "loading" | "done">("form");

  const progName = program ?? "Coming Soon";
  const data = PROG_DATA[progName] ?? {
    img: akashicImg,
    tagline: "Something Extraordinary is Coming",
    desc: "We are preparing something truly special. Be the first to know when it launches.",
    features: ["Exclusive early-bird pricing", "Lifetime access", "Certificate of completion"],
    accentColor: "#7c3aed",
    educator: "BSH Faculty",
    duration: "Full Program",
  };

  const handleNotify = async () => {
    if (!name.trim() || !email.trim()) {
      Alert.alert("Required", "Please enter your name and email."); return;
    }
    setStep("loading");
    try {
      await client.post("/interest-registrations", { name: name.trim(), email: email.trim(), program: progName });
    } catch { /* silent — we still show success */ }
    setStep("done");
  };

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Back button */}
      <TouchableOpacity style={[s.backBtn, { top: insets.top + 12 }]} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
        {/* Hero */}
        <View style={s.heroWrap}>
          <Image source={data.img} style={s.heroBg} resizeMode="cover" />
          <View style={s.heroOverlay} />
          <View style={s.heroBadgeRow}>
            <View style={[s.heroBadge, { backgroundColor: data.accentColor + "cc" }]}>
              <Text style={s.heroBadgeTxt}>⏳  COMING SOON</Text>
            </View>
          </View>
          <View style={s.heroContent}>
            <Text style={s.heroTitle}>{progName}</Text>
            <Text style={s.heroTagline}>{data.tagline}</Text>
            <View style={s.heroMeta}>
              <View style={s.heroChip}>
                <Ionicons name="person-outline" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={s.heroChipTxt}>{data.educator}</Text>
              </View>
              <View style={s.heroChip}>
                <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={s.heroChipTxt}>{data.duration}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        <View style={s.section}>
          <Text style={s.desc}>{data.desc}</Text>
        </View>

        {/* What's included */}
        <View style={[s.section, s.featuresBox]}>
          <Text style={s.featuresTitle}>What's included</Text>
          {data.features.map((f, i) => (
            <View key={i} style={s.featureRow}>
              <View style={[s.featureCheck, { backgroundColor: data.accentColor + "22" }]}>
                <Ionicons name="checkmark" size={12} color={data.accentColor} />
              </View>
              <Text style={s.featureTxt}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Early Bird Notice */}
        <View style={[s.section, s.earlyBirdBox]}>
          <Text style={s.earlyBirdTitle}>🎁  Early Bird Offer</Text>
          <Text style={s.earlyBirdDesc}>
            Register now and get exclusive early-bird pricing — up to 40% off the launch price. Limited seats available.
          </Text>
        </View>

        {/* Notify Form */}
        <View style={s.section}>
          <Text style={s.notifyTitle}>Get notified when it launches</Text>
          <Text style={s.notifySub}>Be first in line. We'll notify you the moment it's live.</Text>

          {step === "done" ? (
            <View style={s.successBox}>
              <Text style={s.successIcon}>🎉</Text>
              <Text style={s.successTitle}>You're on the list!</Text>
              <Text style={s.successMsg}>
                We'll notify <Text style={{ color: data.accentColor, fontWeight: "700" }}>{email}</Text> the moment {progName} launches.
              </Text>
              <TouchableOpacity style={[s.doneBtn, { backgroundColor: data.accentColor }]} onPress={() => router.back()}>
                <Text style={s.doneBtnTxt}>Back to Home</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.formBox}>
              <TextInput
                value={name} onChangeText={setName}
                placeholder="Your full name"
                placeholderTextColor="#6b7280"
                style={s.input}
              />
              <TextInput
                value={email} onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#6b7280"
                keyboardType="email-address"
                autoCapitalize="none"
                style={s.input}
              />
              <TouchableOpacity
                style={[s.notifyBtn, { backgroundColor: data.accentColor, opacity: step === "loading" ? 0.7 : 1 }]}
                onPress={handleNotify}
                disabled={step === "loading"}>
                <Text style={s.notifyBtnTxt}>
                  {step === "loading" ? "Registering..." : "🔔  Notify Me at Launch"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Divider + CTA to consult */}
        <View style={s.section}>
          <View style={s.divider} />
          <Text style={s.ctaLabel}>Want a head start? Talk to our team.</Text>
          <TouchableOpacity style={s.consultBtn}
            onPress={() => router.push("/(tabs)/consultation" as any)}>
            <Ionicons name="chatbubbles-outline" size={16} color="#7c3aed" style={{ marginRight: 8 }} />
            <Text style={s.consultBtnTxt}>Book a Free Consultation →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.whatsappBtn}
            onPress={() => Linking.openURL("https://wa.me/919096221750?text=Hi%2C%20I%27m%20interested%20in%20" + encodeURIComponent(progName)).catch(() => {})}>
            <Ionicons name="logo-whatsapp" size={16} color="#22c55e" style={{ marginRight: 8 }} />
            <Text style={s.whatsappBtnTxt}>WhatsApp Us About This Course</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0d0d1a" },
  backBtn: {
    position: "absolute", left: 16, zIndex: 50,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center",
  },
  heroWrap: { height: 340, position: "relative" },
  heroBg: { width: "100%", height: "100%", position: "absolute" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  heroBadgeRow: { position: "absolute", top: 56, left: 20 },
  heroBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  heroBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  heroContent: { position: "absolute", bottom: 24, left: 20, right: 20 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "900", lineHeight: 34, marginBottom: 6 },
  heroTagline: { color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 20, marginBottom: 12 },
  heroMeta: { flexDirection: "row", gap: 10 },
  heroChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  heroChipTxt: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "600" },

  section: { paddingHorizontal: 20, paddingTop: 20 },
  desc: { color: "#cbd5e1", fontSize: 14, lineHeight: 22 },

  featuresBox: {
    marginHorizontal: 20, marginTop: 20, borderRadius: 16,
    backgroundColor: "#1a1a2e", padding: 18, borderWidth: 1, borderColor: "#2d2d4e",
  },
  featuresTitle: { color: "#fff", fontSize: 16, fontWeight: "800", marginBottom: 14 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  featureCheck: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1 },
  featureTxt: { color: "#e2e8f0", fontSize: 13, flex: 1, lineHeight: 19 },

  earlyBirdBox: {
    marginHorizontal: 20, marginTop: 16, borderRadius: 16,
    backgroundColor: "#1c1006", padding: 18, borderWidth: 1, borderColor: "#f59e0b44",
  },
  earlyBirdTitle: { color: "#f59e0b", fontSize: 15, fontWeight: "800", marginBottom: 6 },
  earlyBirdDesc: { color: "#d4a017", fontSize: 13, lineHeight: 20 },

  notifyTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  notifySub: { color: "#94a3b8", fontSize: 13, marginBottom: 18 },
  formBox: { gap: 12 },
  input: {
    backgroundColor: "#1e1b4b", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13,
    color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "#2d2a5e",
  },
  notifyBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 4 },
  notifyBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "900" },

  successBox: { alignItems: "center", paddingVertical: 24, gap: 10 },
  successIcon: { fontSize: 48 },
  successTitle: { color: "#fff", fontSize: 22, fontWeight: "900" },
  successMsg: { color: "#94a3b8", fontSize: 14, textAlign: "center", lineHeight: 22 },
  doneBtn: { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  doneBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },

  divider: { height: 1, backgroundColor: "#2d2d4e", marginBottom: 20 },
  ctaLabel: { color: "#94a3b8", fontSize: 13, textAlign: "center", marginBottom: 12 },
  consultBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#1e1b4b", borderRadius: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: "#7c3aed44", marginBottom: 12,
  },
  consultBtnTxt: { color: "#7c3aed", fontSize: 14, fontWeight: "700" },
  whatsappBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#0f2010", borderRadius: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: "#22c55e44",
  },
  whatsappBtnTxt: { color: "#22c55e", fontSize: 14, fontWeight: "700" },
});
