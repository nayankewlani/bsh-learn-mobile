import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Switch, ScrollView, TextInput, Linking,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants";
import client from "../../api/client";

interface GHLConfig { inboundSecret?: string; tagId?: string; isConnected?: boolean; }
interface AdminCourse {
  _id: string; title: string; isPublished: boolean; isFeatured: boolean;
  price: number; discountPrice?: number; enrollmentCount?: number; rating?: number;
  category?: string; language?: string; level?: string;
  educator?: { name: string; email: string };
  razorpayPaymentLink?: string; razorpayPaymentLinkId?: string;
  ghlConfig?: GHLConfig; createdAt: string; kind: "course";
}
interface AdminProgram {
  _id: string; programId: string; title: string; isActive: boolean;
  price: number; discountPrice?: number; programType?: string;
  razorpayPaymentLink?: string; razorpayPaymentLinkId?: string;
  ghlConfig?: GHLConfig; createdAt: string; kind: "program";
}
type AdminItem = AdminCourse | AdminProgram;

const TABS = [
  { key:"courses",  label:"Courses"  },
  { key:"programs", label:"Programs" },
];

export default function AdminCoursesScreen() {
  const [tab, setTab] = useState<"courses"|"programs">("courses");
  const [courses, setCourses]     = useState<AdminCourse[]>([]);
  const [programs, setPrograms]   = useState<AdminProgram[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toggling, setToggling]   = useState<string | null>(null);
  const [editingRzp, setEditingRzp] = useState<string | null>(null);
  const [rzpLink, setRzpLink]     = useState("");

  const loadAll = useCallback(async () => {
    try {
      const res = await client.get("/admin-courses");
      const rawCourses:  any[] = res.data?.courses  ?? [];
      const rawPrograms: any[] = res.data?.programs ?? [];
      setCourses(rawCourses.map((x: any) => ({ ...x, kind:"course" })));
      setPrograms(rawPrograms.map((x: any) => ({ ...x, kind:"program" })));
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { setLoading(true); loadAll(); }, []);

  const toggleCourse = async (id: string, field: "isPublished"|"isFeatured", current: boolean) => {
    setToggling(id + field);
    try {
      await client.patch(`/admin-courses/${id}`, { [field]: !current });
      setCourses(prev => prev.map(c => c._id===id ? {...c, [field]:!current} : c));
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed");
    } finally { setToggling(null); }
  };

  const toggleProgram = async (id: string, current: boolean) => {
    setToggling(id);
    try {
      await client.patch(`/admin-courses/programs/${id}`, { isActive: !current });
      setPrograms(prev => prev.map(p => p._id===id ? {...p, isActive:!current} : p));
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed");
    } finally { setToggling(null); }
  };

  const generateRzpLink = async (id: string, type: "course"|"program") => {
    setToggling(id + "rzp");
    try {
      const url = type === "program"
        ? `/admin-courses/programs/${id}/razorpay-link`
        : `/admin-courses/${id}/razorpay-link`;
      const { data } = await client.post(url);
      Alert.alert("Payment Link Created", `Short URL: ${data.shortUrl || data.paymentLink}`, [
        { text:"Copy & Open", onPress:()=>Linking.openURL(data.shortUrl||data.paymentLink).catch(()=>{}) },
        { text:"OK" },
      ]);
      loadAll();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed to generate link");
    } finally { setToggling(null); }
  };

  const saveCustomRzpLink = async (id: string, type: "course"|"program") => {
    if (!rzpLink.trim()) return;
    setToggling(id + "save");
    try {
      const url = type === "program" ? `/admin-courses/programs/${id}` : `/admin-courses/${id}`;
      await client.patch(url, { razorpayPaymentLink: rzpLink.trim() });
      Alert.alert("Saved", "Razorpay payment link updated.");
      setEditingRzp(null); setRzpLink(""); loadAll();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.message ?? "Failed");
    } finally { setToggling(null); }
  };

  const renderCourse = ({ item }: { item: AdminCourse }) => {
    const rzpOk = !!item.razorpayPaymentLink;
    const ghlOk = !!item.ghlConfig?.tagId;
    const isEditRzp = editingRzp === item._id;
    return (
      <View style={s.card}>
        {/* Title row */}
        <View style={{flexDirection:"row",alignItems:"flex-start",gap:10,marginBottom:10}}>
          <View style={{flex:1}}>
            <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={{color:"#a78bfa",fontSize:12,marginBottom:2}}>{item.educator?.name || "—"}</Text>
            <View style={{flexDirection:"row",gap:6,flexWrap:"wrap",marginTop:4}}>
              <Text style={s.priceTag}>
                {item.discountPrice&&item.discountPrice>0
                  ? `₹${Math.round(item.discountPrice/100).toLocaleString("en-IN")}`
                  : `₹${Math.round(item.price/100).toLocaleString("en-IN")}`}
              </Text>
              {item.enrollmentCount != null && <Text style={s.metaTag}>👥 {item.enrollmentCount}</Text>}
              {item.rating ? <Text style={s.metaTag}>⭐ {item.rating.toFixed(1)}</Text> : null}
              {item.category && <Text style={s.metaTag}>{item.category}</Text>}
            </View>
          </View>
          <View style={{gap:4,alignItems:"flex-end"}}>
            {item.isPublished && <View style={s.liveBadge}><Text style={s.liveBadgeTxt}>LIVE</Text></View>}
            {item.isFeatured && <View style={s.featBadge}><Text style={s.featBadgeTxt}>★ FEATURED</Text></View>}
          </View>
        </View>

        {/* Integration status */}
        <View style={s.integRow}>
          <IntegDot ok={rzpOk} label="Razorpay" />
          <IntegDot ok={ghlOk} label="GHL" />
          <Text style={{color:"#6b7280",fontSize:10}}>Agora/Mux via live-classes & lessons</Text>
        </View>

        {/* Razorpay link */}
        {isEditRzp ? (
          <View style={{marginTop:8,gap:6}}>
            <TextInput
              value={rzpLink} onChangeText={setRzpLink}
              placeholder="Paste Razorpay payment link URL..."
              placeholderTextColor="#6b7280"
              style={s.rzpInput} autoCapitalize="none"
            />
            <View style={{flexDirection:"row",gap:8}}>
              <TouchableOpacity style={[s.actionBtn,{flex:1,backgroundColor:"#22c55e22",borderColor:"#22c55e44"}]}
                onPress={()=>saveCustomRzpLink(item._id,"course")}>
                <Text style={{color:"#22c55e",fontSize:12,fontWeight:"700"}}>
                  {toggling===item._id+"save" ? "Saving…" : "Save Link"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn,{backgroundColor:"#ef444422",borderColor:"#ef444444"}]}
                onPress={()=>{setEditingRzp(null);setRzpLink("");}}>
                <Text style={{color:"#ef4444",fontSize:12}}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{flexDirection:"row",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <TouchableOpacity style={s.actionBtn}
              onPress={()=>generateRzpLink(item._id,"course")}
              disabled={toggling===item._id+"rzp"}>
              {toggling===item._id+"rzp"
                ? <ActivityIndicator size="small" color="#a78bfa" />
                : <Text style={s.actionBtnTxt}>⚡ Gen Razorpay Link</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}
              onPress={()=>{setEditingRzp(item._id);setRzpLink(item.razorpayPaymentLink||"");}}>
              <Text style={s.actionBtnTxt}>✏️ Set Custom Link</Text>
            </TouchableOpacity>
            {rzpOk && (
              <TouchableOpacity style={s.actionBtn}
                onPress={()=>Linking.openURL(item.razorpayPaymentLink!).catch(()=>{})}>
                <Text style={s.actionBtnTxt}>🔗 Open Link</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Toggles */}
        <View style={s.toggleRow}>
          <ToggleItem
            label="Published" value={item.isPublished}
            loading={toggling===item._id+"isPublished"}
            onChange={()=>toggleCourse(item._id,"isPublished",item.isPublished)}
            color="#7c3aed"
          />
          <ToggleItem
            label="Featured" value={item.isFeatured}
            loading={toggling===item._id+"isFeatured"}
            onChange={()=>toggleCourse(item._id,"isFeatured",item.isFeatured)}
            color="#f59e0b"
          />
        </View>
      </View>
    );
  };

  const renderProgram = ({ item }: { item: AdminProgram }) => {
    const rzpOk = !!item.razorpayPaymentLink;
    const ghlOk = !!item.ghlConfig?.tagId;
    const isEditRzp = editingRzp === item._id;
    return (
      <View style={s.card}>
        <View style={{flexDirection:"row",alignItems:"flex-start",gap:10,marginBottom:10}}>
          <View style={{flex:1}}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={{color:"#60a5fa",fontSize:11,marginBottom:4}}>ID: {item.programId}</Text>
            <Text style={s.priceTag}>
              {item.discountPrice&&item.discountPrice>0
                ? `₹${Math.round(item.discountPrice/100).toLocaleString("en-IN")} (disc)`
                : `₹${Math.round(item.price/100).toLocaleString("en-IN")}`}
            </Text>
          </View>
          <View style={{gap:4,alignItems:"flex-end"}}>
            {item.isActive
              ? <View style={s.liveBadge}><Text style={s.liveBadgeTxt}>ACTIVE</Text></View>
              : <View style={[s.liveBadge,{backgroundColor:"#ef444422",borderColor:"#ef444444"}]}><Text style={[s.liveBadgeTxt,{color:"#ef4444"}]}>OFF</Text></View>}
          </View>
        </View>

        <View style={s.integRow}>
          <IntegDot ok={rzpOk} label="Razorpay" />
          <IntegDot ok={ghlOk} label="GHL" />
          <Text style={{color:"#6b7280",fontSize:10}}>GHL tag: {item.ghlConfig?.tagId||"—"}</Text>
        </View>

        {isEditRzp ? (
          <View style={{marginTop:8,gap:6}}>
            <TextInput
              value={rzpLink} onChangeText={setRzpLink}
              placeholder="Paste Razorpay payment link URL..."
              placeholderTextColor="#6b7280"
              style={s.rzpInput} autoCapitalize="none"
            />
            <View style={{flexDirection:"row",gap:8}}>
              <TouchableOpacity style={[s.actionBtn,{flex:1,backgroundColor:"#22c55e22",borderColor:"#22c55e44"}]}
                onPress={()=>saveCustomRzpLink(item._id,"program")}>
                <Text style={{color:"#22c55e",fontSize:12,fontWeight:"700"}}>
                  {toggling===item._id+"save" ? "Saving…" : "Save Link"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn,{backgroundColor:"#ef444422",borderColor:"#ef444444"}]}
                onPress={()=>{setEditingRzp(null);setRzpLink("");}}>
                <Text style={{color:"#ef4444",fontSize:12}}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={{flexDirection:"row",gap:8,marginTop:8,flexWrap:"wrap"}}>
            <TouchableOpacity style={s.actionBtn}
              onPress={()=>generateRzpLink(item._id,"program")}
              disabled={toggling===item._id+"rzp"}>
              {toggling===item._id+"rzp"
                ? <ActivityIndicator size="small" color="#a78bfa" />
                : <Text style={s.actionBtnTxt}>⚡ Gen Razorpay Link</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn}
              onPress={()=>{setEditingRzp(item._id);setRzpLink(item.razorpayPaymentLink||"");}}>
              <Text style={s.actionBtnTxt}>✏️ Set Custom Link</Text>
            </TouchableOpacity>
            {rzpOk && (
              <TouchableOpacity style={s.actionBtn}
                onPress={()=>Linking.openURL(item.razorpayPaymentLink!).catch(()=>{})}>
                <Text style={s.actionBtnTxt}>🔗 Open Link</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={s.toggleRow}>
          <ToggleItem
            label="Active" value={item.isActive}
            loading={toggling===item._id}
            onChange={()=>toggleProgram(item._id,item.isActive)}
            color="#22c55e"
          />
        </View>
      </View>
    );
  };

  const items = tab === "courses" ? courses : programs;
  const count = items.length;

  return (
    <>
      <Stack.Screen options={{ title: `Course Manager (${count})` }} />
      <View style={s.root}>
        {/* Info banner */}
        <View style={s.infoBanner}>
          <Text style={s.infoBannerTxt}>
            🔗 Razorpay · Agora (live) · Mux (recordings) · GHL (CRM sync) — all managed here
          </Text>
        </View>

        {/* Tabs */}
        <View style={s.tabRow}>
          {TABS.map(t=>(
            <TouchableOpacity key={t.key} style={[s.tabBtn, tab===t.key && s.tabBtnActive]}
              onPress={()=>setTab(t.key as any)}>
              <Text style={[s.tabBtnTxt, tab===t.key && s.tabBtnTxtActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={COLORS.primaryLight} />
          </View>
        ) : (
          <FlatList
            data={items as any[]}
            keyExtractor={(c) => c._id}
            renderItem={tab==="courses" ? renderCourse as any : renderProgram as any}
            contentContainerStyle={s.list}
            refreshControl={
              <RefreshControl refreshing={refreshing}
                onRefresh={()=>{ setRefreshing(true); loadAll(); }}
                tintColor={COLORS.primaryLight} />
            }
            ListEmptyComponent={
              <View style={s.center}>
                <Ionicons name="book-outline" size={48} color="#4b5563" />
                <Text style={s.emptyText}>No {tab} found</Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
const IntegDot = ({ ok, label }: { ok: boolean; label: string }) => (
  <View style={{ flexDirection:"row", alignItems:"center", gap:4 }}>
    <View style={{ width:7, height:7, borderRadius:4, backgroundColor: ok ? "#22c55e" : "#ef4444" }} />
    <Text style={{ color: ok ? "#22c55e" : "#ef4444", fontSize:10, fontWeight:"700" }}>{label}</Text>
  </View>
);

const ToggleItem = ({ label, value, loading, onChange, color }: {
  label:string; value:boolean; loading:boolean; onChange:()=>void; color:string;
}) => (
  <View style={{ flex:1, flexDirection:"row", alignItems:"center", justifyContent:"space-between", paddingHorizontal:4 }}>
    <Text style={{ color:"#9ca3af", fontSize:12 }}>{label}</Text>
    {loading
      ? <ActivityIndicator size="small" color={color} />
      : <Switch value={value} onValueChange={onChange}
          trackColor={{ false:"#374151", true:color+"55" }}
          thumbColor={value ? color : "#6b7280"} />}
  </View>
);

const s = StyleSheet.create({
  root:   { flex:1, backgroundColor:COLORS.bg },
  center: { flex:1, alignItems:"center", justifyContent:"center", paddingTop:60 },
  list:   { padding:14, paddingBottom:60 },

  infoBanner: { backgroundColor:"#1e1b4b", padding:10, paddingHorizontal:14, borderBottomWidth:1, borderBottomColor:"#3730a3" },
  infoBannerTxt: { color:"#a78bfa", fontSize:11, fontWeight:"600", textAlign:"center" },

  tabRow:       { flexDirection:"row", paddingHorizontal:12, paddingVertical:10, gap:8, backgroundColor:"#13122a", borderBottomWidth:1, borderBottomColor:"#1e1b4b" },
  tabBtn:       { flex:1, alignItems:"center", paddingVertical:8, borderRadius:12, backgroundColor:"#1e1b4b", borderWidth:1, borderColor:"#3730a3" },
  tabBtnActive: { backgroundColor:COLORS.primary, borderColor:COLORS.primary },
  tabBtnTxt:    { color:COLORS.textMuted, fontSize:13, fontWeight:"700" },
  tabBtnTxtActive: { color:"#fff" },

  card: { backgroundColor:"#13122a", borderRadius:14, padding:14, borderWidth:1, borderColor:"#1e1b4b", marginBottom:10 },
  cardTitle: { color:COLORS.text, fontWeight:"800", fontSize:14, marginBottom:3, lineHeight:20 },
  priceTag: { color:"#4ade80", fontSize:12, fontWeight:"700" },
  metaTag: { color:"#6b7280", fontSize:11 },

  integRow: { flexDirection:"row", alignItems:"center", gap:12, marginBottom:8, flexWrap:"wrap" },

  rzpInput: { backgroundColor:"#1e1b4b", borderRadius:10, paddingHorizontal:12, paddingVertical:10,
    color:"#fff", fontSize:12, borderWidth:1, borderColor:"#3730a3" },

  actionBtn: { flexDirection:"row", alignItems:"center", paddingHorizontal:10, paddingVertical:6,
    borderRadius:8, borderWidth:1, borderColor:"#3730a3", backgroundColor:"#1e1b4b" },
  actionBtnTxt: { color:"#a78bfa", fontSize:11, fontWeight:"700" },

  liveBadge:  { backgroundColor:"#4ade8022", borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:"#4ade8044" },
  liveBadgeTxt: { color:"#4ade80", fontSize:10, fontWeight:"700" },
  featBadge:  { backgroundColor:"#f59e0b22", borderRadius:8, paddingHorizontal:8, paddingVertical:3, borderWidth:1, borderColor:"#f59e0b44" },
  featBadgeTxt: { color:"#f59e0b", fontSize:10, fontWeight:"700" },

  toggleRow: { flexDirection:"row", borderTopWidth:1, borderTopColor:"#1e1b4b", paddingTop:10, gap:0, marginTop:8 },
  emptyText: { color:COLORS.textMuted, marginTop:12, fontSize:14 },
});
