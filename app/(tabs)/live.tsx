import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Animated, NativeSyntheticEvent, NativeScrollEvent, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import { useThemeStore } from "../../stores/themeStore";
import { showTabBar, hideTabBar } from "../../stores/tabBarStore";
import client from "../../api/client";

const bshLogoImg    = require("../../assets/BSH-logo-02.png");

type Tab = "oneOnOne" | "courseLive" | "freeAll";

interface LiveClass {
  _id: string; title: string; description?: string;
  educator: { name: string }; scheduledAt: string;
  duration: number; status: string; type?: string;
}

interface Session {
  _id: string; name: string; email: string; phone?: string;
  issues: string[]; detail?: string; type: string;
  status: string; createdAt: string;
}

export default function LiveScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { isDark, t } = useThemeStore();
  const params = useLocalSearchParams<{ tab?: string }>();

  const getInitialTab = (): Tab => {
    if (params.tab === "oneOnOne")  return "oneOnOne";
    if (params.tab === "courseLive") return "courseLive";
    if (params.tab === "freeAll")   return "freeAll";
    return "freeAll";
  };

  const [activeTab, setActiveTab] = useState<Tab>(getInitialTab());
  const [apiClasses, setApiClasses] = useState<LiveClass[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const HEADER_H = 120 + insets.top;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const headerHiddenRef = useRef(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (params.tab) setActiveTab(getInitialTab());
  }, [params.tab]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue:1.4, duration:700, useNativeDriver:true }),
        Animated.timing(pulseAnim, { toValue:1,   duration:700, useNativeDriver:true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    setLoading(true);
    if (activeTab === "freeAll" || activeTab === "courseLive") {
      // The backend defaults to status=scheduled when no status query param is given,
      // so "live" classes were silently never fetched at all — fetch both explicitly.
      Promise.all([client.get("/live-classes?status=scheduled"), client.get("/live-classes?status=live")])
        .then(([scheduled, live]) => setApiClasses([...(live.data.classes ?? []), ...(scheduled.data.classes ?? [])]))
        .catch(()=>{}).finally(()=>setLoading(false));
    } else if (activeTab === "oneOnOne" && user) {
      client.get(`/private-sessions/mine?email=${encodeURIComponent(user.email)}`).then(({ data }) => setSessions(data.sessions ?? [])).catch(()=>{}).finally(()=>setLoading(false));
    } else {
      setLoading(false);
    }
  }, [activeTab, user]);

  // Independent of which tab is active, since the header badge is shown everywhere.
  const [hasLiveNow, setHasLiveNow] = useState(false);
  useEffect(() => {
    client.get("/live-classes?status=live").then(({ data }) => setHasLiveNow((data.classes ?? []).length > 0)).catch(()=>{});
  }, []);

  const handleMainScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const delta = y - lastScrollYRef.current;
    lastScrollYRef.current = y;
    if (y < 60) {
      if (headerHiddenRef.current) {
        headerHiddenRef.current = false;
        Animated.spring(headerTranslateY, { toValue:0, tension:100, friction:12, useNativeDriver:true }).start();
      }
      return;
    }
    if (delta > 4 && !headerHiddenRef.current) {
      headerHiddenRef.current = true;
      hideTabBar();
      Animated.timing(headerTranslateY, { toValue:-HEADER_H, duration:220, useNativeDriver:true }).start();
    } else if (delta < -4 && headerHiddenRef.current) {
      headerHiddenRef.current = false;
      showTabBar();
      Animated.timing(headerTranslateY, { toValue:0, duration:200, useNativeDriver:true }).start();
    }
  };

  const TAB_CONFIG: { key:Tab; label:string; icon:React.ComponentProps<typeof Ionicons>["name"]; color:string }[] = [
    { key:"oneOnOne",   label:"1:1 Sessions", icon:"people-outline",  color:"#7c3aed" },
    { key:"courseLive", label:"Course Live",  icon:"school-outline",  color:"#0d9488" },
    { key:"freeAll",    label:"Free for All", icon:"globe-outline",   color:"#d97706" },
  ];

  const fmtDate = (d: string) => new Date(d).toLocaleString("en-IN", { dateStyle:"medium", timeStyle:"short" });
  const issueLabel = (issues: string[]) => issues.slice(0,2).join(", ") + (issues.length > 2 ? "..." : "");

  const joinLiveClass = (cls: any) => {
    if (!user) { router.push("/(auth)/login"); return; }
    const realId = cls?._id;
    if (!realId || typeof realId !== "string") {
      Alert.alert("Sample Listing", "This is a demo class. Real scheduled classes will be joinable here.");
      return;
    }
    router.push({ pathname: "/live-room" as any, params: { classId: realId } });
  };

  return (
    <View style={[styles.root, { backgroundColor:t.bg }]}>

      {/* ── Floating Header ── */}
      <Animated.View style={[styles.headerWrapper, { paddingTop:insets.top, backgroundColor:t.navBg, transform:[{translateY:headerTranslateY}] }]}>
        <View style={styles.headerRow}>
          <Image source={bshLogoImg} style={styles.headerLogo} resizeMode="contain" />
          <View style={styles.brandArea}>
            <Text style={styles.brandName}>BSH</Text>
            <Text style={styles.brandSub}>Live Classes</Text>
          </View>
          <View style={styles.headerActions}>
            {hasLiveNow && (
              <View style={styles.liveIndicator}>
                <Animated.View style={[styles.livePulse, { transform:[{scale:pulseAnim}] }]} />
                <Text style={styles.liveIndTxt}>LIVE NOW</Text>
              </View>
            )}
            <TouchableOpacity onPress={()=>router.push(user ? "/(tabs)/dashboard" : "/(auth)/login")}>
              {user?.avatar
                ? <Image source={{ uri:user.avatar }} style={styles.avatar} />
                : <View style={styles.avatarDefault}><Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase() ?? "B"}</Text></View>}
            </TouchableOpacity>
          </View>
        </View>

        {/* 3-tab bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {TAB_CONFIG.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tabBtn, active && { borderBottomColor:tab.color }]}
                onPress={()=>setActiveTab(tab.key)}>
                <Ionicons name={tab.icon} size={14} color={active ? tab.color : "rgba(255,255,255,0.5)"} style={{marginRight:5}} />
                <Text style={[styles.tabTxt, active && { color:"#fff", fontWeight:"800" }]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      <ScrollView style={{ flex:1 }} showsVerticalScrollIndicator={false}
        onScroll={handleMainScroll} scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop:HEADER_H+8, paddingBottom:80 }}>

        {/* ═══════════════ FREE FOR ALL ═══════════════ */}
        {activeTab === "freeAll" && (
          <View style={{ paddingHorizontal:16 }}>
            {/* Live now */}
            {apiClasses.find(c=>c.status==="live") && (
              <View style={{ marginBottom:20 }}>
                <View style={styles.sectionHeaderRow}>
                  <Animated.View style={[styles.liveDot, { transform:[{scale:pulseAnim}] }]} />
                  <Text style={[styles.sectionTitle, {color:t.text}]}>On Air Now</Text>
                </View>
                {(() => {
                  const realLive = apiClasses.find(c => c.status === "live");
                  if (!realLive) return null;
                  return (
                    <View style={[styles.featuredCard, { backgroundColor:"#1e1b4b", justifyContent:"center", padding:18 }]}>
                      <View style={styles.liveBadge}>
                        <Animated.View style={[styles.liveBadgeDot, {transform:[{scale:pulseAnim}]}]} />
                        <Text style={styles.liveBadgeTxt}>LIVE</Text>
                      </View>
                      <Text style={[styles.featuredTitle, { marginTop:10 }]}>{realLive.title}</Text>
                      <Text style={styles.educatorTxt}>{typeof realLive.educator === "string" ? realLive.educator : (realLive.educator as any)?.name ?? ""}</Text>
                      <TouchableOpacity style={[styles.joinNowBtn, { marginTop:12 }]} onPress={() => joinLiveClass(realLive)}>
                        <Ionicons name="radio-outline" size={16} color="#fff" />
                        <Text style={styles.joinNowTxt}>Join Live Now</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <Ionicons name="globe-outline" size={16} color="#d97706" />
              <Text style={[styles.sectionTitle, {color:t.text}]}>Free Classes — Open to All</Text>
            </View>
            <Text style={{color:t.textMuted,fontSize:13,marginBottom:16}}>No login required. Join any class, anytime.</Text>

            {apiClasses.filter(c=>c.type!=="course" && c.status!=="live").map((sc,idx)=>{
              const dt = new Date(sc.scheduledAt);
              return (
                <View key={sc._id ?? idx} style={[styles.scheduleCard, {borderLeftColor:"#d97706", backgroundColor:t.card, borderColor:t.border}]}>
                  <View style={[styles.dateCol, {backgroundColor:"#d9770620"}]}>
                    <Text style={[styles.dateDay, {color:"#d97706"}]}>{dt.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</Text>
                    <Text style={[styles.dateTime, {color:t.textMuted}]}>{dt.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}</Text>
                  </View>
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleTopRow}>
                      <View style={[styles.topicPill, {backgroundColor:"#d9770625"}]}>
                        <Text style={[styles.topicPillTxt, {color:"#d97706"}]}>Live Class</Text>
                      </View>
                      <View style={styles.durationPill}>
                        <Ionicons name="time-outline" size={10} color={t.textMuted} />
                        <Text style={[styles.durationTxt, {color:t.textMuted}]}>{sc.duration} min</Text>
                      </View>
                    </View>
                    <Text style={[styles.scheduleTitle, {color:t.text}]} numberOfLines={2}>{sc.title}</Text>
                    <View style={styles.scheduleEduRow}>
                      <Ionicons name="person-circle-outline" size={14} color="#a78bfa" />
                      <Text style={styles.scheduleEduTxt}>{typeof sc.educator === "string" ? sc.educator : (sc.educator as any)?.name ?? ""}</Text>
                    </View>
                    <View style={{flexDirection:"row",gap:8,marginTop:10}}>
                      <TouchableOpacity style={[styles.joinSmallBtn, {borderColor:"#d97706",backgroundColor:"#d9770618"}]}
                        onPress={() => !user ? router.push("/(auth)/login") : Alert.alert("Not Live Yet","This class hasn't started yet.")}>
                        <Text style={[styles.joinSmallTxt, {color:"#d97706"}]}>Join Free →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}

            {!loading && apiClasses.filter(c=>c.type!=="course").length === 0 && (
              <View style={[styles.emptyState, {backgroundColor:t.surface}]}>
                <Ionicons name="globe-outline" size={36} color="#d97706" />
                <Text style={[styles.emptyTitle, {color:t.text}]}>No live classes right now</Text>
                <Text style={[styles.emptySub, {color:t.textMuted}]}>Check back soon — free classes will appear here once scheduled.</Text>
              </View>
            )}

            <View style={[styles.infoStrip, {backgroundColor:t.surface, borderColor:t.border}]}>
              {[{icon:"wifi-outline" as const,label:"HD Live Stream"},{icon:"chatbubble-outline" as const,label:"Live Q&A"},{icon:"recording-outline" as const,label:"Recorded Access"}].map(f=>(
                <View key={f.label} style={styles.infoItem}>
                  <Ionicons name={f.icon} size={20} color="#a78bfa" />
                  <Text style={[styles.infoTxt, {color:t.textMuted}]}>{f.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ═══════════════ COURSE LIVE ═══════════════ */}
        {activeTab === "courseLive" && (
          <View style={{ paddingHorizontal:16 }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="school-outline" size={16} color="#0d9488" />
              <Text style={[styles.sectionTitle, {color:t.text}]}>Your Course Live Classes</Text>
            </View>
            <Text style={{color:t.textMuted,fontSize:13,marginBottom:16}}>Live sessions for courses you're enrolled in</Text>

            {!user && (
              <View style={[styles.emptyState, {backgroundColor:t.surface}]}>
                <Ionicons name="lock-closed-outline" size={36} color="#7c3aed" />
                <Text style={[styles.emptyTitle, {color:t.text}]}>Login to see your classes</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={()=>router.push("/(auth)/login")}>
                  <Text style={styles.emptyBtnTxt}>Log In</Text>
                </TouchableOpacity>
              </View>
            )}

            {user && apiClasses.filter(c=>c.type==="course").map((sc,idx)=>{
              const isLive = sc.status==="live";
              const dt = new Date(sc.scheduledAt);
              return (
                <View key={sc._id ?? idx} style={[styles.scheduleCard, {borderLeftColor:"#0d9488", backgroundColor:t.card, borderColor:t.border}]}>
                  {isLive ? (
                    <View style={[styles.dateCol, {backgroundColor:"#ef444420"}]}>
                      <Animated.View style={[styles.liveDot, {transform:[{scale:pulseAnim}],marginBottom:4}]} />
                      <Text style={[styles.dateDay, {color:"#ef4444"}]}>LIVE</Text>
                    </View>
                  ) : (
                    <View style={[styles.dateCol, {backgroundColor:"#0d948820"}]}>
                      <Text style={[styles.dateDay, {color:"#0d9488"}]}>{dt.toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</Text>
                      <Text style={[styles.dateTime, {color:t.textMuted}]}>{dt.toLocaleTimeString("en-IN",{hour:"numeric",minute:"2-digit"})}</Text>
                    </View>
                  )}
                  <View style={styles.scheduleInfo}>
                    <View style={styles.scheduleTopRow}>
                      <View style={[styles.topicPill, {backgroundColor:"#0d948825"}]}>
                        <Text style={[styles.topicPillTxt, {color:"#0d9488"}]}>Course</Text>
                      </View>
                      <View style={styles.durationPill}>
                        <Ionicons name="time-outline" size={10} color={t.textMuted} />
                        <Text style={[styles.durationTxt, {color:t.textMuted}]}>{sc.duration} min</Text>
                      </View>
                    </View>
                    <Text style={[styles.scheduleTitle, {color:t.text}]} numberOfLines={2}>{sc.title}</Text>
                    <View style={styles.scheduleEduRow}>
                      <Ionicons name="person-circle-outline" size={14} color="#a78bfa" />
                      <Text style={styles.scheduleEduTxt}>{typeof sc.educator === "string" ? sc.educator : (sc.educator as any)?.name ?? ""}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.joinSmallBtn, {borderColor:isLive?"#ef4444":"#0d9488", backgroundColor:isLive?"#ef444418":"#0d948818", marginTop:8}]}
                      onPress={() => isLive ? joinLiveClass(sc) : (!user ? router.push("/(auth)/login") : Alert.alert("Not Live Yet","This class hasn't started yet."))}>
                      <Text style={[styles.joinSmallTxt, {color:isLive?"#f87171":"#0d9488"}]}>{isLive?"Join Now →":"Remind Me"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {user && !loading && apiClasses.filter(c=>c.type==="course").length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><Ionicons name="school-outline" size={36} color="#0d9488" /></View>
                <Text style={[styles.emptyTitle, {color:t.text}]}>No live classes yet</Text>
                <Text style={[styles.emptySub, {color:t.textMuted}]}>Enroll in a course to join its live sessions</Text>
                <TouchableOpacity style={[styles.emptyBtn, {backgroundColor:"#0d9488"}]} onPress={()=>router.push("/(tabs)/explore")}>
                  <Text style={styles.emptyBtnTxt}>Browse Courses</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ═══════════════ 1:1 SESSIONS ═══════════════ */}
        {activeTab === "oneOnOne" && (
          <View style={{ paddingHorizontal:16 }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-outline" size={16} color="#7c3aed" />
              <Text style={[styles.sectionTitle, {color:t.text}]}>Your 1:1 Sessions</Text>
            </View>
            <Text style={{color:t.textMuted,fontSize:13,marginBottom:16}}>Private sessions booked with BSH healers</Text>

            {!user && (
              <View style={[styles.emptyState, {backgroundColor:t.surface}]}>
                <Ionicons name="lock-closed-outline" size={36} color="#7c3aed" />
                <Text style={[styles.emptyTitle, {color:t.text, marginTop:12}]}>Login to see your sessions</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={()=>router.push("/(auth)/login")}>
                  <Text style={styles.emptyBtnTxt}>Log In</Text>
                </TouchableOpacity>
              </View>
            )}

            {user && sessions.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}><Ionicons name="people-outline" size={36} color="#7c3aed" /></View>
                <Text style={[styles.emptyTitle, {color:t.text}]}>No sessions booked yet</Text>
                <Text style={[styles.emptySub, {color:t.textMuted}]}>Book a private 1:1 healing session with our experts</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={()=>router.push("/(tabs)/consultation" as any)}>
                  <Text style={styles.emptyBtnTxt}>Book a Session</Text>
                </TouchableOpacity>
              </View>
            )}

            {sessions.map(sess=>(
              <View key={sess._id} style={[styles.sessionCard, {backgroundColor:t.card, borderColor:t.border}]}>
                <View style={styles.sessionHeader}>
                  <View style={[styles.sessionTypeBadge, {backgroundColor:sess.type==="free_call"?"#22c55e22":"#7c3aed22"}]}>
                    <Text style={{color:sess.type==="free_call"?"#22c55e":"#a78bfa",fontSize:10,fontWeight:"800"}}>
                      {sess.type==="free_call" ? "FREE CALL" : "PRIVATE SESSION"}
                    </Text>
                  </View>
                  <View style={[styles.sessionStatusBadge, {backgroundColor:
                    sess.status==="pending"?"#f59e0b22":
                    sess.status==="confirmed"?"#22c55e22":"#ef444422"}]}>
                    <Text style={{fontSize:10,fontWeight:"800",color:
                      sess.status==="pending"?"#f59e0b":
                      sess.status==="confirmed"?"#22c55e":"#ef4444"}}>
                      {sess.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={[{color:t.text,fontSize:14,fontWeight:"700",marginBottom:4}]}>
                  {sess.type==="free_call" ? "Free Consultation Call" : "Private Healing Session"}
                </Text>
                <Text style={{color:t.textMuted,fontSize:12,marginBottom:6}}>Concerns: {issueLabel(sess.issues)}</Text>
                <Text style={{color:t.textMuted,fontSize:11}}>Booked: {new Date(sess.createdAt).toLocaleDateString("en-IN",{dateStyle:"medium"})}</Text>
                {sess.status==="confirmed" && (
                  <TouchableOpacity style={[styles.joinSmallBtn, {borderColor:"#7c3aed",backgroundColor:"#7c3aed22",marginTop:10}]}
                    onPress={()=>Alert.alert("Session","Your healer will contact you at your registered number.")}>
                    <Text style={[styles.joinSmallTxt, {color:"#a78bfa"}]}>View Details →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Book new session CTA */}
            {user && (
              <TouchableOpacity style={[styles.bookSessionCta, {borderColor:"#7c3aed"}]}
                onPress={()=>router.push("/(tabs)/consultation" as any)}>
                <Ionicons name="add-circle-outline" size={20} color="#7c3aed" style={{marginRight:10}} />
                <Text style={{color:"#7c3aed",fontSize:14,fontWeight:"700"}}>Book a New 1:1 Session</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex:1 },
  headerWrapper: {
    paddingHorizontal:16, paddingBottom:0,
    position:"absolute", top:0, left:0, right:0, zIndex:100,
    elevation:10, shadowColor:"#000", shadowOpacity:0.35, shadowRadius:14, shadowOffset:{width:0,height:6},
  },
  headerRow: { flexDirection:"row", alignItems:"center", paddingTop:10, marginBottom:10 },
  headerLogo: { width:36, height:36, marginRight:10, borderRadius:8 },
  brandArea: { flex:1 },
  brandName: { color:"#fff", fontSize:20, fontWeight:"900", letterSpacing:0.5 },
  brandSub: { color:"rgba(255,255,255,0.65)", fontSize:11 },
  headerActions: { flexDirection:"row", alignItems:"center", gap:10 },
  liveIndicator: { flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"rgba(239,68,68,0.2)", borderRadius:20, paddingHorizontal:10, paddingVertical:5, borderWidth:1, borderColor:"rgba(239,68,68,0.4)" },
  livePulse: { width:7, height:7, borderRadius:4, backgroundColor:"#ef4444" },
  liveIndTxt: { color:"#f87171", fontSize:10, fontWeight:"800" },
  avatar: { width:34, height:34, borderRadius:17, borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarDefault: { width:34, height:34, borderRadius:17, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center", borderWidth:2, borderColor:"rgba(255,255,255,0.5)" },
  avatarInitial: { color:"#fff", fontWeight:"800", fontSize:14 },

  tabScroll: { borderTopWidth:1, borderTopColor:"rgba(255,255,255,0.12)" },
  tabBtn: { flexDirection:"row", alignItems:"center", paddingHorizontal:16, paddingVertical:12, borderBottomWidth:2, borderBottomColor:"transparent", marginRight:4 },
  tabTxt: { color:"rgba(255,255,255,0.5)", fontSize:13, fontWeight:"600" },

  sectionHeaderRow: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:14 },
  sectionTitle: { fontSize:17, fontWeight:"800" },
  liveDot: { width:10, height:10, borderRadius:5, backgroundColor:"#ef4444" },

  featuredCard: { borderRadius:18, overflow:"hidden", height:280 },
  featuredImg: { position:"absolute", width:"100%", height:"100%" },
  featuredOverlay: { position:"absolute", top:0, left:0, right:0, bottom:0, backgroundColor:"rgba(0,0,0,0.5)" },
  viewerBadge: { position:"absolute", top:14, right:14, flexDirection:"row", alignItems:"center", gap:4, backgroundColor:"rgba(0,0,0,0.6)", borderRadius:20, paddingHorizontal:10, paddingVertical:4 },
  viewerTxt: { color:"#fff", fontSize:11, fontWeight:"600" },
  liveBadge: { position:"absolute", top:14, left:14, flexDirection:"row", alignItems:"center", gap:5, backgroundColor:"#ef4444", borderRadius:20, paddingHorizontal:12, paddingVertical:5 },
  liveBadgeDot: { width:6, height:6, borderRadius:3, backgroundColor:"#fff" },
  liveBadgeTxt: { color:"#fff", fontSize:11, fontWeight:"900", letterSpacing:1 },
  featuredBody: { position:"absolute", bottom:0, left:0, right:0, padding:18 },
  topicChip: { alignSelf:"flex-start", borderRadius:20, paddingHorizontal:12, paddingVertical:4, marginBottom:8 },
  topicChipTxt: { color:"#fff", fontSize:10, fontWeight:"700" },
  featuredTitle: { color:"#fff", fontSize:18, fontWeight:"900", lineHeight:24, marginBottom:10 },
  educatorRow: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:14 },
  eduAvatar: { width:24, height:24, borderRadius:12, borderWidth:1.5, borderColor:"#fff" },
  educatorTxt: { color:"rgba(255,255,255,0.85)", fontSize:12, fontWeight:"600" },
  dotSep: { width:3, height:3, borderRadius:2, backgroundColor:"rgba(255,255,255,0.4)" },
  joinNowBtn: { flexDirection:"row", alignItems:"center", gap:8, backgroundColor:"#ef4444", borderRadius:10, paddingVertical:11, paddingHorizontal:20, alignSelf:"flex-start" },
  joinNowTxt: { color:"#fff", fontSize:14, fontWeight:"800" },

  scheduleCard: { flexDirection:"row", borderRadius:14, marginBottom:12, overflow:"hidden", borderLeftWidth:4, borderWidth:1 },
  dateCol: { width:80, padding:14, alignItems:"center", justifyContent:"center" },
  dateDay: { fontSize:11, fontWeight:"800", textAlign:"center", marginBottom:4 },
  dateTime: { fontSize:10, textAlign:"center" },
  scheduleInfo: { flex:1, padding:14 },
  scheduleTopRow: { flexDirection:"row", alignItems:"center", gap:8, marginBottom:6 },
  topicPill: { borderRadius:20, paddingHorizontal:8, paddingVertical:3 },
  topicPillTxt: { fontSize:10, fontWeight:"700" },
  durationPill: { flexDirection:"row", alignItems:"center", gap:3 },
  durationTxt: { fontSize:10 },
  scheduleTitle: { fontSize:13, fontWeight:"700", lineHeight:18, marginBottom:6 },
  scheduleEduRow: { flexDirection:"row", alignItems:"center", gap:5 },
  scheduleEduTxt: { color:"#a78bfa", fontSize:11, fontWeight:"600" },
  joinSmallBtn: { alignSelf:"flex-start", borderWidth:1, borderRadius:8, paddingHorizontal:12, paddingVertical:5 },
  joinSmallTxt: { fontSize:12, fontWeight:"700" },

  infoStrip: { flexDirection:"row", justifyContent:"space-around", marginTop:16, borderRadius:14, paddingVertical:16, borderWidth:1 },
  infoItem: { alignItems:"center", gap:6 },
  infoTxt: { fontSize:11, fontWeight:"600" },

  emptyState: { alignItems:"center", paddingVertical:48, borderRadius:16, marginBottom:16 },
  emptyIcon: { width:72, height:72, borderRadius:36, backgroundColor:"rgba(124,58,237,0.15)", alignItems:"center", justifyContent:"center", marginBottom:14 },
  emptyTitle: { fontSize:17, fontWeight:"800", marginBottom:8 },
  emptySub: { fontSize:13, textAlign:"center", lineHeight:20, marginBottom:16 },
  emptyBtn: { backgroundColor:"#7c3aed", borderRadius:12, paddingHorizontal:24, paddingVertical:11 },
  emptyBtnTxt: { color:"#fff", fontWeight:"800", fontSize:14 },

  sessionCard: { borderRadius:14, padding:16, marginBottom:12, borderWidth:1 },
  sessionHeader: { flexDirection:"row", gap:8, marginBottom:10 },
  sessionTypeBadge: { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  sessionStatusBadge: { borderRadius:8, paddingHorizontal:10, paddingVertical:4 },
  bookSessionCta: { flexDirection:"row", alignItems:"center", justifyContent:"center", borderRadius:14, paddingVertical:14, borderWidth:2, marginTop:8 },
});
