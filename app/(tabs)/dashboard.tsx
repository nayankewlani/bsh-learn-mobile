import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useCourseStore } from "../../stores/courseStore";
import { COLORS } from "../../constants";
import CourseCard from "../../components/CourseCard";

export default function DashboardScreen() {
  const { user, logout } = useAuthStore();
  const { enrolledCourses, fetchMyCourses } = useCourseStore();

  useEffect(() => {
    if (user) fetchMyCourses();
  }, [user]);

  if (!user) {
    return (
      <View style={styles.guestContainer}>
        <Text style={styles.guestIcon}>🎓</Text>
        <Text style={styles.guestTitle}>Start Learning Today</Text>
        <Text style={styles.guestSub}>Create a free account to track your progress</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => router.push("/(auth)/register")}>
          <Text style={styles.authBtnText}>Sign Up Free</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginLink} onPress={() => router.push("/(auth)/login")}>
          <Text style={{ color: COLORS.primaryLight, fontSize: 14 }}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const inProgress = enrolledCourses.filter(e => e.progress < 100);
  const completed = enrolledCourses.filter(e => e.progress === 100);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userRole}>{user.role === "educator" ? "👨‍🏫 Educator" : "🎓 Student"}</Text>
        </View>
        <TouchableOpacity onPress={() => { logout(); }}>
          <Text style={{ color: COLORS.red, fontSize: 13 }}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {[
          { label: "Enrolled", value: enrolledCourses.length, color: COLORS.primary },
          { label: "In Progress", value: inProgress.length, color: COLORS.orange },
          { label: "Completed", value: completed.length, color: COLORS.green },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {user.role === "educator" && (
        <TouchableOpacity style={styles.educatorBtn} onPress={() => router.push("/(auth)/login")}>
          <Text style={styles.educatorBtnText}>📊 Go to Educator Dashboard</Text>
        </TouchableOpacity>
      )}

      {inProgress.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Continue Learning</Text>
          <FlatList
            data={inProgress}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.course._id}
            renderItem={({ item }) => <CourseCard course={item.course} showProgress={item.progress} style={{ width: 260, marginRight: 16 }} />}
          />
        </View>
      )}

      {enrolledCourses.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📚</Text>
          <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: "700", marginBottom: 8 }}>No courses yet</Text>
          <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push("/(tabs)/explore")}>
            <Text style={styles.exploreBtnText}>Explore Courses</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  guestContainer: { flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", padding: 32 },
  guestIcon: { fontSize: 72, marginBottom: 16 },
  guestTitle: { fontSize: 24, fontWeight: "800", color: COLORS.text, marginBottom: 8 },
  guestSub: { color: COLORS.textMuted, fontSize: 14, textAlign: "center", marginBottom: 28 },
  authBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  authBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  loginLink: { marginTop: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 14, padding: 20, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  userName: { color: COLORS.text, fontWeight: "800", fontSize: 16 },
  userRole: { color: COLORS.primaryLight, fontSize: 13 },
  statsRow: { flexDirection: "row", padding: 16, gap: 10 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.surface2 },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  educatorBtn: { margin: 16, backgroundColor: COLORS.surface2, borderRadius: 12, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  educatorBtnText: { color: COLORS.primaryLight, fontWeight: "700" },
  section: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 14 },
  emptyState: { alignItems: "center", padding: 40 },
  exploreBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  exploreBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
