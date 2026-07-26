import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useCourseStore } from "../../stores/courseStore";
import { COLORS } from "../../constants";
import CourseCard from "../../components/CourseCard";

const SW = Dimensions.get("window").width;

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const ACHIEVEMENTS: { id: string; icon: IoniconName; label: string; color: string; earned: boolean }[] = [
  { id: "1", icon: "star",              label: "First Course",   color: "#f59e0b", earned: true  },
  { id: "2", icon: "flame",             label: "7-Day Streak",   color: "#ef4444", earned: true  },
  { id: "3", icon: "trophy-outline",    label: "Completed",      color: "#4ade80", earned: false },
  { id: "4", icon: "diamond-outline",   label: "BSH Elite",      color: "#a78bfa", earned: false },
  { id: "5", icon: "heart-outline",     label: "Healer",         color: "#ec4899", earned: false },
  { id: "6", icon: "shield-checkmark-outline", label: "Certified", color: "#06b6d4", earned: false },
];

const QUICK_ACTIONS: { icon: IoniconName; label: string; color: string; route: string | null }[] = [
  { icon: "book-outline",   label: "Courses",   color: "#7c3aed", route: "/(tabs)/explore" },
  { icon: "radio-outline",  label: "Live",      color: "#ef4444", route: "/(tabs)/live"    },
  { icon: "bag-outline",    label: "Store",     color: "#f59e0b", route: "/(tabs)/store"   },
  { icon: "person-outline", label: "Profile",   color: "#4ade80", route: null              },
];

