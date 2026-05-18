import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Video, ResizeMode } from "expo-av";
import client from "../../api/client";
import { COLORS } from "../../constants";

interface LessonData {
  _id: string;
  title: string;
  description?: string;
  muxPlaybackId?: string;
  type: string;
  duration: number;
}

export default function WatchScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [streamUrl, setStreamUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    if (!lessonId) return;
    client.get(`/lessons/${lessonId}/watch`)
      .then(({ data }) => {
        setLesson(data.lesson);
        setStreamUrl(data.streamUrl || `https://stream.mux.com/${data.lesson.muxPlaybackId}.m3u8`);
      })
      .catch(() => Alert.alert("Error", "Could not load video"))
      .finally(() => setLoading(false));
  }, [lessonId]);

  const markComplete = async () => {
    try {
      await client.post(`/progress/${lessonId}`);
      setMarked(true);
      Alert.alert("✅ Lesson Complete!", "Great job! Keep going.");
    } catch {}
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!lesson) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Lesson not found</Text></View>;

  return (
    <View style={styles.container}>
      {streamUrl ? (
        <Video
          source={{ uri: streamUrl }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
        />
      ) : (
        <View style={[styles.video, styles.noVideo]}>
          <Text style={{ fontSize: 48 }}>📹</Text>
          <Text style={{ color: COLORS.textMuted, marginTop: 8 }}>Video not available</Text>
        </View>
      )}

      <ScrollView style={styles.info}>
        <Text style={styles.title}>{lesson.title}</Text>
        {lesson.description && <Text style={styles.desc}>{lesson.description}</Text>}

        <TouchableOpacity style={[styles.markBtn, marked && { backgroundColor: "#052e16" }]} onPress={markComplete} disabled={marked}>
          <Text style={[styles.markBtnText, marked && { color: COLORS.green }]}>
            {marked ? "✅ Completed" : "Mark as Complete"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back to Course</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.bg },
  video: { width: "100%", height: 240, backgroundColor: "#000" },
  noVideo: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  title: { color: COLORS.text, fontSize: 18, fontWeight: "800", marginBottom: 8 },
  desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 20 },
  markBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginBottom: 12 },
  markBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  backBtn: { padding: 12, alignItems: "center" },
  backBtnText: { color: COLORS.primaryLight, fontSize: 14 },
});
