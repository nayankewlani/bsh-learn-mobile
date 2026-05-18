import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useAuthStore } from "../../stores/authStore";
import client from "../../api/client";
import { COLORS } from "../../constants";
import { router } from "expo-router";

interface LiveClass {
  _id: string;
  title: string;
  description?: string;
  educator: { name: string };
  scheduledAt: string;
  duration: number;
  status: string;
}

export default function LiveScreen() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/live-classes").then(({ data }) => setClasses(data.classes)).finally(() => setLoading(false));
  }, []);

  const joinClass = async (cls: LiveClass) => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (cls.status === "ended") {
      Alert.alert("Class Ended", "This class has already ended.");
      return;
    }
    if (cls.status !== "live" && user.role !== "educator") {
      Alert.alert("Not Live Yet", "This class hasn't started yet. Check back when it goes live.");
      return;
    }
    try {
      const isHost = user.role === "educator";
      const endpoint = isHost ? `/live-classes/${cls._id}/start` : `/live-classes/${cls._id}/join`;
      const { data } = await client.post(endpoint);
      Alert.alert("Joined!", `Channel: ${data.channel}\nToken: ${data.token.substring(0, 30)}...`);
    } catch (err: unknown) {
      Alert.alert("Error", (err as { message?: string }).message || "Failed to join class");
    }
  };

  const fmtDate = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={classes}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📡</Text>
            <Text style={styles.emptyText}>No live classes scheduled</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.statusBadge, { backgroundColor: item.status === "live" ? "#450a0a" : "#1e1b4b" }]}>
                <Text style={{ color: item.status === "live" ? "#f87171" : COLORS.primaryLight, fontSize: 12, fontWeight: "700" }}>
                  {item.status === "live" ? "🔴 LIVE" : "📅 Scheduled"}
                </Text>
              </View>
              <Text style={styles.duration}>{item.duration} min</Text>
            </View>

            <Text style={styles.title}>{item.title}</Text>
            {item.description && <Text style={styles.desc}>{item.description}</Text>}
            <Text style={styles.educator}>👨‍🏫 {item.educator.name}</Text>
            <Text style={styles.date}>🗓 {fmtDate(item.scheduledAt)}</Text>

            <TouchableOpacity style={[styles.joinBtn, item.status !== "live" && { backgroundColor: COLORS.surface2 }]} onPress={() => joinClass(item)}>
              <Text style={[styles.joinBtnText, item.status !== "live" && { color: COLORS.textMuted }]}>
                {item.status === "live" ? "Join Now →" : (user?.role === "educator" ? "Start Class" : "Remind Me")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.surface2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  duration: { color: COLORS.textMuted, fontSize: 12 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: "800", marginBottom: 6, lineHeight: 22 },
  desc: { color: COLORS.textMuted, fontSize: 13, marginBottom: 8 },
  educator: { color: "#c4b5fd", fontSize: 13, marginBottom: 4 },
  date: { color: COLORS.textMuted, fontSize: 12, marginBottom: 16 },
  joinBtn: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  joinBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
