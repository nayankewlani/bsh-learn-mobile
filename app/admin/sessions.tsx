import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, TextInput, Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import client from "../../api/client";

type Status = "pending" | "contacted" | "scheduled" | "completed" | "cancelled";

interface Session {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  type: "private" | "free_call";
  issues: string[];
  status: Status;
  createdAt: string;
  adminNotes?: string;
}

const STATUS_ORDER: Status[] = ["pending", "contacted", "scheduled", "completed", "cancelled"];
const STATUS_COLOR: Record<Status, string> = {
  pending:   "#f59e0b",
  contacted: "#60a5fa",
  scheduled: "#a78bfa",
  completed: "#4ade80",
  cancelled: "#ef4444",
};
const FILTERS: { key: string; label: string }[] = [
  { key: "all",       label: "All"       },
  { key: "pending",   label: "Pending"   },
  { key: "contacted", label: "Contacted" },
  { key: "scheduled", label: "Scheduled" },
  { key: "completed", label: "Completed" },
];

export default function AdminSessionsScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter]     = useState("pending");
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async (status = filter) => {
    try {
      const q = status === "all" ? "" : `?status=${status}`;
      const res = await client.get(`/admin/private-sessions${q}`);
      setSessions(res.data?.sessions ?? res.data ?? []);
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load sessions");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { setLoading(true); load(filter); }, [filter]);

  const cycleStatus = async (session: Session) => {
    const idx  = STATUS_ORDER.indexOf(session.status);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length];
    Alert.alert(
      "Update Status",
      `Change "${session.name}" from ${session.status} → ${next}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update", onPress: async () => {
            setUpdating(session._id);
            try {
              await client.patch(`/admin/private-sessions/${session._id}`, { status: next });
              setSessions((prev) =>
                prev.map((s) => s._id === session._id ? { ...s, status: next } : s)
              );
            } catch (e: any) {
              Alert.alert("Error", e?.response?.data?.message ?? "Update failed");
            } finally {
              setUpdating(null);
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => cycleStatus(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email}</Text>
          {item.phone ? <Text style={styles.phone}>{item.phone}</Text> : null}
        </View>
        {updating === item._id ? (
          <ActivityIndicator size="small" color={COLORS.primaryLight} />
        ) : (
          <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[item.status] + "22", borderColor: STATUS_COLOR[item.status] + "55" }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.type}>
        {item.type === "free_call" ? "Free Call" : "Private Session"}
        {item.issues?.length > 0 ? ` · ${item.issues.slice(0, 2).join(", ")}` : ""}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </Text>
        <Text style={styles.tapHint}>Tap to update status →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Private Sessions" }} />
      <View style={styles.root}>
        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.chip, filter === f.key && styles.chipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(s) => s._id}
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
                <Ionicons name="calendar-outline" size={48} color="#4b5563" />
                <Text style={styles.emptyText}>No sessions found</Text>
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

  filterRow: {
    flexDirection: "row", paddingHorizontal: 12, paddingVertical: 10,
    gap: 8, backgroundColor: "#13122a", borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: "#1e1b4b", borderWidth: 1, borderColor: "#3730a3",
  },
  chipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText:       { color: COLORS.textMuted, fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },

  card: {
    backgroundColor: "#13122a", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#1e1b4b", marginBottom: 10,
  },
  cardTop:  { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  name:     { color: COLORS.text, fontWeight: "700", fontSize: 15, marginBottom: 2 },
  email:    { color: COLORS.textMuted, fontSize: 12 },
  phone:    { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
  type:     { color: "#a78bfa", fontSize: 12, fontWeight: "600", marginBottom: 6 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date:     { color: "#6b7280", fontSize: 11 },
  tapHint:  { color: "#4b5563", fontSize: 10, fontStyle: "italic" },
  statusPill:  { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText:  { fontSize: 11, fontWeight: "700" },
  emptyText:   { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
});
