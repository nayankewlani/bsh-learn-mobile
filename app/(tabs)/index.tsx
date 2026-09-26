import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  FlatList, Dimensions, Modal, Animated, Easing, TextInput, ActivityIndicator,
  NativeSyntheticEvent, NativeScrollEvent, Alert, Linking, Switch,
  InteractionManager,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { showTabBar, hideTabBar } from "../../stores/tabBarStore";
import { RAZORPAY_KEY_ID, API_URL } from "../../constants";
import client from "../../api/client";
import { blockIOSPurchase } from "../../lib/paymentGate";
import { useHomeStore } from "../../stores/homeStore";

// react-native-razorpay (EAS build only)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _rzpMod = (() => { try { return require("react-native-razorpay"); } catch { return null; } })();
const RazorpayCheckout: {
  open: (o: Record<string, unknown>) => Promise<{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }>;
} | null = _rzpMod?.default?.open ? _rzpMod.default : _rzpMod?.open ? _rzpMod : null;

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Video, ResizeMode } from "expo-av";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop, Rect as SvgRect } from "react-native-svg";
type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const { width: SW } = Dimensions.get("window");

// ── Types ────────────────────────────────────────────────────────────────────
interface ApiTrainer {
  _id: string; name: string; avatar: string; isOnline: boolean;
  trainerRole: string; trainerColor: string; specialties: string[];
  experience: string; sessionsDisplay: string; rating: number;
  followers: number; trainerLanguages: string[]; isVerifiedBadge: boolean;
  sessionPricePaise: number; hasPayBooking: boolean; hasApplyBooking: boolean;
}
interface ApiProgram {
  _id: string; programId: string; title: string; description: string;
  thumbnail: string; price: number; discountPrice: number;
  duration: string; level: string; features: string[];
  programType: string; tags: string[];
}
interface ApiBatch {
  _id: string; title: string; thumbnail: string; category: string;
  price: number; discountPrice: number; enrollmentCount: number;
  rating: number; isFeatured: boolean; language: string; level: string;
  educator: { name: string; avatar: string };
  razorpayPaymentLink?: string;
}
interface HomeClassType {
  _id: string; title: string; educator: string; subject: string;
  subjectColor: string; lang: string; thumbnailUrl: string;
  recordingUrl: string; views: string; bgColor: string;
  isFeatured: boolean; isActive: boolean; order: number;
}
interface HealTool {
  id: number; category: string; title: string; desc: string;
  icon: string; duration: string; type: string; free: boolean;
  g1: string; g2: string; interactive?: "breathing" | "pomodoro";
}

// ── Assets ──────────────────────────────────────────────────────────────────
const advHypnosisImg = require("../../assets/advanced-hypnosis.png");
const hypnosis2Img   = require("../../assets/hypnosis-2.png");
const shadowWorkImg  = require("../../assets/shadow-work.png");
const reikiImg       = require("../../assets/reiki.png");
const deepTranceImg  = require("../../assets/deep-trance.png");
const akashicImg     = require("../../assets/akashic.png");
const bshLogoImg     = require("../../assets/BSH-logo-02.png");
const mesmerismImg   = require("../../assets/mesmerism.png");
const pastLifeImg    = require("../../assets/past-life-regression.png");
const geetaImg       = require("../../assets/geeta-makhijani.png");
const slide1         = require("../../assets/slide-1.png");
const slide4         = require("../../assets/slide-4.png");
const vedic          = require("../../assets/vedic-astro.jpeg");
const modAstrologyImg    = require("../../assets/module-astrology.png");
const modTarotImg        = require("../../assets/module-tarot.png");
const modManifestImg     = require("../../assets/module-manifestation.png");
const modHypnosisImg     = require("../../assets/module-hypnosis.png");
const modHealingImg      = require("../../assets/module-healing.png");
const modDreamsImg       = require("../../assets/module-dreams.png");

// Local images for known trainers (matches consultation page)
const LOCAL_IMGS_HOME: Record<string, number> = {
  "dr. pradeep kumar": slide1,
  "geeta makhijani":   geetaImg,
  "bsh faculty":       slide4,
};

// Fallback images for known program IDs
const PROG_IMG: Record<string, number> = {
  "advance-hypnosis": advHypnosisImg,
  "hypnosis-2":       hypnosis2Img,
  "healing-tools":    reikiImg,
};
// Fallback images by course category
const CAT_IMG: Record<string, number> = {
  "Advance Hypnosis":      advHypnosisImg,
  "Hypnosis 2.0":          hypnosis2Img,
  "Deep Trance Level":     deepTranceImg,
  "Art of Shadow Work":    shadowWorkImg,
  "Shadow Work":           shadowWorkImg,
  "Reiki":                 reikiImg,
  "Akashik":               akashicImg,
  "Mesmerism":             mesmerismImg,
  "Past Life Regression":  pastLifeImg,
  "Vedic Astrology":       vedic,
};

// ── Static Data ──────────────────────────────────────────────────────────────
const GOALS = [
  { img: advHypnosisImg, name: "Advance\nHypnosis",    count: "12 Batches" },
  { img: hypnosis2Img,   name: "Hypnosis 2.0",          count: "8 Batches"  },
  { img: deepTranceImg,  name: "Deep Trance\nLevel",    count: "5 Batches"  },
  { img: shadowWorkImg,  name: "Art of\nShadow Work",   count: "6 Batches"  },
  { img: reikiImg,       name: "Reiki",                 count: "10 Batches" },
  { img: akashicImg,     name: "Akashik",               count: "5 Batches"  },
  { img: mesmerismImg,   name: "Mesmerism",             count: "4 Batches"  },
  { img: pastLifeImg,    name: "Past Life\nRegression", count: "3 Batches"  },
  { img: vedic,          name: "Vedic\nAstrology",      count: "6 Batches"  },
];

const GUIDANCE_MODULES = [
  { id:"astrology",     img:modAstrologyImg, name:"Astrology",     accent:"#f59e0b" },
  { id:"tarot",         img:modTarotImg,     name:"Tarot",         accent:"#60a5fa" },
  { id:"manifestation", img:modManifestImg,  name:"Manifestation", accent:"#60a5fa" },
  { id:"hypnosis",      img:modHypnosisImg,  name:"Hypnosis",      accent:"#34d399" },
  { id:"healing",       img:modHealingImg,   name:"Healing",       accent:"#f472b6" },
  { id:"dreams",        img:modDreamsImg,    name:"Dreams",        accent:"#818cf8" },
];

const spiritKundliImg    = require("../../assets/kundli image for application.jpg");
const spiritPujaImg      = require("../../assets/puja image for application..jpg");
const spiritPanchangImg  = require("../../assets/Panchanga for application.jpg");
const spiritNumerologyImg= require("../../assets/numerology image for application.jpg");
const spiritHoroscopeImg = require("../../assets/horoscope for application.jpg");

const SPIRITUAL_TOOLS = [
  { id:"kundli",     label:"Kundli",     sub:"Birth chart & destiny",    img: spiritKundliImg },
  { id:"puja",       label:"Puja",       sub:"Sacred rituals & mantras", img: spiritPujaImg },
  { id:"panchang",   label:"Panchang",   sub:"Auspicious timings",       img: spiritPanchangImg },
  { id:"numerology", label:"Numerology", sub:"Numbers & vibrations",     img: spiritNumerologyImg },
  { id:"horoscope",  label:"Horoscope",  sub:"Daily cosmic guidance",    img: spiritHoroscopeImg },
];

const TRAINERS = [
  { name: "Dr. Pradeep Kumar",  role: "Clinical Hypnotherapist & NLP Master",  color: "#0c2461", exp: "20+ Yrs", sessions: "5,000+", badge: "POPULAR",       subjects: ["Hypnosis","NLP"], rating: 4.9 },
  { name: "Geeta Makhijani",    role: "Shadow Work & Emotional Healing Expert", color: "#0c2461", exp: "12+ Yrs", sessions: "2,500+", badge: "MASTER TRAINER", subjects: ["Shadow Work","Healing"], rating: 4.8 },
  { name: "Nalini J. Yadav",    role: "Emotional Healing Expert",               color: "#0c2461", exp: "10+ Yrs", sessions: "1,500+", badge: "POPULAR",       subjects: ["Emotional Healing"], rating: 4.8 },
  { name: "Vikas Bhardwaj",     role: "NLP & Life Transformation Coach",        color: "#2563eb", exp: "8+ Yrs",  sessions: "1,200+", badge: "POPULAR",       subjects: ["NLP","Coaching"], rating: 4.6 },
  { name: "Dr. Puneet Jain",    role: "Autism & Special Needs Expert",          color: "#16a34a", exp: "12+ Yrs", sessions: "800+",   badge: "SPECIALIST",    subjects: ["Autism","Healing"], rating: 4.9 },
  { name: "Vandana Khurana",    role: "Mind Healing & Wellness Coach",          color: "#db2777", exp: "10+ Yrs", sessions: "1,800+", badge: "POPULAR",       subjects: ["Mind Wellness"], rating: 4.7 },
  { name: "Dr. Suman Batra",    role: "Hypnotherapy & Spiritual Healing",       color: "#0c2461", exp: "15+ Yrs", sessions: "2,000+", badge: "MASTER TRAINER", subjects: ["Hypnotherapy","Spiritual"], rating: 4.8 },
  { name: "Biju Balkrishnan",   role: "Corporate Trainer & Leadership Coach",   color: "#0c2461", exp: "18+ Yrs", sessions: "4,000+", badge: "MASTER TRAINER", subjects: ["Corporate","Leadership"], rating: 4.9 },
  { name: "Dr. Ratna Sawant",   role: "Clinical Hypnotherapist",                color: "#0c2461", exp: "12+ Yrs", sessions: "1,600+", badge: "POPULAR",       subjects: ["Hypnotherapy"], rating: 4.7 },
  { name: "Shruti Saxena",      role: "Emotional Healing & Wellness Coach",     color: "#db2777", exp: "8+ Yrs",  sessions: "900+",   badge: "POPULAR",       subjects: ["Emotional Healing"], rating: 4.6 },
  { name: "Ankit Vig",          role: "NLP Coach & Motivational Speaker",       color: "#2563eb", exp: "10+ Yrs", sessions: "2,200+", badge: "POPULAR",       subjects: ["NLP","Motivation"], rating: 4.8 },
  { name: "Deepika Handa",      role: "Hypnotherapy & Mind Wellness Coach",     color: "#0ea5e9", exp: "7+ Yrs",  sessions: "700+",   badge: "RISING STAR",   subjects: ["Hypnotherapy"], rating: 4.6 },
  { name: "Rajesh Kumar",       role: "Vastu Master & Energy Healing Expert",   color: "#d97706", exp: "20+ Yrs", sessions: "1,500+", badge: "MASTER TRAINER", subjects: ["Vastu","Energy"], rating: 4.9 },
  { name: "Abhinnav Kumar",     role: "Hypnotherapy & Transformation Coach",    color: "#0c2461", exp: "6+ Yrs",  sessions: "500+",   badge: "RISING STAR",   subjects: ["Hypnotherapy"], rating: 4.5 },
];

const EDUCATORS = [
  { name: "BSH Faculty",       subject: "Akashik & Energy Expert",   img: bshLogoImg, followers: "45K",  watchMins: "98M",  badge: "STAR",   resizeMode: "contain" as const, imgBg: "#0c2461", slug: null,
    bio: "BSH's core team of certified energy healers specializing in Akashik Records, Pranic Healing and Chakra Alignment." },
  { name: "Dr. Pradeep Kumar", subject: "Hypnosis & NLP Expert",     img: slide1,   followers: "161K", watchMins: "315M", badge: "MASTER", resizeMode: "contain" as const, imgBg: "#1a0a3e", slug: "pradeep",
    bio: "India's leading Clinical Hypnotherapist with 20+ years of experience. Has trained over 5,000+ practitioners across 15 countries." },
  { name: "Geeta Makhijani",   subject: "Shadow Work Specialist",    img: geetaImg, followers: "90K",  watchMins: "257M", badge: "MASTER", resizeMode: "cover" as const,    imgBg: undefined, slug: "geeta",
    bio: "Pioneering Shadow Work & Emotional Healing in India. Geeta's unique methodology has helped thousands heal childhood wounds and relationship traumas." },
];

const BATCHES = [
  { id:"b1", isActive:true,  img:advHypnosisImg, tags:["Hindi","Full Course"],    title:"Advance Hypnosis — Master Batch 2026",          educator:"Dr. Pradeep Kumar", status:"upcoming" as const, startLabel:"Enroll Now · 6-Month Certification",  price:"₹29,999", originalPrice:"", saving:"", category:"Advance Hypnosis"   },
  { id:"b2", isActive:true,  img:hypnosis2Img,   tags:["Hindi","Full Course"],    title:"Hypnosis 2.0 — Upgrade Your Mind",              educator:"Dr. Pradeep Kumar", status:"upcoming" as const, startLabel:"Starts 1 Jun 2026",             price:"₹2,699", originalPrice:"₹4,500", saving:"40%", category:"Hypnosis 2.0"       },
  { id:"b3", isActive:false, img:shadowWorkImg,  tags:["Hindi","Full Course"],    title:"Art of Shadow Work — Deep Healing",             educator:"Geeta Makhijani",   status:"upcoming" as const, startLabel:"Starts Soon · Registration Open", price:"₹2,499", originalPrice:"₹3,999", saving:"37%", category:"Art of Shadow Work"  },
  { id:"b4", isActive:false, img:reikiImg,       tags:["Hindi / English","Level 1 & 2"], title:"Reiki — Universal Life Energy Certification", educator:"BSH Faculty",   status:"upcoming" as const, startLabel:"Starts 15 Jun 2026",            price:"₹1,999", originalPrice:"₹3,000", saving:"33%", category:"Reiki"              },
  { id:"b5", isActive:false, img:deepTranceImg,  tags:["Hindi","Workshop"],       title:"Deep Trance Level — 4 Day Intensive",           educator:"Dr. Pradeep Kumar", status:"upcoming" as const, startLabel:"Starts 20 Jun 2026",             price:"₹1,499", originalPrice:"₹2,500", saving:"40%", category:"Deep Trance Level"   },
  { id:"b6", isActive:false, img:akashicImg,     tags:["Hindi / English","Full Course"], title:"Akashik Records — Access Universal Knowledge", educator:"BSH Faculty",  status:"upcoming" as const, startLabel:"Starts Soon · Registration Open", price:"₹2,999", originalPrice:"₹4,999", saving:"40%", category:"Akashik"            },
];

const HEAL_CATS = ["All","Breathing","Focus","Sleep","Healing","Student"];
const HEAL_CAT_ICONS: Record<string, IoniconName> = {
  All:"apps-outline", Breathing:"pulse-outline", Focus:"hourglass-outline",
  Sleep:"moon-outline", Healing:"heart-circle-outline", Student:"library-outline",
};

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

const TESTIMONIALS = [
  { name:"Priya Sharma",  init:"P", color:"#0c2461", subject:"Reiki Student",
    text:"BSH Healers transformed my understanding of energy healing. The Reiki course is exceptional!" },
  { name:"Rahul Mehta",   init:"R", color:"#0c2461", subject:"Hypnosis Student",
    text:"The Advance Hypnosis course opened doors I never knew existed. World-class content and teaching." },
  { name:"Anjali Singh",  init:"A", color:"#db2777", subject:"Shadow Work Student",
    text:"Shadow work sessions with live classes helped me heal past traumas. Highly recommend to everyone." },
  { name:"Vikram Patel",  init:"V", color:"#d97706", subject:"Akashik Student",
    text:"Akashik course is life-changing. The educator's knowledge and depth is truly unparalleled." },
];

const PS_ISSUE_TAGS = [
  "Anxiety & Stress","Depression","Relationship Issues","Trauma & Wounds",
  "Sleep Problems","Fear & Phobias","Anger Management","Low Confidence",
  "Career Block","Grief & Loss","Childhood Healing","Spiritual Growth",
  "Physical Pain","Addiction","Exam Fear","Family Conflict",
];
const PS_TIME_SLOTS = ["Morning (8–12)", "Afternoon (12–5)", "Evening (5–9)"];

// ── Pure helpers (module-level so they don't recreate on every render) ────────
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmtShortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

