import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Platform, Linking,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../stores/authStore";
import client from "../../api/client";
import { COLORS } from "../../constants";
import { purchaseCourse, restorePurchases } from "../../services/purchaseService";

interface Lesson    { _id: string; title: string; isFree: boolean; duration: number; muxPlaybackId?: string; chapter: string; }
interface Chapter   { _id: string; title: string; order: number; }
interface MediaItem { _id: string; title: string; description?: string; type: "video" | "pdf" | "image"; muxPlaybackId?: string; gcsKey?: string; tags: string[]; isFree: boolean; }
interface Course    { _id: string; title: string; description: string; educator: { name: string }; category: string; level: string; price: number; discountPrice?: number; thumbnail: string; rating: number; enrollmentCount: number; totalLessons: number; requirements: string[]; objectives: string[]; razorpayPaymentLink?: string; ghlPortalUrl?: string; }

interface Post {
  _id: string;
  type: "live_class" | "announcement";
  title?: string;
  content: string;
  scheduledAt?: string;
  links: { label: string; url: string }[];
  createdAt: string;
  liveStatus?: "scheduled" | "live" | "ended";
}

const fmtDateTime = (s: string) =>
  new Date(s).toLocaleString("en-IN", {
    weekday: "short", day: "2-digit", month: "short",
    year: "numeric", hour: "2-digit", minute: "2-digit",
  });

