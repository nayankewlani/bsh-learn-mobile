import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Linking, Dimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStore } from "../../stores/themeStore";

const { width: SW } = Dimensions.get("window");

const slide1   = require("../../assets/slide-1.png");
const geetaImg = require("../../assets/geeta-makhijani.png");
const slide4   = require("../../assets/slide-4.png");
const advImg   = require("../../assets/advanced-hypnosis.png");
const shadowImg = require("../../assets/shadow-work.png");

// ── Profile data ────────────────────────────────────────────────────────────
const PROFILES: Record<string, {
  name: string; credentials: string; role: string; tagline: string;
  bio: string[]; img: any; bgColor: string; accentColor: string;
  stats: { label: string; value: string }[];
  achievements: string[];
  specialties: string[];
  social: { icon: string; label: string; url: string; color: string }[];
  ctaLabel: string; ctaAction: "consultation" | "explore";
}> = {
  pradeep: {
    name: "Dr. Pradeep Kumar",
    credentials: "PhD (Hypnotherapy) · Clinical Hypnotherapist · NLP Master",
    role: "Founder & Chief Mentor, BSH Healers",
    tagline: "India's #1 Clinical Hypnotherapist with 20+ years of transforming lives",
    bgColor: "#1a0a3e",
    accentColor: "#7c3aed",
    img: slide1,
    bio: [
      "Dr. Pradeep Kumar is India's most sought-after Clinical Hypnotherapist, NLP Master, and Mind Coach. With over 20 years of practice, he has trained more than 5,000+ certified practitioners across 15+ countries.",
      "He founded BSH (Blessings School of Hypnosis) to make professional hypnotherapy education accessible to every aspiring healer in India and abroad. His teaching combines ancient wisdom with modern neuroscience.",
      "Dr. Pradeep has authored multiple books on hypnotherapy and has been featured on leading national television channels and publications. He conducts workshops, certification programs, and 1:1 coaching sessions globally.",
    ],
    stats: [
      { label: "Students Trained",  value: "5,000+"  },
      { label: "Countries Reached", value: "15+"     },
      { label: "Watch Minutes",     value: "315M"    },
      { label: "YouTube Followers", value: "161K+"   },
      { label: "Years Experience",  value: "20+"     },
      { label: "Certification Courses", value: "12+" },
    ],
    achievements: [
      "Founder of India's largest Hypnotherapy school — BSH Healers",
      "Certified trainer in 25+ healing modalities including Ericksonian Hypnosis, NLP, Past Life Regression",
      "Published author — 'The Power of Trance' & 'Hypnosis for Healing'",
      "International speaker at Mind & Wellness conferences across USA, UK & Middle East",
      "Pioneered Hindi-medium hypnotherapy education making it accessible across India",
      "Recipient of 'Best Wellness Educator' award 3 years running",
      "Over 300+ hours of free YouTube content in Hindi & English",
    ],
    specialties: [
      "Clinical Hypnotherapy", "Neuro-Linguistic Programming", "Ericksonian Hypnosis",
      "Past Life Regression", "Stage Hypnosis", "Street Hypnosis", "Self-Hypnosis",
      "Deep Trance Induction", "Parts Therapy", "Inner Child Healing",
    ],
    social: [
      { icon: "logo-youtube",    label: "YouTube",   url: "https://www.youtube.com/@drpradeepkumar3912",              color: "#ff0000" },
      { icon: "logo-instagram",  label: "Instagram", url: "https://www.instagram.com/drpradeepkumarofficial/",         color: "#e1306c" },
      { icon: "logo-facebook",   label: "Facebook",  url: "https://www.facebook.com/drpradeepkumar",                   color: "#1877f2" },
      { icon: "logo-linkedin",   label: "LinkedIn",  url: "https://www.linkedin.com/in/drpradeepkumar3912",             color: "#0a66c2" },
      { icon: "logo-twitter",    label: "Twitter/X", url: "https://x.com/pradeep23923",                                color: "#1da1f2" },
      { icon: "globe-outline",   label: "Website",   url: "https://www.blessingsschoolofhypnosis.com",                 color: "#7c3aed" },
    ],
    ctaLabel: "Book 1:1 Session with Dr. Pradeep",
    ctaAction: "consultation",
  },

  geeta: {
    name: "Geeta Makhijani",
    credentials: "Certified Shadow Work Practitioner · Emotional Healing Expert",
    role: "Co-Founder & Lead Healer, BSH Healers",
    tagline: "Pioneering Shadow Work & Emotional Healing in India since 2012",
    bgColor: "#0d1a0a",
    accentColor: "#0d9488",
    img: geetaImg,
    bio: [
      "Geeta Makhijani is India's foremost Shadow Work specialist and Emotional Healing expert. She co-founded BSH Healers and has developed a unique healing methodology that blends Jungian psychology, energy work, and spiritual practices.",
      "With over 12 years of practice, Geeta has guided thousands through deep emotional healing, helping them release childhood wounds, relationship traumas, and subconscious patterns that block growth and happiness.",
      "Her workshops are known for their transformative depth — participants frequently describe sessions as 'life-changing'. Geeta also provides 1:1 coaching for individuals seeking deep personal transformation.",
    ],
    stats: [
      { label: "Students Healed",   value: "2,500+"  },
      { label: "Watch Minutes",     value: "257M"    },
      { label: "YouTube Followers", value: "90K+"    },
      { label: "Years Experience",  value: "12+"     },
      { label: "Private Sessions",  value: "1,800+"  },
      { label: "Healing Modalities", value: "8+"    },
    ],
    achievements: [
      "Co-Founder of BSH Healers — India's largest healing education platform",
      "Pioneer of Hindi-medium Shadow Work education in India",
      "Certified in Jungian Shadow Work, Inner Child Healing, and Parts Integration",
      "Trained 2,500+ shadow work practitioners across India and abroad",
      "Author of the widely-read guide 'Healing Your Shadow — A Practical Path'",
      "Regular speaker at Wellness & Mind-Body conferences",
      "Created the '90-Day Shadow Integration' program with 95% completion rate",
    ],
    specialties: [
      "Shadow Work", "Inner Child Healing", "Emotional Healing", "Parts Integration",
      "Relationship Healing", "Childhood Trauma Release", "Energy Healing",
      "Chakra Balancing", "Women's Healing Circles",
    ],
    social: [
      { icon: "logo-youtube",    label: "YouTube",   url: "https://www.youtube.com/@drpradeepkumar3912",  color: "#ff0000" },
      { icon: "logo-instagram",  label: "Instagram", url: "https://www.instagram.com/drpradeepkumarofficial/", color: "#e1306c" },
      { icon: "globe-outline",   label: "Website",   url: "https://www.blessingsschoolofhypnosis.com",    color: "#0d9488" },
    ],
    ctaLabel: "Book 1:1 Session with Geeta",
    ctaAction: "consultation",
  },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function EducatorProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t, isDark } = useThemeStore();
  const insets = useSafeAreaInsets();

  const profile = PROFILES[slug as string];

  if (!profile) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", backgroundColor:t.bg }}>
        <Text style={{ color:t.text, fontSize:16 }}>Profile not found</Text>
        <TouchableOpacity onPress={()=>router.back()} style={{ marginTop:16 }}>
          <Text style={{ color:"#7c3aed", fontSize:14 }}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { name, credentials, role, tagline, bio, img, bgColor, accentColor,
    stats, achievements, specialties, social, ctaLabel, ctaAction } = profile;

  return (
    <View style={{ flex:1, backgroundColor:t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:40 }}>

        {/* Hero */}
        <View style={[s.hero, { backgroundColor:bgColor, paddingTop:insets.top+10 }]}>
          <TouchableOpacity style={s.backBtn} onPress={()=>router.back()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={s.heroInner}>
            <View style={[s.heroImgWrap, { borderColor:accentColor }]}>
              <Image source={img} style={s.heroImg} resizeMode="cover" />
            </View>
            <View style={[s.verifiedBadge, { backgroundColor:accentColor }]}>
              <Ionicons name="checkmark-circle" size={12} color="#fff" />
              <Text style={s.verifiedTxt}>VERIFIED MASTER</Text>
            </View>
            <Text style={s.heroName}>{name}</Text>
            <Text style={s.heroCreds}>{credentials}</Text>
            <Text style={s.heroRole}>{role}</Text>
            <View style={[s.heroTaglineWrap, { borderColor:accentColor+"55" }]}>
              <Text style={[s.heroTagline, { color:accentColor+"dd" }]}>"{tagline}"</Text>
            </View>
          </View>
        </View>

        {/* Stats grid */}
        <View style={[s.statsGrid, { backgroundColor:t.card, borderColor:t.border }]}>
          {stats.map((st, i) => (
            <View key={i} style={[s.statCell, { borderColor:t.border, borderRightWidth:i%3!==2?1:0, borderBottomWidth:i<3?1:0 }]}>
              <Text style={[s.statVal, { color:accentColor }]}>{st.value}</Text>
              <Text style={[s.statLbl, { color:t.textMuted }]}>{st.label}</Text>
            </View>
          ))}
        </View>

        {/* Bio */}
        <View style={[s.section, { backgroundColor:t.surface }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor:accentColor }]} />
            <Text style={[s.sectionTitle, { color:t.text }]}>About {name.split(" ")[1]}</Text>
          </View>
          {bio.map((para, i) => (
            <Text key={i} style={[s.para, { color:t.textSec }]}>{para}</Text>
          ))}
        </View>

        {/* Achievements */}
        <View style={[s.section, { backgroundColor:t.bg }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor:"#f59e0b" }]} />
            <Text style={[s.sectionTitle, { color:t.text }]}>Achievements</Text>
          </View>
          {achievements.map((ach, i) => (
            <View key={i} style={s.achieveRow}>
              <Text style={[s.achieveIcon, { color:accentColor }]}>✦</Text>
              <Text style={[s.achieveTxt, { color:t.textSec }]}>{ach}</Text>
            </View>
          ))}
        </View>

        {/* Specialties */}
        <View style={[s.section, { backgroundColor:t.surface }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor:"#a78bfa" }]} />
            <Text style={[s.sectionTitle, { color:t.text }]}>Specialties</Text>
          </View>
          <View style={s.tagWrap}>
            {specialties.map((sp, i) => (
              <View key={i} style={[s.tag, { backgroundColor:accentColor+"18", borderColor:accentColor+"40" }]}>
                <Text style={[s.tagTxt, { color:accentColor }]}>{sp}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Social links */}
        <View style={[s.section, { backgroundColor:t.bg }]}>
          <View style={s.sectionHeader}>
            <View style={[s.sectionDot, { backgroundColor:"#60a5fa" }]} />
            <Text style={[s.sectionTitle, { color:t.text }]}>Connect</Text>
          </View>
          <View style={{ gap:10 }}>
            {social.map((soc, i) => (
              <TouchableOpacity key={i}
                style={[s.socialRow, { backgroundColor:t.card, borderColor:soc.color+"33" }]}
                onPress={()=>Linking.openURL(soc.url).catch(()=>{})}>
                <View style={[s.socialIcon, { backgroundColor:soc.color+"22" }]}>
                  <Ionicons name={soc.icon as any} size={20} color={soc.color} />
                </View>
                <Text style={[s.socialLabel, { color:t.text }]}>{soc.label}</Text>
                <Ionicons name="open-outline" size={14} color={t.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={{ paddingHorizontal:20, paddingTop:8 }}>
          <TouchableOpacity
            style={[s.cta, { backgroundColor:accentColor }]}
            onPress={()=>{
              if (ctaAction === "consultation") router.push("/(tabs)/consultation" as any);
              else router.push("/(tabs)/explore" as any);
            }}>
            <Ionicons name="calendar-outline" size={18} color="#fff" style={{ marginRight:8 }} />
            <Text style={s.ctaTxt}>{ctaLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop:14, alignItems:"center" }} onPress={()=>router.back()}>
            <Text style={{ color:t.textMuted, fontSize:13 }}>← Back to Home</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { paddingHorizontal:20, paddingBottom:28 },
  backBtn: { width:38, height:38, borderRadius:19, backgroundColor:"rgba(255,255,255,0.15)",
    alignItems:"center", justifyContent:"center", marginBottom:16 },
  heroInner: { alignItems:"center" },
  heroImgWrap: { width:120, height:120, borderRadius:60, overflow:"hidden", borderWidth:3, marginBottom:10 },
  heroImg: { width:"100%", height:"100%" },
  verifiedBadge: { flexDirection:"row", alignItems:"center", gap:4, borderRadius:12,
    paddingHorizontal:10, paddingVertical:4, marginBottom:12 },
  verifiedTxt: { color:"#fff", fontSize:10, fontWeight:"800", letterSpacing:0.5 },
  heroName: { color:"#fff", fontSize:24, fontWeight:"900", textAlign:"center", marginBottom:4 },
  heroCreds: { color:"rgba(255,255,255,0.65)", fontSize:11, textAlign:"center", lineHeight:16, marginBottom:6 },
  heroRole: { color:"rgba(255,255,255,0.85)", fontSize:13, fontWeight:"600", textAlign:"center", marginBottom:14 },
  heroTaglineWrap: { borderWidth:1, borderRadius:12, paddingHorizontal:16, paddingVertical:10, marginTop:4 },
  heroTagline: { fontSize:13, fontStyle:"italic", textAlign:"center", lineHeight:20 },

  statsGrid: { flexDirection:"row", flexWrap:"wrap", borderWidth:1, marginHorizontal:0 },
  statCell: { width:`${100/3}%` as any, alignItems:"center", paddingVertical:14 },
  statVal: { fontSize:18, fontWeight:"900", marginBottom:2 },
  statLbl: { fontSize:9, textAlign:"center", fontWeight:"600" },

  section: { paddingHorizontal:20, paddingVertical:20, marginTop:1 },
  sectionHeader: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:14 },
  sectionDot: { width:8, height:8, borderRadius:4 },
  sectionTitle: { fontSize:18, fontWeight:"800" },
  para: { fontSize:13, lineHeight:21, marginBottom:10 },

  achieveRow: { flexDirection:"row", gap:10, marginBottom:10, alignItems:"flex-start" },
  achieveIcon: { fontSize:12, marginTop:2 },
  achieveTxt: { flex:1, fontSize:13, lineHeight:19 },

  tagWrap: { flexDirection:"row", flexWrap:"wrap", gap:8 },
  tag: { borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1 },
  tagTxt: { fontSize:12, fontWeight:"600" },

  socialRow: { flexDirection:"row", alignItems:"center", gap:12, borderRadius:14,
    padding:14, borderWidth:1 },
  socialIcon: { width:38, height:38, borderRadius:10, alignItems:"center", justifyContent:"center" },
  socialLabel: { flex:1, fontSize:14, fontWeight:"600" },

  cta: { flexDirection:"row", alignItems:"center", justifyContent:"center",
    borderRadius:16, paddingVertical:16, shadowOpacity:0.3, shadowRadius:12, elevation:6 },
  ctaTxt: { color:"#fff", fontSize:15, fontWeight:"900" },
});
