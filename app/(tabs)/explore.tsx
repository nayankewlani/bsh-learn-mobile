import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Dimensions, Animated, NativeSyntheticEvent, NativeScrollEvent,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useCourseStore, Course } from "../../stores/courseStore";
import { COLORS } from "../../constants";
import client from "../../api/client";

interface ApiProgram {
  _id: string; programId: string; title: string; description: string;
  thumbnail: string; price: number; discountPrice: number;
  level: string; programType: string; features: string[];
}

const { width: SW } = Dimensions.get("window");

// ── Assets ──────────────────────────────────────────────────────────────────
const advHypnosisImg = require("../../assets/advanced-hypnosis.png");
const hypnosis2Img   = require("../../assets/hypnosis-2.png");
const shadowWorkImg  = require("../../assets/shadow-work.png");
const reikiImg       = require("../../assets/reiki.png");
const deepTranceImg  = require("../../assets/deep-trance.png");
const akashicImg     = require("../../assets/akashic.png");
const mesmerismImg   = require("../../assets/mesmerism.png");
const pastLifeImg    = require("../../assets/past-life-regression.png");
const vedicImg       = require("../../assets/vedic-astro.jpeg");
const bshLogoImg     = require("../../assets/BSH-logo-02.png");

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ── Static flagship programs (fallback) ─────────────────────────────────────
const STATIC_PROGRAMS = [
  {
    programId: "advance-hypnosis", isActive: true,
    title: "Advance Hypnosis",
    description: "India's most comprehensive 6-month advanced hypnosis certification program. Covers self-hypnosis, hetero hypnosis, street, stage, Ericksonian & more.",
    level: "Beginner",
    programType: "Certification",
    price: 2999900,
    discountPrice: 0,
    img: advHypnosisImg,
  },
  {
    programId: "hypnosis-2", isActive: true,
    title: "Hypnosis 2.0",
    description: "Subscription-based hypnosis mastery program with live classes and a growing recordings library. Monthly access to 40+ expert-led sessions.",
    level: "Beginner",
    programType: "Subscription",
    price: 99900,
    discountPrice: 0,
    img: hypnosis2Img,
  },
  {
    programId: "healing-tools", isActive: true,
    title: "BSH Healing Tools — Full Access",
    description: "Unlock all 16 premium healing tools: sleep hypnosis, inner child healing, chakra balancing, fear release, and more. One-time lifetime access.",
    level: "Beginner",
    programType: "Tool Pack",
    price: 9900,
    discountPrice: 0,
    img: reikiImg,
  },
];

const PROG_LABEL_COLOR: Record<string, string> = {
  Certification: "#7c3aed",
  Subscription:  "#0d9488",
  "Tool Pack":   "#d97706",
  default:       "#1d4ed8",
};

// Always use bundled images for these programs — API thumbnails may be stale/expired
const FLAGSHIP_IMG: Record<string, any> = {
  "advance-hypnosis": advHypnosisImg,
  "hypnosis-2":       hypnosis2Img,
  "healing-tools":    reikiImg,
};

// ── Category data ────────────────────────────────────────────────────────────
const CATEGORIES: { name: string; icon: IoniconName }[] = [
  { name: "All",               icon: "apps-outline"        },
  { name: "Advance Hypnosis",  icon: "eye-outline"         },
  { name: "Hypnosis 2.0",      icon: "flash-outline"       },
  { name: "Art of Shadow Work",icon: "moon-outline"        },
  { name: "Reiki",             icon: "heart-outline"       },
  { name: "Akashik",           icon: "planet-outline"      },
  { name: "Mesmerism",         icon: "magnet-outline"      },
  { name: "Past Life",         icon: "time-outline"        },
  { name: "Vedic Astrology",   icon: "sunny-outline"       },
];

