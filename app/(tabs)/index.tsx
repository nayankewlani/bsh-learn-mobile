import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList, Image } from "react-native";
import { router } from "expo-router";
import { useCourseStore, Course } from "../../stores/courseStore";
import { useAuthStore } from "../../stores/authStore";
import { COLORS } from "../../constants";
import CourseCard from "../../components/CourseCard";

const CATEGORIES = [
  { icon: "🧠", name: "Advance Hypnosis" }, { icon: "✨", name: "Hypnosis 2.0" },
  { icon: "🌑", name: "Art of shadow work" }, { icon: "🌿", name: "Reiki" },
  { icon: "📖", name: "Akashik" },
];

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { featuredCourses, fetchFeatured, isLoading } = useCourseStore();

  useEffect(() => { fetchFeatured(); }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <Image source={require("../../assets/logo-1.png")} style={styles.heroLogo} resizeMode="contain" />
        <Text style={styles.greeting}>👋 {user ? `Hello, ${user.name.split(" ")[0]}!` : "Welcome to BSHLearn"}</Text>
        <Text style={styles.heroTitle}>India's Best{"\n"}Spiritual Learning</Text>
        <Text style={styles.heroSub}>Hypnosis · Reiki · Shadow Work · Akashik</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push("/(tabs)/explore")}>
          <Text style={styles.ctaBtnText}>Explore Courses →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Browse Categories</Text>
        <View style={styles.catGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.name} style={styles.catBtn} onPress={() => router.push({ pathname: "/(tabs)/explore", params: { category: cat.name } })}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={styles.catName}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Courses</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/explore")}>
            <Text style={{ color: COLORS.primaryLight, fontSize: 13 }}>View All</Text>
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <Text style={{ color: COLORS.textMuted, padding: 20 }}>Loading...</Text>
        ) : (
          <FlatList
            data={featuredCourses}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <CourseCard course={item} style={{ width: 260, marginRight: 16 }} />}
            ListEmptyComponent={<Text style={{ color: COLORS.textMuted, padding: 20 }}>No courses yet</Text>}
          />
        )}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: COLORS.surface, padding: 24, paddingTop: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  heroLogo: { width: 140, height: 52, marginBottom: 12 },
  greeting: { color: COLORS.primaryLight, fontSize: 14, marginBottom: 8 },
  heroTitle: { fontSize: 30, fontWeight: "900", color: COLORS.text, lineHeight: 36, marginBottom: 8 },
  heroSub: { color: COLORS.textMuted, fontSize: 14, marginBottom: 20 },
  ctaBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignSelf: "flex-start" },
  ctaBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section: { padding: 20 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.text, marginBottom: 14 },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surface2, borderRadius: 10, padding: 10, alignItems: "center", width: "30%" },
  catIcon: { fontSize: 22, marginBottom: 4 },
  catName: { color: COLORS.primaryLight, fontSize: 11, textAlign: "center" },
});
