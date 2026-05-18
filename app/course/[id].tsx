import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import client from "../../api/client";
import { COLORS } from "../../constants";

interface Lesson { _id: string; title: string; isFree: boolean; duration: number; muxPlaybackId?: string; chapter: string; }
interface Chapter { _id: string; title: string; order: number; }
interface Course { _id: string; title: string; description: string; educator: { name: string }; category: string; level: string; price: number; discountPrice?: number; thumbnail: string; rating: number; enrollmentCount: number; totalLessons: number; requirements: string[]; objectives: string[]; }

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    if (!id) return;
    client.get(`/courses/${id}`)
      .then(({ data }) => {
        setCourse(data.course);
        setChapters(data.chapters);
        setLessons(data.lessons);
        setIsEnrolled(data.isEnrolled);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const enroll = async () => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (course!.price === 0) {
      setEnrolling(true);
      try {
        await client.post(`/enroll/${id}`);
        setIsEnrolled(true);
        Alert.alert("Enrolled!", "You now have access to this course");
      } finally { setEnrolling(false); }
    } else {
      Alert.alert("Purchase Required", "Open on web to complete payment");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!course) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Course not found</Text></View>;

  const price = course.discountPrice ?? course.price;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={{ fontSize: 48 }}>📚</Text>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.badge}><Text style={styles.badgeText}>{course.category}</Text></View>
        <Text style={styles.title}>{course.title}</Text>
        <Text style={styles.desc}>{course.description}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.meta}>👤 {course.educator.name}</Text>
          <Text style={styles.meta}>⭐ {course.rating.toFixed(1)}</Text>
          <Text style={styles.meta}>👥 {course.enrollmentCount}</Text>
          <Text style={styles.meta}>📚 {course.totalLessons} lessons</Text>
        </View>

        {!isEnrolled && (
          <View style={styles.priceBox}>
            <Text style={styles.price}>{price === 0 ? "Free" : `₹${(price / 100).toLocaleString()}`}</Text>
            <TouchableOpacity style={styles.enrollBtn} onPress={enroll} disabled={enrolling}>
              <Text style={styles.enrollBtnText}>{enrolling ? "Enrolling..." : isEnrolled ? "Enrolled ✓" : price === 0 ? "Enroll Free" : "Buy Now"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {isEnrolled && lessons.length > 0 && (
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push(`/watch/${lessons[0]._id}`)}>
            <Text style={styles.startBtnText}>▶ Start Learning</Text>
          </TouchableOpacity>
        )}

        {course.objectives?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What you'll learn</Text>
            {course.objectives.map((obj, i) => (
              <View key={i} style={styles.listItem}>
                <Text style={{ color: COLORS.green }}>✓</Text>
                <Text style={styles.listText}>{obj}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Course Content</Text>
          {chapters.map((ch) => (
            <View key={ch._id} style={styles.chapter}>
              <Text style={styles.chapterTitle}>{ch.title}</Text>
              {lessons.filter(l => l.chapter === ch._id).map((lesson) => (
                <TouchableOpacity key={lesson._id} style={styles.lesson} onPress={() => (isEnrolled || lesson.isFree) && router.push(`/watch/${lesson._id}`)}>
                  <Text style={styles.lessonIcon}>{lesson.isFree ? "▶" : isEnrolled ? "▶" : "🔒"}</Text>
                  <Text style={[styles.lessonTitle, !isEnrolled && !lesson.isFree && { color: COLORS.textMuted }]}>{lesson.title}</Text>
                  {lesson.isFree && <View style={styles.freeBadge}><Text style={{ color: COLORS.green, fontSize: 11 }}>Free</Text></View>}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbnail: { width: "100%", height: 220 },
  thumbnailPlaceholder: { backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center" },
  content: { padding: 16 },
  badge: { backgroundColor: "#3b0764", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", marginBottom: 10 },
  badgeText: { color: "#d8b4fe", fontSize: 12, fontWeight: "700" },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "900", lineHeight: 28, marginBottom: 10 },
  desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  meta: { color: "#9ca3af", fontSize: 13 },
  priceBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.surface2 },
  price: { color: COLORS.primaryLight, fontSize: 26, fontWeight: "900" },
  enrollBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  enrollBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  startBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16 },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  section: { marginTop: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 12 },
  listItem: { flexDirection: "row", gap: 10, marginBottom: 8 },
  listText: { color: "#c4b5fd", fontSize: 14, flex: 1 },
  chapter: { backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  chapterTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 },
  lesson: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 },
  lessonIcon: { fontSize: 14 },
  lessonTitle: { color: "#e5e7eb", fontSize: 13, flex: 1 },
  freeBadge: { backgroundColor: "#052e16", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
});