// ── Static fallback courses ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface StaticCourse {
  id: string; img: any; tags: string[]; title: string;
  educator: string; status: "ongoing" | "upcoming"; startLabel: string;
  price: string; originalPrice: string; saving: string; category: string;
  rating: string; students: string; duration: string;
}
const STATIC_COURSES: StaticCourse[] = [
  { id:"s1", img: advHypnosisImg, tags:["Hindi","Full Course"],    title:"Advance Hypnosis — Master Batch 2026",        educator:"Dr. Pradeep Kumar", status:"ongoing",  startLabel:"Ongoing · Started 1 May 2026",   price:"₹3,999", originalPrice:"₹5,999", saving:"33%", category:"Advance Hypnosis",  rating:"4.9", students:"2.1K", duration:"48 hrs" },
  { id:"s2", img: hypnosis2Img,   tags:["Hindi","Full Course"],    title:"Hypnosis 2.0 — Upgrade Your Mind",            educator:"Dr. Pradeep Kumar", status:"upcoming", startLabel:"Starts 1 Jun 2026",              price:"₹2,999", originalPrice:"₹4,500", saving:"33%", category:"Hypnosis 2.0",     rating:"4.8", students:"1.4K", duration:"36 hrs" },
  { id:"s3", img: shadowWorkImg,  tags:["Hindi","Full Course"],    title:"Art of Shadow Work — Deep Healing",           educator:"Geeta Makhijani",   status:"ongoing",  startLabel:"Ongoing · Started 10 May 2026",  price:"₹2,499", originalPrice:"₹3,999", saving:"37%", category:"Art of Shadow Work", rating:"4.9", students:"980",  duration:"30 hrs" },
  { id:"s4", img: reikiImg,       tags:["Hindi / English","Level 1 & 2"], title:"Reiki — Universal Life Energy Certification", educator:"BSH Faculty",       status:"upcoming", startLabel:"Starts 15 Jun 2026",             price:"₹1,999", originalPrice:"₹3,000", saving:"33%", category:"Reiki",             rating:"4.7", students:"760",  duration:"24 hrs" },
  { id:"s5", img: deepTranceImg,  tags:["Hindi","Workshop"],       title:"Deep Trance Level — 4 Day Intensive",         educator:"Dr. Pradeep Kumar", status:"upcoming", startLabel:"Starts 20 Jun 2026",             price:"₹1,499", originalPrice:"₹2,500", saving:"40%", category:"Advance Hypnosis",  rating:"4.8", students:"540",  duration:"16 hrs" },
  { id:"s6", img: akashicImg,     tags:["Hindi / English","Full Course"], title:"Akashik Records — Access Universal Knowledge", educator:"BSH Faculty",       status:"ongoing",  startLabel:"Ongoing · Started 5 May 2026",   price:"₹2,999", originalPrice:"₹4,999", saving:"40%", category:"Akashik",           rating:"4.9", students:"1.2K", duration:"32 hrs" },
  { id:"s7", img: mesmerismImg,   tags:["Hindi","Workshop"],       title:"Mesmerism & Energy Mastery",                  educator:"Dr. Pradeep Kumar", status:"upcoming", startLabel:"Starts 5 Jul 2026",              price:"₹1,999", originalPrice:"₹3,500", saving:"42%", category:"Mesmerism",         rating:"4.7", students:"430",  duration:"20 hrs" },
  { id:"s8", img: pastLifeImg,    tags:["Hindi","Therapy Course"], title:"Past Life Regression Therapy",                educator:"Geeta Makhijani",   status:"upcoming", startLabel:"Starts 10 Jul 2026",             price:"₹2,499", originalPrice:"₹3,999", saving:"37%", category:"Past Life",         rating:"4.8", students:"620",  duration:"28 hrs" },
  { id:"s9", img: vedicImg,       tags:["Hindi / English","Full Course"], title:"Vedic Astrology — Read Your Destiny",         educator:"BSH Faculty",       status:"upcoming", startLabel:"Starts 1 Aug 2026",              price:"₹2,999", originalPrice:"₹4,999", saving:"40%", category:"Vedic Astrology",   rating:"4.7", students:"870",  duration:"40 hrs" },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { courses, fetchCourses, isLoading } = useCourseStore();
  const params = useLocalSearchParams<{ category?: string }>();

  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState(params.category || "All");
  const [sortBy, setSortBy] = useState<"popular" | "newest" | "price">("popular");
  const [showSort, setShowSort] = useState(false);
  const [apiPrograms, setApiPrograms] = useState<ApiProgram[]>([]);

  // Floating header
  const HEADER_H = 128 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);

  const handleMainScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
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
      Animated.timing(headerTranslateY, { toValue: -HEADER_H, duration: 220, useNativeDriver: true }).start();
    } else if (delta < -4 && headerHiddenRef.current) {
      headerHiddenRef.current = false;
      Animated.timing(headerTranslateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  };

  useEffect(() => {
    if (params.category) setSelectedCat(params.category);
  }, [params.category]);

  useEffect(() => {
    client.get("/courses/programs/public")
      .then(({ data }) => setApiPrograms(data.programs ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p: Record<string, string | number> = { limit: 20 };
    if (search) p.search = search;
    if (selectedCat !== "All") p.category = selectedCat;
    fetchCourses(p);
  }, [search, selectedCat]);

  // Use API data if available, else static fallback
  const apiCourses = courses as Course[];
  const displayStatic = !isLoading && apiCourses.length === 0;

  const filteredStatic = STATIC_COURSES.filter(c => {
    const matchCat = selectedCat === "All" || c.category === selectedCat;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.educator.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalCount = displayStatic ? filteredStatic.length : apiCourses.length;

  const SORT_LABELS: Record<string, string> = { popular: "Most Popular", newest: "Newest First", price: "Price: Low to High" };

  return (
    <View style={styles.root}>

      {/* ── Floating Header ── */}
      <Animated.View style={[styles.headerWrapper, { paddingTop: insets.top, transform: [{ translateY: headerTranslateY }] }]}>
        <View style={styles.headerRow}>
          <Image source={bshLogoImg} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.brandArea}>
            <Text style={styles.brandName}>BSH</Text>
            <Text style={styles.brandSub}>Courses</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push(user ? "/(tabs)/dashboard" : "/(auth)/login")}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarDefault}>
                  <Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search courses, topics, educators..."
            placeholderTextColor="#9ca3af"
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* ── Main Scroll ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_H + 8, paddingBottom: 56 }}
      >
        {/* ── Flagship Programs ── */}
        <View style={styles.flagshipSection}>
          <View style={styles.flagshipHeader}>
            <Text style={styles.flagshipTitle}>Flagship Programs</Text>
          </View>

          {(apiPrograms.length > 0 ? apiPrograms : STATIC_PROGRAMS).map((prog: any) => {
            const typeLabel = prog.programType || "Course";
            const labelColor = PROG_LABEL_COLOR[typeLabel] ?? PROG_LABEL_COLOR.default;
            const priceRs = prog.discountPrice > 0
              ? Math.round(prog.discountPrice / 100)
              : Math.round(prog.price / 100);
            const priceStr = typeLabel === "Subscription"
              ? `₹${priceRs}/mo`
              : `₹${priceRs.toLocaleString("en-IN")}`;
            const localImg = FLAGSHIP_IMG[prog.programId] ?? prog.img ?? advHypnosisImg;
            const slug = prog.programId;
            const active = prog.isActive !== false; // API programs are always active

            return (
              <TouchableOpacity key={prog.programId ?? prog._id}
                activeOpacity={active ? 0.9 : 1}
                style={styles.flagshipCard}
                onPress={() => active && router.push(`/program/${slug}` as any)}>

                {/* Type badge — only shown for Certification (Advance Hypnosis) */}
                {prog.programType === "Certification" && (
                  <View style={[styles.flagshipTypeBadge, { backgroundColor: labelColor, opacity: active ? 1 : 0.4 }]}>
                    <Text style={styles.flagshipTypeTxt}>Certification</Text>
                  </View>
                )}

                {/* Image — prefer bundled asset for known programs to avoid stale API URLs */}
                <View style={styles.flagshipImgBox}>
                  <Image source={localImg} style={[styles.flagshipImg, !active && { opacity: 0.4 }]} resizeMode="cover" />
                  <View style={styles.flagshipImgDim} />
                  {/* Starting Soon badge over image */}
                  {!active && (
                    <View style={styles.flagshipStartingSoonBox}>
                      <Text style={styles.flagshipStartingSoonTxt}>STARTING SOON</Text>
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={[styles.flagshipInfo, !active && { opacity: 0.45 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    {prog.level && (
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelTxt}>{prog.level}</Text>
                      </View>
                    )}
                    {prog.programId === "advance-hypnosis" && (
                      <View style={styles.certifiedBadge}>
                        <Text style={styles.certifiedTxt}>BSH Healers Certified</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.flagshipName}>{prog.title}</Text>
                  <Text style={styles.flagshipDesc} numberOfLines={2}>{prog.description}</Text>
                  <View style={styles.flagshipPriceRow}>
                    <Text style={styles.flagshipPrice}>{priceStr}</Text>
                    {active ? (
                      <TouchableOpacity style={styles.viewProgramBtn}
                        onPress={() => router.push(`/program/${slug}` as any)}>
                        <Text style={styles.viewProgramTxt}>View Program</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.viewProgramBtn, { backgroundColor: "#1f1f35", borderColor: "#2d2b52" }]}>
                        <Text style={[styles.viewProgramTxt, { color: "#4b5563" }]}>Coming Soon</Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Stats Strip */}
        <View style={styles.statsStrip}>
          {[
            { val: "50K+", lbl: "Students",  icon: "people-outline"    as IoniconName },
            { val: "100+", lbl: "Courses",   icon: "book-outline"      as IoniconName },
            { val: "4.8★", lbl: "Rating",   icon: "star-outline"      as IoniconName },
            { val: "15+",  lbl: "Trainers",  icon: "school-outline"    as IoniconName },
          ].map(s => (
            <View key={s.lbl} style={styles.statItem}>
              <Ionicons name={s.icon} size={18} color="#a78bfa" style={{ marginBottom: 4 }} />
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}
          contentContainerStyle={{ paddingHorizontal: 16, flexDirection: "row", alignItems: "center" }}>
          {CATEGORIES.map((cat, idx) => {
            const active = cat.name === selectedCat;
            return (
              <TouchableOpacity key={cat.name} onPress={() => setSelectedCat(cat.name)}
                style={[styles.catChip, active && styles.catChipActive, idx < CATEGORIES.length - 1 && { marginRight: 8 }]}>
                <Ionicons name={cat.icon} size={13} color={active ? "#fff" : "#6b7280"} style={{ marginRight: 5 }} />
                <Text style={[styles.catChipTxt, active && styles.catChipTxtActive]}>{cat.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Results row + Sort */}
        <View style={styles.resultsRow}>
          <Text style={styles.resultsCount}>
            <Text style={{ color: "#a78bfa", fontWeight: "800" }}>{totalCount}</Text> courses found
          </Text>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSort(s => !s)}>
            <Ionicons name="funnel-outline" size={13} color="#a78bfa" />
            <Text style={styles.sortTxt}>{SORT_LABELS[sortBy]}</Text>
            <Ionicons name={showSort ? "chevron-up" : "chevron-down"} size={13} color="#a78bfa" />
          </TouchableOpacity>
        </View>

        {/* Sort Dropdown */}
        {showSort && (
          <View style={styles.sortDropdown}>
            {(["popular", "newest", "price"] as const).map(opt => (
              <TouchableOpacity key={opt} style={styles.sortOption} onPress={() => { setSortBy(opt); setShowSort(false); }}>
                <Text style={[styles.sortOptionTxt, sortBy === opt && styles.sortOptionActive]}>{SORT_LABELS[opt]}</Text>
                {sortBy === opt && <Ionicons name="checkmark" size={14} color="#a78bfa" />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Course List ── */}
        {isLoading ? (
          // Skeleton
          <View style={{ paddingHorizontal: 16, gap: 16 }}>
            {[1, 2, 3].map(n => (
              <View key={n} style={styles.skeleton}>
                <View style={styles.skeletonImg} />
                <View style={{ padding: 14 }}>
                  <View style={[styles.skeletonLine, { width: "90%", marginBottom: 10 }]} />
                  <View style={[styles.skeletonLine, { width: "60%", marginBottom: 10 }]} />
                  <View style={[styles.skeletonLine, { width: "40%" }]} />
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
            {(displayStatic ? filteredStatic : apiCourses as unknown as StaticCourse[]).length === 0 ? (
              // Empty state
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={40} color="#7c3aed" />
                </View>
                <Text style={styles.emptyTitle}>No courses found</Text>
                <Text style={styles.emptySub}>Try a different category or search term</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={() => { setSearch(""); setSelectedCat("All"); }}>
                  <Text style={styles.emptyBtnTxt}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            ) : (
              (displayStatic ? filteredStatic : apiCourses as unknown as StaticCourse[]).map((course) => (
                <StaticCourseCard key={(course as StaticCourse).id || (course as any)._id} course={course as StaticCourse} />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Rich Course Card ──────────────────────────────────────────────────────────
function StaticCourseCard({ course }: { course: StaticCourse }) {
  return (
    <View style={[cardStyles.card, cardStyles.cardDimmed]}>
      {/* Image */}
      <View style={cardStyles.imgWrapper}>
        <Image source={course.img} style={[cardStyles.img, { opacity: 0.45 }]} resizeMode="cover" />
        <View style={cardStyles.imgDim} />
        {/* Dark overlay for coming soon */}
        <View style={cardStyles.comingSoonOverlay}>
          <View style={cardStyles.comingSoonPill}>
            <Ionicons name="lock-closed" size={11} color="#94a3b8" />
            <Text style={cardStyles.comingSoonPillTxt}>COMING SOON</Text>
          </View>
        </View>
        {/* Status badge */}
        <View style={[cardStyles.statusBadge, course.status === "ongoing" ? cardStyles.statusLive : cardStyles.statusUpcoming, { opacity: 0.5 }]}>
          {course.status === "ongoing" && <View style={cardStyles.liveDot} />}
          <Text style={cardStyles.statusTxt}>{course.status === "ongoing" ? "LIVE" : "UPCOMING"}</Text>
        </View>
        {/* Tags */}
        <View style={cardStyles.tagRow}>
          {course.tags.map(t => (
            <View key={t} style={[cardStyles.tag, { opacity: 0.5 }]}>
              <Text style={cardStyles.tagTxt}>{t}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Body — dimmed */}
      <View style={[cardStyles.body, { opacity: 0.5 }]}>
        <Text style={cardStyles.title} numberOfLines={2}>{course.title}</Text>

        {/* Educator */}
        <View style={cardStyles.educatorRow}>
          <Ionicons name="person-circle-outline" size={15} color="#a78bfa" />
          <Text style={cardStyles.educatorTxt}>{typeof course.educator === "string" ? course.educator : (course.educator as any)?.name ?? ""}</Text>
        </View>

        {/* Meta row: rating, students, duration */}
        <View style={cardStyles.metaRow}>
          <View style={cardStyles.metaItem}>
            <Ionicons name="star" size={12} color="#fbbf24" />
            <Text style={cardStyles.metaVal}>{course.rating}</Text>
          </View>
          <View style={cardStyles.metaDot} />
          <View style={cardStyles.metaItem}>
            <Ionicons name="people-outline" size={12} color="#60a5fa" />
            <Text style={cardStyles.metaVal}>{course.students} students</Text>
          </View>
          <View style={cardStyles.metaDot} />
          <View style={cardStyles.metaItem}>
            <Ionicons name="time-outline" size={12} color="#34d399" />
            <Text style={cardStyles.metaVal}>{course.duration}</Text>
          </View>
        </View>

        {/* Start label */}
        <View style={cardStyles.startRow}>
          <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
          <Text style={cardStyles.startTxt}>{course.startLabel}</Text>
        </View>

        <View style={cardStyles.divider} />

        {/* Price + disabled CTA */}
        <View style={cardStyles.priceRow}>
          <View>
            <Text style={cardStyles.price}>{course.price}<Text style={cardStyles.perMo}>/mo</Text></Text>
            <Text style={cardStyles.originalPrice}>{course.originalPrice}/mo</Text>
          </View>
          <View style={cardStyles.saveBadge}>
            <Text style={cardStyles.saveTxt}>SAVE {course.saving}</Text>
          </View>
          <View style={cardStyles.comingSoonBtn}>
            <Text style={cardStyles.comingSoonBtnTxt}>Coming Soon</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  headerWrapper: {
    backgroundColor: "#2d0a6e",
    paddingHorizontal: 16, paddingBottom: 14,
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    elevation: 10,
    shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  headerRow: { flexDirection: "row", alignItems: "center", paddingTop: 10, marginBottom: 14 },
  headerLogo: { width: 38, height: 38, marginRight: 10, borderRadius: 8 },
  brandArea: { flex: 1 },
  brandName: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5, lineHeight: 24 },
  brandSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarDefault: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.5)",
  },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 14 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, color: "#111827", fontSize: 14, padding: 0 },

  // Flagship Programs
  flagshipSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  flagshipHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  flagshipTitle: { color: COLORS.text, fontSize: 20, fontWeight: "900" },
  certifiedBadge: {
    backgroundColor: "rgba(13,148,136,0.15)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "#0d948855",
  },
  certifiedTxt: { color: "#0d9488", fontSize: 11, fontWeight: "700" },
  flagshipCard: {
    backgroundColor: "#13122a", borderRadius: 18, marginBottom: 16,
    overflow: "hidden", borderWidth: 1, borderColor: "#1e1b4b",
    shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  flagshipTypeBadge: {
    position: "absolute", top: 12, left: 12, zIndex: 10,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  flagshipTypeTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },
  flagshipImgBox: { height: 200, position: "relative" },
  flagshipImg: { width: "100%", height: "100%" },
  flagshipImgDim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  flagshipStartingSoonBox: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(6,3,20,0.55)",
  },
  flagshipStartingSoonTxt: {
    color: "#a78bfa", fontSize: 16, fontWeight: "900", letterSpacing: 2,
    borderWidth: 1.5, borderColor: "rgba(124,58,237,0.6)",
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "rgba(10,6,30,0.85)",
  },
  flagshipInfo: { padding: 16 },
  levelBadge: {
    alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: "rgba(34,197,94,0.15)", borderWidth: 1, borderColor: "#22c55e44",
    marginBottom: 8,
  },
  levelTxt: { color: "#22c55e", fontSize: 11, fontWeight: "700" },
  flagshipName: { color: "#f3f4f6", fontSize: 18, fontWeight: "900", marginBottom: 6 },
  flagshipDesc: { color: "#9ca3af", fontSize: 13, lineHeight: 19, marginBottom: 14 },
  flagshipPriceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  flagshipPrice: { color: "#f3f4f6", fontSize: 22, fontWeight: "900" },
  viewProgramBtn: {
    backgroundColor: "#7c3aed", borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  viewProgramTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },

  statsStrip: {
    flexDirection: "row", justifyContent: "space-around",
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: "#13122a", borderRadius: 16,
    paddingVertical: 14, borderWidth: 1, borderColor: "#1e1b4b",
  },
  statItem: { alignItems: "center" },
  statVal: { color: "#f3f4f6", fontSize: 15, fontWeight: "900" },
  statLbl: { color: "#6b7280", fontSize: 9, marginTop: 1 },

  catScroll: { marginBottom: 10 },
  catChip: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#3730a3",
  },
  catChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  catChipTxt: { color: "#6b7280", fontSize: 12, fontWeight: "600" },
  catChipTxtActive: { color: "#fff" },

  resultsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, marginBottom: 4,
  },
  resultsCount: { color: COLORS.textMuted, fontSize: 13 },
  sortBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(124,58,237,0.12)", borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  sortTxt: { color: "#a78bfa", fontSize: 11, fontWeight: "700" },
  sortDropdown: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: "#13122a", borderRadius: 12,
    borderWidth: 1, borderColor: "#1e1b4b",
    overflow: "hidden",
  },
  sortOption: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  sortOptionTxt: { color: COLORS.textMuted, fontSize: 14 },
  sortOptionActive: { color: "#a78bfa", fontWeight: "700" },

  skeleton: { backgroundColor: "#13122a", borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: "#1e1b4b", overflow: "hidden" },
  skeletonImg: { width: "100%", height: 180, backgroundColor: "#1e1b4b" },
  skeletonLine: { height: 12, backgroundColor: "#1e1b4b", borderRadius: 6 },

  emptyState: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(124,58,237,0.15)", alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  emptySub: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 },
  emptyBtn: {
    backgroundColor: "#7c3aed", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 10,
  },
  emptyBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: "#13122a", borderRadius: 18,
    borderWidth: 1, borderColor: "#1e1b4b",
    marginBottom: 18, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  imgWrapper: { height: 190, position: "relative" },
  img: { width: "100%", height: "100%" },
  imgDim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.2)" },
  statusBadge: {
    position: "absolute", top: 12, left: 12,
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statusLive: { backgroundColor: "rgba(239,68,68,0.9)", borderWidth: 1, borderColor: "#ef4444" },
  statusUpcoming: { backgroundColor: "rgba(124,58,237,0.88)", borderWidth: 1, borderColor: "#7c3aed" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  statusTxt: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  tagRow: { position: "absolute", bottom: 12, left: 12, flexDirection: "row", gap: 6 },
  tag: { backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagTxt: { color: "#e5e7eb", fontSize: 10, fontWeight: "600" },

  body: { padding: 16 },
  title: { color: "#f3f4f6", fontSize: 16, fontWeight: "900", lineHeight: 22, marginBottom: 8 },

  educatorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  educatorTxt: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },

  metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 8, gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaVal: { color: "#d1d5db", fontSize: 12, fontWeight: "600" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#4b5563" },

  startRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
  startTxt: { color: "#9ca3af", fontSize: 12 },

  divider: { height: 1, backgroundColor: "#1e1b4b", marginBottom: 12 },

  priceRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  price: { color: "#f3f4f6", fontSize: 18, fontWeight: "900" },
  perMo: { fontSize: 11, color: "#9ca3af", fontWeight: "400" },
  originalPrice: { color: "#6b7280", fontSize: 11, textDecorationLine: "line-through", marginTop: 2 },
  saveBadge: { backgroundColor: "#065f46", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  saveTxt: { color: "#34d399", fontSize: 10, fontWeight: "800" },
  enrollBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#7c3aed", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  enrollTxt: { color: "#fff", fontSize: 13, fontWeight: "800" },

  // Coming soon card overrides
  cardDimmed: { borderColor: "#111128" },
  comingSoonOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(5,4,18,0.55)",
    alignItems: "center", justifyContent: "center",
  },
  comingSoonPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(15,14,38,0.85)", borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
    borderWidth: 1, borderColor: "#334155",
  },
  comingSoonPillTxt: { color: "#94a3b8", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  comingSoonBtn: {
    backgroundColor: "#1a1932", borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: "#2d2b52",
  },
  comingSoonBtnTxt: { color: "#4b5563", fontSize: 13, fontWeight: "700" },
});
