import React, { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCourseStore, Course } from "../../stores/courseStore";
import { COLORS } from "../../constants";
import CourseCard from "../../components/CourseCard";

const CATEGORIES = ["All", "Advance Hypnosis", "Hypnosis 2.0", "Art of shadow work", "Reiki", "Akashik"];

export default function ExploreScreen() {
  const { courses, fetchCourses, isLoading } = useCourseStore();
  const params = useLocalSearchParams<{ category?: string }>();
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState(params.category || "All");

  useEffect(() => {
    if (params.category && CATEGORIES.includes(params.category)) {
      setSelectedCat(params.category);
    }
  }, [params.category]);

  useEffect(() => {
    const fetchParams: Record<string, string | number> = { limit: 20 };
    if (search) fetchParams.search = search;
    if (selectedCat !== "All") fetchParams.category = selectedCat;
    fetchCourses(fetchParams);
  }, [search, selectedCat]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search courses, topics..."
          placeholderTextColor="#4b5563"
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={CATEGORIES}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        style={styles.catList}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setSelectedCat(item)} style={[styles.catChip, selectedCat === item && styles.catChipActive]}>
            <Text style={[styles.catChipText, selectedCat === item && { color: "#fff" }]}>{item}</Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item: Course) => item._id}
          numColumns={1}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          renderItem={({ item }) => <CourseCard course={item} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 15 }}>No courses found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: { padding: 16, paddingBottom: 8 },
  searchInput: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12, color: COLORS.text, padding: 12, fontSize: 15 },
  catList: { paddingHorizontal: 16, paddingBottom: 8 },
  catChip: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.surface2, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginRight: 8 },
  catChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  catChipText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
});
