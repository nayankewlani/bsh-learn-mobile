import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import client from "../../api/client";

interface Transaction {
  _id: string;
  amount: number;
  type: "course" | "subscription";
  createdAt: string;
  user?: { name: string; email: string };
  course?: { title: string };
}

export default function AdminTransactionsScreen() {
  const [txns, setTxns]           = useState<Transaction[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      const res = await client.get(`/admin/transactions?page=${p}`);
      const list: Transaction[] = res.data?.transactions ?? [];
      setTxns((prev) => (append ? [...prev, ...list] : list));
      setTotal(res.data?.total ?? 0);
      setPage(p);
      if (!append) {
        const sum = list.reduce((acc, t) => acc + t.amount, 0);
        setTotalRevenue(sum);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load transactions");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(1); }, []);

  const fmt = (paise: number) => {
    const rs = paise / 100;
    return rs >= 100000 ? `₹${(rs / 100000).toFixed(1)}L` : `₹${rs.toLocaleString("en-IN")}`;
  };

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.iconBox, { backgroundColor: item.type === "course" ? "#7c3aed22" : "#f59e0b22" }]}>
          <Ionicons
            name={item.type === "course" ? "book" : "card"}
            size={18}
            color={item.type === "course" ? "#a78bfa" : "#f59e0b"}
          />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.courseName} numberOfLines={1}>
            {item.course?.title ?? (item.type === "subscription" ? "Subscription" : "Course")}
          </Text>
          <Text style={styles.userName}>{item.user?.name ?? "—"}</Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </Text>
        </View>
        <Text style={styles.amount}>{fmt(item.amount)}</Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `Transactions (${total})` }} />
      <View style={styles.root}>
        {/* Revenue summary */}
        <View style={styles.summary}>
          <Ionicons name="trending-up" size={18} color="#4ade80" />
          <Text style={styles.summaryText}>Page revenue: {fmt(totalRevenue)}</Text>
          <Text style={styles.summaryCount}>{total} total</Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
          <FlatList
            data={txns}
            keyExtractor={(t) => t._id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); load(1); }}
                tintColor={COLORS.primaryLight}
              />
            }
            onEndReached={() => {
              if (txns.length < total && !loadingMore) {
                setLoadingMore(true);
                load(page + 1, true);
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={COLORS.primaryLight} style={{ margin: 16 }} /> : null}
            ListEmptyComponent={
              <View style={styles.center}>
                <Ionicons name="card-outline" size={48} color="#4b5563" />
                <Text style={styles.emptyText}>No transactions yet</Text>
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
  summary: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: "#13122a", borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  summaryText:  { color: "#4ade80", fontWeight: "700", fontSize: 14, flex: 1 },
  summaryCount: { color: COLORS.textMuted, fontSize: 12 },
  card: {
    backgroundColor: "#13122a", borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: "#1e1b4b", marginBottom: 8,
  },
  row:        { flexDirection: "row", alignItems: "center" },
  iconBox:    { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  courseName: { color: COLORS.text, fontWeight: "600", fontSize: 14, marginBottom: 2 },
  userName:   { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
  date:       { color: "#6b7280", fontSize: 11 },
  amount:     { color: "#4ade80", fontWeight: "800", fontSize: 16 },
  emptyText:  { color: COLORS.textMuted, marginTop: 12, fontSize: 14 },
});
