import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Linking } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import client from "../../api/client";
import { COLORS } from "../../constants";
import { purchaseCourse, restorePurchases } from "../../services/purchaseService";

interface Lesson { _id: string; title: string; isFree: boolean; duration: number; muxPlaybackId?: string; chapter: string; }
interface Chapter { _id: string; title: string; order: number; }
interface MediaItem { _id: string; title: string; description?: string; type: "video" | "pdf" | "image"; muxPlaybackId?: string; gcsKey?: string; tags: string[]; }
interface Course { _id: string; title: string; description: string; educator: { name: string }; category: string; level: string; price: number; discountPrice?: number; thumbnail: string; rating: number; enrollmentCount: number; totalLessons: number; requirements: string[]; objectives: string[]; razorpayPaymentLink?: string; ghlPortalUrl?: string; }

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { restoredCount } = await restorePurchases();
      if (restoredCount > 0) {
        // Re-fetch this course's enrollment status in case it was just restored.
        client.get(`/courses/${id}`).then(({ data }) => setIsEnrolled(data.isEnrolled)).catch(() => {});
        Alert.alert("Restored", `Recovered ${restoredCount} purchase${restoredCount > 1 ? "s" : ""}.`);
      } else {
        Alert.alert("Nothing to Restore", "No pending purchases were found for this account.");
      }
    } finally { setRestoring(false); }
  };

  useEffect(() => {
    if (!id) return;
    client.get(`/courses/${id}`)
      .then(({ data }) => {
        setCourse(data.course);
        setChapters(data.chapters);
        setLessons(data.lessons);
        setIsEnrolled(data.isEnrolled);
        if (data.isEnrolled) {
          client.get(`/media/for-me?target=course&courseId=${id}`)
            .then(r => setMediaItems(r.data.items || []))
            .catch(() => {});
        }
      })
      .catch(() => {})
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
      return;
    }
    setEnrolling(true);
    try {
      const result = await purchaseCourse({
        courseId: course!._id, title: course!.title,
        priceRupees: Math.round(course!.price / 100), discountPriceRupees: course!.discountPrice ? Math.round(course!.discountPrice / 100) : undefined,
        razorpayPaymentLink: course!.razorpayPaymentLink,
        userName: user.name, userEmail: user.email,
      });
      if (result.success) {
        setIsEnrolled(true);
        Alert.alert("Enrolled! 🎉", `You're now enrolled in ${course!.title}!`);
      }
    } finally { setEnrolling(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!course) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Course not found</Text></View>;

  // DB stores price in paise; convert to rupees for display
  const priceRs = Math.round((course.discountPrice ?? course.price) / 100);
  const price   = course.discountPrice ?? course.price;  // keep paise for payment

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={styles.thumbnail} contentFit="cover" cachePolicy="disk" />
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
            <Text style={styles.price}>{priceRs === 0 ? "Free" : `₹${priceRs.toLocaleString("en-IN")}`}</Text>
            <TouchableOpacity style={styles.enrollBtn} onPress={enroll} disabled={enrolling}>
              <Text style={styles.enrollBtnText}>{enrolling ? "Enrolling..." : isEnrolled ? "Enrolled ✓" : priceRs === 0 ? "Enroll Free" : "Buy Now"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isEnrolled && priceRs > 0 && Platform.OS === "ios" && (
          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={{ alignSelf: "center", marginBottom: 16 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, textDecorationLine: "underline" }}>
              {restoring ? "Restoring…" : "Restore Purchases"}
            </Text>
          </TouchableOpacity>
        )}

        {isEnrolled && lessons.length > 0 && (
          <TouchableOpacity style={styles.startBtn} onPress={() => router.push(`/watch/${lessons[0]._id}`)}>
            <Text style={styles.startBtnText}>▶ Start Learning</Text>
          </TouchableOpacity>
        )}

        {isEnrolled && course.ghlPortalUrl ? (
          <TouchableOpacity
            style={styles.ghlBtn}
            onPress={() => Linking.openURL(course.ghlPortalUrl!).catch(() => {})}
            activeOpacity={0.85}
          >
            <Text style={styles.ghlBtnText}>🎬 Watch Classes on BSH Portal</Text>
          </TouchableOpacity>
        ) : null}

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

        {isEnrolled && mediaItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resources</Text>
            {mediaItems.map(item => (
              <TouchableOpacity
                key={item._id}
                style={styles.mediaCard}
                activeOpacity={0.75}
                onPress={async () => {
                  if (item.type === "video") {
                    router.push({ pathname: "/watch/[lessonId]" as any, params: { lessonId: item._id, source: "media" } });
                  } else {
                    try {
                      const { data } = await client.get(`/media/${item._id}/stream`);
                      if (data.streamUrl) Linking.openURL(data.streamUrl);
                    } catch {}
                  }
                }}
              >
                <Text style={styles.mediaIcon}>{item.type === "video" ? "🎬" : item.type === "pdf" ? "📄" : "🖼️"}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
                  {item.description ? <Text style={styles.mediaDesc} numberOfLines={1}>{item.description}</Text> : null}
                </View>
                <Text style={{ color: COLORS.primaryLight, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  startBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 12 },
  startBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ghlBtn: { backgroundColor: "#0f766e", borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#134e4a" },
  ghlBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section: { marginTop: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 12 },
  listItem: { flexDirection: "row", gap: 10, marginBottom: 8 },
  listText: { color: "#93c5fd", fontSize: 14, flex: 1 },
  chapter:    { backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  mediaCard:  { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border ?? COLORS.surface },
  mediaIcon:  { fontSize: 26, marginRight: 12 },
  mediaTitle: { fontSize: 13, fontWeight: "700", color: COLORS.text, marginBottom: 2 },
  mediaDesc:  { fontSize: 11, color: COLORS.textMuted },
  chapterTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 },
  lesson: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 },
  lessonIcon: { fontSize: 14 },
  lessonTitle: { color: "#e5e7eb", fontSize: 13, flex: 1 },
  freeBadge: { backgroundColor: "#052e16", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
});