const fmtShortDateTime = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours(); const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h%12||12}:${String(m).padStart(2,"0")} ${ampm}`;
};

const fmtCountdown = (scheduledAt: string, status: string): { label: string; color: string; bg: string } => {
  if (status === "live") return { label: "🔴 LIVE NOW", color: "#fff", bg: "#ef4444" };
  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff <= 0) return { label: "STARTING NOW", color: "#fff", bg: "#ef4444" };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const today = new Date().toDateString() === new Date(scheduledAt).toDateString();
  if (h < 24 && today) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return { label: `LIVE IN ${pad(h)}:${pad(m)}:${pad(s)}`, color: "#fff", bg: "#0c2461" };
  }
  const tom = new Date(); tom.setDate(tom.getDate() + 1);
  if (tom.toDateString() === new Date(scheduledAt).toDateString()) return { label: "TOMORROW", color: "#fff", bg: "#0c2461" };
  return { label: fmtShortDate(scheduledAt), color: "#fff", bg: "#0c2461" };
};

// CountdownBadge — owns its own 1-second timer so only this tiny component
// re-renders each tick instead of the entire HomeScreen.
const CountdownBadge = React.memo(({ scheduledAt, status, badgeStyle, textStyle }: {
  scheduledAt: string; status: string; badgeStyle: any; textStyle: any;
}) => {
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const { label, bg } = fmtCountdown(scheduledAt, status);
  return (
    <View style={[badgeStyle, { backgroundColor: bg }]}>
      <Text style={textStyle}>{label}</Text>
    </View>
  );
});

// FlashingDot — owns its own 1.2-second toggle so only this 9×9 View
// re-renders each blink instead of the entire HomeScreen.
const FlashingDot = React.memo(() => {
  const [green, setGreen] = React.useState(false);
  React.useEffect(() => {
    const iv = setInterval(() => setGreen(v => !v), 1200);
    return () => clearInterval(iv);
  }, []);
  return (
    <View style={{
      position: "absolute", top: 0, right: 0,
      width: 9, height: 9, borderRadius: 5,
      backgroundColor: green ? "#22c55e" : "#ef4444",
      borderWidth: 1.5, borderColor: "rgba(0,0,0,0.6)",
    }} />
  );
});

const fmtINR = (paise: number) => "₹" + String(Math.round(paise / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const trainerInitials = (name: string) => name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
const fmtPlayerTime = (secs: number) => {
  const m = Math.floor(secs / 60); const s = secs % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};

// ── Hero types (module-level so HeroCarousel can reference them) ──────────────
interface LiveHeroSession {
  _id: string; title: string;
  educator: { _id: string; name: string; avatar?: string } | string;
  scheduledAt: string; status: string; enrolledStudents: string[];
  thumbnailUrl?: string;
}
interface HeroBannerItem {
  _id: string; _type: "banner"; title: string; superTitle: string;
  educatorName: string; badgeText: string; badgeBg: string; showTimer: boolean;
  timerEndsAt?: string; videoUrl?: string; thumbnailUrl?: string; ctaLink: string;
}
type HeroSlide = (LiveHeroSession & { _type?: "live" }) | HeroBannerItem;

// ── PLAYER_SCRIPTS — hoisted so it isn't recreated on every render ────────────
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

// Hoisted so it's never reallocated on render
const BREATH_PHASES: Array<{ phase: "inhale"|"hold1"|"exhale"|"hold2"; dur: number }> = [
  { phase:"inhale",dur:4 },{ phase:"hold1",dur:4 },
  { phase:"exhale",dur:4 },{ phase:"hold2",dur:4 },
];

// ── HeroCarousel — self-contained: owns heroIndex, heroMuted, auto-cycle ──────
// Extracted so the 5-second index update only re-renders this small component
// instead of the entire HomeScreen (trainers, healing tools, batches, etc.)
const HeroCarousel = React.memo(({ heroSlides, isTabFocused, isHeroVisible, dataReady, s, insets }: {
  heroSlides: HeroSlide[];
  isTabFocused: boolean;
  isHeroVisible: boolean;
  /** true once all 8 API calls have settled — prevents video competing with data fetch */
  dataReady: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  s: any;
  insets: { top: number };
}) => {
  const [heroIndex, setHeroIndex] = React.useState(0);
  const [heroMuted, setHeroMuted] = React.useState(true);
  const heroRef = React.useRef<FlatList>(null);
  const failedVideoIds = React.useRef<Set<string>>(new Set());
  const [, setVideoFailCount] = React.useState(0);

  // Auto-cycle slides every 5 s — state update now scoped to this component only
  React.useEffect(() => {
    if (heroSlides.length === 0) return;
    const t = setInterval(() => {
      setHeroIndex(i => {
        const total = heroSlides.length;
        const next = total > 0 ? (i + 1) % total : 0;
        try { heroRef.current?.scrollToIndex({ index: next, animated: true }); } catch {}
        return next;
      });
    }, 5000);
    return () => clearInterval(t);
  }, [heroSlides.length]);

  if (heroSlides.length === 0) return null;

  return (
    <View style={{ backgroundColor:"#0d0820", borderBottomLeftRadius:28, borderBottomRightRadius:28, overflow:"hidden", marginBottom:8 }}>
      <View style={{ height: SW * 1.1 + insets.top, backgroundColor:"#0d0820" }}>
        <FlatList
          ref={heroRef}
          data={heroSlides}
          horizontal pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item._id}
          getItemLayout={(_, index) => ({ length: SW, offset: SW * index, index })}
          onScrollToIndexFailed={info => {
            heroRef.current?.scrollToOffset({ offset: SW * info.index, animated: true });
          }}
          onScroll={e => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
            if (idx !== heroIndex) setHeroIndex(idx);
          }}
          scrollEventThrottle={16}
          removeClippedSubviews
          maxToRenderPerBatch={2}
          windowSize={3}
          renderItem={({ item, index: slideIdx }) => {
            const isBanner = (item as HeroBannerItem)._type === "banner";
            const isActiveSlide = slideIdx === heroIndex && isTabFocused;

            // ── Banner slide ──────────────────────────────────────────────────
            if (isBanner) {
              const b = item as HeroBannerItem;
              const dest = b.ctaLink || ("/(tabs)/live" as any);
              return (
                <TouchableOpacity activeOpacity={0.95} style={{ width: SW, height: SW * 1.1 + insets.top }}
                  onPress={() => router.push(dest as any)}>
                  {b.thumbnailUrl ? (
                    <Image source={{ uri: b.thumbnailUrl }} style={{ position:"absolute", width:"100%", height:"100%" }} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <Image source={slide1} style={{ position:"absolute", width:"100%", height:"100%" }} contentFit="cover" />
                  )}
                  {b.videoUrl && isActiveSlide && !failedVideoIds.current.has(b._id) && (
                    <Video
                      source={{ uri: `${API_URL}/hero-banners/${b._id}/video-stream`, overrideFileExtensionAndroid: "mp4" }}
                      style={{ position:"absolute", width:"100%", height:"100%" }}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={isTabFocused && isHeroVisible && dataReady} isLooping isMuted={heroMuted} useNativeControls={false}
                      onError={() => { failedVideoIds.current.add(b._id); setVideoFailCount(c => c + 1); }} />
                  )}
                  <View pointerEvents="none" style={{ position:"absolute", bottom:0, left:0, right:0, height:280 }}>
                    <Svg width={SW} height={280} viewBox={`0 0 ${SW} 280`} preserveAspectRatio="none">
                      <Defs>
                        <SvgGradient id="bannerFade" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0"    stopColor="#0d0820" stopOpacity="0"    />
                          <Stop offset="0.25" stopColor="#0d0820" stopOpacity="0"    />
                          <Stop offset="0.58" stopColor="#0d0820" stopOpacity="0.52" />
                          <Stop offset="0.80" stopColor="#0d0820" stopOpacity="0.84" />
                          <Stop offset="1"    stopColor="#0d0820" stopOpacity="1"    />
                        </SvgGradient>
                      </Defs>
                      <SvgRect x="0" y="0" width={SW} height={280} fill="url(#bannerFade)" />
                    </Svg>
                  </View>
                  <View style={s.heroOverlay}>
                    {b.superTitle ? <Text style={s.heroSuperTitle}>{b.superTitle}</Text> : null}
                    {b.educatorName ? <Text style={s.heroEducatorName}>{b.educatorName}</Text> : null}
                    <Text style={s.heroSessionTitle} numberOfLines={3}>{b.title}</Text>
                    {b.showTimer && b.timerEndsAt ? (
                      <CountdownBadge scheduledAt={b.timerEndsAt} status="scheduled" badgeStyle={s.heroCountdownBadge} textStyle={s.heroCountdownTxt} />
                    ) : b.badgeText ? (
                      <View style={[s.heroCountdownBadge, { backgroundColor: b.badgeBg || "#0c2461" }]}>
                        <Text style={s.heroCountdownTxt}>{b.badgeText}</Text>
                      </View>
                    ) : null}
                  </View>
                  {b.videoUrl && (
                    <TouchableOpacity style={s.heroMuteBtn} onPress={() => setHeroMuted(m => !m)}>
                      <Ionicons name={heroMuted ? "volume-mute" : "volume-high"} size={15} color="#fff" />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            }

            // ── Live session slide ─────────────────────────────────────────────
            const live = item as LiveHeroSession;
            const eduObj = typeof live.educator === "object" ? live.educator : null;
            const eduName = eduObj?.name ?? (typeof live.educator === "string" ? live.educator : "BSH Healer");
            const avatar = eduObj?.avatar ? { uri: eduObj.avatar } : slide1;
            const heroVideo = (live as any).heroVideoUrl as string | undefined;
            return (
              <TouchableOpacity activeOpacity={0.95} style={{ width: SW, height: SW * 1.1 + insets.top }}
                onPress={() => router.push("/(tabs)/live" as any)}>
                <Image source={avatar} style={{ position:"absolute", width:"100%", height:"100%" }} contentFit="cover" cachePolicy="disk" />
                {heroVideo && isActiveSlide && (
                  <Video
                    source={{
                      uri: heroVideo,
                      overrideFileExtensionAndroid: heroVideo.includes(".m3u8") ? "m3u8" : heroVideo.includes(".mpd") ? "mpd" : "mp4",
                    }}
                    style={{ position:"absolute", width:"100%", height:"100%" }}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={isTabFocused && isHeroVisible && dataReady} isLooping isMuted={heroMuted} useNativeControls={false} />
                )}
                <View style={{ position:"absolute", top:0, left:0, right:0, height: insets.top + 90 }}>
                  <View style={{ flex:1, backgroundColor:"rgba(4,2,14,0.45)" }} />
                </View>
                <View pointerEvents="none" style={{ position:"absolute", bottom:0, left:0, right:0, height:280 }}>
                  <Svg width={SW} height={280} viewBox={`0 0 ${SW} 280`} preserveAspectRatio="none">
                    <Defs>
                      <SvgGradient id="liveFade" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0"    stopColor="#0d0820" stopOpacity="0"    />
                        <Stop offset="0.25" stopColor="#0d0820" stopOpacity="0"    />
                        <Stop offset="0.58" stopColor="#0d0820" stopOpacity="0.52" />
                        <Stop offset="0.80" stopColor="#0d0820" stopOpacity="0.84" />
                        <Stop offset="1"    stopColor="#0d0820" stopOpacity="1"    />
                      </SvgGradient>
                    </Defs>
                    <SvgRect x="0" y="0" width={SW} height={280} fill="url(#liveFade)" />
                  </Svg>
                </View>
                <View style={s.heroOverlay}>
                  <Text style={s.heroSuperTitle}>WITH EXPERT HEALERS</Text>
                  <Text style={s.heroEducatorName}>{eduName}</Text>
                  <Text style={s.heroSessionTitle} numberOfLines={3}>{live.title}</Text>
                  <CountdownBadge scheduledAt={live.scheduledAt} status={live.status} badgeStyle={s.heroCountdownBadge} textStyle={s.heroCountdownTxt} />
                  {live.enrolledStudents?.length > 0 && (
                    <View style={s.heroAttendeeRow}>
                      {[...live.enrolledStudents].slice(0, 3).map((_, ai) => (
                        <View key={ai} style={[s.heroAvatarThumb, { left: ai * 16, backgroundColor: ["#0c2461","#0c2461","#db2777"][ai] }]}>
                          <Text style={{ color:"#fff", fontSize:8 }}>👤</Text>
                        </View>
                      ))}
                      <Text style={[s.heroAttendeeTxt, { marginLeft: Math.min(live.enrolledStudents.length, 3) * 16 + 8 }]}>
                        +{live.enrolledStudents.length} Attending
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={s.heroMuteBtn} onPress={() => setHeroMuted(m => !m)}>
                  <Ionicons name={heroMuted ? "volume-mute" : "volume-high"} size={15} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Pagination dots */}
      <View style={{ paddingTop:16, paddingBottom:2, flexDirection:"row", justifyContent:"center", gap:6 }}>
        {heroSlides.map((_, i) => (
          <View key={i} style={[s.heroDot, i === heroIndex && s.heroDotActive]} />
        ))}
      </View>

      {/* ── Section header ── */}
      <View style={{ paddingTop:20, paddingHorizontal:16, paddingBottom:0 }}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{ color:"#fff", fontSize:20, fontWeight:"800", letterSpacing:-0.2 }}>
          Find Your Right Guidance
        </Text>
      </View>

      {/* ── 3×2 module card grid ── */}
      <View style={{ flexDirection:"row", flexWrap:"wrap", paddingHorizontal:12, gap:8, marginTop:14, paddingBottom:28 }}>
        {GUIDANCE_MODULES.map((m) => {
          const cardW = (SW - 40) / 3;
          const cardH = cardW * 1.28;
          return (
            <TouchableOpacity key={m.id}
              style={{ width:cardW, height:cardH, borderRadius:12, overflow:"hidden", borderWidth:1, borderColor:"rgba(255,255,255,0.09)" }}
              activeOpacity={0.8}
              onPress={() => router.push(`/module/${m.id}` as any)}>
              <Image source={m.img} style={{ position:"absolute", width:"100%", height:"100%" }} contentFit="cover" />
              <View pointerEvents="none" style={{ position:"absolute", bottom:0, left:0, right:0, height:cardH * 0.55 }}>
                <Svg width={cardW} height={cardH * 0.55} viewBox={`0 0 ${cardW} ${cardH * 0.55}`} preserveAspectRatio="none">
                  <Defs>
                    <SvgGradient id={`mgr_${m.id}`} x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0"   stopColor="#0d0820" stopOpacity="0"    />
                      <Stop offset="0.5" stopColor="#0d0820" stopOpacity="0.58" />
                      <Stop offset="1"   stopColor="#0d0820" stopOpacity="0.95" />
                    </SvgGradient>
                  </Defs>
                  <SvgRect x="0" y="0" width={cardW} height={cardH * 0.55} fill={`url(#mgr_${m.id})`} />
                </Svg>
              </View>
              <View style={{ position:"absolute", bottom:0, left:0, right:0, paddingHorizontal:8, paddingBottom:9 }}>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                  style={{ color:"#fff", fontSize:11, fontWeight:"800", letterSpacing:0.3, textTransform:"uppercase" }}>
                  {m.name}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

// ── Component ────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { user } = useAuthStore();
  const { isDark, t, toggle: toggleTheme } = useThemeStore();
  const insets = useSafeAreaInsets();
  // Header scroll-hide animation
  const HEADER_H = 56 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const [isHeroVisible, setIsHeroVisible] = useState(true);
  const heroVisibleRef = useRef(true);

  const handleMainScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;
    const nowVisible = y < SW * 0.7;
    if (nowVisible !== heroVisibleRef.current) {
      heroVisibleRef.current = nowVisible;
      setIsHeroVisible(nowVisible);
    }
    if (y < 60) {
      if (headerHiddenRef.current) {
        headerHiddenRef.current = false;
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
  }, []);

  // Individual selectors — HomeScreen only re-renders for the field it uses,
  // not on every store mutation (e.g. lastFetched change no longer fires here)
  const heroBanners      = useHomeStore(s => s.heroBanners);
  const upcomingClasses  = useHomeStore(s => s.upcomingClasses);
  const liveHeroSessions = useHomeStore(s => s.liveHeroSessions);
  const homeTrainers     = useHomeStore(s => s.homeTrainers);
  const trainersLoaded   = useHomeStore(s => s.trainersLoaded);
  const apiPrograms      = useHomeStore(s => s.apiPrograms);
  const apiBatches       = useHomeStore(s => s.apiBatches);
  const homeClasses      = useHomeStore(s => s.homeClasses);
  const fetchHomeData    = useHomeStore(s => s.fetchHomeData);
  const lastFetched      = useHomeStore(s => s.lastFetched);
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [hasHealingAccess, setHasHealingAccess] = useState(false);
  const [healPayLoading, setHealPayLoading] = useState(false);

  // API-first: exact same source as Consultation page. Static only if API fails.
  const displayTrainers = useMemo(() => {
    if (homeTrainers.length > 0) {
      // Same list & order as Consultation page — online trainers first
      return [...homeTrainers]
        .sort((a, b) => Number(b.isOnline) - Number(a.isOnline))
        .map(api => ({
          name:     api.name,
          role:     api.trainerRole || "",
          color:    api.trainerColor || "#0c2461",
          exp:      api.experience || "",
          sessions: api.sessionsDisplay || "",
          rating:   api.rating || 0,
          badge:    api.isVerifiedBadge ? "VERIFIED" : "EXPERT",
          subjects: api.specialties || [],
          _api:     api,
        }));
    }
    // Static fallback only after API has responded with nothing (not during loading)
    if (trainersLoaded) return TRAINERS.map(tr => ({ ...tr, _api: null }));
    return []; // still loading — render nothing (avoids flash of stale data)
  }, [homeTrainers, trainersLoaded]);

  // Healing Hub
  const [healCat, setHealCat] = useState("All");
  const [healQ, setHealQ] = useState("");

  // Healing Tool Player
  const [healPlayer, setHealPlayer] = useState<HealTool | null>(null);
  const [playerRunning, setPlayerRunning] = useState(false);
  const [playerElapsed, setPlayerElapsed] = useState(0);
  const playerIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerGlowAnim = useRef(new Animated.Value(0.85)).current;
  const playerOrb1Anim = useRef(new Animated.Value(0)).current;
  const playerOrb2Anim = useRef(new Animated.Value(0)).current;
  const glowLoopRef  = useRef<Animated.CompositeAnimation | null>(null);
  const orb1LoopRef  = useRef<Animated.CompositeAnimation | null>(null);
  const orb2LoopRef  = useRef<Animated.CompositeAnimation | null>(null);

  // Breathing animation
  const [breathModalOpen, setBreathModalOpen] = useState(false);
  const [breathPhase, setBreathPhase] = useState<"inhale"|"hold1"|"exhale"|"hold2">("inhale");
  const [breathSecs, setBreathSecs] = useState(4);
  const [breathCycles, setBreathCycles] = useState(0);
  const breathAnimVal = useRef(new Animated.Value(0.7)).current;
  const breathIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const breathPhaseIdxRef = useRef(0);
  const breathSecsRef = useRef(4);

  // Pomodoro
  const [pomModalOpen, setPomModalOpen] = useState(false);
  const [pomPhase, setPomPhase] = useState<"focus"|"shortBreak"|"longBreak">("focus");
  const [pomSecs, setPomSecs] = useState(25 * 60);
  const [pomSession, setPomSession] = useState(1);
  const [pomRunning, setPomRunning] = useState(false);
  const pomIvRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pomPhaseRef = useRef<"focus"|"shortBreak"|"longBreak">("focus");
  const pomSecsRef = useRef(25 * 60);
  const pomSessionRef = useRef(1);
  // Sync refs after render — safe for Concurrent Mode (refs are read only in
  // setInterval callbacks, never during render, so no tearing risk)
  useEffect(() => {
    pomPhaseRef.current = pomPhase;
    pomSecsRef.current = pomSecs;
    pomSessionRef.current = pomSession;
  }, [pomPhase, pomSecs, pomSession]);

  // Booking modal
  const [bookModal, setBookModal] = useState<"session"|"freeCall"|null>(null);
  const [sName, setSName] = useState("");
  const [sEmail, setSEmail] = useState("");
  const [sPhone, setSPhone] = useState("");
  const [sDob, setSDob] = useState("");
  const [sDetail, setSDetail] = useState("");
  const [sIssues, setSIssues] = useState<string[]>([]);
  const [sTimeSlot, setSTimeSlot] = useState("");
  const [sStep, setSStep] = useState<"form"|"loading"|"success">("form");

  // BSH Plus
  const [plusLoading, setPlusLoading] = useState(false);
  const [liveMenuOpen, setLiveMenuOpen] = useState(false);

  // Task 3: Dynamic programs + batches
  const [progModal, setProgModal]     = useState<ApiProgram | null>(null);
  const [batchModal, setBatchModal]   = useState<ApiBatch | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  // ── Hero tab focus state (types + heroIndex/heroMuted live inside HeroCarousel) ─
  const [isTabFocused, setIsTabFocused] = useState(true);

  // Pause all hero videos when navigating away from this tab
  useFocusEffect(
    useCallback(() => {
      setIsTabFocused(true);
      return () => setIsTabFocused(false);
    }, [])
  );

  // ── Effects ─────────────────────────────────────────────────────────────────
  // heroBanners is already a stable Zustand reference — no copy needed
  const heroSlides = heroBanners as HeroSlide[];

  // Trigger TTL-cached fetch on mount and each time the home tab gains focus.
  // The 2-minute TTL inside fetchHomeData prevents redundant network calls.
  useEffect(() => { fetchHomeData(); }, []);
  useFocusEffect(useCallback(() => { fetchHomeData(); }, [fetchHomeData]));

  // Set active subject when home classes first arrive from the store
  useEffect(() => {
    if (homeClasses.length > 0 && !activeSubject) {
      const subjects = [...new Set((homeClasses as any[]).map((c) => c.subject as string))];
      setActiveSubject(subjects[0] ?? "");
    }
  }, [homeClasses.length]);

  // User-specific: healing tools access check (re-runs on login/logout)
  useEffect(() => {
    if (!user) { setHasHealingAccess(false); return; }
    InteractionManager.runAfterInteractions(() => {
      client.get("/payments/program-access/healing-tools")
        .then(({ data }) => setHasHealingAccess(data.hasAccess === true))
        .catch(() => {});
    });
  }, [user?._id]);


  useEffect(() => {
    if (!breathModalOpen) {
      if (breathIvRef.current) clearInterval(breathIvRef.current);
      breathAnimVal.stopAnimation();
      breathPhaseIdxRef.current=0; breathSecsRef.current=4;
      setBreathPhase("inhale"); setBreathSecs(4); setBreathCycles(0);
      breathAnimVal.setValue(0.7); return;
    }
    Animated.timing(breathAnimVal, { toValue:1, duration:4000, easing:Easing.inOut(Easing.ease), useNativeDriver:true }).start();
    breathIvRef.current = setInterval(() => {
      breathSecsRef.current--;
      if (breathSecsRef.current <= 0) {
        const prevIdx = breathPhaseIdxRef.current;
        breathPhaseIdxRef.current = (prevIdx+1) % BREATH_PHASES.length;
        if (breathPhaseIdxRef.current === 0) setBreathCycles(c => c+1);
        breathSecsRef.current = BREATH_PHASES[breathPhaseIdxRef.current].dur;
        const nextPhase = BREATH_PHASES[breathPhaseIdxRef.current].phase;
        setBreathPhase(nextPhase);
        const toVal = nextPhase==="inhale"||nextPhase==="hold1" ? 1 : 0.7;
        const dur = nextPhase==="inhale"||nextPhase==="exhale" ? 3900 : 150;
        Animated.timing(breathAnimVal, { toValue:toVal, duration:dur, easing:Easing.inOut(Easing.ease), useNativeDriver:true }).start();
      }
      setBreathSecs(breathSecsRef.current);
    }, 1000);
    return () => {
      if (breathIvRef.current) clearInterval(breathIvRef.current);
      breathAnimVal.stopAnimation();
    };
  }, [breathModalOpen]);

  const POM_TOTALS: Record<string,number> = { focus:25*60, shortBreak:5*60, longBreak:15*60 };
  useEffect(() => {
    if (!pomRunning) { if (pomIvRef.current) clearInterval(pomIvRef.current); return; }
    pomIvRef.current = setInterval(() => {
      const next = pomSecsRef.current - 1;
      if (next > 0) { setPomSecs(next); return; }
      setPomRunning(false);
      const ph = pomPhaseRef.current; const sess = pomSessionRef.current;
      if (ph==="focus") {
        if (sess>=4) { setPomPhase("longBreak"); setPomSecs(POM_TOTALS.longBreak); setPomSession(1); }
        else { setPomPhase("shortBreak"); setPomSecs(POM_TOTALS.shortBreak); setPomSession(s=>s+1); }
      } else { setPomPhase("focus"); setPomSecs(POM_TOTALS.focus); }
    }, 1000);
    return () => { if (pomIvRef.current) clearInterval(pomIvRef.current); };
  }, [pomRunning]);

  const resetPomodoro = () => { setPomRunning(false); setPomPhase("focus"); setPomSecs(25*60); setPomSession(1); };

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const toggleSIssue = useCallback((tag: string) =>
    setSIssues(prev => prev.includes(tag) ? prev.filter(i=>i!==tag) : [...prev, tag]), []);

  const submitSession = async () => {
    if (!sName.trim()||!sEmail.trim()||sIssues.length===0) {
      Alert.alert("Missing Info","Please fill Name, Email and select at least one concern."); return;
    }
    setSStep("loading");
    try {
      await client.post("/private-sessions", {
        name:sName.trim(), email:sEmail.trim(), phone:sPhone.trim(),
        dob:sDob.trim(), issues:sIssues, detail:sDetail.trim(),
        timeSlot:sTimeSlot, type:bookModal==="freeCall" ? "free_call" : "private",
      });
      setSStep("success");
    } catch { setSStep("form"); Alert.alert("Submission Failed","Could not send your request. Please try again."); }
  };

  const closeSessionModal = useCallback(() => {
    setBookModal(null); setSStep("form"); setSName(""); setSEmail("");
    setSPhone(""); setSDob(""); setSDetail(""); setSIssues([]); setSTimeSlot("");
  }, []);

  const handleHealTap = (tool: HealTool) => {
    if (!tool.free && !hasHealingAccess) {
      Alert.alert("🔒 Premium Tool",
        `${tool.title} requires the Healing Tools pack.\n\nUnlock all 20 tools for just ₹99 (one-time).`,
        [{ text:"Unlock ₹99", onPress:handleUnlockHealingTools }, { text:"Maybe Later", style:"cancel" }]);
      return;
    }
    if (tool.interactive==="breathing") setBreathModalOpen(true);
    else if (tool.interactive==="pomodoro") setPomModalOpen(true);
    else setHealPlayer(tool);
  };

  const handleClassTap = useCallback((cls: HomeClassType) => {
    if (!cls.recordingUrl) return;
    Linking.openURL(cls.recordingUrl).catch(() =>
      Alert.alert("Cannot open link","Unable to open recording URL."));
  }, []);

  const handleUnlockHealingTools = async () => {
    if (!user) {
      Alert.alert("Login Required","Please log in to unlock Healing Tools.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    if (blockIOSPurchase()) return;
    if (!RazorpayCheckout) {
      Alert.alert("Payment Not Available","Payments require the full BSH app build."); return;
    }
    if (healPayLoading) return;
    setHealPayLoading(true);
    try {
      const { data } = await client.post("/payments/create-order", { type:"program", programId:"healing-tools" });
      const order = data.order;
      const paymentData = await RazorpayCheckout.open({
        key:RAZORPAY_KEY_ID, amount:String(order.amount), currency:"INR",
        name:"BSH", description:"Healing Tools — Lifetime Access",
        order_id:order.id, prefill:{ name:user.name, email:user.email }, theme:{ color:"#0c2461" },
      });
      await client.post("/payments/verify", {
        razorpayOrderId:paymentData.razorpay_order_id,
        razorpayPaymentId:paymentData.razorpay_payment_id,
        razorpaySignature:paymentData.razorpay_signature,
      });
      setHasHealingAccess(true);
      Alert.alert("Unlocked! 🎉","All 20 Healing Tools are now available for you.");
    } catch (err: unknown) {
      const e = err as { code?:number; description?:string; response?:{status?:number;data?:{message?:string}};message?:string };
      if (e?.code===0) return;
      Alert.alert("Payment Failed", e.response?.data?.message ?? e.description ?? e.message ?? "Payment failed. Please try again.");
    } finally { setHealPayLoading(false); }
  };

  const handleJoinPlus = async () => {
    if (!user) {
      Alert.alert("Login Required","Please log in to purchase BSH Plus.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    if (blockIOSPurchase()) return;
    if (!RazorpayCheckout) {
      Alert.alert("Payment Not Available","Payments require the full BSH app build."); return;
    }
    if (plusLoading) return;
    setPlusLoading(true);
    try {
      const { data } = await client.post("/payments/create-order", { type:"subscription", plan:"bsh_plus" });
      const order = data.order;
      const paymentData = await RazorpayCheckout.open({
        key:RAZORPAY_KEY_ID, amount:String(order.amount), currency:"INR",
        name:"BSH", description:"BSH Plus — 12 Months Unlimited Access",
        order_id:order.id, prefill:{ name:user.name, email:user.email }, theme:{ color:"#0c2461" },
      });
      await client.post("/payments/verify", {
        razorpayOrderId:paymentData.razorpay_order_id,
        razorpayPaymentId:paymentData.razorpay_payment_id,
        razorpaySignature:paymentData.razorpay_signature,
      });
      Alert.alert("Payment Successful 🎉","Welcome to BSH Plus! Unlimited access for 12 months.",
        [{ text:"Start Learning", onPress:()=>router.push("/(tabs)/explore") }]);
    } catch (err: unknown) {
      const e = err as { code?:number; description?:string; response?:{status?:number;data?:{message?:string}};message?:string };
      if (e?.code===0) return;
      Alert.alert("Payment Failed", e.response?.data?.message ?? e.description ?? e.message ?? "Payment failed.");
    } finally { setPlusLoading(false); }
  };

  const BREATH_COLORS: Record<string,string> = { inhale:"#4facfe",hold1:"#00f2fe",exhale:"#60a5fa",hold2:"#fbc2eb" };
  const BREATH_LABELS: Record<string,string> = { inhale:"Inhale ↑",hold1:"Hold •",exhale:"Exhale ↓",hold2:"Hold •" };
  const POM_LABELS: Record<string,string> = { focus:"Focus Time",shortBreak:"Short Break ☕",longBreak:"Long Break 🎉" };
  const POM_COLORS: Record<string,string> = { focus:"#0c2461",shortBreak:"#059669",longBreak:"#d97706" };

  const healFiltered = useMemo(() => HEAL_TOOLS.filter(tool =>
    (healCat === "All" || tool.category === healCat) &&
    (!healQ || tool.title.toLowerCase().includes(healQ.toLowerCase()) || tool.desc.toLowerCase().includes(healQ.toLowerCase()))
  ), [healCat, healQ]);

  // ── Heal Player timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!playerRunning) {
      if (playerIvRef.current) clearInterval(playerIvRef.current);
      return;
    }
    playerIvRef.current = setInterval(() => setPlayerElapsed(s => s + 1), 1000);
    return () => { if (playerIvRef.current) clearInterval(playerIvRef.current); };
  }, [playerRunning]);

  useEffect(() => {
    // Always stop any running loops first to prevent accumulation
    glowLoopRef.current?.stop();
    orb1LoopRef.current?.stop();
    orb2LoopRef.current?.stop();
    glowLoopRef.current = null;
    orb1LoopRef.current = null;
    orb2LoopRef.current = null;

    if (!healPlayer) {
      setPlayerRunning(false);
      setPlayerElapsed(0);
      if (playerIvRef.current) clearInterval(playerIvRef.current);
      playerGlowAnim.stopAnimation(() => playerGlowAnim.setValue(0.85));
      return;
    }
    // Glow pulse loop
    glowLoopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(playerGlowAnim, { toValue: 1.18, duration: 1800, useNativeDriver: true }),
      Animated.timing(playerGlowAnim, { toValue: 0.82, duration: 1800, useNativeDriver: true }),
    ]));
    glowLoopRef.current.start();
    // Orb drift
    orb1LoopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(playerOrb1Anim, { toValue: 1, duration: 4200, useNativeDriver: true }),
      Animated.timing(playerOrb1Anim, { toValue: 0, duration: 4200, useNativeDriver: true }),
    ]));
    orb1LoopRef.current.start();
    orb2LoopRef.current = Animated.loop(Animated.sequence([
      Animated.timing(playerOrb2Anim, { toValue: 1, duration: 5600, useNativeDriver: true }),
      Animated.timing(playerOrb2Anim, { toValue: 0, duration: 5600, useNativeDriver: true }),
    ]));
    orb2LoopRef.current.start();
    setPlayerRunning(true);
    return () => {
      glowLoopRef.current?.stop();
      orb1LoopRef.current?.stop();
      orb2LoopRef.current?.stop();
    };
  }, [healPlayer]);


  const playerDurationSecs = useMemo(() => healPlayer ? (parseInt(healPlayer.duration) || 10) * 60 : 600, [healPlayer]);
  const playerPhases       = useMemo(() => PLAYER_SCRIPTS[healPlayer?.type ?? "AUDIO"] ?? PLAYER_SCRIPTS.AUDIO, [healPlayer]);
  const phaseInterval      = useMemo(() => Math.floor(playerDurationSecs / playerPhases.length), [playerDurationSecs, playerPhases]);
  const currentPhaseIdx    = Math.min(Math.floor(playerElapsed / Math.max(phaseInterval, 1)), playerPhases.length - 1);
  const currentPhaseText   = playerPhases[currentPhaseIdx];
  const playerProgress     = Math.min(playerElapsed / playerDurationSecs, 1);

  const PLAYER_CIRC_R = 88;
  const PLAYER_CIRC_C = 2 * Math.PI * PLAYER_CIRC_R;
  const playerDashOff = PLAYER_CIRC_C * (1 - playerProgress);
  const playerOrb1Y   = playerOrb1Anim.interpolate({ inputRange:[0,1], outputRange:[0,-40] });
  const playerOrb2Y   = playerOrb2Anim.interpolate({ inputRange:[0,1], outputRange:[0,50] });

  const featuredClasses = useMemo(() => homeClasses.filter(c => c.isFeatured), [homeClasses]);
  const subjectClasses  = useMemo(() => homeClasses.filter(c => c.subject === activeSubject), [homeClasses, activeSubject]);
  const allSubjects     = useMemo(() => [...new Set(homeClasses.map(c => c.subject))], [homeClasses]);


  // ── Purchase handlers ────────────────────────────────────────────────────
  const handleBuyProgram = async (prog: ApiProgram) => {
    if (!user) {
      Alert.alert("Login Required","Please log in to purchase.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    if (blockIOSPurchase()) return;
    // If admin set a Razorpay payment link, open it directly
    const directLink = (prog as any).razorpayPaymentLink;
    if (directLink) { Linking.openURL(directLink).catch(()=>{}); setProgModal(null); return; }
    if (!RazorpayCheckout) {
      Alert.alert("Payment Not Available","Payments require the full BSH app build. Please use our website to purchase.");
      return;
    }
    setPurchaseLoading(true);
    try {
      const { data } = await client.post("/payments/create-order", { type:"program", programId:prog.programId });
      const order = data.order;
      const paymentData = await RazorpayCheckout.open({
        key:RAZORPAY_KEY_ID, amount:String(order.amount), currency:"INR",
        name:"BSH Healers", description:prog.title,
        order_id:order.id, prefill:{ name:user.name, email:user.email }, theme:{ color:"#0c2461" },
      });
      await client.post("/payments/verify", {
        razorpayOrderId:paymentData.razorpay_order_id,
        razorpayPaymentId:paymentData.razorpay_payment_id,
        razorpaySignature:paymentData.razorpay_signature,
      });
      setProgModal(null);
      Alert.alert("Enrolled! 🎉",`Welcome to ${prog.title}! You now have full access.`,
        [{ text:"Start Learning", onPress:()=>router.push("/(tabs)/explore") }]);
    } catch (err: unknown) {
      const e = err as { code?:number; description?:string; response?:{status?:number;data?:{message?:string}};message?:string };
      if (e?.code===0) return;
      Alert.alert("Payment Failed", e.response?.data?.message ?? e.description ?? e.message ?? "Payment failed.");
    } finally { setPurchaseLoading(false); }
  };

  const handleBuyCourse = async (course: ApiBatch) => {
    if (!user) {
      Alert.alert("Login Required","Please log in to purchase.",
        [{ text:"Log In", onPress:()=>router.push("/(auth)/login") }, { text:"Cancel", style:"cancel" }]);
      return;
    }
    if (blockIOSPurchase()) return;
    if (course.razorpayPaymentLink) {
      Linking.openURL(course.razorpayPaymentLink).catch(()=>{});
      setBatchModal(null); return;
    }
    if (!RazorpayCheckout) {
      Alert.alert("Payment Not Available","Payments require the full BSH app build. Please use our website to purchase.");
      return;
    }
    setPurchaseLoading(true);
    try {
      const { data } = await client.post("/payments/create-order", { type:"course", courseId:course._id });
      const order = data.order;
      const paymentData = await RazorpayCheckout.open({
        key:RAZORPAY_KEY_ID, amount:String(order.amount), currency:"INR",
        name:"BSH Healers", description:course.title,
        order_id:order.id, prefill:{ name:user.name, email:user.email }, theme:{ color:"#0c2461" },
      });
      await client.post("/payments/verify", {
        razorpayOrderId:paymentData.razorpay_order_id,
        razorpayPaymentId:paymentData.razorpay_payment_id,
        razorpaySignature:paymentData.razorpay_signature,
      });
      setBatchModal(null);
      Alert.alert("Enrolled! 🎉",`You're now enrolled in ${course.title}!`,
        [{ text:"Go to Course", onPress:()=>router.push(`/course/${course._id}` as any) }]);
    } catch (err: unknown) {
      const e = err as { code?:number; description?:string; response?:{status?:number;data?:{message?:string}};message?:string };
      if (e?.code===0) return;
      Alert.alert("Payment Failed", e.response?.data?.message ?? e.description ?? e.message ?? "Payment failed.");
    } finally { setPurchaseLoading(false); }
  };

  // ── Computed: goals and batches (API-first, static fallback) ─────────────
  const displayGoals = useMemo(() => {
    if (apiPrograms.length > 0) {
      const apiItems = apiPrograms.map(p => ({
        img:      PROG_IMG[p.programId] || advHypnosisImg,
        thumbUrl: p.thumbnail || "",
        name:     p.title,
        count:    p.features?.length ? `${p.features.length} Features` : p.programType || "Full Program",
        price:    p.discountPrice > 0 ? Math.round(p.discountPrice / 100) : Math.round(p.price / 100),
        _prog:    p, comingSoon: false,
      }));
      // Append coming-soon programs not already covered by the API list
      const csProgs: Array<{ name: string; img: ReturnType<typeof require> }> = [
        { name: "Art of Shadow Work", img: shadowWorkImg },
        { name: "Reiki",              img: reikiImg },
        { name: "Deep Trance Level",  img: deepTranceImg },
        { name: "Akashik Records",    img: akashicImg },
      ];
      const csItems = csProgs
        .filter(cs => !apiItems.some(a => a.name.toLowerCase().includes(cs.name.toLowerCase().split(" ")[0])))
        .map(cs => ({
          img: cs.img, thumbUrl: "", name: cs.name, count: "Coming Soon",
          price: 0, _prog: null, comingSoon: true,
        }));
      return [...apiItems, ...csItems];
    }
    return GOALS.map(g => ({ ...g, thumbUrl:"", price:0, _prog:null, comingSoon:false }));
  }, [apiPrograms]);

  const displayBatches = useMemo(() => {
    const ACTIVE_CATS = new Set(["Advance Hypnosis", "Hypnosis 2.0"]);
    if (apiBatches.length > 0) {
      return apiBatches.map(c => ({
        id:    c._id,
        img:   CAT_IMG[c.category] || advHypnosisImg,
        thumbUrl: c.thumbnail || "",
        tags:  [c.language || "Hindi", c.level || "Full Course"],
        title: c.title,
        educator: c.educator?.name || "BSH Faculty",
        status: "upcoming" as const,
        startLabel: `${c.enrollmentCount || 0} enrolled · ⭐ ${c.rating?.toFixed(1) || "New"}`,
        price: fmtINR(c.discountPrice || c.price),
        originalPrice: c.discountPrice > 0 ? fmtINR(c.price) : "",
        saving: c.discountPrice > 0 ? `${Math.round((1 - c.discountPrice / c.price) * 100)}%` : "",
        category: c.category,
        isActive: ACTIVE_CATS.has(c.category),
        _course: c,
      }));
    }
    return BATCHES.map(b => ({ ...b, thumbUrl:"", _course:null }));
  }, [apiBatches]);

  // ── Dynamic styles (theme-aware, memoised so StyleSheet.create only runs when theme changes) ─────────────────────────────────────────
  const s = useMemo(() => makeStyles(t, isDark, insets.top, HEADER_H), [t, isDark, insets.top, HEADER_H]);

  return (
    <View style={[s.root, { backgroundColor: t.bg }]}>

      {/* ── Floating Header ── */}
      {/* Floating transparent header — overlays the hero */}
      <Animated.View style={[s.headerWrapper, { paddingTop:insets.top, transform:[{translateY:headerTranslateY}] }]}>
        <View style={s.headerRow}>
          {/* Logo + brand */}
          <View style={{ flexDirection:"row", alignItems:"center", gap:8 }}>
            <Image source={bshLogoImg} style={s.headerLogo} contentFit="contain" />
            <View>
              <Text style={s.brandName}>BSH</Text>
              <Text style={s.brandSub}>Healers</Text>
            </View>
          </View>

          {/* Right actions */}
          <View style={s.headerActions}>
            {/* Live pill */}
            <TouchableOpacity style={s.liveBtn} onPress={()=>setLiveMenuOpen(true)}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>Live</Text>
            </TouchableOpacity>

            {/* Chat */}
            <TouchableOpacity style={[s.consultBtn, {position:"relative"}]} onPress={()=>router.push("/(tabs)/consultation" as any)}>
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff"
                style={{ textShadowColor:"rgba(0,0,0,0.7)", textShadowOffset:{width:0,height:1}, textShadowRadius:6 } as any} />
              <FlashingDot />
            </TouchableOpacity>

            {/* Theme toggle */}
            <TouchableOpacity style={s.themeBtn} onPress={toggleTheme}>
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={22} color="#fff"
                style={{ textShadowColor:"rgba(0,0,0,0.7)", textShadowOffset:{width:0,height:1}, textShadowRadius:6 } as any}
              />
            </TouchableOpacity>

            {/* Avatar — taps open profile */}
            <TouchableOpacity onPress={()=>router.push(user ? "/profile" : "/(auth)/login")}>
              {user?.avatar ? (
                <Image source={{ uri:user.avatar }} style={s.avatar} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <View style={s.avatarDefault}>
                  <Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* ── Scrollable Content ── */}
      <ScrollView showsVerticalScrollIndicator={false} onScroll={handleMainScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop:0, paddingBottom:100 }}>

        {/* ═══════════════ UNIFIED HERO + GUIDANCE EXPERIENCE ═══════════════ */}
        <HeroCarousel
          heroSlides={heroSlides}
          isTabFocused={isTabFocused}
          isHeroVisible={isHeroVisible}
          dataReady={lastFetched !== null}
          s={s}
          insets={insets}
        />

        {/* ═══════════════ STARTING SOON (countdown cards) ═══════════════
             Admin-managed upcoming class cards with live countdown timers.
             Falls back to live sessions if no admin classes are set. */}
        {(upcomingClasses.length > 0 || liveHeroSessions.length > 0) && (() => {
          const useAdmin = upcomingClasses.length > 0;
          return (
            <View style={[s.section, { paddingHorizontal:0 }]}>
              <Text style={[s.sectionTitle, { paddingHorizontal:16, color:t.text }]} numberOfLines={1}>Starting Soon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:12, gap:10 }}>
                {useAdmin
                  ? (upcomingClasses as any[]).map(item => {
                      const src = item.thumbnailUrl ? { uri: item.thumbnailUrl } : slide1;
                      return (
                        <TouchableOpacity key={item._id} activeOpacity={0.88}
                          onPress={() => router.push({ pathname: "/(tabs)/live" as any, params: { educator: item.educatorName, scheduledAt: item.scheduledAt } })}>
                          <View style={s.startSoonCard}>
                            <Image source={src} style={{ position:"absolute", width:"100%", height:"100%" }} contentFit="cover" cachePolicy="disk" />
                            <View style={{ position:"absolute", top:0, right:0, bottom:0, left:0, backgroundColor:"rgba(10,5,30,0.38)" }} />
                            <CountdownBadge scheduledAt={item.scheduledAt} status={item.status} badgeStyle={s.startSoonBadge} textStyle={s.startSoonBadgeTxt} />
                            <View style={s.startSoonInfo}>
                              <Text style={s.startSoonTitle} numberOfLines={2}>{item.title}</Text>
                              {item.educatorName ? <Text style={s.startSoonEdu}>{item.educatorName}</Text> : null}
                              <Text style={s.startSoonDate}>
                                {fmtShortDateTime(item.scheduledAt)}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  : (liveHeroSessions as any[]).map(item => {
                      const eduObj = typeof item.educator === "object" ? item.educator : null;
                      const eduName = eduObj?.name ?? "BSH Healer";
                      const avatar = eduObj?.avatar ? { uri: eduObj.avatar } : slide1;
                      return (
                        <TouchableOpacity key={item._id} activeOpacity={0.88}
                          onPress={() => router.push("/(tabs)/live" as any)}>
                          <View style={s.startSoonCard}>
                            <Image source={avatar} style={{ position:"absolute", width:"100%", height:"100%" }} contentFit="cover" cachePolicy="disk" />
                            <View style={{ position:"absolute", top:0, right:0, bottom:0, left:0, backgroundColor:"rgba(10,5,30,0.35)" }} />
                            <CountdownBadge scheduledAt={item.scheduledAt} status={item.status} badgeStyle={s.startSoonBadge} textStyle={s.startSoonBadgeTxt} />
                            <View style={s.startSoonInfo}>
                              <Text style={s.startSoonTitle} numberOfLines={2}>{item.title}</Text>
                              <Text style={s.startSoonEdu}>{eduName}</Text>
                              <Text style={s.startSoonDate}>
                                {fmtShortDateTime(item.scheduledAt)}
                              </Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })
                }
              </ScrollView>
            </View>
          );
        })()}



        {/* ── Spiritual Tools ── */}
        <View style={[s.section, {paddingBottom:6, borderTopWidth:1, borderColor:t.border}]}>
          <Text style={[s.sectionTitle, {color:t.text}]}>Spiritual Tools</Text>
          <Text style={[s.sectionSub, {color:t.textMuted}]}>Ancient wisdom for everyday life</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingHorizontal:14, gap:12, paddingTop:10, paddingBottom:4}}>
            {SPIRITUAL_TOOLS.map(tool => (
              <TouchableOpacity key={tool.id} activeOpacity={0.85} style={s.spiritCard}
                onPress={() => router.push(`/${tool.id}` as any)}>
                {/* Full-bleed image */}
                <Image source={tool.img} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                {/* Dark gradient overlay at bottom */}
                <View style={{position:"absolute", bottom:0, left:0, right:0, height:72, backgroundColor:"rgba(0,0,0,0.58)"}} />
                {/* Label */}
                <View style={{position:"absolute", bottom:0, left:0, right:0, padding:12}}>
                  <Text style={{color:"#fff", fontSize:14, fontWeight:"800"}}>{tool.label}</Text>
                  <Text style={{color:"rgba(255,255,255,0.72)", fontSize:9, marginTop:2}}>{tool.sub}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Most Engaging Classes (API) ── */}
        {featuredClasses.length > 0 && (
          <View style={[s.section, {backgroundColor:t.surface2, borderTopWidth:1, borderBottomWidth:1, borderColor:t.border, paddingVertical:18}]}>
            <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>Most Engaging Spiritual Classes</Text>
            <Text style={[s.sectionSub, {color:t.textMuted}]}>Tap any class to watch the recording</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:12 }}>
              {featuredClasses.slice(0,8).map(cls=>(
                <TouchableOpacity key={cls._id} onPress={()=>handleClassTap(cls)} activeOpacity={0.85}
                  style={[s.clsCard, {backgroundColor:cls.bgColor||"#0f2557"}]}>
                  {cls.thumbnailUrl
                    ? <Image source={{ uri:cls.thumbnailUrl }} style={s.clsThumb} contentFit="cover" cachePolicy="disk" />
                    : <View style={[s.clsThumb, {backgroundColor:"#2d2a5e",alignItems:"center",justifyContent:"center"}]}><Text style={{fontSize:28}}>🧠</Text></View>}
                  <View style={s.clsBody}>
                    <View style={[s.clsSubjectBadge, {backgroundColor:cls.subjectColor+"33"}]}>
                      <Text style={[s.clsSubjectTxt, {color:cls.subjectColor}]}>{cls.subject}</Text>
                    </View>
                    <Text style={s.clsTitle} numberOfLines={2}>{cls.title}</Text>
                    <Text style={s.clsEducator}>{cls.educator}</Text>
                    <View style={{flexDirection:"row",gap:8,marginTop:4}}>
                      <Text style={s.clsMeta}>👁 {cls.views}</Text>
                      <Text style={s.clsMeta}>{cls.lang}</Text>
                    </View>
                    {cls.recordingUrl && (
                      <View style={{flexDirection:"row",alignItems:"center",gap:4,marginTop:4}}>
                        <Ionicons name="play-circle" size={13} color="#60a5fa"/>
                        <Text style={{color:"#60a5fa",fontSize:11,fontWeight:"600"}}>Watch Recording</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Classes by BSH Subject (API) ── */}
        {homeClasses.length > 0 && allSubjects.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>Classes by BSH Subjects</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop:10, marginBottom:12 }}>
              {allSubjects.map(subj=>{
                const active = subj===activeSubject;
                return (
                  <TouchableOpacity key={subj} onPress={()=>setActiveSubject(subj)}
                    style={[s.subjectTab, active && s.subjectTabActive,
                      {borderColor: active ? "#0c2461" : t.border, backgroundColor: active ? "rgba(30,58,138,0.15)" : t.surface}]}>
                    <Text style={[s.subjectTabTxt, {color: active ? t.accentLight : t.textMuted}]}>{subj}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {subjectClasses.map(cls=>(
                <TouchableOpacity key={cls._id} onPress={()=>handleClassTap(cls)} activeOpacity={0.85}
                  style={[s.clsCard, {backgroundColor:cls.bgColor||"#0f2557"}]}>
                  {cls.thumbnailUrl
                    ? <Image source={{ uri:cls.thumbnailUrl }} style={s.clsThumb} contentFit="cover" cachePolicy="disk" />
                    : <View style={[s.clsThumb, {backgroundColor:"#2d2a5e",alignItems:"center",justifyContent:"center"}]}><Text style={{fontSize:28}}>🧠</Text></View>}
                  <View style={s.clsBody}>
                    <View style={[s.clsSubjectBadge, {backgroundColor:cls.subjectColor+"33"}]}>
                      <Text style={[s.clsSubjectTxt, {color:cls.subjectColor}]}>{cls.subject}</Text>
                    </View>
                    <Text style={s.clsTitle} numberOfLines={2}>{cls.title}</Text>
                    <Text style={s.clsEducator}>{cls.educator}</Text>
                    {cls.recordingUrl && (
                      <View style={{flexDirection:"row",alignItems:"center",gap:4,marginTop:6}}>
                        <Ionicons name="play-circle" size={13} color="#60a5fa"/>
                        <Text style={{color:"#60a5fa",fontSize:11,fontWeight:"600"}}>Watch Recording</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Private Healing Session — 15 Trainers ── */}
        <View style={[s.section, {backgroundColor: isDark ? "#040312" : "#FFFFFF", borderTopWidth:1, borderBottomWidth:1, borderColor:t.border, paddingVertical:20}]}>
          <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>Meet Your Personal Healers</Text>
          <Text style={[s.sectionSub, {color:t.textMuted, marginBottom:14}]}>Hand-picked masters — each session is 1-on-1, deeply personal</Text>

          {/* Horizontal FlatList virtualizes off-screen trainer cards — only ~4 rendered at a time */}
          <FlatList
            horizontal
            data={displayTrainers}
            showsHorizontalScrollIndicator={false}
            keyExtractor={tr => tr.name}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item: tr }) => {
              const api      = tr._api as ApiTrainer | null;
              const color    = (api?.trainerColor || tr.color) || "#0c2461";
              const isOnline = api?.isOnline ?? false;
              const verified = api?.isVerifiedBadge ?? false;
              const priceRs  = (api?.sessionPricePaise ?? 0) > 0 ? Math.round((api!.sessionPricePaise) / 100) : 0;
              const badge    = isOnline ? "ONLINE" : verified ? "VERIFIED" : tr.badge;
              const badgeColor = isOnline ? "#22c55e" : verified ? "#3b82f6" : badge==="POPULAR" ? "#f59e0b" : badge==="MASTER TRAINER" ? "#0c2461" : badge==="SPECIALIST" ? "#16a34a" : "#0ea5e9";
              const rating   = api?.rating ?? tr.rating;
              const exp      = api?.experience || tr.exp;
              const sessions = api?.sessionsDisplay || tr.sessions;
              const subject  = api?.specialties?.[0] || tr.subjects[0] || "";
              const initials = trainerInitials(tr.name);
              return (
                <TouchableOpacity activeOpacity={0.85}
                  onPress={() => router.push("/(tabs)/consultation" as any)}
                  style={s.trainerCard}>
                  {LOCAL_IMGS_HOME[tr.name.toLowerCase()]
                    ? <Image source={LOCAL_IMGS_HOME[tr.name.toLowerCase()]} style={StyleSheet.absoluteFillObject} contentFit="cover" />
                    : <View style={[StyleSheet.absoluteFillObject, {backgroundColor:color||"#0c2461", alignItems:"center", justifyContent:"center"}]}>
                        <Text style={{color:"rgba(255,255,255,0.13)", fontSize:72, fontWeight:"900"}}>{initials}</Text>
                      </View>
                  }
                  {api?.avatar ? <Image source={{uri: api.avatar}} style={StyleSheet.absoluteFillObject} contentFit="cover" cachePolicy="memory" /> : null}
                  {/* Each card is its own <Svg> document — "trGrad" ID is scoped per-Svg, no conflicts */}
                  <View pointerEvents="none" style={{position:"absolute", bottom:0, left:0, width:152, height:148}}>
                    <Svg width={152} height={148} viewBox="0 0 152 148" preserveAspectRatio="none">
                      <Defs>
                        <SvgGradient id="trGrad" x1="0" y1="0" x2="0" y2="1">
                          <Stop offset="0" stopColor="#04030e" stopOpacity="0" />
                          <Stop offset="0.35" stopColor="#04030e" stopOpacity="0.65" />
                          <Stop offset="1" stopColor="#04030e" stopOpacity="0.97" />
                        </SvgGradient>
                      </Defs>
                      <SvgRect x="0" y="0" width="152" height="148" fill="url(#trGrad)" />
                    </Svg>
                  </View>
                  {isOnline
                    ? <View style={{position:"absolute",top:8,left:8,flexDirection:"row",alignItems:"center",gap:4,backgroundColor:"rgba(34,197,94,0.22)",borderRadius:10,paddingHorizontal:7,paddingVertical:3}}>
                        <View style={{width:5,height:5,borderRadius:3,backgroundColor:"#22c55e"}} />
                        <Text style={{color:"#22c55e",fontSize:8,fontWeight:"800"}}>LIVE</Text>
                      </View>
                    : <View style={{position:"absolute",top:8,left:8,backgroundColor:badgeColor,borderRadius:7,paddingHorizontal:6,paddingVertical:2}}>
                        <Text style={{color:"#fff",fontSize:7,fontWeight:"800"}}>{badge}</Text>
                      </View>
                  }
                  <View style={{position:"absolute",top:8,right:8,backgroundColor:"rgba(0,0,0,0.52)",borderRadius:7,paddingHorizontal:5,paddingVertical:2}}>
                    <Text style={{color:"#fff",fontSize:8,fontWeight:"700"}}>⭐ {rating||"—"}</Text>
                  </View>
                  <View style={{position:"absolute",bottom:0,left:0,right:0,padding:10}}>
                    <Text style={{color:"#fff",fontSize:12,fontWeight:"800",marginBottom:2}} numberOfLines={1}>{tr.name}</Text>
                    {subject ? <Text style={{color:"rgba(255,255,255,0.70)",fontSize:9,lineHeight:13,marginBottom:4}} numberOfLines={2}>{subject}</Text> : null}
                    <View style={{flexDirection:"row",alignItems:"center",gap:4,marginBottom:4}}>
                      <Text style={{color:"rgba(255,255,255,0.55)",fontSize:8}}>{exp||"—"}</Text>
                      <Text style={{color:"rgba(255,255,255,0.3)",fontSize:8}}>·</Text>
                      <Text style={{color:"rgba(255,255,255,0.55)",fontSize:8}}>{sessions||"—"}</Text>
                    </View>
                    {priceRs > 0 && (
                      <Text style={{color:"#fbbf24",fontSize:9,fontWeight:"700",marginBottom:4}}>₹{priceRs}/min</Text>
                    )}
                    <TouchableOpacity
                      style={{backgroundColor:"rgba(255,255,255,0.16)",borderRadius:8,paddingVertical:5,alignItems:"center",borderWidth:1,borderColor:"rgba(255,255,255,0.28)"}}
                      onPress={() => router.push("/(tabs)/consultation" as any)}>
                      <Text style={{color:"#fff",fontSize:10,fontWeight:"700"}}>Book Now →</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
          />

        </View>

        {/* ── Daily Healing Tools ── */}
        <View style={[s.section, {paddingBottom:20}]}>
          <View style={s.healHeader}>
            <View style={[s.healIcon, {backgroundColor:"#0c2461"}]}>
              <Ionicons name="flash" size={22} color="#fff" />
            </View>
            <View style={{flex:1,minWidth:0}}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>Daily Healing Tools</Text>
                <View style={{backgroundColor:"#0c2461",borderRadius:4,paddingHorizontal:6,paddingVertical:2}}>
                  <Text style={{color:"#fff",fontSize:8,fontWeight:"800"}}>BSH</Text>
                </View>
              </View>
              <Text style={[s.healSub, {color:t.textMuted}]}>
                {hasHealingAccess ? "All 20 tools unlocked ✓" : "4 tools forever free · Unlock all 20 for just ₹99"}
              </Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:14}}>
            {[{label:"4 Free Tools",color:"#22c55e"},{label:"20K+ Daily Users",color:"#60a5fa"},{label:"Clinically Backed",color:"#60a5fa"},{label:"No App Required",color:"#f59e0b"}].map(p=>(
              <View key={p.label} style={[s.statPill, {borderColor:p.color+"44", backgroundColor:t.statPill}]}>
                <Text style={[s.statPillTxt, {color:p.color}]}>{p.label}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:16}}>
            {HEAL_CATS.map(cat=>{
              const active = cat===healCat;
              return (
                <TouchableOpacity key={cat} onPress={()=>setHealCat(cat)}
                  style={[s.healCatTab, active && s.healCatTabActive,
                    {borderColor: active ? "#0c2461" : t.border, backgroundColor: active ? "rgba(30,58,138,0.15)" : t.surface}]}>
                  <View style={{flexDirection:"row",alignItems:"center",gap:5}}>
                    <Ionicons name={HEAL_CAT_ICONS[cat]} size={13} color={active ? "#93c5fd" : t.textMuted} />
                    <Text style={[s.healCatTxt, {color: active ? "#93c5fd" : t.textMuted}]}>{cat}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* FlatList renders only visible healing tool cards instead of all 20 at once */}
          <FlatList
            horizontal
            data={healFiltered}
            keyExtractor={tool => String(tool.id)}
            showsHorizontalScrollIndicator={false}
            style={{marginBottom:16}}
            initialNumToRender={4}
            maxToRenderPerBatch={4}
            windowSize={5}
            removeClippedSubviews
            renderItem={({ item: tool }) => (
              <TouchableOpacity onPress={() => handleHealTap(tool)} activeOpacity={0.85} style={s.healCard}>
                <View style={[s.healCardTop, {backgroundColor:tool.g1}]}>
                  <View style={s.healGradientOverlay} />
                  <MaterialCommunityIcons name={tool.icon as any} size={42} color="#fff" />
                  <View style={s.healTypeBadge}><Text style={s.healTypeTxt}>{tool.type}</Text></View>
                  {tool.free
                    ? <View style={s.healFreeBadge}><Text style={s.healFreeTxt}>✓ FREE</Text></View>
                    : hasHealingAccess
                      ? <View style={[s.healFreeBadge,{backgroundColor:"#22c55e33"}]}><Text style={[s.healFreeTxt,{color:"#22c55e"}]}>✓ UNLOCKED</Text></View>
                      : <View style={s.healLockedBadge}><Text style={s.healLockedTxt}>🔒 ₹99</Text></View>}
                </View>
                <View style={[s.healCardBody, {backgroundColor:t.card, borderColor:t.border}]}>
                  <Text style={[s.healCardTitle, {color:t.text}]} numberOfLines={1}>{tool.title}</Text>
                  <Text style={[s.healCardDesc, {color:t.textMuted}]} numberOfLines={2}>{tool.desc}</Text>
                  <View style={s.healCardFoot}>
                    <View style={{flexDirection:"row",alignItems:"center",gap:3}}>
                      <Ionicons name="time-outline" size={10} color={tool.g1} />
                      <Text style={{color:tool.g1,fontSize:10}}>{tool.duration}</Text>
                    </View>
                    {tool.free || hasHealingAccess
                      ? <View style={[s.healCtaFree, {backgroundColor:tool.g1+"30"}]}>
                          <Text style={[s.healCtaFreeTxt, {color:tool.g1}]}>{tool.interactive?"Start →":"Listen →"}</Text>
                        </View>
                      : <TouchableOpacity style={s.healCtaLock} onPress={handleUnlockHealingTools}>
                          <Text style={s.healCtaLockTxt}>Unlock ₹99</Text>
                        </TouchableOpacity>}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity style={[s.healUpgradeRow, {backgroundColor:t.surface2, borderColor:t.border}]}
            onPress={hasHealingAccess ? undefined : handleUnlockHealingTools} activeOpacity={hasHealingAccess ? 1 : 0.85}>
            <Ionicons name={hasHealingAccess ? "checkmark-circle" : "lock-closed"} size={14}
              color={hasHealingAccess ? "#22c55e" : "#93c5fd"} style={{marginRight:8}} />
            <Text style={[s.healUpgradeTxt, {flex:1, color:t.textSec}]}>
              {hasHealingAccess ? "All 20 Healing Tools Unlocked ✓" : "Unlock all 20 premium tools — just ₹99 one-time"}
            </Text>
            {!hasHealingAccess && <Ionicons name="chevron-forward" size={16} color="#60a5fa" />}
          </TouchableOpacity>
        </View>

        {/* ── Watch Free Live Classes ── */}
        <View style={[s.section, {backgroundColor: isDark ? "#071528" : "#f8faff", borderTopWidth:1, borderBottomWidth:1, borderColor:t.border, paddingVertical:20}]}>
          <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>Watch Free Live Classes</Text>
          <View style={{flexDirection:"row",gap:8,marginTop:10,marginBottom:16}}>
            {[
              { icon:"chatbubble-ellipses" as IoniconName, color:"#0c2461", label:"Live Chat" },
              { icon:"help-circle"         as IoniconName, color:"#1e3a8a", label:"Q&A" },
              { icon:"checkmark-circle"    as IoniconName, color:"#0c2461", label:"Doubt Clear" },
            ].map(f=>(
              <View key={f.label} style={{flex:1, alignItems:"center", backgroundColor: isDark?"#0f2557":"#eff6ff", borderRadius:12, paddingVertical:10, gap:6, borderWidth:1, borderColor:t.border}}>
                <Ionicons name={f.icon} size={20} color={f.color} />
                <Text style={{color:t.text, fontSize:11, fontWeight:"700"}}>{f.label}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[s.bigCta, {backgroundColor:"#0c2461"}]}
            onPress={()=>router.push("/(tabs)/live")}>
            <Ionicons name="play-circle" size={20} color="#fff" style={{marginRight:8}} />
            <Text style={s.bigCtaTxt}>Watch free classes now</Text>
          </TouchableOpacity>
        </View>

        {/* ── Platform Features ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>Why 50K+ Students Love BSH</Text>
          <View style={{flexDirection:"row", gap:8, marginTop:4}}>
            {[
              { icon:"videocam"        as IoniconName, iconColor:"#0c2461", bg: isDark?"#0f2557":"#eff6ff", title:"Live Classes",    desc:"Daily live sessions with Q&A" },
              { icon:"library-outline" as IoniconName, iconColor:"#0c2461", bg: isDark?"#0f2557":"#f0f6ff", title:"Practice",        desc:"Notes, recordings & revision" },
              { icon:"cloud-done"      as IoniconName, iconColor:"#1e3a8a", bg: isDark?"#0f2557":"#dbeafe", title:"Learn Anywhere",  desc:"All devices, anytime access" },
            ].map(f=>(
              <View key={f.title} style={{flex:1, backgroundColor:f.bg, borderRadius:14, padding:12, borderWidth:1, borderColor:t.border, alignItems:"flex-start"}}>
                <View style={{width:36, height:36, borderRadius:10, backgroundColor:f.iconColor+"22", alignItems:"center", justifyContent:"center", marginBottom:8}}>
                  <Ionicons name={f.icon} size={18} color={f.iconColor} />
                </View>
                <Text style={{color:t.text, fontSize:12, fontWeight:"800", marginBottom:4, lineHeight:16}}>{f.title}</Text>
                <Text style={{color:t.textMuted, fontSize:11, lineHeight:15}}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Popular Batches (dynamic from admin courses) ── */}
        <View style={[s.section, {marginTop:8}]}>
          <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <View>
              <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>Popular Batches</Text>
              <Text style={[s.sectionSub, {color:t.textMuted}]}>
                {apiBatches.length > 0 ? "Live from admin · Razorpay enabled" : "Hand-picked by our educators"}
              </Text>
            </View>
            <TouchableOpacity onPress={()=>router.push("/(tabs)/explore")}>
              <Text style={{color:"#0c2461",fontSize:13,fontWeight:"700"}}>View all →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingBottom:4, paddingRight:4}}>
            {displayBatches.map(batch=>{
              const active = batch.isActive !== false;
              return (
              <View key={batch.id} style={{width:264, borderRadius:16, overflow:"hidden", borderWidth:1,
                marginRight:14, backgroundColor:t.card, borderColor: active ? t.border : "#111128"}}>
                <View style={{height:140, position:"relative"}}>
                  {batch.thumbUrl
                    ? <Image source={{uri:batch.thumbUrl}} style={[s.batchImg, !active && {opacity:0.4}]} contentFit="cover" cachePolicy="disk" />
                    : <Image source={batch.img} style={[s.batchImg, !active && {opacity:0.4}]} contentFit="cover" />}
                  <View style={s.batchImgDim} />
                  {!active && (
                    <View style={s.batchComingSoonOverlay}>
                      <View style={s.batchComingSoonPill}>
                        <Ionicons name="lock-closed" size={11} color="#94a3b8" />
                        <Text style={s.batchComingSoonPillTxt}>COMING SOON</Text>
                      </View>
                    </View>
                  )}
                  {active && (batch.status as string)==="ongoing" && (
                    <View style={s.ongoingBadge}>
                      <View style={s.redDot} />
                      <Text style={s.ongoingTxt}>Live</Text>
                    </View>
                  )}
                  {active && batch._course && (
                    <View style={{position:"absolute",top:10,right:10,backgroundColor:"rgba(30,58,138,0.9)",borderRadius:8,paddingHorizontal:8,paddingVertical:4}}>
                      <Text style={{color:"#fff",fontSize:9,fontWeight:"800"}}>ADMIN MANAGED</Text>
                    </View>
                  )}
                </View>
                <View style={[s.batchBody, !active && {opacity:0.5}]}>
                  <View style={{flexDirection:"row",flexWrap:"wrap",gap:6,marginBottom:8}}>
                    {batch.tags.map(tag=>(
                      <View key={tag} style={[s.tag, {backgroundColor:t.surface2, borderColor:t.border}]}>
                        <Text style={[s.tagTxt, {color:t.textMuted}]}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[s.batchTitle, {color:t.text}]} numberOfLines={2}>{batch.title}</Text>
                  <Text style={[s.batchEducator, {color:t.textMuted}]}>by {batch.educator}</Text>
                  <Text style={[s.batchStatus, {color:"#0c2461"}]}>{batch.startLabel}</Text>
                  <View style={[s.batchDivider, {backgroundColor:t.border}]} />
                  <View style={{flexDirection:"row",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                    <Text style={[s.batchPrice, {color:t.text}]}>{batch.price}</Text>
                    {batch.originalPrice ? <Text style={[s.originalPrice, {color:t.textMuted}]}>{batch.originalPrice}</Text> : null}
                    {batch.saving ? (
                      <View style={{backgroundColor:"#22c55e22",borderRadius:6,paddingHorizontal:6,paddingVertical:2}}>
                        <Text style={{color:"#22c55e",fontSize:10,fontWeight:"700"}}>SAVE {batch.saving}</Text>
                      </View>
                    ) : null}
                  </View>
                  {active ? (
                    <>
                      <View style={{flexDirection:"row",gap:8}}>
                        <TouchableOpacity style={[s.buyBtn, {backgroundColor:"#0c2461"}]}
                          onPress={()=>{
                            const slug = batch.category==="Advance Hypnosis"?"advance-hypnosis":batch.category==="Hypnosis 2.0"?"hypnosis-2":null;
                            if (slug) router.push(`/program/${slug}` as any);
                            else if (batch._course) setBatchModal(batch._course);
                            else router.push({ pathname:"/(tabs)/explore", params:{ category:batch.category } });
                          }}>
                          <Text style={s.buyBtnTxt}>Enroll Now</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.detailBtn, {borderColor:t.border}]}
                          onPress={()=>{
                            const slug = batch.category==="Advance Hypnosis"?"advance-hypnosis":batch.category==="Hypnosis 2.0"?"hypnosis-2":null;
                            if (slug) router.push(`/program/${slug}` as any);
                            else if (batch._course) setBatchModal(batch._course);
                            else router.push({ pathname:"/(tabs)/explore", params:{ category:batch.category } });
                          }}>
                          <Text style={[s.detailBtnTxt, {color:t.text}]}>View Details</Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity style={{marginTop:10}} onPress={()=>setBookModal("freeCall")}>
                        <Text style={{color:t.textMuted,fontSize:11}}>Questions? <Text style={{color:"#0c2461",fontWeight:"700"}}>📞 Talk to counsellor</Text></Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <View style={s.batchComingSoonBtn}>
                      <Text style={s.batchComingSoonBtnTxt}>Coming Soon</Text>
                    </View>
                  )}
                </View>
              </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Stats Strip ── */}
        <View style={[s.statsRow, {backgroundColor:t.surface, borderTopWidth:1, borderBottomWidth:1, borderColor:t.border}]}>
          {[{value:"20+",label:"Subjects"},{value:"50K+",label:"Students"},{value:"500+",label:"Live Classes"},{value:"1M+",label:"Mins Watched"}].map(stat=>(
            <View key={stat.label} style={s.statItem}>
              <Text style={[s.statValue, {color:"#0c2461"}]}>{stat.value}</Text>
              <Text style={[s.statLabel, {color:t.textMuted}]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── India's Top Educators ── */}
        <View style={[s.section, {backgroundColor:t.surface2, borderTopWidth:1, borderBottomWidth:1, borderColor:t.border, paddingVertical:20}]}>
          <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>India's Top Educators</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:10}}>
            {[{icon:"⭐",txt:"Proven history of results"},{icon:"🔒",txt:"Mentored 1000s of practitioners"},{icon:"⚡",txt:"Unique style of teaching"}].map(p=>(
              <View key={p.txt} style={[s.statPill, {borderColor:t.border,backgroundColor:t.surface, marginRight:8}]}>
                <Text style={{color:t.textSec,fontSize:11}}>{p.icon} {p.txt}</Text>
              </View>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingBottom:4, paddingRight:4}}>
            {EDUCATORS.map((e,idx)=>(
              <View key={idx} style={{width:192, borderRadius:16, overflow:"hidden", borderWidth:1,
                backgroundColor:t.card, borderColor:t.border, marginRight:12}}>
                <View style={{height:156, backgroundColor: e.imgBg || t.surface2}}>
                  <Image source={e.img} style={{width:"100%",height:"100%"}} contentFit={e.resizeMode} />
                  <View style={{position:"absolute",bottom:0,left:0,right:0,
                    backgroundColor:"#0c2461",alignItems:"center",paddingVertical:5}}>
                    <Text style={{color:"#fff",fontSize:9,fontWeight:"700"}}>⭐ {e.badge}</Text>
                  </View>
                </View>
                <View style={{padding:12}}>
                  <Text style={{color:t.text,fontSize:14,fontWeight:"800",marginBottom:2}} numberOfLines={1}>{e.name}</Text>
                  <Text style={{color:"#0c2461",fontSize:11,fontWeight:"600",marginBottom:6}} numberOfLines={1}>{e.subject}</Text>
                  {e.slug && (
                    <View style={{flexDirection:"row",gap:12,marginBottom:8}}>
                      <View><Text style={{color:t.text,fontSize:12,fontWeight:"800"}}>{e.watchMins}</Text><Text style={{color:t.textMuted,fontSize:10}}>Watch Mins</Text></View>
                      <View><Text style={{color:t.text,fontSize:12,fontWeight:"800"}}>{e.followers}</Text><Text style={{color:t.textMuted,fontSize:10}}>Followers</Text></View>
                    </View>
                  )}
                  <TouchableOpacity style={{marginTop:2}} onPress={()=>{
                    if (e.slug) router.push(`/educator/${e.slug}` as any);
                    else router.push("/(tabs)/consultation" as any);
                  }}>
                    <Text style={{color:"#0c2461",fontSize:12,fontWeight:"700"}}>{e.slug ? "View Profile →" : "View Profiles →"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ── Testimonials ── */}
        <View style={[s.section, {backgroundColor:t.surface2, borderTopWidth:1, borderBottomWidth:1, borderColor:t.border, paddingVertical:20}]}>
          <Text style={[s.sectionTitle, {color:t.text}]} numberOfLines={1}>What Our Students Say</Text>
          <Text style={[s.sectionSub, {color:t.textMuted, marginBottom:14}]}>Real experiences from our learners</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{paddingBottom:4, paddingRight:4}}>
            {TESTIMONIALS.map(tm=>(
              <View key={tm.name} style={{width:264, borderRadius:16, padding:16, borderWidth:1,
                marginRight:12, backgroundColor:t.card, borderColor:t.border}}>
                <Text style={{color:"#f59e0b",fontSize:14,marginBottom:8,letterSpacing:1}}>★★★★★</Text>
                <Text style={[s.testimonialText, {color:t.textSec}]} numberOfLines={5}>"{tm.text}"</Text>
                <View style={{flexDirection:"row",alignItems:"center",gap:10,marginTop:14}}>
                  <View style={[s.testimonialAvatar, {backgroundColor:tm.color}]}>
                    <Text style={{color:"#fff",fontWeight:"800",fontSize:14}}>{tm.init}</Text>
                  </View>
                  <View style={{flex:1}}>
                    <Text style={[s.testimonialName, {color:t.text}]} numberOfLines={1}>{tm.name}</Text>
                    <Text style={{color:t.textMuted,fontSize:11}}>{tm.subject}</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>


        {/* ── Social Links ── */}
        <View style={{alignItems:"center", paddingVertical:10, paddingHorizontal:16}}>
          <Text style={{color:t.textMuted, fontSize:11, marginBottom:8, letterSpacing:0.5}}>Follow BSH</Text>
          <View style={{flexDirection:"row", justifyContent:"center", gap:6}}>
            {[
              { icon:"logo-youtube"    as IoniconName, color:"#ff0000", url:"https://www.youtube.com/@drpradeepkumar3912" },
              { icon:"logo-instagram"  as IoniconName, color:"#e1306c", url:"https://www.instagram.com/drpradeepkumarofficial/" },
              { icon:"logo-facebook"   as IoniconName, color:"#1877f2", url:"https://www.facebook.com/drpradeepkumar" },
              { icon:"globe-outline"   as IoniconName, color:"#0c2461", url:"https://blessingsschoolofhypnosis.com" },
              { icon:"logo-linkedin"   as IoniconName, color:"#0a66c2", url:"https://www.linkedin.com/in/drpradeepkumar3912" },
              { icon:"logo-twitter"    as IoniconName, color:"#1da1f2", url:"https://x.com/pradeep23923" },
            ].map(soc=>(
              <TouchableOpacity key={soc.url} onPress={()=>Linking.openURL(soc.url).catch(()=>{})}
                style={{width:34, height:34, borderRadius:17, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:soc.color+"44"}}>
                <Ionicons name={soc.icon} size={16} color={soc.color} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* ── Program Purchase Modal ── */}
      <Modal visible={progModal!==null} transparent animationType="slide" onRequestClose={()=>setProgModal(null)}>
        <View style={{flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"}}>
          <View style={{backgroundColor:isDark?"#071223":"#fff",borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"85%"}}>
            {/* Header */}
            <View style={{backgroundColor:"#0c2461",borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:18}}>
              <TouchableOpacity style={{position:"absolute",top:14,right:16,zIndex:5}}
                onPress={()=>setProgModal(null)}>
                <Text style={{color:"rgba(255,255,255,0.7)",fontSize:20}}>✕</Text>
              </TouchableOpacity>
              {progModal?.thumbnail
                ? <Image source={{uri:progModal.thumbnail}} style={{width:"100%",height:120,borderRadius:12,marginBottom:14}} contentFit="cover" cachePolicy="disk" />
                : <Image source={PROG_IMG[progModal?.programId||""] || advHypnosisImg}
                    style={{width:"100%",height:120,borderRadius:12,marginBottom:14}} contentFit="cover" />}
              <View style={{backgroundColor:"rgba(255,255,255,0.2)",alignSelf:"flex-start",borderRadius:8,paddingHorizontal:10,paddingVertical:4,marginBottom:8}}>
                <Text style={{color:"#fff",fontSize:10,fontWeight:"800"}}>✦ {progModal?.programType || "FULL PROGRAM"}</Text>
              </View>
              <Text style={{color:"#fff",fontSize:20,fontWeight:"900"}}>{progModal?.title}</Text>
              {progModal?.level && <Text style={{color:"rgba(255,255,255,0.7)",fontSize:12,marginTop:4}}>{progModal.level} · {progModal.duration || "Self-paced"}</Text>}
            </View>
            <ScrollView style={{padding:20}} showsVerticalScrollIndicator={false}>
              {progModal?.description && (
                <Text style={{color:t.textMuted,fontSize:13,lineHeight:20,marginBottom:16}}>{progModal.description}</Text>
              )}
              {(progModal?.features?.length ?? 0) > 0 && (
                <View style={{marginBottom:16}}>
                  <Text style={{color:t.text,fontSize:14,fontWeight:"800",marginBottom:10}}>What's included</Text>
                  {progModal!.features.map((f,i)=>(
                    <View key={i} style={{flexDirection:"row",alignItems:"flex-start",gap:8,marginBottom:6}}>
                      <Text style={{color:"#22c55e",fontSize:13}}>✓</Text>
                      <Text style={{color:t.textSec,fontSize:13,flex:1}}>{f}</Text>
                    </View>
                  ))}
                </View>
              )}
              {/* Price + CTA */}
              <View style={{backgroundColor:isDark?"#0f2557":"#ffffff",borderRadius:16,padding:16,marginBottom:16}}>
                <View style={{flexDirection:"row",alignItems:"center",gap:12,marginBottom:14}}>
                  {progModal && progModal.discountPrice > 0 && (
                    <Text style={{color:t.textMuted,fontSize:14,textDecorationLine:"line-through"}}>
                      {fmtINR(progModal.price)}
                    </Text>
                  )}
                  <Text style={{color:"#0c2461",fontSize:28,fontWeight:"900"}}>
                    {progModal ? fmtINR(progModal.discountPrice||progModal.price) : "₹0"}
                  </Text>
                  {progModal && progModal.discountPrice > 0 && (
                    <View style={{backgroundColor:"#22c55e22",borderRadius:6,paddingHorizontal:8,paddingVertical:3}}>
                      <Text style={{color:"#22c55e",fontSize:11,fontWeight:"700"}}>
                        SAVE {Math.round((1-progModal.discountPrice/progModal.price)*100)}%
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={{backgroundColor:"#0c2461",borderRadius:14,paddingVertical:14,alignItems:"center",
                    opacity:purchaseLoading?0.7:1}}
                  onPress={()=>progModal && handleBuyProgram(progModal)}
                  disabled={purchaseLoading}>
                  {purchaseLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{color:"#fff",fontSize:15,fontWeight:"900"}}>🔒 Enroll Now — Razorpay</Text>}
                </TouchableOpacity>
                <Text style={{color:t.textMuted,fontSize:11,textAlign:"center",marginTop:8}}>Secure payment via Razorpay · GHL synced</Text>
              </View>
              <TouchableOpacity style={{alignItems:"center",paddingBottom:20}} onPress={()=>setBookModal("freeCall")}>
                <Text style={{color:t.textMuted,fontSize:13}}>Have questions? <Text style={{color:"#0c2461",fontWeight:"700"}}>📞 Talk to counsellor</Text></Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Batch / Course Purchase Modal ── */}
      <Modal visible={batchModal!==null} transparent animationType="slide" onRequestClose={()=>setBatchModal(null)}>
        <View style={{flex:1,backgroundColor:"rgba(0,0,0,0.7)",justifyContent:"flex-end"}}>
          <View style={{backgroundColor:isDark?"#071223":"#fff",borderTopLeftRadius:24,borderTopRightRadius:24,maxHeight:"82%"}}>
            <View style={{backgroundColor:"#0c2461",borderTopLeftRadius:24,borderTopRightRadius:24,padding:22,paddingBottom:18}}>
              <TouchableOpacity style={{position:"absolute",top:14,right:16,zIndex:5}} onPress={()=>setBatchModal(null)}>
                <Text style={{color:"rgba(255,255,255,0.7)",fontSize:20}}>✕</Text>
              </TouchableOpacity>
              {batchModal?.thumbnail
                ? <Image source={{uri:batchModal.thumbnail}} style={{width:"100%",height:110,borderRadius:12,marginBottom:12}} contentFit="cover" cachePolicy="disk" />
                : <Image source={CAT_IMG[batchModal?.category||""] || advHypnosisImg}
                    style={{width:"100%",height:110,borderRadius:12,marginBottom:12}} contentFit="cover" />}
              <View style={{backgroundColor:"rgba(255,255,255,0.2)",alignSelf:"flex-start",borderRadius:8,paddingHorizontal:10,paddingVertical:4,marginBottom:8}}>
                <Text style={{color:"#fff",fontSize:10,fontWeight:"800"}}>✦ {batchModal?.category || "COURSE"}</Text>
              </View>
              <Text style={{color:"#fff",fontSize:19,fontWeight:"900"}} numberOfLines={2}>{batchModal?.title}</Text>
              <Text style={{color:"rgba(255,255,255,0.7)",fontSize:12,marginTop:4}}>
                by {batchModal?.educator?.name || "BSH Faculty"} · ⭐ {batchModal?.rating?.toFixed(1)||"New"} · {batchModal?.enrollmentCount||0} enrolled
              </Text>
            </View>
            <ScrollView style={{padding:20}} showsVerticalScrollIndicator={false}>
              <View style={{backgroundColor:isDark?"#0f2557":"#f0fdf4",borderRadius:16,padding:16,marginBottom:16}}>
                <View style={{flexDirection:"row",alignItems:"center",gap:12,marginBottom:14}}>
                  {batchModal && batchModal.discountPrice > 0 && (
                    <Text style={{color:t.textMuted,fontSize:14,textDecorationLine:"line-through"}}>
                      {fmtINR(batchModal.price)}
                    </Text>
                  )}
                  <Text style={{color:"#0c2461",fontSize:28,fontWeight:"900"}}>
                    {batchModal ? fmtINR(batchModal.discountPrice||batchModal.price) : "₹0"}
                  </Text>
                  {batchModal && batchModal.discountPrice > 0 && (
                    <View style={{backgroundColor:"#22c55e22",borderRadius:6,paddingHorizontal:8,paddingVertical:3}}>
                      <Text style={{color:"#22c55e",fontSize:11,fontWeight:"700"}}>
                        SAVE {Math.round((1-batchModal.discountPrice/batchModal.price)*100)}%
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={{backgroundColor:"#0c2461",borderRadius:14,paddingVertical:14,alignItems:"center",
                    opacity:purchaseLoading?0.7:1}}
                  onPress={()=>batchModal && handleBuyCourse(batchModal)}
                  disabled={purchaseLoading}>
                  {purchaseLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{color:"#fff",fontSize:15,fontWeight:"900"}}>🔒 Enroll Now — Razorpay</Text>}
                </TouchableOpacity>
                <Text style={{color:t.textMuted,fontSize:11,textAlign:"center",marginTop:8}}>Secure payment · Agora live · Mux recordings</Text>
              </View>
              <View style={{flexDirection:"row",gap:12,marginBottom:16}}>
                {[{icon:"📺",label:"Live classes via Agora"},{icon:"🎥",label:"Recordings on Mux"},{icon:"✅",label:"Certificate on completion"}].map(f=>(
                  <View key={f.label} style={{flex:1,alignItems:"center",backgroundColor:isDark?"#0f2557":"#f8fafc",borderRadius:12,padding:10}}>
                    <Text style={{fontSize:22,marginBottom:4}}>{f.icon}</Text>
                    <Text style={{color:t.textMuted,fontSize:10,textAlign:"center"}}>{f.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={{alignItems:"center",paddingBottom:20}} onPress={()=>{ setBatchModal(null); router.push({ pathname:"/(tabs)/explore", params:{ category:batchModal?.category||"" } }); }}>
                <Text style={{color:"#0c2461",fontSize:13,fontWeight:"700"}}>View full course details →</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Live Classes Menu Modal ── */}
      <Modal visible={liveMenuOpen} transparent animationType="slide" onRequestClose={()=>setLiveMenuOpen(false)}>
        <TouchableOpacity style={{flex:1,backgroundColor:"rgba(0,0,0,0.6)"}} activeOpacity={1} onPress={()=>setLiveMenuOpen(false)} />
        <View style={[{backgroundColor: isDark ? "#071223" : "#fff", borderTopLeftRadius:24, borderTopRightRadius:24, paddingBottom:40, position:"absolute", bottom:0, left:0, right:0}]}>
          {/* Handle bar */}
          <View style={{width:40,height:4,borderRadius:2,backgroundColor:t.border,alignSelf:"center",marginTop:12,marginBottom:16}} />
          <Text style={{color:t.text,fontSize:18,fontWeight:"900",paddingHorizontal:22,marginBottom:4}}>Live Classes</Text>
          <Text style={{color:t.textMuted,fontSize:13,paddingHorizontal:22,marginBottom:20}}>Choose what you want to join</Text>

          {[
            { icon:"people-outline" as IoniconName, label:"1:1 Sessions", desc:"Your booked private sessions with healers", color:"#0c2461", tab:"oneOnOne" },
            { icon:"school-outline" as IoniconName, label:"Course Live",  desc:"Live classes for courses you enrolled in",  color:"#0c2461", tab:"courseLive" },
            { icon:"globe-outline"  as IoniconName, label:"Free for All", desc:"Free live classes open to everyone",          color:"#d97706", tab:"freeAll" },
          ].map(opt=>(
            <TouchableOpacity key={opt.tab}
              style={{flexDirection:"row",alignItems:"center",gap:16,paddingHorizontal:22,paddingVertical:16,borderTopWidth:1,borderTopColor:t.border}}
              onPress={()=>{
                setLiveMenuOpen(false);
                router.push({ pathname:"/(tabs)/live", params:{ tab:opt.tab } } as any);
              }}>
              <View style={{width:48,height:48,borderRadius:14,backgroundColor:opt.color+"22",alignItems:"center",justifyContent:"center"}}>
                <Ionicons name={opt.icon} size={24} color={opt.color} />
              </View>
              <View style={{flex:1}}>
                <Text style={{color:t.text,fontSize:15,fontWeight:"800",marginBottom:2}}>{opt.label}</Text>
                <Text style={{color:t.textMuted,fontSize:12}}>{opt.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={t.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* ── Booking Modal ── */}
      <Modal visible={bookModal!==null} transparent animationType="slide" onRequestClose={closeSessionModal}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, {backgroundColor: isDark ? "#071223" : "#fff", maxHeight:"92%",paddingTop:0,paddingHorizontal:0,paddingBottom:0}]}>
            <View style={[s.psModalHeader, {backgroundColor: isDark ? "#0f2557" : "#ffffff"}]}>
              <TouchableOpacity style={s.modalClose} onPress={closeSessionModal}>
                <Text style={{color:"#9ca3af",fontSize:18}}>✕</Text>
              </TouchableOpacity>
              <View style={s.psModalBadge}>
                <Text style={s.psModalBadgeTxt}>{bookModal==="freeCall" ? "✦ FREE CONSULTATION" : "✦ PRIVATE SESSION"}</Text>
              </View>
              <Text style={[s.psModalTitle, {color:t.text}]}>
                {bookModal==="freeCall" ? "Book Your Free Call" : "Book Your 1-on-1 Healing"}
              </Text>
              <Text style={[s.psModalSub, {color:t.textMuted}]}>
                {bookModal==="freeCall" ? "Speak directly with Dr. Pradeep Kumar — no cost" : "Our expert healer connects within 24 hours"}
              </Text>
            </View>

            <ScrollView style={{paddingHorizontal:22}} contentContainerStyle={{paddingBottom:28}} showsVerticalScrollIndicator={false}>
              {sStep==="loading" && (
                <View style={s.psLoadingWrap}>
                  <View style={s.psSpinner} />
                  <Text style={[s.psLoadingTxt, {color:t.textMuted}]}>Submitting your request…</Text>
                </View>
              )}
              {sStep==="success" && (
                <View style={{alignItems:"center",paddingVertical:32}}>
                  <View style={s.psSuccessCircle}><Text style={{fontSize:36}}>✓</Text></View>
                  <Text style={[s.psSuccessTitle, {color:t.text}]}>{bookModal==="freeCall" ? "Call Booked! 🎉" : "Request Sent! 🎉"}</Text>
                  <Text style={[s.psSuccessMsg, {color:t.textSec}]}>{"Thank you, "}<Text style={{color:"#60a5fa",fontWeight:"700"}}>{sName}</Text>{"!\n"}{bookModal==="freeCall" ? "Dr. Pradeep will call you at\n" : "Our healer will reach you at\n"}<Text style={{color:"#60a5fa",fontWeight:"700"}}>{bookModal==="freeCall" ? (sPhone||sEmail) : sEmail}</Text>{"\nwithin 24 hours."}</Text>
                  <TouchableOpacity style={s.psSuccessBtn} onPress={closeSessionModal}>
                    <Text style={s.psSuccessBtnTxt}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
              {sStep==="form" && (
                <View style={{gap:14,paddingTop:20}}>
                  {[
                    { label:"Full Name *", val:sName, set:setSName, placeholder:"Your full name", keyboard:"default" as const },
                    { label:"Email Address *", val:sEmail, set:setSEmail, placeholder:"you@example.com", keyboard:"email-address" as const },
                    { label:"Phone Number", val:sPhone, set:setSPhone, placeholder:"+91 XXXXX XXXXX", keyboard:"phone-pad" as const },
                    { label:"Date of Birth * (DD/MM/YYYY)", val:sDob, set:setSDob, placeholder:"e.g. 15/08/1990", keyboard:"default" as const },
                  ].map(f=>(
                    <View key={f.label}>
                      <Text style={[s.psFieldLabel, {color:t.textMuted}]}>{f.label}</Text>
                      <TextInput value={f.val} onChangeText={f.set} placeholder={f.placeholder}
                        placeholderTextColor={t.textMuted} keyboardType={f.keyboard}
                        autoCapitalize="none"
                        style={[s.psInput, {backgroundColor:t.inputBg, color:t.text, borderColor:t.border}]} />
                    </View>
                  ))}
                  <View>
                    <Text style={[s.psFieldLabel, {color:t.textMuted}]}>Your Concerns * (select all that apply)</Text>
                    <View style={{flexDirection:"row",flexWrap:"wrap",gap:8,marginTop:4}}>
                      {PS_ISSUE_TAGS.map(tag=>{
                        const sel = sIssues.includes(tag);
                        return (
                          <TouchableOpacity key={tag} onPress={()=>toggleSIssue(tag)}
                            style={[s.psTag, sel && s.psTagSel, {borderColor: sel ? "#0c2461" : t.border}]}>
                            <Text style={[s.psTagTxt, {color: sel ? "#93c5fd" : t.textMuted}]}>{tag}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  <View>
                    <Text style={[s.psFieldLabel, {color:t.textMuted}]}>Preferred Session Time</Text>
                    <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
                      {PS_TIME_SLOTS.map(slot=>(
                        <TouchableOpacity key={slot} onPress={()=>setSTimeSlot(slot)}
                          style={[s.psTag, sTimeSlot===slot && s.psTagSel, {borderColor: sTimeSlot===slot ? "#0c2461" : t.border}]}>
                          <Text style={[s.psTagTxt, {color: sTimeSlot===slot ? "#93c5fd" : t.textMuted}]}>{slot}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  <View>
                    <Text style={[s.psFieldLabel, {color:t.textMuted}]}>Describe Your Situation <Text style={{color:t.textMuted,fontWeight:"400"}}>(optional)</Text></Text>
                    <TextInput value={sDetail} onChangeText={setSDetail}
                      placeholder="Share what you're going through…" placeholderTextColor={t.textMuted}
                      multiline numberOfLines={4}
                      style={[s.psInput, {height:90,textAlignVertical:"top", backgroundColor:t.inputBg, color:t.text, borderColor:t.border}]} />
                  </View>
                  <View style={[s.psPrivacyRow, {backgroundColor:t.surface2, borderColor:t.border}]}>
                    <Text style={{fontSize:14}}>🔒</Text>
                    <Text style={[s.psPrivacyTxt, {color:t.textMuted}]}>Your details are 100% confidential and never shared outside BSH's healing team.</Text>
                  </View>
                  <TouchableOpacity style={s.psSubmitBtn} onPress={submitSession} activeOpacity={0.88}>
                    <Text style={s.psSubmitTxt}>{bookModal==="freeCall" ? "📞 Schedule My Free Call" : "✨ Book My Private Healing Session"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Healing Tool Player Modal ── */}
      <Modal visible={!!healPlayer} transparent animationType="fade" onRequestClose={() => setHealPlayer(null)}>
        {healPlayer ? (
          <View style={{ flex:1, backgroundColor:"rgba(4,2,14,0.97)" }}>
            {/* Ambient orbs */}
            <Animated.View pointerEvents="none" style={{
              position:"absolute", width:320, height:320, borderRadius:160,
              backgroundColor: healPlayer.g1 + "28",
              top: -60, right: -80,
              transform:[{ translateY: playerOrb1Y }],
            }} />
            <Animated.View pointerEvents="none" style={{
              position:"absolute", width:260, height:260, borderRadius:130,
              backgroundColor: healPlayer.g2 + "20",
              bottom: 80, left: -60,
              transform:[{ translateY: playerOrb2Y }],
            }} />

            {/* Close + type badge + play/pause */}
            <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 20, flexDirection:"row", justifyContent:"space-between", alignItems:"center" }}>
              <TouchableOpacity onPress={() => setHealPlayer(null)}
                style={{ width:38, height:38, borderRadius:19, backgroundColor:"rgba(255,255,255,0.08)", alignItems:"center", justifyContent:"center" }}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              <View style={{ paddingHorizontal:14, paddingVertical:6, borderRadius:20, backgroundColor: healPlayer.g1 + "40", borderWidth:1, borderColor: healPlayer.g1 + "60" }}>
                <Text style={{ color:"#fff", fontSize:11, fontWeight:"800", letterSpacing:1.5 }}>{healPlayer.type}</Text>
              </View>
              <TouchableOpacity onPress={() => setPlayerRunning(r => !r)}
                style={{ width:38, height:38, borderRadius:19, backgroundColor:"rgba(255,255,255,0.08)", alignItems:"center", justifyContent:"center" }}>
                <Ionicons name={playerRunning ? "pause" : "play"} size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Center: progress ring + icon */}
            <View style={{ flex:1, alignItems:"center", justifyContent:"center", marginTop: -20 }}>
              {/* Glow halo */}
              <Animated.View pointerEvents="none" style={{
                position:"absolute", width:220, height:220, borderRadius:110,
                backgroundColor: healPlayer.g1 + "18",
                transform:[{ scale: playerGlowAnim }],
              }} />

              {/* SVG progress ring */}
              <Svg width={210} height={210} style={{ position:"absolute" }}>
                <Circle cx={105} cy={105} r={PLAYER_CIRC_R} stroke="rgba(255,255,255,0.08)" strokeWidth={6} fill="none" />
                <Circle
                  cx={105} cy={105} r={PLAYER_CIRC_R}
                  stroke={healPlayer.g1}
                  strokeWidth={6}
                  fill="none"
                  strokeDasharray={`${PLAYER_CIRC_C}`}
                  strokeDashoffset={playerDashOff}
                  strokeLinecap="round"
                  rotation={-90}
                  origin="105,105"
                />
              </Svg>

              {/* Icon + timer */}
              <View style={{ alignItems:"center", justifyContent:"center" }}>
                <Animated.View style={{ transform:[{ scale: playerGlowAnim }] }}>
                  <Ionicons name={healPlayer.icon} size={54} color={healPlayer.g1} />
                </Animated.View>
                <Text style={{ color:"#fff", fontSize:20, fontWeight:"700", marginTop:14 }}>
                  {fmtPlayerTime(playerElapsed)}
                </Text>
                <Text style={{ color:"rgba(255,255,255,0.35)", fontSize:12, marginTop:2 }}>
                  / {healPlayer.duration}
                </Text>
              </View>
            </View>

            {/* Title + guidance text */}
            <View style={{ paddingHorizontal:32, paddingBottom:insets.bottom + 56, alignItems:"center" }}>
              <Text style={{ color:"#fff", fontSize:22, fontWeight:"800", textAlign:"center", marginBottom:16 }}>
                {healPlayer.title}
              </Text>

              {/* Phase guidance card */}
              <View style={{ backgroundColor:"rgba(255,255,255,0.05)", borderRadius:16, padding:20, borderWidth:1, borderColor: healPlayer.g1 + "30", width:"100%" }}>
                <View style={{ flexDirection:"row", alignItems:"center", marginBottom:8, gap:6 }}>
                  <Ionicons name="mic-outline" size={13} color={healPlayer.g1} />
                  <Text style={{ color: healPlayer.g1, fontSize:10, fontWeight:"700", letterSpacing:1.5, textTransform:"uppercase" }}>
                    Guidance
                  </Text>
                  <Text style={{ color:"rgba(255,255,255,0.25)", fontSize:10, flex:1, textAlign:"right" }}>
                    {currentPhaseIdx + 1}/{playerPhases.length}
                  </Text>
                </View>
                <Text style={{ color:"rgba(255,255,255,0.82)", fontSize:16, lineHeight:24, textAlign:"center", fontStyle:"italic" }}>
                  "{currentPhaseText}"
                </Text>
              </View>

              {/* Phase dots */}
              <View style={{ flexDirection:"row", gap:6, marginTop:16 }}>
                {playerPhases.map((_, i) => (
                  <View key={i} style={{
                    width: i === currentPhaseIdx ? 18 : 6,
                    height:6, borderRadius:3,
                    backgroundColor: i <= currentPhaseIdx ? healPlayer.g1 : "rgba(255,255,255,0.18)",
                  }} />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* ── Breathing Modal ── */}
      <Modal visible={breathModalOpen} transparent animationType="fade" onRequestClose={()=>setBreathModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, {backgroundColor: isDark ? "#071223" : "#fff"}]}>
            <TouchableOpacity style={s.modalClose} onPress={()=>setBreathModalOpen(false)}>
              <Text style={{color:"#9ca3af",fontSize:18}}>✕</Text>
            </TouchableOpacity>
            <Text style={[s.modalTitle, {color:t.text}]}>Box Breathing 🫁</Text>
            <Text style={[s.modalSub, {color:t.textMuted}]}>4-4-4-4 technique · Cycle {breathCycles+1}</Text>
            <View style={s.breathCircleWrap}>
              <View style={[s.breathGlowRing, {borderColor:BREATH_COLORS[breathPhase]}]} />
              <Animated.View style={[s.breathCircle, {
                backgroundColor:BREATH_COLORS[breathPhase]+"44", borderColor:BREATH_COLORS[breathPhase],
                transform:[{scale:breathAnimVal}], shadowColor:BREATH_COLORS[breathPhase],
              }]}>
                <View style={s.breathInner}>
                  <Text style={s.breathSecsNum}>{breathSecs}</Text>
                  <Text style={s.breathSecsSub}>sec</Text>
                </View>
              </Animated.View>
            </View>
            <Text style={[s.breathPhaseLabel, {color:BREATH_COLORS[breathPhase]}]}>{BREATH_LABELS[breathPhase]}</Text>
            <View style={s.breathDots}>
              {(["inhale","hold1","exhale","hold2"] as const).map((p,i)=>(
                <View key={p} style={{alignItems:"center"}}>
                  <View style={[s.breathDot, {backgroundColor:BREATH_COLORS[p], opacity:p===breathPhase?1:0.3}]} />
                  <Text style={s.breathDotLbl}>{["In","Hold","Out","Hold"][i]}</Text>
                </View>
              ))}
            </View>
            <View style={[s.modalTip, {backgroundColor:t.surface2}]}>
              <Text style={[s.modalTipTxt, {color:t.textMuted}]}>✨ Do this 3–5 min daily to reduce cortisol & activate relaxation.</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Pomodoro Modal ── */}
      <Modal visible={pomModalOpen} transparent animationType="fade" onRequestClose={()=>setPomModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, {backgroundColor: isDark ? "#071223" : "#fff"}]}>
            <TouchableOpacity style={s.modalClose} onPress={()=>{ setPomModalOpen(false); resetPomodoro(); }}>
              <Text style={{color:"#9ca3af",fontSize:18}}>✕</Text>
            </TouchableOpacity>
            <View style={[s.pomPhaseBadge, {borderColor:POM_COLORS[pomPhase]+"55",backgroundColor:POM_COLORS[pomPhase]+"18"}]}>
              <Text style={[s.pomPhaseTxt, {color:POM_COLORS[pomPhase]}]}>{POM_LABELS[pomPhase]}</Text>
            </View>
            <Text style={[s.modalTitle, {color:t.text}]}>Pomodoro Timer ⏱️</Text>
            <View style={s.pomTimerWrap}>
              <Text style={[s.pomTime, {color:t.text}]}>
                {String(Math.floor(pomSecs/60)).padStart(2,"0")}:{String(pomSecs%60).padStart(2,"0")}
              </Text>
              <Text style={{color:t.textMuted,fontSize:12,marginTop:4}}>Session {pomSession} of 4</Text>
            </View>
            <View style={s.pomBtnRow}>
              <TouchableOpacity style={[s.pomBtn, {backgroundColor:POM_COLORS[pomPhase]+"22"}]}
                onPress={()=>setPomRunning(r=>!r)}>
                <Ionicons name={pomRunning ? "pause" : "play"} size={22} color={POM_COLORS[pomPhase]} />
              </TouchableOpacity>
              <TouchableOpacity style={[s.pomBtn, {backgroundColor:t.surface2}]} onPress={resetPomodoro}>
                <Ionicons name="refresh" size={20} color={t.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={[s.modalTip, {backgroundColor:t.surface2}]}>
              <Text style={[s.modalTipTxt, {color:t.textMuted}]}>
                {pomPhase==="focus" ? "🧠 Stay focused — distractions can wait 25 minutes." : "☕ Step away from the screen. Rest your eyes and stretch."}
              </Text>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ── Styles Factory ────────────────────────────────────────────────────────────
function makeStyles(t: ReturnType<typeof import("../../stores/themeStore").useThemeStore.getState>["t"], isDark: boolean, topInset: number, HEADER_H: number) {
  return StyleSheet.create({
    root: { flex:1 },

    // ── Floating header — fully transparent over hero ────────────────────────
    headerWrapper: {
      paddingHorizontal:16, paddingBottom:10,
      position:"absolute", top:0, left:0, right:0, zIndex:100,
    },
    headerRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center", paddingTop:8 },
    headerLogo: { width:34, height:34, borderRadius:8 },
    brandName: { color:"#fff", fontSize:19, fontWeight:"900", letterSpacing:0.4,
      textShadowColor:"rgba(0,0,0,0.6)", textShadowOffset:{width:0,height:1}, textShadowRadius:4 },
    brandSub: { color:"rgba(255,255,255,0.75)", fontSize:10, fontWeight:"500" },
    headerActions: { flexDirection:"row", alignItems:"center", gap:10 },

    // Live pill — only button that keeps its background (it's a feature indicator)
    liveBtn: {
      flexDirection:"row", alignItems:"center", gap:5,
      backgroundColor:"rgba(220,38,38,0.22)", borderRadius:20,
      paddingHorizontal:11, paddingVertical:6,
      borderWidth:1.5, borderColor:"rgba(255,80,80,0.5)",
    },
    liveDot: { width:6, height:6, borderRadius:3, backgroundColor:"#ff4444",
      shadowColor:"#ff4444", shadowOpacity:1, shadowRadius:4 },
    liveTxt: { color:"#fff", fontSize:11, fontWeight:"900", letterSpacing:0.3,
      textShadowColor:"rgba(0,0,0,0.5)", textShadowOffset:{width:0,height:1}, textShadowRadius:3 },

    // Chat, theme, avatar — fully transparent, white icons with text shadow
    consultBtn: { padding:4, position:"relative" },
    consultTxt: { fontSize:20,
      textShadowColor:"rgba(0,0,0,0.7)", textShadowOffset:{width:0,height:1}, textShadowRadius:6 },
    themeBtn: { padding:4, alignItems:"center", justifyContent:"center" },
    avatar: { width:34, height:34, borderRadius:17, borderWidth:2, borderColor:"rgba(255,255,255,0.8)",
      shadowColor:"#000", shadowOpacity:0.4, shadowRadius:6 },
    avatarDefault: {
      width:34, height:34, borderRadius:17,
      backgroundColor:"rgba(30,58,138,0.55)", alignItems:"center", justifyContent:"center",
      borderWidth:2, borderColor:"rgba(255,255,255,0.7)",
      shadowColor:"#000", shadowOpacity:0.5, shadowRadius:6,
    },
    avatarInitial: { color:"#fff", fontWeight:"900", fontSize:14 },

    // ── Hero live-session carousel ──────────────────────────────────────────
    heroMuteBtn: {
      position:"absolute", bottom:52, right:24,
      width:40, height:40, borderRadius:20,
      backgroundColor:"rgba(0,0,0,0.52)",
      alignItems:"center", justifyContent:"center",
      borderWidth:1.5, borderColor:"rgba(255,255,255,0.32)",
      shadowColor:"#000", shadowOpacity:0.55, shadowRadius:10, shadowOffset:{width:0,height:3},
      elevation:10,
    },
    heroOverlay: { position:"absolute", bottom:0, left:0, right:0, paddingHorizontal:24, paddingBottom:52, alignItems:"center" },
    // Hero text — no background, centred, let image show through
    heroSuperTitle: {
      color:"rgba(255,255,255,0.6)", fontSize:9, fontWeight:"700",
      letterSpacing:2.5, marginBottom:6, textTransform:"uppercase", textAlign:"center",
      textShadowColor:"rgba(0,0,0,0.6)", textShadowOffset:{width:0,height:1}, textShadowRadius:4,
    },
    heroEducatorName: {
      color:"rgba(255,255,255,0.88)", fontSize:12, fontWeight:"700",
      letterSpacing:2, marginBottom:8, textTransform:"uppercase", textAlign:"center",
      textShadowColor:"rgba(0,0,0,0.6)", textShadowOffset:{width:0,height:1}, textShadowRadius:4,
    },
    heroSessionTitle: {
      color:"#fff", fontSize:22, fontWeight:"800", lineHeight:29, marginBottom:14,
      textAlign:"center",
      textShadowColor:"rgba(0,0,0,0.55)", textShadowOffset:{width:0,height:2}, textShadowRadius:10,
    },
    heroCountdownBadge: {
      alignSelf:"center", borderRadius:24,
      paddingHorizontal:18, paddingVertical:8, marginBottom:14,
    },
    heroCountdownTxt: { color:"#fff", fontSize:12, fontWeight:"900", letterSpacing:1 },
    heroAttendeeRow: { flexDirection:"row", alignItems:"center", height:26, justifyContent:"center" },
    heroAvatarThumb: { position:"absolute", width:24, height:24, borderRadius:12, borderWidth:2, borderColor:"rgba(0,0,0,0.5)", alignItems:"center", justifyContent:"center" },
    heroAttendeeTxt: { color:"rgba(255,255,255,0.8)", fontSize:12, fontWeight:"600" },
    heroDotsRow: { position:"absolute", bottom:20, left:0, right:0, flexDirection:"row", justifyContent:"center", gap:6 },
    heroDot: { width:20, height:3, borderRadius:2, backgroundColor:"rgba(255,255,255,0.3)" },
    heroDotActive: { width:34, height:3, borderRadius:2, backgroundColor:"#fff" },

    // ── "Spiritual Guidance For Every Need" 2×3 photo goal grid ─────────────
    healNeedGrid: { flexDirection:"row", flexWrap:"wrap", paddingHorizontal:10, gap:6, marginTop:14 },
    healNeedTile: { width:(SW-32)/3, aspectRatio:0.85, borderRadius:12, overflow:"hidden", position:"relative", alignItems:"center", justifyContent:"flex-end", paddingBottom:10 },
    healNeedLabel: { color:"#fff", fontSize:10, fontWeight:"900", letterSpacing:0.8, textAlign:"center", lineHeight:14 },

    // ── "Starting Soon" portrait session cards ─────────────────────────────
    startSoonCard: { width:160, height:220, borderRadius:14, overflow:"hidden", position:"relative" },
    startSoonBadge: { position:"absolute", top:10, left:10, borderRadius:20, paddingHorizontal:10, paddingVertical:4, zIndex:2 },
    startSoonBadgeTxt: { color:"#fff", fontSize:9, fontWeight:"900" },
    startSoonInfo: { position:"absolute", bottom:0, left:0, right:0, padding:10 },
    startSoonTitle: { color:"#fff", fontSize:12, fontWeight:"800", lineHeight:16, marginBottom:3 },
    startSoonEdu: { color:"rgba(255,255,255,0.75)", fontSize:10, fontWeight:"600" },
    startSoonDate: { color:"rgba(255,255,255,0.6)", fontSize:9, marginTop:2 },

    // ── Spiritual Tools cards ─────────────────────────────────────────────────
    spiritCard: { width:130, height:175, borderRadius:20, marginRight:12, overflow:"hidden" },

    // ── "Get 1:1 Expert Guidance Today" 2×3 icon grid ───────────────────────
    guidance1on1Grid: { flexDirection:"row", flexWrap:"wrap", paddingHorizontal:10, gap:8, marginTop:14 },
    guidanceTile: { width:(SW-36)/3, aspectRatio:1, borderRadius:12, overflow:"hidden", position:"relative", alignItems:"center", justifyContent:"flex-end", paddingBottom:10 },
    guidanceTileLabel: { color:"#fff", fontSize:9, fontWeight:"900", letterSpacing:0.8, textAlign:"center", lineHeight:13 },

    // Banners
    bannerCard: { flex:1, overflow:"hidden" },
    bannerEducatorImg: { position:"absolute", right:0, bottom:0, width:SW*0.52, height:280 },
    bannerGradientMask: { position:"absolute", left:0, top:0, bottom:0, width:"65%", backgroundColor:"transparent" },
    bannerBody: { padding:18, paddingTop:22, width:SW*0.62, justifyContent:"center" },
    bannerBadge: { alignSelf:"flex-start", backgroundColor:"rgba(255,255,255,0.18)", borderRadius:20, paddingHorizontal:12, paddingVertical:4, marginBottom:10, borderWidth:1, borderColor:"rgba(255,255,255,0.28)" },
    bannerBadgeText: { color:"#fff", fontSize:11, fontWeight:"700" },
    bannerTitle: { color:"#fff", fontSize:19, fontWeight:"900", lineHeight:25, marginBottom:6 },
    bannerSub: { color:"rgba(255,255,255,0.75)", fontSize:11, lineHeight:16, marginBottom:12 },
    bannerCta: { backgroundColor:"#fff", paddingHorizontal:16, paddingVertical:8, borderRadius:8, marginBottom:10, alignSelf:"flex-start" },
    bannerCtaTxt: { color:"#0c2461", fontSize:12, fontWeight:"800" },
    bannerDateLabel: { color:"rgba(255,255,255,0.6)", fontSize:10 },
    bannerDate: { color:"#f59e0b", fontSize:12, fontWeight:"700" },
    bannerTnc: { color:"rgba(255,255,255,0.4)", fontSize:9, marginTop:6 },
    dotsRow: { flexDirection:"row", justifyContent:"center", gap:6, paddingVertical:10 },
    dot: { width:6, height:6, borderRadius:3, backgroundColor:"rgba(30,58,138,0.3)" },
    dotActive: { backgroundColor:"#0c2461", width:18 },

    // Section commons
    section: { paddingHorizontal:16, paddingTop:20, paddingBottom:8 },
    sectionTitle: { fontSize:15, fontWeight:"700", letterSpacing:0.7 },
    sectionSub: { fontSize:12, marginTop:3, letterSpacing:0.2 },
    seeAllBtn: { marginTop:12, alignSelf:"flex-start", paddingHorizontal:14, paddingVertical:8, borderRadius:10, borderWidth:1.5 },
    seeAllBtnTxt: { fontSize:13, fontWeight:"600" },

    // Goal cards (horizontal)
    goalCard: { width:120, height:110, borderRadius:14, overflow:"hidden", marginRight:10, borderWidth:1 },
    goalImg: { width:"100%", height:"100%", position:"absolute" },
    goalDim: { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.45)" },
    goalInfo: { position:"absolute", bottom:0, left:0, right:0, padding:8 },
    goalName: { color:"#fff", fontSize:11, fontWeight:"700", lineHeight:14 },
    goalCount: { color:"rgba(255,255,255,0.7)", fontSize:9, marginTop:2 },

    // Class cards
    clsCard: { width:176, borderRadius:14, overflow:"hidden", marginRight:12, borderWidth:1, borderColor:"rgba(255,255,255,0.08)" },
    clsThumb: { width:"100%", height:110 },
    clsBody: { padding:10 },
    clsSubjectBadge: { alignSelf:"flex-start", borderRadius:10, paddingHorizontal:8, paddingVertical:3, marginBottom:5 },
    clsSubjectTxt: { fontSize:10, fontWeight:"700" },
    clsTitle: { color:"#fff", fontSize:12, fontWeight:"700", lineHeight:16, marginBottom:4 },
    clsEducator: { color:"rgba(255,255,255,0.55)", fontSize:11 },
    clsMeta: { color:"rgba(255,255,255,0.45)", fontSize:10 },

    // Subject tabs
    subjectTab: { paddingHorizontal:14, paddingVertical:7, borderRadius:20, marginRight:8, borderWidth:1.5 },
    subjectTabActive: {},
    subjectTabTxt: { fontSize:12, fontWeight:"600" },

    // Trainers
    trainerCard: { width:152, height:220, borderRadius:20, marginRight:12, overflow:"hidden" },
    trainerPhotoArea: { height:76, alignItems:"center", justifyContent:"center", position:"relative" },
    trainerAvatar: { width:52, height:52, borderRadius:26, alignItems:"center", justifyContent:"center", borderWidth:2 },
    trainerAvatarTxt: { fontSize:16, fontWeight:"900" },
    trainerBadge: { position:"absolute", top:5, left:5, borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
    trainerBadgeTxt: { color:"#fff", fontSize:7, fontWeight:"800" },
    ratingBadge: { position:"absolute", bottom:5, right:5, borderRadius:6, paddingHorizontal:5, paddingVertical:2 },
    ratingTxt: { color:"#fff", fontSize:8, fontWeight:"700" },
    trainerInfo: { paddingTop:6, paddingHorizontal:8, paddingBottom:5 },
    trainerName: { fontSize:12, fontWeight:"800", marginBottom:1 },
    trainerRole: { fontSize:9, lineHeight:11, marginBottom:3 },
    trainerStats: { flexDirection:"row", alignItems:"center", gap:4, marginBottom:4 },
    trainerStat: { flex:1, alignItems:"center" },
    trainerStatVal: { fontSize:10, fontWeight:"800" },
    trainerStatLabel: { fontSize:7, marginTop:1 },
    trainerBookBtn: { borderRadius:8, paddingVertical:5, alignItems:"center" },
    trainerBookBtnTxt: { color:"#fff", fontSize:10, fontWeight:"700" },
    bigCta: { flexDirection:"row", alignItems:"center", justifyContent:"center", backgroundColor:"#0c2461", borderRadius:14, paddingVertical:14, paddingHorizontal:20 },
    bigCtaTxt: { color:"#fff", fontSize:15, fontWeight:"800" },

    // Healing Tools
    healHeader: { flexDirection:"row", alignItems:"flex-start", gap:12, marginBottom:12 },
    healIcon: { width:44, height:44, borderRadius:12, alignItems:"center", justifyContent:"center" },
    healSub: { fontSize:12, marginTop:2 },
    healSearch: { flexDirection:"row", alignItems:"center", borderRadius:12, paddingHorizontal:14, paddingVertical:11, marginBottom:14, borderWidth:1.5 },
    healSearchInput: { flex:1, fontSize:13 },
    healCatTab: { paddingHorizontal:14, paddingVertical:7, borderRadius:20, marginRight:8, borderWidth:1.5 },
    healCatTabActive: {},
    healCatTxt: { fontSize:12, fontWeight:"600" },
    healCard: { width:160, borderRadius:16, marginRight:12, overflow:"hidden" },
    healCardTop: { height:110, alignItems:"center", justifyContent:"center", position:"relative" },
    healGradientOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.15)" },
    healTypeBadge: { position:"absolute", top:8, right:8, backgroundColor:"rgba(0,0,0,0.5)", borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
    healTypeTxt: { color:"#fff", fontSize:9, fontWeight:"800" },
    healFreeBadge: { position:"absolute", top:8, left:8, backgroundColor:"rgba(34,197,94,0.25)", borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
    healFreeTxt: { color:"#4ade80", fontSize:9, fontWeight:"800" },
    healLockedBadge: { position:"absolute", top:8, left:8, backgroundColor:"rgba(0,0,0,0.45)", borderRadius:6, paddingHorizontal:6, paddingVertical:2 },
    healLockedTxt: { color:"#fbbf24", fontSize:9, fontWeight:"800" },
    healCardBody: { padding:10, borderWidth:1, borderTopWidth:0 },
    healCardTitle: { fontSize:13, fontWeight:"800", marginBottom:3 },
    healCardDesc: { fontSize:11, lineHeight:15, marginBottom:8 },
    healCardFoot: { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
    healCtaFree: { borderRadius:8, paddingHorizontal:8, paddingVertical:4 },
    healCtaFreeTxt: { fontSize:11, fontWeight:"700" },
    healCtaLock: { backgroundColor:"rgba(30,58,138,0.2)", borderRadius:8, paddingHorizontal:8, paddingVertical:4 },
    healCtaLockTxt: { color:"#60a5fa", fontSize:11, fontWeight:"700" },
    healUpgradeRow: { flexDirection:"row", alignItems:"center", borderRadius:12, paddingHorizontal:14, paddingVertical:12, borderWidth:1 },
    healUpgradeTxt: { fontSize:12, fontWeight:"600" },

    // Features
    featureCard: { borderRadius:16, padding:20, marginBottom:12, borderWidth:1 },
    featureTitle: { fontSize:16, fontWeight:"800", marginBottom:6 },
    featureDesc: { fontSize:13, lineHeight:19 },

    // Educators
    eduCard: { flexDirection:"row", borderRadius:16, overflow:"hidden", borderWidth:1 },
    eduPhotoWrap: { width:120, height:140 },
    eduPhoto: { width:"100%", height:"100%" },
    eduBadgeLabel: { position:"absolute", bottom:6, left:0, right:0, alignItems:"center", paddingVertical:4 },
    eduInfo: { flex:1, padding:14 },
    eduName: { fontSize:16, fontWeight:"800", marginBottom:2 },
    eduBio: { fontSize:12, lineHeight:17 },
    eduStat: { fontSize:14, fontWeight:"800" },

    // Stats
    statsRow: { flexDirection:"row", paddingVertical:20 },
    statItem: { flex:1, alignItems:"center" },
    statValue: { fontSize:22, fontWeight:"900" },
    statLabel: { fontSize:11, marginTop:2 },
    statPill: { flexDirection:"row", alignItems:"center", paddingHorizontal:12, paddingVertical:6, borderRadius:20, borderWidth:1, marginRight:8 },
    statPillTxt: { fontSize:11, fontWeight:"700" },

    // Batches
    batchCard: { borderRadius:16, overflow:"hidden", borderWidth:1 },
    batchImgWrapper: { height:140, position:"relative" },
    batchImg: { width:"100%", height:"100%" },
    batchImgDim: { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(0,0,0,0.3)" },
    batchComingSoonOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor:"rgba(5,4,18,0.55)", alignItems:"center", justifyContent:"center" },
    batchComingSoonPill: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(15,14,38,0.85)", borderRadius:20, paddingHorizontal:14, paddingVertical:6, borderWidth:1, borderColor:"#334155" },
    batchComingSoonPillTxt: { color:"#94a3b8", fontSize:11, fontWeight:"800", letterSpacing:1 },
    batchComingSoonBtn: { backgroundColor:"#1a1932", borderRadius:12, paddingVertical:11, alignItems:"center", borderWidth:1, borderColor:"#2d2b52" },
    batchComingSoonBtnTxt: { color:"#4b5563", fontSize:13, fontWeight:"700" },
    ongoingBadge: { position:"absolute", top:10, left:10, flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(0,0,0,0.7)", borderRadius:10, paddingHorizontal:8, paddingVertical:4 },
    redDot: { width:6, height:6, borderRadius:3, backgroundColor:"#ef4444" },
    ongoingTxt: { color:"#fff", fontSize:10, fontWeight:"700" },
    batchBody: { padding:14 },
    tag: { borderRadius:6, paddingHorizontal:8, paddingVertical:4, borderWidth:1 },
    tagTxt: { fontSize:10, fontWeight:"600" },
    batchTitle: { fontSize:15, fontWeight:"800", lineHeight:20, marginBottom:4 },
    batchEducator: { fontSize:12, marginBottom:4 },
    batchStatus: { fontSize:12, fontWeight:"600", marginBottom:8 },
    batchDivider: { height:1, marginBottom:12 },
    batchPrice: { fontSize:20, fontWeight:"900" },
    originalPrice: { fontSize:12, textDecorationLine:"line-through" },
    buyBtn: { flex:1, alignItems:"center", paddingVertical:10, borderRadius:12 },
    buyBtnTxt: { color:"#fff", fontSize:13, fontWeight:"800" },
    detailBtn: { flex:1, alignItems:"center", paddingVertical:10, borderRadius:12, borderWidth:1.5 },
    detailBtnTxt: { fontSize:13, fontWeight:"600" },

    // Testimonials
    testimonialCard: { borderRadius:16, padding:16, borderWidth:1 },
    testimonialText: { fontSize:14, lineHeight:20, fontStyle:"italic" },
    testimonialAvatar: { width:40, height:40, borderRadius:20, alignItems:"center", justifyContent:"center" },
    testimonialName: { fontSize:14, fontWeight:"700" },

    // Become Educator
    becomeEduCard: { borderRadius:20, padding:24, backgroundColor:"#3b0764", overflow:"hidden" },

    // Social
    socialBtn: { width:48, height:48, borderRadius:24, alignItems:"center", justifyContent:"center", borderWidth:1.5 },

    // Booking modal
    modalOverlay: { flex:1, backgroundColor:"rgba(0,0,0,0.75)", justifyContent:"flex-end" },
    modalCard: { borderTopLeftRadius:24, borderTopRightRadius:24, overflow:"hidden" },
    modalClose: { position:"absolute", top:14, right:16, zIndex:10, width:32, height:32, alignItems:"center", justifyContent:"center" },
    modalTitle: { fontSize:20, fontWeight:"900", textAlign:"center", marginBottom:4 },
    modalSub: { fontSize:13, textAlign:"center", marginBottom:20 },
    psModalHeader: { paddingTop:20, paddingHorizontal:22, paddingBottom:16 },
    psModalBadge: { backgroundColor:"rgba(30,58,138,0.2)", alignSelf:"flex-start", borderRadius:10, paddingHorizontal:10, paddingVertical:4, marginBottom:8 },
    psModalBadgeTxt: { color:"#60a5fa", fontSize:10, fontWeight:"800" },
    psModalTitle: { fontSize:20, fontWeight:"900", marginBottom:4 },
    psModalSub: { fontSize:13 },
    psLoadingWrap: { alignItems:"center", paddingVertical:40 },
    psSpinner: { width:40, height:40, borderRadius:20, borderWidth:3, borderColor:"#0c2461", borderTopColor:"transparent" },
    psLoadingTxt: { marginTop:12, fontSize:14 },
    psSuccessCircle: { width:72, height:72, borderRadius:36, backgroundColor:"rgba(34,197,94,0.2)", alignItems:"center", justifyContent:"center", marginBottom:16 },
    psSuccessTitle: { fontSize:22, fontWeight:"900", marginBottom:8 },
    psSuccessMsg: { fontSize:14, textAlign:"center", lineHeight:22, marginBottom:16 },
    psSuccessBtn: { backgroundColor:"#0c2461", borderRadius:12, paddingHorizontal:32, paddingVertical:12 },
    psSuccessBtnTxt: { color:"#fff", fontWeight:"800", fontSize:15 },
    psFieldLabel: { fontSize:12, fontWeight:"600", marginBottom:5 },
    psInput: { borderRadius:10, paddingHorizontal:14, paddingVertical:11, fontSize:14, marginBottom:4, borderWidth:1 },
    psTag: { paddingHorizontal:12, paddingVertical:7, borderRadius:20, borderWidth:1.5 },
    psTagSel: { backgroundColor:"rgba(30,58,138,0.2)" },
    psTagTxt: { fontSize:12, fontWeight:"600" },
    psPrivacyRow: { flexDirection:"row", alignItems:"flex-start", gap:10, borderRadius:10, padding:12, borderWidth:1 },
    psPrivacyTxt: { fontSize:12, flex:1, lineHeight:17 },
    psSubmitBtn: { backgroundColor:"#0c2461", borderRadius:14, paddingVertical:15, alignItems:"center", shadowColor:"#0c2461", shadowOpacity:0.4, shadowRadius:12, elevation:6, marginTop:4 },
    psSubmitTxt: { color:"#fff", fontSize:15, fontWeight:"900" },

    // Breathing modal
    breathCircleWrap: { alignItems:"center", justifyContent:"center", marginVertical:20, height:180 },
    breathGlowRing: { position:"absolute", width:170, height:170, borderRadius:85, borderWidth:2, opacity:0.3 },
    breathCircle: { width:150, height:150, borderRadius:75, alignItems:"center", justifyContent:"center", borderWidth:2, shadowOpacity:0.6, shadowRadius:20 },
    breathInner: { alignItems:"center" },
    breathSecsNum: { color:"#fff", fontSize:40, fontWeight:"900" },
    breathSecsSub: { color:"rgba(255,255,255,0.7)", fontSize:12 },
    breathPhaseLabel: { fontSize:20, fontWeight:"800", textAlign:"center", marginBottom:16 },
    breathDots: { flexDirection:"row", justifyContent:"center", gap:20, marginBottom:16 },
    breathDot: { width:10, height:10, borderRadius:5, marginBottom:4 },
    breathDotLbl: { color:"#6b7280", fontSize:9 },
    modalTip: { borderRadius:12, padding:14, marginTop:4 },
    modalTipTxt: { fontSize:12, textAlign:"center", lineHeight:18 },

    // Pomodoro modal
    pomPhaseBadge: { alignSelf:"center", borderRadius:20, paddingHorizontal:16, paddingVertical:6, borderWidth:1.5, marginBottom:8 },
    pomPhaseTxt: { fontSize:13, fontWeight:"700" },
    pomTimerWrap: { alignItems:"center", marginVertical:24 },
    pomTime: { fontSize:52, fontWeight:"900", letterSpacing:2 },
    pomBtnRow: { flexDirection:"row", justifyContent:"center", gap:16, marginBottom:16 },
    pomBtn: { width:56, height:56, borderRadius:28, alignItems:"center", justifyContent:"center" },
  });
}