const BENEFITS: { icon: IoniconName; text: string }[] = [
  { icon: "book-outline",       text: "Access 50+ healing courses"         },
  { icon: "radio-outline",      text: "Join live meditation sessions"       },
  { icon: "trending-up-outline",text: "Track your wellness journey"         },
  { icon: "ribbon-outline",     text: "Earn certificates & badges"          },
  { icon: "people-outline",     text: "Connect with a healing community"    },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuthStore();
  const { enrolledCourses, fetchMyCourses } = useCourseStore();

  const HEADER_H = 90 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);

  useEffect(() => {
    if (user) fetchMyCourses();
  }, [user]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
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

  /* ─── Guest View ─── */
  if (!user) {
    return (
      <View style={styles.guestRoot}>
        <View style={[styles.guestTopBar, { paddingTop: insets.top + 14 }]}>
          <Text style={styles.topBarBSH}>BSH</Text>
          <Text style={styles.topBarSub}>My Learning</Text>
        </View>

        <ScrollView contentContainerStyle={styles.guestContent} showsVerticalScrollIndicator={false}>
          <View style={styles.guestHero}>
            <View style={styles.guestIconRing}>
              <Ionicons name="school-outline" size={52} color="#a78bfa" />
            </View>
            <Text style={styles.guestTitle}>Start Your Healing Journey</Text>
            <Text style={styles.guestDesc}>
              Sign up to track progress, earn certificates, and access your enrolled courses.
            </Text>
          </View>

          <View style={styles.benefitsList}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <View style={styles.benefitIconBox}>
                  <Ionicons name={b.icon} size={20} color="#a78bfa" />
                </View>
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.signupBtn} onPress={() => router.push("/(auth)/register")}>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={styles.signupBtnText}>Sign Up Free</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => router.push("/(auth)/login")}>
            <Text style={styles.loginLinkText}>
              Already have an account?{"  "}
              <Text style={{ color: COLORS.primaryLight, fontWeight: "700" }}>Log in</Text>
            </Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </View>
    );
  }

  /* ─── Authenticated View ─── */
  const inProgress = enrolledCourses.filter((e) => e.progress < 100);
  const completed  = enrolledCourses.filter((e) => e.progress === 100);
  const streak     = 7;
  const initials   = user.name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const CARD_W = (SW - 32 - 20) / 3;

  return (
    <View style={styles.root}>
      {/* Floating Header */}
      <Animated.View
        style={[
          styles.floatHeader,
          { paddingTop: insets.top + 10, height: HEADER_H, transform: [{ translateY: headerTranslateY }] },
        ]}
      >
        <View style={styles.floatHeaderInner}>
          <View>
            <Text style={styles.floatBSH}>BSH</Text>
            <Text style={styles.floatSub}>My Learning</Text>
          </View>
          <View style={styles.floatRight}>
            <View style={styles.streakPill}>
              <Ionicons name="flame" size={14} color="#f59e0b" />
              <Text style={styles.streakNum}>{streak}</Text>
            </View>
            <TouchableOpacity style={styles.avatarChip} onPress={() => logout()}>
              <Text style={styles.avatarChipText}>{initials}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: HEADER_H + 20, paddingBottom: 64 }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileStripe} />
          <View style={styles.profileBody}>
            <View style={styles.avatarBig}>
              <Text style={styles.avatarBigText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user.name}</Text>
              {user.role === "educator" ? (
                <TouchableOpacity
                  style={[styles.rolePill, { zIndex: 999, elevation: 999 }]}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  activeOpacity={0.6}
                  onPress={() => router.push("/educator-dashboard" as any)}
                >
                  <Ionicons name="mic-outline" size={12} color="#a78bfa" />
                  <Text style={styles.roleLabel}>Educator</Text>
                  <Ionicons name="chevron-forward" size={11} color="#a78bfa" />
                </TouchableOpacity>
              ) : (
                <View style={styles.rolePill}>
                  <Ionicons name="school-outline" size={12} color="#a78bfa" />
                  <Text style={styles.roleLabel}>Learner</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.logoutTap} onPress={() => logout()}>
              <Ionicons name="log-out-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            { icon: "library-outline"         as IoniconName, val: enrolledCourses.length, label: "Enrolled",    color: "#a78bfa" },
            { icon: "hourglass-outline"        as IoniconName, val: inProgress.length,      label: "In Progress", color: "#f59e0b" },
            { icon: "checkmark-circle-outline" as IoniconName, val: completed.length,        label: "Completed",   color: "#4ade80" },
            { icon: "flame"                    as IoniconName, val: streak,                  label: "Day Streak",  color: "#ef4444" },
          ].map((s, i) => (
            <View key={s.label} style={[styles.statBox, i < 3 && { marginRight: 8 }]}>
              <Ionicons name={s.icon} size={16} color={s.color} />
              <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <View style={styles.sect}>
          <Text style={styles.sectTitle}>Quick Actions</Text>
          <View style={styles.quickRow}>
            {QUICK_ACTIONS.map((a, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.quickCard, i < 3 && { marginRight: 8 }]}
                onPress={() => (a.route ? router.push(a.route as any) : undefined)}
                activeOpacity={0.75}
              >
                <View style={[styles.quickIconBox, { backgroundColor: a.color + "25" }]}>
                  <Ionicons name={a.icon} size={22} color={a.color} />
                </View>
                <Text style={styles.quickLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Continue Learning */}
        {inProgress.length > 0 && (
          <View style={styles.sect}>
            <Text style={styles.sectTitle}>Continue Learning</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}
            >
              {inProgress.map((item) => (
                <CourseCard
                  key={item.course._id}
                  course={item.course}
                  showProgress={item.progress}
                  style={{ width: 260, marginRight: 16 }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Achievements */}
        <View style={styles.sect}>
          <Text style={styles.sectTitle}>Achievements</Text>
          <View style={styles.achieveGrid}>
            {ACHIEVEMENTS.map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.achieveTile,
                  { width: CARD_W, marginRight: (i + 1) % 3 === 0 ? 0 : 10 },
                  !a.earned && styles.achieveLocked,
                ]}
              >
                <View style={[styles.achieveRing, { backgroundColor: a.earned ? a.color + "25" : "#1e1b4b" }]}>
                  <Ionicons name={a.icon} size={26} color={a.earned ? a.color : "#374151"} />
                </View>
                <Text style={[styles.achieveName, !a.earned && { color: "#4b5563" }]}>{a.label}</Text>
                {!a.earned && (
                  <Ionicons name="lock-closed" size={10} color="#4b5563" style={{ marginTop: 2 }} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Educator shortcut */}
        {user.role === "educator" && (
          <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
            <TouchableOpacity
              style={styles.educatorRow}
              onPress={() => router.push("/educator-dashboard" as any)}
            >
              <Ionicons name="stats-chart-outline" size={18} color={COLORS.primaryLight} />
              <Text style={styles.educatorRowText}>Go to Educator Dashboard</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.primaryLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* Empty enrolled state */}
        {enrolledCourses.length === 0 && (
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Ionicons name="book-outline" size={38} color="#4b5563" />
            </View>
            <Text style={styles.emptyTitle}>No courses yet</Text>
            <Text style={styles.emptySub}>Start your healing journey today</Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push("/(tabs)/explore")}
            >
              <Ionicons name="search-outline" size={16} color="#fff" />
              <Text style={styles.exploreBtnText}>Explore Courses</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },

  /* ── Floating header ── */
  floatHeader: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, elevation: 10,
    backgroundColor: "#13122a",
    borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
    justifyContent: "flex-end", paddingBottom: 12,
  },
  floatHeaderInner: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", paddingHorizontal: 18,
  },
  floatBSH:   { color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 1 },
  floatSub:   { color: "#a78bfa", fontSize: 11, fontWeight: "600", marginTop: -2 },
  floatRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  streakPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#f59e0b22", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: "#f59e0b44",
  },
  streakNum:     { color: "#f59e0b", fontWeight: "700", fontSize: 13 },
  avatarChip:    {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "#a78bfa44",
  },
  avatarChipText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  /* ── Guest ── */
  guestRoot:    { flex: 1, backgroundColor: COLORS.bg },
  guestTopBar:  {
    backgroundColor: "#13122a", paddingHorizontal: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  topBarBSH:    { color: "#fff", fontWeight: "900", fontSize: 20, letterSpacing: 1 },
  topBarSub:    { color: "#a78bfa", fontSize: 11, fontWeight: "600", marginTop: -1 },
  guestContent: { paddingHorizontal: 24, paddingTop: 32 },
  guestHero:    { alignItems: "center", marginBottom: 30 },
  guestIconRing:{
    width: 100, height: 100, borderRadius: 50, backgroundColor: "#a78bfa22",
    alignItems: "center", justifyContent: "center", marginBottom: 20,
    borderWidth: 2, borderColor: "#a78bfa44",
  },
  guestTitle:   { color: COLORS.text, fontWeight: "800", fontSize: 22, textAlign: "center", marginBottom: 10 },
  guestDesc:    { color: COLORS.textMuted, fontSize: 14, textAlign: "center", lineHeight: 22 },
  benefitsList: { marginBottom: 28 },
  benefitRow:   { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  benefitIconBox:{
    width: 42, height: 42, borderRadius: 12, backgroundColor: "#a78bfa22",
    alignItems: "center", justifyContent: "center",
  },
  benefitText:  { color: COLORS.text, fontSize: 14, flex: 1 },
  signupBtn:    {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 15, marginBottom: 14,
  },
  signupBtnText:{ color: "#fff", fontWeight: "700", fontSize: 16 },
  loginLink:    { alignItems: "center", paddingVertical: 8 },
  loginLinkText:{ color: COLORS.textMuted, fontSize: 14 },

  /* ── Profile card ── */
  profileCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 18,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: "#3730a3",
    overflow: "hidden",
  },
  profileStripe: {
    position: "absolute", top: 0, left: 0, right: 0, height: 50,
    backgroundColor: "#3730a3",
  },
  profileBody: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16,
  },
  avatarBig:     {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center",
    borderWidth: 3, borderColor: "#1e1b4b", marginTop: -14,
  },
  avatarBigText: { color: "#fff", fontWeight: "900", fontSize: 21 },
  profileName:   { color: COLORS.text, fontWeight: "800", fontSize: 16, marginBottom: 5 },
  rolePill:      {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#a78bfa22", borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start",
  },
  roleLabel:  { color: "#a78bfa", fontSize: 11, fontWeight: "600" },
  logoutTap:  { padding: 6 },

  /* ── Stats strip ── */
  statsStrip: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 6 },
  statBox: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 13, padding: 10,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.surface2,
  },
  statNum: { fontSize: 18, fontWeight: "900", marginTop: 3, marginBottom: 1 },
  statLbl: { color: COLORS.textMuted, fontSize: 9, textAlign: "center" },

  /* ── Section ── */
  sect:      { marginBottom: 6, paddingTop: 10 },
  sectTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 12, paddingHorizontal: 16 },

  /* ── Quick actions ── */
  quickRow:    { flexDirection: "row", paddingHorizontal: 16 },
  quickCard:   {
    flex: 1, alignItems: "center", backgroundColor: COLORS.surface,
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: COLORS.surface2,
  },
  quickIconBox:{ width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 7 },
  quickLabel:  { color: COLORS.text, fontSize: 11, fontWeight: "600", textAlign: "center" },

  /* ── Achievements ── */
  achieveGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 16 },
  achieveTile: {
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
    alignItems: "center", borderWidth: 1, borderColor: COLORS.surface2, marginBottom: 10,
  },
  achieveLocked: { opacity: 0.5 },
  achieveRing:   {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  achieveName:   { color: COLORS.text, fontSize: 10, fontWeight: "600", textAlign: "center" },

  /* ── Educator row ── */
  educatorRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 12,
  },
  educatorRowText: { color: COLORS.primaryLight, fontWeight: "700", flex: 1 },

  /* ── Empty state ── */
  emptyBox:     { alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: COLORS.surface,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.surface2,
  },
  emptyTitle:   { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 5 },
  emptySub:     { color: COLORS.textMuted, fontSize: 13, marginBottom: 20 },
  exploreBtn:   {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
  },
  exploreBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
