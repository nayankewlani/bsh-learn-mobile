import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import client from "../../api/client";
import { useAuthStore } from "../../stores/authStore";

interface LiveClass {
  _id: string;
  title: string;
  status: "scheduled" | "live" | "ended" | "pending_approval" | "rejected";
  scheduledAt: string;
  educator: { _id: string; name: string };
  participantCount?: number;
}

const STATUS_FILTERS = [
  { key: "all",       label: "All"       },
  { key: "live",      label: "Live Now"  },
  { key: "scheduled", label: "Upcoming"  },
  { key: "ended",     label: "Ended"     },
];
const STATUS_COLOR: Record<string, string> = {
  live:      "#ef4444",
  scheduled: "#a78bfa",
  ended:     "#6b7280",
};

export default function AdminLiveClassesScreen() {
  const { user } = useAuthStore();
  const [classes, setClasses]     = useState<LiveClass[]>([]);
  const [filter, setFilter]       = useState("all");
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (status = filter) => {
    try {
      const q = status === "all" ? "" : `?status=${status}`;
      const res = await client.get(`/admin/live-classes${q}`);
      setClasses(res.data?.classes ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load live classes");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); load(filter); }, [filter]);

  const renderItem = ({ item }: { item: LiveClass }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.educator}>{item.educator?.name}</Text>
          <Text style={styles.time}>
            {new Date(item.scheduledAt).toLocaleString("en-IN", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: (STATUS_COLOR[item.status] || "#6b7280") + "22", borderColor: (STATUS_COLOR[item.status] || "#6b7280") + "55" }]}>
          {item.status === "live" && <View style={styles.liveDot} />}
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] || "#9ca3af" }]}>
            {item.status === "live" ? "LIVE" : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      {item.educator?._id === user?._id && (item.status === "scheduled" || item.status === "live") && (
        <TouchableOpacity style={styles.startBtn} onPress={() => router.push({ pathname: "/live-room" as any, params: { classId: item._id } })}>
          <Ionicons name={item.status === "live" ? "radio" : "play"} size={14} color="#fff" />
          <Text style={styles.startBtnTxt}>{item.status === "live" ? "Rejoin Live" : "Start Live"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `Live Classes (${total})` }} />
      <View style={styles.root}>
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
          <FlatList
            data={classes}
            keyExtractor={(c) => c._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(filter); }}
                tintColor={COLORS.primaryLight}
              />
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="radio-outline" size={48} color="#4b5563" />
                <Text style={styles.emptyText}>No live classes found</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.bg },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  list:    { padding: 16, paddingBottom: 56 },
  filterRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    backgroundColor: "#13122a", borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
    flexWrap: "wrap",
  },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#1e1b4b", borderWidth: 1, borderColor: "#3730a3" },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  card: {
    backgroundColor: "#13122a", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#1e1b4b", marginBottom: 8,
  },
  cardTop:    { flexDirection: "row", alignItems: "flex-start" },
  title:      { color: COLORS.text, fontWeight: "700", fontSize: 14, marginBottom: 4, lineHeight: 20 },
  educator:   { color: "#a78bfa", fontSize: 12, marginBottom: 3 },
  time:       { color: "#6b7280", fontSize: 11 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 5 },
  liveDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  statusText: { fontSize: 11, fontWeight: "700" },
  emptyText:  { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
  startBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 9, marginTop: 10 },
  startBtnTxt:{ color: "#fff", fontWeight: "700", fontSize: 13 },
});
