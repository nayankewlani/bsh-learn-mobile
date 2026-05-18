import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { router } from "expo-router";
import { Course } from "../stores/courseStore";
import { COLORS } from "../constants";

interface Props {
  course: Course;
  showProgress?: number;
  style?: ViewStyle;
}

const CourseCard: React.FC<Props> = ({ course, showProgress, style }) => {
  const price = course.discountPrice ?? course.price;

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={() => router.push(`/course/${course._id}`)}
      activeOpacity={0.85}
    >
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={{ fontSize: 32 }}>📚</Text>
        </View>
      )}
      <View style={styles.info}>
        <View style={styles.badge}><Text style={styles.badgeText}>{course.category}</Text></View>
        <Text style={styles.title} numberOfLines={2}>{course.title}</Text>
        <Text style={styles.educator} numberOfLines={1}>👤 {course.educator?.name}</Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>⭐ {course.rating.toFixed(1)}</Text>
          <Text style={styles.stat}>👥 {course.enrollmentCount}</Text>
          <Text style={styles.stat}>📚 {course.totalLessons}</Text>
        </View>
        {showProgress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${showProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{showProgress}%</Text>
          </View>
        )}
        <Text style={styles.price}>{price === 0 ? "Free" : `₹${(price / 100).toLocaleString()}`}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: COLORS.surface2 },
  thumbnail: { width: "100%", height: 160 },
  thumbnailPlaceholder: { backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center" },
  info: { padding: 12 },
  badge: { backgroundColor: "#3b0764", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: "flex-start", marginBottom: 6 },
  badgeText: { color: "#d8b4fe", fontSize: 11, fontWeight: "700" },
  title: { color: COLORS.text, fontSize: 14, fontWeight: "700", lineHeight: 20, marginBottom: 4 },
  educator: { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  stats: { flexDirection: "row", gap: 8, marginBottom: 6 },
  stat: { color: COLORS.textMuted, fontSize: 11 },
  progressContainer: { marginBottom: 6 },
  progressBar: { height: 5, backgroundColor: COLORS.surface2, borderRadius: 3 },
  progressFill: { height: "100%", backgroundColor: COLORS.primaryLight, borderRadius: 3 },
  progressText: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  price: { color: COLORS.primaryLight, fontWeight: "800", fontSize: 16 },
});

export default CourseCard;
