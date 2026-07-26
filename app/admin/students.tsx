import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import client from "../../api/client";

interface Student {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  enrollmentCount: number;
  createdAt: string;
}

export default function AdminStudentsScreen() {
  const [students, setStudents]   = useState<Student[]>([]);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [toggling, setToggling]   = useState<string | null>(null);

  const load = useCallback(async (p = 1, q = search, append = false) => {
    try {
      const res = await client.get(`/admin/students?page=${p}&limit=20&search=${encodeURIComponent(q)}`);
      const list: Student[] = res.data?.students ?? [];
      setStudents((prev) => (append ? [...prev, ...list] : list));
      setTotal(res.data?.total ?? 0);
      setPage(p);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load students");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { load(1, search); }, [search]);

  const toggleActive = (student: Student) => {
    const action = student.isActive ? "Suspend" : "Reinstate";
    Alert.alert(action, `${action} ${student.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: action, style: student.isActive ? "destructive" : "default",
        onPress: async () => {
          setToggling(student._id);
          try {
            await client.patch(`/admin/permissions/${student._id}`, { isActive: !student.isActive });
            setStudents((prev) =>
              prev.map((s) => s._id === student._id ? { ...s, isActive: !s.isActive } : s)
            );
          } catch (e: any) {
            Alert.alert("Error", e?.response?.data?.message ?? "Failed");
          } finally {
            setToggling(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Student }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: item.isActive ? COLORS.primary : "#374151" }]}>
          <Text style={styles.avatarText}>
            {item.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="book-outline" size={11} color="#6b7280" />
            <Text style={styles.meta}>{item.enrollmentCount} courses</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={[styles.statusTag, { color: item.isActive ? "#4ade80" : "#ef4444" }]}>
              {item.isActive ? "Active" : "Suspended"}
            </Text>
          </View>
        </View>
        {toggling === item._id ? (
          <ActivityIndicator size="small" color={COLORS.primaryLight} />
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: item.isActive ? "#ef444415" : "#4ade8015" }]}
            onPress={() => toggleActive(item)}
          >
            <Ionicons
              name={item.isActive ? "ban-outline" : "checkmark-circle-outline"}
              size={18}
              color={item.isActive ? "#ef4444" : "#4ade80"}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `Students (${total})` }} />
      <View style={styles.root}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email…"
            placeholderTextColor="#6b7280"
            value={search}
            onChangeText={(t) => { setSearch(t); setLoading(true); }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
          <FlatList
            data={students}
            keyExtractor={(s) => s._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(1, search); }}
                tintColor={COLORS.primaryLight}
              />
            }
            onEndReached={() => {
              if (students.length < total && !loadingMore) {
                setLoadingMore(true);
                load(page + 1, search, true);
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primaryLight} style={{ margin: 16 }} /> : null}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="people-outline" size={48} color="#4b5563" />
                <Text style={styles.emptyText}>No students found</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  list:   { padding: 16, paddingBottom: 56 },

  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#13122a", paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 14 },

  card: {
    backgroundColor: "#13122a", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#1e1b4b", marginBottom: 8,
  },
  row:    { flexDirection: "row", alignItems: "center" },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  name:   { color: COLORS.text, fontWeight: "700", fontSize: 15, marginBottom: 2 },
  email:  { color: COLORS.textMuted, fontSize: 12, marginBottom: 4 },
  metaRow:    { flexDirection: "row", alignItems: "center", gap: 4 },
  meta:       { color: "#6b7280", fontSize: 11 },
  dot:        { color: "#6b7280", fontSize: 11 },
  statusTag:  { fontSize: 11, fontWeight: "600" },
  actionBtn:  { padding: 8, borderRadius: 10 },
  emptyText:  { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
});
