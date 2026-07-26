import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, Modal, ActivityIndicator, Image,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import client from "../../api/client";
import { COLORS } from "../../constants";

interface HomeClass {
  _id: string;
  title: string;
  educator: string;
  subject: string;
  subjectColor: string;
  lang: string;
  thumbnailUrl: string;
  recordingUrl: string;
  views: string;
  bgColor: string;
  isFeatured: boolean;
  isActive: boolean;
  order: number;
}

type FormData = Omit<HomeClass, "_id">;

const EMPTY_FORM: FormData = {
  title: "",
  educator: "",
  subject: "Hypnosis",
  subjectColor: "#7c3aed",
  lang: "Hindi",
  thumbnailUrl: "",
  recordingUrl: "",
  views: "0",
  bgColor: "#1e1b4b",
  isFeatured: false,
  isActive: true,
  order: 0,
};

const SUBJECTS = [
  "Hypnosis", "Hypnosis 2.0", "Shadow Work", "Reiki", "Deep Trance",
  "Akashik", "Mesmerism", "Past Life Regression", "Vedic Astrology",
];

const LANGS = ["Hindi", "English", "Hindi / English", "Marathi"];

export default function AdminHomeClasses() {
  const insets = useSafeAreaInsets();
  const [classes, setClasses] = useState<HomeClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchClasses = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await client.get("/home-classes/admin");
      setClasses(data.classes ?? []);
    } catch {
      Alert.alert("Error", "Failed to load home classes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  const openAdd = () => {
    setEditId(null);
    setForm({ ...EMPTY_FORM, order: classes.length });
    setModalOpen(true);
  };

  const openEdit = (cls: HomeClass) => {
    setEditId(cls._id);
    setForm({
      title: cls.title,
      educator: cls.educator,
      subject: cls.subject,
      subjectColor: cls.subjectColor,
      lang: cls.lang,
      thumbnailUrl: cls.thumbnailUrl,
      recordingUrl: cls.recordingUrl,
      views: cls.views,
      bgColor: cls.bgColor,
      isFeatured: cls.isFeatured,
      isActive: cls.isActive,
      order: cls.order,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.educator.trim()) {
      Alert.alert("Validation", "Title and Educator are required.");
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await client.patch(`/home-classes/admin/${editId}`, form);
      } else {
        await client.post("/home-classes/admin", form);
      }
      setModalOpen(false);
      fetchClasses();
    } catch {
      Alert.alert("Error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cls: HomeClass) => {
    Alert.alert("Delete Class", `Delete "${cls.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await client.delete(`/home-classes/admin/${cls._id}`);
            fetchClasses();
          } catch {
            Alert.alert("Error", "Failed to delete.");
          }
        },
      },
    ]);
  };

  const toggleFeatured = async (cls: HomeClass) => {
    try {
      await client.patch(`/home-classes/admin/${cls._id}`, { isFeatured: !cls.isFeatured });
      fetchClasses();
    } catch { /* silent */ }
  };

  const toggleActive = async (cls: HomeClass) => {
    try {
      await client.patch(`/home-classes/admin/${cls._id}`, { isActive: !cls.isActive });
      fetchClasses();
    } catch { /* silent */ }
  };

  const setField = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(prev => ({ ...prev, [key]: val }));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Home Free Classes</Text>
        <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTxt}>Loading classes…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <Text style={styles.hint}>
            ⭐ Featured = "Most Engaging" section · Active = visible on Home
          </Text>

          {classes.length === 0 && (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTxt}>No classes yet.</Text>
              <TouchableOpacity onPress={openAdd} style={styles.emptyBtn}>
                <Text style={styles.emptyBtnTxt}>Add First Class</Text>
              </TouchableOpacity>
            </View>
          )}

          {classes.map((cls) => (
            <View key={cls._id} style={styles.card}>
              <View style={styles.cardLeft}>
                {cls.thumbnailUrl ? (
                  <Image source={{ uri: cls.thumbnailUrl }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={{ fontSize: 22 }}>🧠</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{cls.title}</Text>
                <Text style={styles.cardSub}>{cls.educator}</Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.subjBadge, { backgroundColor: cls.subjectColor + "33" }]}>
                    <Text style={[styles.subjTxt, { color: cls.subjectColor }]}>{cls.subject}</Text>
                  </View>
                  <Text style={styles.metaTxt}>{cls.lang}</Text>
                  <Text style={styles.metaTxt}>👁 {cls.views}</Text>
                </View>

                <View style={styles.cardToggles}>
                  <TouchableOpacity onPress={() => toggleFeatured(cls)} style={styles.toggleBtn}>
                    <Text style={cls.isFeatured ? styles.toggleOn : styles.toggleOff}>
                      {cls.isFeatured ? "⭐ Featured" : "☆ Feature"}
                    </Text>
                  </TouchableOpacity>
                  <Switch
                    value={cls.isActive}
                    onValueChange={() => toggleActive(cls)}
                    thumbColor={cls.isActive ? COLORS.primary : "#6b7280"}
                    trackColor={{ false: "#1e1b4b", true: COLORS.primary + "55" }}
                  />
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => openEdit(cls)} style={styles.editBtn}>
                  <Ionicons name="pencil-outline" size={18} color="#60a5fa" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(cls)} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editId ? "Edit Class" : "Add Class"}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={22} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput style={styles.input} value={form.title} onChangeText={v => setField("title", v)} placeholder="Class title" placeholderTextColor="#4b5563" />

              <Text style={styles.fieldLabel}>Educator *</Text>
              <TextInput style={styles.input} value={form.educator} onChangeText={v => setField("educator", v)} placeholder="Educator name" placeholderTextColor="#4b5563" />

              <Text style={styles.fieldLabel}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {SUBJECTS.map(s => (
                  <TouchableOpacity key={s} onPress={() => setField("subject", s)}
                    style={[styles.chipBtn, form.subject === s && styles.chipBtnActive]}>
                    <Text style={[styles.chipTxt, form.subject === s && styles.chipTxtActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Language</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {LANGS.map(l => (
                  <TouchableOpacity key={l} onPress={() => setField("lang", l)}
                    style={[styles.chipBtn, form.lang === l && styles.chipBtnActive]}>
                    <Text style={[styles.chipTxt, form.lang === l && styles.chipTxtActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.fieldLabel}>Thumbnail URL</Text>
              <TextInput style={styles.input} value={form.thumbnailUrl} onChangeText={v => setField("thumbnailUrl", v)} placeholder="https://..." placeholderTextColor="#4b5563" autoCapitalize="none" />

              <Text style={styles.fieldLabel}>Recording URL (YouTube / direct video)</Text>
              <TextInput style={styles.input} value={form.recordingUrl} onChangeText={v => setField("recordingUrl", v)} placeholder="https://youtu.be/... or direct .mp4 URL" placeholderTextColor="#4b5563" autoCapitalize="none" />

              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Views</Text>
                  <TextInput style={styles.input} value={form.views} onChangeText={v => setField("views", v)} placeholder="e.g. 12K" placeholderTextColor="#4b5563" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.fieldLabel}>Order</Text>
                  <TextInput style={styles.input} value={String(form.order)} onChangeText={v => setField("order", parseInt(v) || 0)} keyboardType="number-pad" placeholder="0" placeholderTextColor="#4b5563" />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Featured (Most Engaging section)</Text>
                <Switch value={form.isFeatured} onValueChange={v => setField("isFeatured", v)}
                  thumbColor={form.isFeatured ? COLORS.primary : "#6b7280"}
                  trackColor={{ false: "#1e1b4b", true: COLORS.primary + "55" }} />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.fieldLabel}>Active (visible on Home)</Text>
                <Switch value={form.isActive} onValueChange={v => setField("isActive", v)}
                  thumbColor={form.isActive ? "#22c55e" : "#6b7280"}
                  trackColor={{ false: "#1e1b4b", true: "#22c55e55" }} />
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnTxt}>{editId ? "Save Changes" : "Add Class"}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingTxt: { color: COLORS.textMuted, marginTop: 10, fontSize: 14 },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#12103a", borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  backBtn: { padding: 4 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  addBtn: {
    backgroundColor: COLORS.primary, borderRadius: 8, padding: 6,
  },

  hint: { color: "#6b7280", fontSize: 12, marginBottom: 14, lineHeight: 18 },

  emptyWrap: { alignItems: "center", paddingVertical: 48 },
  emptyTxt: { color: COLORS.textMuted, fontSize: 16, marginBottom: 16 },
  emptyBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  card: {
    backgroundColor: "#12103a", borderRadius: 14, padding: 12, marginBottom: 12,
    flexDirection: "row", borderWidth: 1, borderColor: "#1e1b4b",
  },
  cardLeft: { marginRight: 12 },
  thumb: { width: 72, height: 72, borderRadius: 10 },
  thumbPlaceholder: { backgroundColor: "#1e1b4b", alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  cardSub: { color: "#9ca3af", fontSize: 12, marginBottom: 6 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  subjBadge: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  subjTxt: { fontSize: 10, fontWeight: "700" },
  metaTxt: { color: "#6b7280", fontSize: 10 },
  cardToggles: { flexDirection: "row", alignItems: "center", gap: 10 },
  toggleBtn: { paddingVertical: 2 },
  toggleOn: { color: "#f59e0b", fontSize: 12, fontWeight: "700" },
  toggleOff: { color: "#6b7280", fontSize: 12 },
  cardActions: { justifyContent: "center", gap: 10, marginLeft: 8 },
  editBtn: { padding: 6 },
  delBtn: { padding: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: "#12103a", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: "92%", borderWidth: 1, borderColor: "#1e1b4b",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#1e1b4b",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "800" },
  modalBody: { padding: 20, gap: 4 },
  fieldLabel: { color: "#9ca3af", fontSize: 12, fontWeight: "600", marginBottom: 5 },
  input: {
    backgroundColor: "#1e1b4b", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    color: "#fff", fontSize: 14, marginBottom: 14, borderWidth: 1, borderColor: "#2d2a5e",
  },
  rowFields: { flexDirection: "row", marginBottom: 4 },
  chipBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, marginRight: 8,
    borderWidth: 1.5, borderColor: "#1e1b4b", backgroundColor: "#0a0914",
  },
  chipBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + "22" },
  chipTxt: { color: "#6b7280", fontSize: 12, fontWeight: "600" },
  chipTxtActive: { color: "#c4b5fd" },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: "center", marginTop: 8,
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  saveBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});
