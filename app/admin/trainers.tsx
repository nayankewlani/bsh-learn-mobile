import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import client from "../../api/client";

interface Trainer {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  courseCount: number;
  studentCount: number;
  revenuePaise: number;
  createdAt: string;
}

export default function AdminTrainersScreen() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await client.get("/admin/trainers");
      setTrainers(res.data?.trainers ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load trainers");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const toggleActive = (trainer: Trainer) => {
    const action = trainer.isActive ? "Deactivate" : "Activate";
    Alert.alert(action, `${action} trainer ${trainer.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: action, style: trainer.isActive ? "destructive" : "default",
        onPress: async () => {
          setToggling(trainer._id);
          try {
            await client.patch(`/admin/trainers/${trainer._id}/status`, { isActive: !trainer.isActive });
            setTrainers((prev) =>
              prev.map((t) => t._id === trainer._id ? { ...t, isActive: !t.isActive } : t)
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

  const fmtRevenue = (paise: number) => {
    const rs = paise / 100;
    return rs >= 100000 ? `₹${(rs / 100000).toFixed(1)}L` : `₹${rs.toLocaleString("en-IN")}`;
  };

  const renderItem = ({ item }: { item: Trainer }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: item.isActive ? "#7c3aed" : "#374151" }]}>
          <Text style={styles.avatarText}>
            {item.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={[styles.activeTag, { color: item.isActive ? "#4ade80" : "#ef4444" }]}>
              {item.isActive ? "Active" : "Inactive"}
            </Text>
          </View>
          <Text style={styles.email}>{item.email}</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBadge}>
              <Ionicons name="book-outline" size={11} color="#a78bfa" />
              <Text style={styles.statText}>{item.courseCount} courses</Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="people-outline" size={11} color="#60a5fa" />
              <Text style={styles.statText}>{item.studentCount} students</Text>
            </View>
            <View style={styles.statBadge}>
              <Ionicons name="trending-up-outline" size={11} color="#4ade80" />
              <Text style={styles.statText}>{fmtRevenue(item.revenuePaise)}</Text>
            </View>
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
              name={item.isActive ? "pause-circle-outline" : "play-circle-outline"}
              size={22}
              color={item.isActive ? "#ef4444" : "#4ade80"}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `Trainers (${trainers.length})` }} />
      <View style={styles.root}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
          <FlatList
            data={trainers}
            keyExtractor={(t) => t._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(); }}
                tintColor={COLORS.primaryLight}
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="mic-outline" size={48} color="#4b5563" />
                <Text style={styles.emptyText}>No trainers yet</Text>
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

  card: {
    backgroundColor: "#13122a", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#1e1b4b", marginBottom: 8,
  },
  row:      { flexDirection: "row", alignItems: "center" },
  avatar:   { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  nameRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  name:     { color: COLORS.text, fontWeight: "700", fontSize: 15 },
  activeTag:{ fontSize: 11, fontWeight: "600" },
  email:    { color: COLORS.textMuted, fontSize: 12, marginBottom: 6 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBadge:{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#1e1b4b", borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  statText: { color: COLORS.textMuted, fontSize: 10 },
  actionBtn:{ padding: 8, borderRadius: 10 },
  emptyText:{ color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
});
