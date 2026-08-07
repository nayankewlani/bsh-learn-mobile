import React, { useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Dimensions, Alert, Animated, NativeSyntheticEvent, NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { COLORS } from "../../constants";

const { width: SW } = Dimensions.get("window");

const advHypnosisImg  = require("../../assets/advanced-hypnosis.png");
const hypnosis2Img    = require("../../assets/hypnosis-2.png");
const shadowWorkImg   = require("../../assets/shadow-work.png");
const reikiImg        = require("../../assets/reiki.png");
const akashicImg      = require("../../assets/akashic.png");
const mesmerismImg    = require("../../assets/mesmerism.png");
const pastLifeImg     = require("../../assets/past-life-regression.png");
const deepTranceImg   = require("../../assets/deep-trance.png");
const bshLogoImg      = require("../../assets/BSH-logo-02.png");

const CATEGORIES = ["All", "Books", "Courses", "Merch", "Tools", "Combos"];

// isActive = false → dark "Starting Soon" overlay; no purchase action
const PRODUCTS = [
  {
    id: "p1", category: "Courses", isActive: true,
    title: "Advance Hypnosis Master Course",
    desc: "Complete A–Z hypnosis certification with live Q&A sessions.",
    img: advHypnosisImg, price: 29999, originalPrice: 34999,
    badge: "BESTSELLER", badgeColor: "#f59e0b",
    tag: "Certification",
    slug: "advance-hypnosis",
  },
  {
    id: "p2", category: "Courses", isActive: false,
    title: "Art of Shadow Work",
    desc: "Deep inner healing — heal suppressed emotions permanently.",
    img: shadowWorkImg, price: 2499, originalPrice: 3999,
    badge: "TOP RATED", badgeColor: "#7c3aed",
    tag: "Digital Course",
    slug: "",
  },
  {
    id: "p3", category: "Courses", isActive: false,
    title: "Akashik Records Access",
    desc: "Learn to access universal knowledge and soul blueprint.",
    img: akashicImg, price: 2999, originalPrice: 4999,
    badge: null, badgeColor: "",
    tag: "Digital Course",
    slug: "",
  },
  {
    id: "p4", category: "Courses", isActive: false,
    title: "Reiki Level 1 & 2",
    desc: "Universal life energy healing — beginner to practitioner.",
    img: reikiImg, price: 1999, originalPrice: 3000,
    badge: "NEW", badgeColor: "#059669",
    tag: "Workshop",
    slug: "",
  },
  {
    id: "p5", category: "Courses", isActive: true,
    title: "Hypnosis 2.0 — Upgrade Your Mind",
    desc: "Advanced techniques beyond beginner hypnosis.",
    img: hypnosis2Img, price: 2999, originalPrice: 4500,
    badge: null, badgeColor: "",
    tag: "Digital Course",
    slug: "hypnosis-2",
  },
  {
    id: "p6", category: "Courses", isActive: false,
    title: "Mesmerism & Energy Mastery",
    desc: "Ancient art of magnetism and personal influence.",
    img: mesmerismImg, price: 1999, originalPrice: 3500,
    badge: null, badgeColor: "",
    tag: "Workshop",
    slug: "",
  },
  {
    id: "p7", category: "Courses", isActive: false,
    title: "Past Life Regression Therapy",
    desc: "Journey into past lives to heal present-day blocks.",
    img: pastLifeImg, price: 2499, originalPrice: 3999,
    badge: "POPULAR", badgeColor: "#7c3aed",
    tag: "Therapy Course",
    slug: "",
  },
  {
    id: "p8", category: "Combos", isActive: false,
    title: "BSH Complete Healing Bundle",
    desc: "All 8 flagship courses — hypnosis, reiki, shadow work & more.",
    img: deepTranceImg, price: 9999, originalPrice: 24000,
    badge: "SAVE 58%", badgeColor: "#ef4444",
    tag: "Bundle",
    slug: "",
  },
  {
    id: "p9", category: "Tools", isActive: false,
    title: "BSH Plus Membership",
    desc: "Access all 20 healing tools, guided meditations & live sessions.",
    img: bshLogoImg, price: 999, originalPrice: 1999,
    badge: "MONTHLY", badgeColor: "#0d9488",
    tag: "Subscription",
    slug: "",
  },
];

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [activeCategory, setActiveCategory] = useState("All");

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

  const filtered = activeCategory === "All"
    ? PRODUCTS
    : PRODUCTS.filter(p => p.category === activeCategory);

  const handleBuy = (product: typeof PRODUCTS[0]) => {
    if (!product.isActive) return;
    if (product.slug) { router.push(`/program/${product.slug}` as any); return; }
    Alert.alert(
      "Add to Cart",
      `Add "${product.title}" for ₹${product.price.toLocaleString()}?`,
      [
        { text: "Buy Now", onPress: () => {} },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* ── Floating Header (same as Home) ── */}
      <Animated.View style={[styles.headerWrapper, { paddingTop: insets.top, transform: [{ translateY: headerTranslateY }] }]}>
        <View style={styles.headerRow}>
          <Image source={bshLogoImg} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.brandArea}>
            <Text style={styles.brandName}>BSH</Text>
            <Text style={styles.brandSub}>Store</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.streakPill}>
              <Text>🔥</Text>
              <Text style={styles.streakTxt}>0 day</Text>
            </View>
            <TouchableOpacity style={styles.iconBtn}>
              <Text style={{ fontSize: 20 }}>🎁</Text>
            </TouchableOpacity>
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
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.9}>
          <Ionicons name="search-outline" size={16} color="#9ca3af" />
          <Text style={styles.searchPlaceholder}>Search for <Text style={{ color: "#7c3aed", fontWeight: "700" }}>courses</Text></Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: HEADER_H + 6, paddingBottom: 48 }}
      >
        {/* Promo Banner */}
        <View style={styles.promoBanner}>
          <View style={styles.promoLeft}>
            <Text style={styles.promoTag}>LIMITED OFFER</Text>
            <Text style={styles.promoTitle}>Up to 60% Off</Text>
            <Text style={styles.promoSub}>On all BSH courses this week</Text>
          </View>
          <Text style={styles.promoEmoji}>🌟</Text>
        </View>

        {/* Category Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.catScroll}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, flexDirection: "row", alignItems: "center" }}
        >
          {CATEGORIES.map((cat, idx) => {
            const active = cat === activeCategory;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[styles.catTab, active && styles.catTabActive, idx < CATEGORIES.length - 1 && { marginRight: 8 }]}
              >
                <Text style={[styles.catTxt, active && styles.catTxtActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Product Grid */}
        <View style={styles.grid}>
        {filtered.map((product, idx) => {
          const discount = Math.round((1 - product.price / product.originalPrice) * 100);
          const isRightCol = idx % 2 === 1;
          const active = product.isActive;
          return (
            <TouchableOpacity
              key={product.id}
              style={[styles.card, isRightCol && { marginRight: 0 }]}
              onPress={() => handleBuy(product)}
              activeOpacity={active ? 0.85 : 1}
            >
              {/* Image */}
              <View style={styles.cardImgWrapper}>
                <Image source={product.img} style={[styles.cardImg, !active && { opacity: 0.45 }]} />
                <View style={styles.cardImgDim} />
                {active && product.badge && (
                  <View style={[styles.cardBadge, { backgroundColor: product.badgeColor }]}>
                    <Text style={styles.cardBadgeTxt}>{product.badge}</Text>
                  </View>
                )}
                <View style={styles.cardTag}>
                  <Text style={styles.cardTagTxt}>{product.tag}</Text>
                </View>
              </View>

              {/* Body */}
              <View style={[styles.cardBody, !active && { opacity: 0.45 }]}>
                <Text style={styles.cardTitle} numberOfLines={2}>{product.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{product.desc}</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.price}>₹{product.price.toLocaleString()}</Text>
                  <Text style={styles.originalPrice}>₹{product.originalPrice.toLocaleString()}</Text>
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountTxt}>{discount}% OFF</Text>
                  </View>
                </View>
              </View>

              {/* Starting Soon overlay for inactive courses */}
              {!active && (
                <View style={styles.startingSoonOverlay}>
                  <View style={styles.startingSoonBadge}>
                    <Text style={styles.startingSoonTxt}>STARTING SOON</Text>
                  </View>
                </View>
              )}

              {/* Action button pinned at bottom */}
              <View style={styles.cardFooter}>
                {active ? (
                  <View style={styles.buyBtn}>
                    <Text style={styles.buyBtnTxt}>Enroll Now</Text>
                  </View>
                ) : (
                  <View style={[styles.buyBtn, styles.comingSoonBtn]}>
                    <Text style={[styles.buyBtnTxt, { color: "#6b7280" }]}>Coming Soon</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  // ── Floating header (mirrors Home) ───────────────────────────────────────
  headerWrapper: {
    backgroundColor: "#2d0a6e",
    paddingHorizontal: 16, paddingBottom: 14,
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    elevation: 10,
    shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },
  headerRow: { flexDirection: "row", alignItems: "center", paddingTop: 10, marginBottom: 14 },
  headerLogo: { width: 38, height: 38, marginRight: 10, borderRadius: 8 },
  brandArea: { flex: 1, marginRight: 10 },
  brandName: { color: "#fff", fontSize: 20, fontWeight: "900", letterSpacing: 0.5, lineHeight: 24 },
  brandSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: "500" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  streakPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  streakTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  iconBtn: { padding: 2 },
  avatar: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" },
  avatarDefault: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.5)",
  },
  avatarInitial: { color: "#fff", fontWeight: "800", fontSize: 14 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  searchPlaceholder: { color: "#9ca3af", fontSize: 14, flex: 1 },

  promoBanner: {
    marginHorizontal: 16, marginTop: 12, marginBottom: 4,
    backgroundColor: "#2d0a6e",
    borderRadius: 16, padding: 18,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1, borderColor: "#4c1d95",
  },
  promoLeft: { flex: 1 },
  promoTag: {
    color: "#a78bfa", fontSize: 10, fontWeight: "800", letterSpacing: 1,
    marginBottom: 4,
  },
  promoTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginBottom: 2 },
  promoSub: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  promoEmoji: { fontSize: 48, marginLeft: 12 },

  catScroll: { marginTop: 12, marginBottom: 4, flexGrow: 0 },
  catTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#3730a3",
  },
  catTabActive: { backgroundColor: "rgba(124,58,237,0.18)", borderColor: "#7c3aed" },
  catTxt: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  catTxtActive: { color: "#c4b5fd" },

  grid: {
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24,
    flexDirection: "row", flexWrap: "wrap",
  },

  card: {
    width: (SW - 46) / 2,
    marginBottom: 14,
    marginRight: 14,
    backgroundColor: "#13122a",
    borderRadius: 16, overflow: "hidden",
    borderWidth: 1, borderColor: "#1e1b4b",
  },
  cardImgWrapper: { height: 130, position: "relative" },
  cardImg: { width: "100%", height: "100%", resizeMode: "cover" },
  cardImgDim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.25)" },
  cardBadge: {
    position: "absolute", top: 8, left: 8,
    borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
  },
  cardBadgeTxt: { color: "#fff", fontSize: 8, fontWeight: "800" },
  cardTag: {
    position: "absolute", bottom: 8, right: 8,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 3,
  },
  cardTagTxt: { color: "#e5e7eb", fontSize: 9, fontWeight: "600" },

  cardBody: { padding: 10, paddingBottom: 4 },
  cardTitle: { color: COLORS.text, fontSize: 12, fontWeight: "800", lineHeight: 17, marginBottom: 4 },
  cardDesc: { color: COLORS.textMuted, fontSize: 10, lineHeight: 14, marginBottom: 10 },

  priceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10, flexWrap: "wrap" },
  price: { color: "#f3f4f6", fontSize: 15, fontWeight: "900" },
  originalPrice: { color: "#6b7280", fontSize: 11, textDecorationLine: "line-through" },
  discountBadge: { backgroundColor: "#065f46", borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  discountTxt: { color: "#34d399", fontSize: 9, fontWeight: "800" },

  cardFooter: { paddingHorizontal: 10, paddingBottom: 10 },
  buyBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingVertical: 9, alignItems: "center",
  },
  comingSoonBtn: { backgroundColor: "#1f1f35", borderWidth: 1, borderColor: "#2d2b52" },
  buyBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "800" },

  startingSoonOverlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    zIndex: 10,
  },
  startingSoonBadge: {
    backgroundColor: "rgba(10,6,30,0.82)",
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(124,58,237,0.5)",
    paddingHorizontal: 12, paddingVertical: 7,
  },
  startingSoonTxt: {
    color: "#a78bfa", fontSize: 10, fontWeight: "900",
    letterSpacing: 1.5,
  },
});