const timeFromNow = (s: string) => {
  const diff = new Date(s).getTime() - Date.now();
  if (diff < 0) return "passed";
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "in less than 1 hr";
  if (h < 24) return `in ${h}h`;
  return `in ${Math.floor(h / 24)}d`;
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [course, setCourse]         = useState<Course | null>(null);
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  const [lessons, setLessons]       = useState<Lesson[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [mediaFetched, setMediaFetched] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [loading, setLoading]       = useState(true);
  const [enrolling, setEnrolling]   = useState(false);
  const [restoring, setRestoring]   = useState(false);

  // Member area
  const [posts, setPosts]           = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [filter, setFilter]         = useState<"all" | "live_class" | "announcement" | "content">("all");

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const { restoredCount } = await restorePurchases();
      if (restoredCount > 0) {
        client.get(`/courses/${id}`).then(({ data }) => setIsEnrolled(data.isEnrolled)).catch(() => {});
        Alert.alert("Restored", `Recovered ${restoredCount} purchase${restoredCount > 1 ? "s" : ""}.`);
      } else {
        Alert.alert("Nothing to Restore", "No pending purchases were found for this account.");
      }
    } finally { setRestoring(false); }
  };

  useEffect(() => {
    if (!id) return;
    client.get(`/courses/${id}`)
      .then(({ data }) => {
        setCourse(data.course);
        setChapters(data.chapters);
        setLessons(data.lessons);
        setIsEnrolled(data.isEnrolled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch posts when enrolled
  useEffect(() => {
    if (!isEnrolled || !id) return;
    setPostsLoading(true);
    client.get(`/courses/${id}/posts`)
      .then(({ data }) => setPosts((data as any).posts ?? []))
      .catch(() => {})
      .finally(() => setPostsLoading(false));
  }, [isEnrolled, id]);

  const loadMedia = useCallback(async () => {
    if (mediaFetched || !id) return;
    setMediaLoading(true);
    try {
      const { data } = await client.get(`/media/for-me?target=course&courseId=${id}`);
      setMediaItems(data.items || []);
    } catch {}
    setMediaFetched(true);
    setMediaLoading(false);
  }, [id, mediaFetched]);

  const openContentItem = async (item: MediaItem) => {
    if (item.type === "video") {
      router.push({ pathname: "/watch/[lessonId]" as any, params: { lessonId: item._id, source: "media" } });
      return;
    }
    try {
      const { data } = await client.get(`/media/${item._id}/stream`);
      if (data.streamUrl) Linking.openURL(data.streamUrl);
    } catch {}
  };

  const enroll = async () => {
    if (!user) { router.push("/(auth)/login"); return; }
    if (course!.price === 0) {
      setEnrolling(true);
      try {
        await client.post(`/enroll/${id}`);
        setIsEnrolled(true);
        Alert.alert("Enrolled!", "You now have access to this course");
      } finally { setEnrolling(false); }
      return;
    }
    setEnrolling(true);
    try {
      const result = await purchaseCourse({
        courseId: course!._id, title: course!.title,
        priceRupees: Math.round(course!.price / 100),
        discountPriceRupees: course!.discountPrice ? Math.round(course!.discountPrice / 100) : undefined,
        razorpayPaymentLink: course!.razorpayPaymentLink,
        userName: user.name, userEmail: user.email,
      });
      if (result.success) {
        setIsEnrolled(true);
        Alert.alert("Enrolled! 🎉", `You're now enrolled in ${course!.title}!`);
      } else if (!result.cancelled) {
        // StoreKit2 can fire the listener twice (pending then purchased); or the
        // server may fail JWS verification on a re-submitted old transaction while
        // the user is already enrolled from a prior purchase. Always re-check
        // enrollment before surfacing an error — if they're enrolled, go straight
        // to the member area with no error dialog.
        try {
          const { data } = await client.get(`/courses/${id}`);
          if (data.isEnrolled) {
            setIsEnrolled(true);
            // Already enrolled — no error shown, member area opens
          } else {
            Alert.alert("Purchase Failed", result.errorMessage || "Could not complete purchase. If you were charged, use \"Restore Purchases\" to recover access.");
          }
        } catch {
          Alert.alert("Purchase Failed", result.errorMessage || "Could not complete purchase.");
        }
      }
    } finally { setEnrolling(false); }
  };

  if (loading) return <View style={s.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!course) return <View style={s.center}><Text style={{ color: COLORS.textMuted }}>Course not found</Text></View>;

  const priceRs = Math.round((course.discountPrice ?? course.price) / 100);

  // ── Member area (enrolled) ─────────────────────────────────────────────────
  if (isEnrolled) {
    const accent = COLORS.primary;
    const livePosts = posts.filter(p => p.type === "live_class");
    const annPosts  = posts.filter(p => p.type === "announcement");
    const nextLive  = livePosts.find(p => p.scheduledAt && new Date(p.scheduledAt) > new Date());
    const visible   = filter === "all" ? posts : filter === "live_class" ? livePosts : annPosts;

    return (
      <View style={[s.root, { backgroundColor: "#080614" }]}>
        <Stack.Screen options={{ headerShown: false }} />
        {/* Top bar */}
        <View style={[s.memberTopBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.memberTopTitle} numberOfLines={1}>{course.title}</Text>
            {user?.role === "admin" && (
              <Text style={s.memberAdminBadge}>Admin Preview</Text>
            )}
          </View>
          <View style={s.enrolledBadge}>
            <View style={s.greenDot} />
            <Text style={s.enrolledTxt}>Enrolled</Text>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}>

          {/* Member area header */}
          <View style={s.memberHeader}>
            <Text style={{ fontSize: 22 }}>🔐</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.memberAreaTitle}>Member Area</Text>
              <Text style={s.memberAreaSub}>Live classes, content & updates — exclusive to enrolled students</Text>
            </View>
          </View>

          {/* Quick actions */}
          <View style={s.quickActions}>
            {lessons.length > 0 && (
              <TouchableOpacity style={[s.quickBtn, { backgroundColor: accent }]}
                onPress={() => router.push(`/watch/${lessons[0]._id}`)}>
                <Ionicons name="play-circle" size={16} color="#fff" />
                <Text style={s.quickBtnTxt}>Start Learning</Text>
              </TouchableOpacity>
            )}
            {course.ghlPortalUrl ? (
              <TouchableOpacity style={[s.quickBtn, { backgroundColor: "#0f766e", flex: 1 }]}
                onPress={() => Linking.openURL(course.ghlPortalUrl!).catch(() => {})}>
                <Ionicons name="globe-outline" size={16} color="#fff" />
                <Text style={s.quickBtnTxt}>BSH Portal</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Stats row */}
          {posts.length > 0 && (
            <View style={s.statsRow}>
              {[
                { label: "Total", value: posts.length, color: "#f1f5f9" },
                { label: "Live Classes", value: livePosts.length, color: accent },
                { label: "Announcements", value: annPosts.length, color: "#94a3b8" },
              ].map(st => (
                <View key={st.label} style={s.statCard}>
                  <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                  <Text style={s.statLbl}>{st.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Next live class */}
          {nextLive && (
            <View style={[s.liveCard, { borderColor: accent + "80" }]}>
              <View style={s.liveCardHeader}>
                <View style={s.redDot} />
                <Text style={s.liveCardLabel}>UPCOMING LIVE CLASS</Text>
              </View>
              {nextLive.title && <Text style={s.liveCardTitle}>{nextLive.title}</Text>}
              {nextLive.scheduledAt && (
                <Text style={[s.liveCardDate, { color: accent }]}>
                  📅 {fmtDateTime(nextLive.scheduledAt)}{"  "}
                  <Text style={{ color: "#94a3b8", fontSize: 12 }}>({timeFromNow(nextLive.scheduledAt)})</Text>
                </Text>
              )}
              {nextLive.content ? <Text style={s.liveCardContent}>{nextLive.content}</Text> : null}
              {nextLive.links?.length > 0 && nextLive.links.map((lk, i) => (
                <TouchableOpacity key={i} style={[s.joinClassBtn, { backgroundColor: accent }]}
                  onPress={() => Linking.openURL(lk.url).catch(() => {})}>
                  <Text style={s.joinClassTxt}>🎥 {lk.label || "Join Class"}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {(["all", "live_class", "content", "announcement"] as const).map(val => {
              const iconName = val === "all" ? "apps" : val === "live_class" ? "radio" : val === "announcement" ? "megaphone" : "library";
              const lbl = val === "all" ? "All" : val === "live_class" ? "Live" : val === "announcement" ? "Announcements" : "Content";
              const active = filter === val;
              return (
                <TouchableOpacity key={val}
                  onPress={() => { setFilter(val); if (val === "content") loadMedia(); }}
                  style={[s.filterTab, active && { backgroundColor: accent + "25", borderColor: accent }]}>
                  <Ionicons name={iconName as any} size={13} color={active ? accent : "#64748b"} style={{ marginRight: 5 }} />
                  <Text style={[s.filterTabTxt, { color: active ? accent : "#64748b" }]}>{lbl}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Content tab */}
          {filter === "content" && (
            mediaLoading ? (
              <ActivityIndicator color={accent} size="large" style={{ marginTop: 40 }} />
            ) : mediaItems.length === 0 ? (
              <View style={s.emptyState}>
                <Ionicons name="cloud-upload-outline" size={52} color="#1e293b" style={{ marginBottom: 14 }} />
                <Text style={s.emptyTitle}>No Content Yet</Text>
                <Text style={s.emptySub}>Videos, PDFs and resources will appear here once uploaded by your trainer.</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {mediaItems.map(item => {
                  const iconName  = item.type === "video" ? "play-circle" : item.type === "pdf" ? "document-text" : "image";
                  const iconColor = item.type === "video" ? "#60a5fa" : item.type === "pdf" ? "#f472b6" : "#34d399";
                  const typeLbl   = item.type === "video" ? "VIDEO" : item.type === "pdf" ? "PDF" : "IMAGE";
                  return (
                    <TouchableOpacity key={item._id} style={s.mediaCard} onPress={() => openContentItem(item)} activeOpacity={0.78}>
                      <View style={[s.mediaBanner, { backgroundColor: iconColor + "12" }]}>
                        <Ionicons name={iconName as any} size={52} color={iconColor} />
                        <View style={[s.mediaTypePill, { backgroundColor: iconColor + "22", position: "absolute", top: 10, right: 10 }]}>
                          <Text style={[s.mediaTypeTxt, { color: iconColor }]}>{typeLbl}</Text>
                        </View>
                      </View>
                      <View style={s.mediaBody}>
                        <Text style={s.mediaTitle} numberOfLines={2}>{item.title}</Text>
                        {item.description ? <Text style={s.mediaSub} numberOfLines={2}>{item.description}</Text> : null}
                        <View style={s.mediaFooter}>
                          <View style={s.mediaTagRow}>
                            {item.tags.slice(0, 3).map(tag => (
                              <View key={tag} style={s.mediaTag}><Text style={s.mediaTagTxt}>{tag}</Text></View>
                            ))}
                          </View>
                          <View style={[s.mediaPlayBtn, { backgroundColor: iconColor }]}>
                            <Ionicons name={item.type === "video" ? "play" : "open-outline"} size={14} color="#fff" />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )
          )}

          {/* Course lessons (inside All tab) */}
          {filter === "all" && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Course Content</Text>
              {chapters.map((ch) => (
                <View key={ch._id} style={s.chapter}>
                  <Text style={s.chapterTitle}>{ch.title}</Text>
                  {lessons.filter(l => l.chapter === ch._id).map((lesson) => (
                    <TouchableOpacity key={lesson._id} style={s.lesson}
                      onPress={() => router.push(`/watch/${lesson._id}`)}>
                      <Ionicons name="play-circle" size={18} color={accent} />
                      <Text style={s.lessonTitle}>{lesson.title}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          )}

          {/* Posts list */}
          {filter !== "content" && filter !== "all" && (postsLoading ? (
            <ActivityIndicator color={accent} style={{ marginTop: 32 }} />
          ) : visible.length === 0 ? (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 36, marginBottom: 10 }}>📭</Text>
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Your trainer will post updates here soon.</Text>
            </View>
          ) : (
            visible.map(post => {
              if (post.type === "live_class") {
                const isLiveNow  = post.liveStatus === "live";
                const isUpcoming = isLiveNow || !!(post.scheduledAt && new Date(post.scheduledAt) > new Date());
                const d = post.scheduledAt ? new Date(post.scheduledAt) : null;
                const dayLabel  = d ? d.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase() : "";
                const dateLabel = d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";
                const timeLabel = d ? d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : "";
                return (
                  <TouchableOpacity
                    key={post._id}
                    style={[s.liveClassCard, { borderColor: isUpcoming ? accent + "40" : "#1e293b" }]}
                    onPress={() => post.links?.[0] && Linking.openURL(post.links[0].url).catch(() => {})}
                    activeOpacity={0.85}
                  >
                    <View style={[s.liveClassStrip, { backgroundColor: isUpcoming ? "#ef444412" : "#0d1117" }]}>
                      <View style={[s.stripStatusDot, { backgroundColor: isUpcoming ? "#ef4444" : "#475569" }]} />
                      <Text style={[s.stripStatusTxt, { color: isUpcoming ? "#f87171" : "#64748b" }]}>
                        {isLiveNow ? "🔴 LIVE NOW" : isUpcoming ? "UPCOMING CLASS" : "COMPLETED"}
                      </Text>
                    </View>
                    <View style={s.liveClassBody}>
                      {d && (
                        <View style={[s.liveClassDateBlock, { borderColor: isUpcoming ? accent + "35" : "#1e293b" }]}>
                          <Text style={[s.liveClassDayAbbr, { color: isUpcoming ? accent : "#475569" }]}>{dayLabel}</Text>
                          <Text style={[s.liveClassDayNum, { color: isUpcoming ? "#f1f5f9" : "#64748b" }]}>{d.getDate()}</Text>
                          <Text style={[s.liveClassMonthYr, { color: isUpcoming ? "#94a3b8" : "#475569" }]}>
                            {dateLabel.split(" ").slice(1).join(" ")}
                          </Text>
                        </View>
                      )}
                      <View style={s.liveClassInfo}>
                        {post.title && (
                          <Text style={[s.liveClassTitle, { color: isUpcoming ? "#f1f5f9" : "#94a3b8" }]} numberOfLines={3}>
                            {post.title}
                          </Text>
                        )}
                        {d && (
                          <View style={s.liveClassTimeRow}>
                            <Ionicons name="time-outline" size={12} color="#64748b" />
                            <Text style={s.liveClassTimeTxt}>{timeLabel}</Text>
                          </View>
                        )}
                        {post.links && post.links.length > 0 && (
                          <View style={[s.liveJoinBtn, {
                            backgroundColor: isUpcoming ? accent : "transparent",
                            borderColor: isUpcoming ? "transparent" : "#334155",
                            borderWidth: isUpcoming ? 0 : 1,
                          }]}>
                            <Ionicons name={isUpcoming ? "videocam" : "checkmark-circle-outline"} size={13}
                              color={isUpcoming ? "#fff" : "#475569"} />
                            <Text style={[s.liveJoinTxt, { color: isUpcoming ? "#fff" : "#475569" }]}>
                              {isLiveNow ? "Join Now" : isUpcoming ? "Join Class" : "Attended"}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }
              return (
                <View key={post._id} style={s.postCard}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <View style={[s.annBadge, { borderColor: accent + "50", backgroundColor: accent + "18" }]}>
                      <Text style={[s.annBadgeTxt, { color: accent }]}>📢 ANNOUNCEMENT</Text>
                    </View>
                  </View>
                  {post.title && <Text style={s.postTitle}>{post.title}</Text>}
                  <Text style={s.postContent}>{post.content}</Text>
                  {post.links?.map((lk, i) => (
                    <TouchableOpacity key={i} onPress={() => Linking.openURL(lk.url).catch(() => {})}
                      style={[s.postLinkBtn, { borderColor: accent + "60" }]}>
                      <Text style={[s.postLinkTxt, { color: accent }]}>🔗 {lk.label || "Open"}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              );
            })
          ))}

        </ScrollView>
      </View>
    );
  }

  // ── Marketing page (not enrolled) ─────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* floating back button over thumbnail */}
      <TouchableOpacity
        style={[s.backBtn, { position: "absolute", top: insets.top + 10, left: 16, zIndex: 100 }]}
        onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={20} color="#fff" />
      </TouchableOpacity>
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      {course.thumbnail ? (
        <Image source={{ uri: course.thumbnail }} style={s.thumbnail} contentFit="cover" cachePolicy="disk" />
      ) : (
        <View style={[s.thumbnail, s.thumbnailPlaceholder]}>
          <Text style={{ fontSize: 48 }}>📚</Text>
        </View>
      )}

      <View style={s.content}>
        <View style={s.badge}><Text style={s.badgeText}>{course.category}</Text></View>
        <Text style={s.title}>{course.title}</Text>
        <Text style={s.desc}>{course.description}</Text>

        <View style={s.metaRow}>
          <Text style={s.meta}>👤 {course.educator.name}</Text>
          <Text style={s.meta}>⭐ {course.rating.toFixed(1)}</Text>
          <Text style={s.meta}>👥 {course.enrollmentCount}</Text>
          <Text style={s.meta}>📚 {course.totalLessons} lessons</Text>
        </View>

        <View style={s.priceBox}>
          <Text style={s.price}>{priceRs === 0 ? "Free" : `₹${priceRs.toLocaleString("en-IN")}`}</Text>
          <TouchableOpacity style={s.enrollBtn} onPress={enroll} disabled={enrolling}>
            <Text style={s.enrollBtnText}>{enrolling ? "Enrolling..." : priceRs === 0 ? "Enroll Free" : "Buy Now"}</Text>
          </TouchableOpacity>
        </View>

        {priceRs > 0 && Platform.OS === "ios" && (
          <TouchableOpacity onPress={handleRestore} disabled={restoring} style={{ alignSelf: "center", marginBottom: 16 }}>
            <Text style={{ color: COLORS.textMuted, fontSize: 13, textDecorationLine: "underline" }}>
              {restoring ? "Restoring…" : "Restore Purchases"}
            </Text>
          </TouchableOpacity>
        )}

        {course.objectives?.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>What you'll learn</Text>
            {course.objectives.map((obj, i) => (
              <View key={i} style={s.listItem}>
                <Text style={{ color: COLORS.green }}>✓</Text>
                <Text style={s.listText}>{obj}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Course Content</Text>
          {chapters.map((ch) => (
            <View key={ch._id} style={s.chapter}>
              <Text style={s.chapterTitle}>{ch.title}</Text>
              {lessons.filter(l => l.chapter === ch._id).map((lesson) => (
                <TouchableOpacity key={lesson._id} style={s.lesson}
                  onPress={() => lesson.isFree && router.push(`/watch/${lesson._id}`)}>
                  <Text style={s.lessonIcon}>{lesson.isFree ? "▶" : "🔒"}</Text>
                  <Text style={[s.lessonTitle, !lesson.isFree && { color: COLORS.textMuted }]}>{lesson.title}</Text>
                  {lesson.isFree && <View style={s.freeBadge}><Text style={{ color: COLORS.green, fontSize: 11 }}>Free</Text></View>}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.bg },
  root:       { flex: 1, backgroundColor: "#0d0d1a" },
  center:     { flex: 1, alignItems: "center", justifyContent: "center" },
  thumbnail:  { width: "100%", height: 220 },
  thumbnailPlaceholder: { backgroundColor: COLORS.surface2, alignItems: "center", justifyContent: "center" },
  content:    { padding: 16 },
  badge:      { backgroundColor: "#3b0764", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: "flex-start", marginBottom: 10 },
  badgeText:  { color: "#d8b4fe", fontSize: 12, fontWeight: "700" },
  title:      { color: COLORS.text, fontSize: 22, fontWeight: "900", lineHeight: 28, marginBottom: 10 },
  desc:       { color: COLORS.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 14 },
  metaRow:    { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  meta:       { color: "#9ca3af", fontSize: 13 },
  priceBox:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: COLORS.surface2 },
  price:      { color: COLORS.primaryLight, fontSize: 26, fontWeight: "900" },
  enrollBtn:  { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  enrollBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  section:    { marginTop: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: "800", marginBottom: 12 },
  listItem:   { flexDirection: "row", gap: 10, marginBottom: 8 },
  listText:   { color: "#93c5fd", fontSize: 14, flex: 1 },
  chapter:    { backgroundColor: COLORS.surface, borderRadius: 12, marginBottom: 12, overflow: "hidden" },
  chapterTitle: { color: COLORS.text, fontWeight: "700", fontSize: 14, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 },
  lesson:     { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.surface2 },
  lessonIcon: { fontSize: 14 },
  lessonTitle: { color: "#e5e7eb", fontSize: 13, flex: 1 },
  freeBadge:  { backgroundColor: "#052e16", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },

  // Member area
  memberTopBar:    { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#0d0824", paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e1040" },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },
  memberTopTitle:  { color: "#f1f5f9", fontSize: 15, fontWeight: "800" },
  memberAdminBadge: { color: "#f59e0b", fontSize: 10, fontWeight: "700", backgroundColor: "rgba(245,158,11,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, alignSelf: "flex-start", marginTop: 2 },
  enrolledBadge:   { flexDirection: "row", alignItems: "center", gap: 5 },
  greenDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: "#4ade80", shadowColor: "#4ade80", shadowOpacity: 0.8, shadowRadius: 4 },
  enrolledTxt:     { color: "#4ade80", fontSize: 12, fontWeight: "700" },
  memberHeader:    { flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: "#0f0a2e", borderRadius: 14, padding: 16, marginTop: 16, marginBottom: 14, borderWidth: 1, borderColor: "#0f2557" },
  memberAreaTitle: { color: "#f1f5f9", fontWeight: "900", fontSize: 17, marginBottom: 3 },
  memberAreaSub:   { color: "#64748b", fontSize: 12, lineHeight: 18 },
  quickActions:    { flexDirection: "row", gap: 10, marginBottom: 16 },
  quickBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 12 },
  quickBtnTxt:     { color: "#fff", fontWeight: "700", fontSize: 14 },
  statsRow:        { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard:        { flex: 1, backgroundColor: "#0f0a2e", borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "#0f2557" },
  statVal:         { fontSize: 22, fontWeight: "900", marginBottom: 2 },
  statLbl:         { color: "#64748b", fontSize: 11 },
  liveCard:        { backgroundColor: "#0f0a2e", borderRadius: 16, padding: 18, borderWidth: 1.5, marginBottom: 14 },
  liveCardHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  liveCardLabel:   { color: "#f87171", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  liveCardTitle:   { color: "#f1f5f9", fontSize: 16, fontWeight: "800", marginBottom: 6 },
  liveCardDate:    { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  liveCardContent: { color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 12 },
  joinClassBtn:    { borderRadius: 50, paddingVertical: 12, alignItems: "center" },
  joinClassTxt:    { color: "#fff", fontSize: 14, fontWeight: "800" },
  redDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: "#ef4444", shadowColor: "#ef4444", shadowOpacity: 0.8, shadowRadius: 5 },
  filterTab:       { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50, borderWidth: 1.5, borderColor: "#1e293b", marginRight: 8 },
  filterTabTxt:    { fontSize: 13, fontWeight: "600" },
  emptyState:      { paddingVertical: 52, alignItems: "center" },
  emptyTitle:      { color: "#f1f5f9", fontSize: 16, fontWeight: "700", marginBottom: 6 },
  emptySub:        { color: "#64748b", fontSize: 13 },
  postCard:        { backgroundColor: "#0f0a2e", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#0f2557" },
  postTitle:       { color: "#f1f5f9", fontSize: 15, fontWeight: "800", marginBottom: 6 },
  postContent:     { color: "#94a3b8", fontSize: 13, lineHeight: 20, marginBottom: 8 },
  postLinkBtn:     { marginTop: 6, borderWidth: 1, borderRadius: 50, paddingVertical: 9, paddingHorizontal: 18, alignSelf: "flex-start" },
  postLinkTxt:     { fontSize: 13, fontWeight: "700" },
  annBadge:        { borderWidth: 1, borderRadius: 50, paddingHorizontal: 10, paddingVertical: 3 },
  annBadgeTxt:     { fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  mediaCard:       { backgroundColor: "#0f0a2e", borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#1e293b", marginBottom: 12 },
  mediaBanner:     { height: 110, alignItems: "center", justifyContent: "center", borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  mediaBody:       { padding: 14 },
  mediaTitle:      { fontSize: 14, fontWeight: "700", color: "#f1f5f9", lineHeight: 20, marginBottom: 4 },
  mediaSub:        { fontSize: 12, color: "#64748b", lineHeight: 17, marginBottom: 10 },
  mediaFooter:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  mediaTagRow:     { flexDirection: "row", flexWrap: "wrap", gap: 4, flex: 1 },
  mediaTag:        { backgroundColor: "rgba(96,165,250,0.12)", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  mediaTagTxt:     { fontSize: 10, color: "#60a5fa", fontWeight: "600" },
  mediaTypePill:   { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  mediaTypeTxt:    { fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  mediaPlayBtn:    { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  liveClassCard:   { backgroundColor: "#0f0a2e", borderRadius: 16, overflow: "hidden", borderWidth: 1, marginBottom: 12 },
  liveClassStrip:  { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 8 },
  stripStatusDot:  { width: 6, height: 6, borderRadius: 3 },
  stripStatusTxt:  { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  liveClassBody:   { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 14, paddingTop: 12 },
  liveClassDateBlock: { width: 58, alignItems: "center", paddingVertical: 10, borderRadius: 12, borderWidth: 1, flexShrink: 0, backgroundColor: "rgba(255,255,255,0.03)" },
  liveClassDayAbbr: { fontSize: 10, fontWeight: "800", letterSpacing: 1, marginBottom: 2 },
  liveClassDayNum:  { fontSize: 26, fontWeight: "900", lineHeight: 30 },
  liveClassMonthYr: { fontSize: 9, fontWeight: "600", marginTop: 2, textAlign: "center" },
  liveClassInfo:    { flex: 1 },
  liveClassTitle:   { fontSize: 14, fontWeight: "800", lineHeight: 20, marginBottom: 6 },
  liveClassTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 10 },
  liveClassTimeTxt: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  liveJoinBtn:      { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  liveJoinTxt:      { fontSize: 12, fontWeight: "700" },
});
