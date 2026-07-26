import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput,
  ActivityIndicator, Alert, Modal, BackHandler, Animated, Dimensions,
} from "react-native";
import { router, useLocalSearchParams, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RtcSurfaceView } from "react-native-agora";
import { useAuthStore } from "../stores/authStore";
import client from "../api/client";
import Whiteboard, { WbStroke } from "../components/Whiteboard";
import {
  requestMediaPermissions, getEngine, attachHandlers, joinChannel,
  leaveChannel, destroyEngine, setMuted, setVideoOff, switchCamera,
  promoteToCoHost, demoteToAudience, startScreenShare, stopScreenShare,
} from "../services/agoraService";

type Role = "host" | "audience";
type Panel = "participants" | "chat" | "whiteboard" | "breakout" | null;

interface ChatMsg { user: string; name: string; text: string; createdAt: string; }
interface RaisedHand { user: string; name: string; }
interface CoHost { user: string; name: string; token: string; uid?: number }
interface BreakoutRoom { id: string; name: string; participantCount: number }
interface MyBreakout { id: string; name: string; channel: string }
interface Reaction { user: string; name: string; emoji: string; ts: number }

const nqColor = (n: number) => n === 0 ? "#6b7280" : n <= 2 ? "#22c55e" : n <= 4 ? "#f59e0b" : "#ef4444";
const nqLabel = (n: number) => n === 0 ? "—" : n <= 2 ? "Good" : n <= 4 ? "Fair" : "Poor";
const REACTION_EMOJIS = ["❤️", "👍", "😂", "👏", "😮", "🎉"];
const SCREEN_W = Dimensions.get("window").width;

const FloatingReaction: React.FC<{ emoji: string; left: number; onDone: () => void }> = ({ emoji, left, onDone }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -200, duration: 2200, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.Text style={{ position: "absolute", bottom: 70, left, fontSize: 34, transform: [{ translateY }], opacity }}>
      {emoji}
    </Animated.Text>
  );
};

export default function LiveRoomScreen() {
  const insets = useSafeAreaInsets();
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const { user } = useAuthStore();

  const [phase, setPhase]       = useState<"loading" | "connecting" | "waiting-room" | "joined" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [role, setRole]         = useState<Role>("audience");
  const [title, setTitle]       = useState("");
  const [connInfo, setConnInfo] = useState<{ appId: string; channel: string; token: string } | null>(null);

  // Agora state
  const [localUid, setLocalUid]   = useState<number | null>(null);
  const [remoteUids, setRemoteUids] = useState<number[]>([]);
  const [isMuted, setIsMutedState]   = useState(false);
  const [isVideoOff, setIsVideoOffState] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(0);

  // Panel / polling state
  const [activePanel, setActivePanel] = useState<Panel>(null);
  const [messages, setMessages]       = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]     = useState("");
  const [unreadChat, setUnreadChat]   = useState(0);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [coHosts, setCoHosts]         = useState<CoHost[]>([]);
  const [isCoHost, setIsCoHost]       = useState(false);
  const [isOneToOneGuest, setIsOneToOneGuest] = useState(false);
  const [wbStrokes, setWbStrokes]     = useState<WbStroke[]>([]);
  const [wbTool, setWbTool]           = useState<"pen" | "eraser">("pen");
  const [wbColor, setWbColor]         = useState("#ffffff");
  const [wbSize, setWbSize]           = useState(4);
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoom[]>([]);
  const [breakoutActive, setBreakoutActive] = useState(false);
  const [myBreakout, setMyBreakout]   = useState<MyBreakout | null>(null);
  const [inBreakout, setInBreakout]   = useState(false);
  const [breakoutCount, setBreakoutCount] = useState(2);
  const [breakoutNotice, setBreakoutNotice] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [locked, setLocked] = useState(false);
  const [lockToggling, setLockToggling] = useState(false);
  const [mutingAll, setMutingAll] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [waitingRoomEnabled, setWaitingRoomEnabled] = useState(false);
  const [waitingRoomToggling, setWaitingRoomToggling] = useState(false);
  const [waitingList, setWaitingList] = useState<{ user: string; name: string; requestedAt: string }[]>([]);
  const [admittingIds, setAdmittingIds] = useState<string[]>([]);
  const [hostUid, setHostUid] = useState<number | null>(null);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);
  const [activeParticipants, setActiveParticipants] = useState<{ uid: number; name: string; user: string }[]>([]);
  const [isForceMuted, setIsForceMuted] = useState(false);
  const [recordingActive, setRecordingActive] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);

  const pollRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgCountRef   = useRef(0);
  const panelRef      = useRef<Panel>(null);
  const coHostRef     = useRef(false);
  const pendingStrokes = useRef<WbStroke[]>([]);
  const mainChannelRef = useRef<{ channel: string; token: string; uid: number } | null>(null);
  const lastReactionTsRef = useRef(0);

  useEffect(() => { panelRef.current = activePanel; }, [activePanel]);

  /* ── initial connect ──────────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    let waitRoomPoll: ReturnType<typeof setInterval> | null = null;

    const connectAgora = (conn: any, myRole: Role) => {
      mainChannelRef.current = { channel: conn.channel, token: conn.token, uid: conn.uid ?? 0 };
      setConnInfo({ appId: conn.appId, channel: conn.channel, token: conn.token });

      // Every joiner gets a publisher token now (see /join) — treat them as a full
      // participant on the Agora SDK level even though their app-level `role` stays
      // "audience" (host-only things like ending the class or creating breakout
      // rooms still belong solely to the actual owner).
      const audienceCanPublish = !!conn.canPublish;
      setIsOneToOneGuest(audienceCanPublish);
      const agoraRole = myRole === "host" || audienceCanPublish ? "host" : "audience";

      getEngine(conn.appId);
      attachHandlers({
        onJoined: (uid) => { setLocalUid(uid); setPhase("joined"); },
        onUserJoined: (uid) => setRemoteUids(prev => prev.includes(uid) ? prev : [...prev, uid]),
        onUserOffline: (uid) => setRemoteUids(prev => prev.filter(u => u !== uid)),
        onNetworkQuality: (q) => setNetworkQuality(q),
        onError: (msg) => { if (cancelled) return; setErrorMsg(msg); setPhase("error"); },
      });
      joinChannel(conn.channel, conn.token, agoraRole, conn.uid ?? 0);
    };

    (async () => {
      if (!classId || !user) { setErrorMsg("Not logged in"); setPhase("error"); return; }
      try {
        const { data } = await client.get(`/live-classes/${classId}`);
        const lc = data.liveClass;
        if (cancelled) return;
        setTitle(lc.title);
        // Backend only allows /start when educator field matches the caller exactly —
        // being an admin alone is not enough, so host eligibility mirrors that check.
        const isOwner = lc.educator?._id === user._id;
        const myRole: Role = isOwner ? "host" : "audience";
        setRole(myRole);

        const granted = await requestMediaPermissions();
        if (!granted) { setErrorMsg("Camera & microphone permission is required to join."); setPhase("error"); return; }

        setPhase("connecting");
        const endpoint = myRole === "host" ? "start" : "join";
        const { data: conn } = await client.post(`/live-classes/${classId}/${endpoint}`);
        if (cancelled) return;

        if (conn.waiting) {
          setPhase("waiting-room");
          waitRoomPoll = setInterval(async () => {
            try {
              const { data: st } = await client.get(`/live-classes/${classId}/state`);
              if (cancelled) return;
              if (st.amIAdmitted) {
                if (waitRoomPoll) clearInterval(waitRoomPoll);
                const { data: conn2 } = await client.post(`/live-classes/${classId}/join`);
                if (cancelled) return;
                setPhase("connecting");
                connectAgora(conn2, myRole);
              }
            } catch {}
          }, 3000);
          return;
        }

        connectAgora(conn, myRole);
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.response?.data?.message ?? "Could not connect to the live class");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      if (waitRoomPoll) clearInterval(waitRoomPoll);
      destroyEngine();
    };
  }, [classId]);

  /* ── poll shared state: chat, hands, co-hosts, whiteboard, breakout ─────── */
  const flushStrokes = useCallback(async () => {
    if (pendingStrokes.current.length === 0) return;
    const toSend = [...pendingStrokes.current];
    pendingStrokes.current = [];
    try { await client.post(`/live-classes/${classId}/whiteboard`, { strokes: toSend }); } catch {}
  }, [classId]);

  const pollState = useCallback(async () => {
    await flushStrokes();
    try {
      const { data } = await client.get(`/live-classes/${classId}/state`);
      setRaisedHands(data.raisedHands || []);
      setCoHosts(data.coHosts || []);
      if (typeof data.hostUid === "number") setHostUid(data.hostUid);
      setMutedUserIds(data.mutedUsers || []);
      setActiveParticipants(data.activeParticipants || []);
      setRecordingActive(!!data.recordingActive);

      // Host-issued mute is enforced here, not just displayed: force the local audio
      // track off and lock the toggle so the muted person can't just unmute themselves.
      const iAmMuted = (data.mutedUsers || []).includes(String(user?._id));
      if (iAmMuted !== isForceMuted) {
        setIsForceMuted(iAmMuted);
        if (iAmMuted) { setMuted(true); setIsMutedState(true); }
      }
      setBreakoutRooms(data.breakoutRooms || []);
      setBreakoutActive(data.breakoutActive || false);
      setMyBreakout(data.myBreakout || null);
      setWbStrokes(data.whiteboardStrokes || []);

      const myCoHost = (data.coHosts || []).find((c: CoHost) => c.user === String(user?._id) && c.token);
      const promoted = !!myCoHost;
      if (promoted !== coHostRef.current && role === "audience") {
        coHostRef.current = promoted;
        setIsCoHost(promoted);
        if (promoted) promoteToCoHost();
        else if (!inBreakout) demoteToAudience();
      }

      const myRoom: MyBreakout | null = data.myBreakout;
      if (myRoom && data.breakoutActive && !inBreakout) {
        setBreakoutNotice(`You've been moved to ${myRoom.name}`);
      }
      if (!data.breakoutActive && inBreakout) {
        returnFromBreakout();
      }

      const incoming: ChatMsg[] = data.messages || [];
      if (incoming.length > msgCountRef.current && panelRef.current !== "chat") {
        setUnreadChat(u => u + (incoming.length - msgCountRef.current));
      }
      msgCountRef.current = incoming.length;
      setMessages(incoming);

      setLocked(!!data.locked);
      setWaitingRoomEnabled(!!data.waitingRoomEnabled);
      setWaitingList(data.waitingRoom || []);
      const incomingReactions: Reaction[] = data.reactions || [];
      const fresh = incomingReactions.filter(r => r.ts > lastReactionTsRef.current);
      if (fresh.length) {
        lastReactionTsRef.current = Math.max(...fresh.map(r => r.ts));
        fresh.forEach(r => addFloatingReaction(r.emoji));
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, user?._id, role, inBreakout, flushStrokes, isForceMuted]);

  useEffect(() => {
    if (phase !== "joined") return;
    pollState();
    pollRef.current = setInterval(pollState, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [phase, pollState]);

  /* ── breakout join / return ──────────────────────────────────────────── */
  const joinBreakout = async (room: { id: string; name: string }) => {
    try {
      setBreakoutNotice(null);
      const { data } = await client.post(`/live-classes/${classId}/breakout/${room.id}/join`);
      leaveChannel();
      setRemoteUids([]);
      setInBreakout(true);
      joinChannel(data.channel, data.token, "host", data.uid ?? 0);
    } catch { Alert.alert("Error", "Could not join breakout room."); }
  };

  const returnFromBreakout = async () => {
    setInBreakout(false);
    setBreakoutNotice("Returning to main room…");
    leaveChannel();
    setRemoteUids([]);
    const main = mainChannelRef.current;
    if (main) joinChannel(main.channel, main.token, role, main.uid);
    setBreakoutNotice(null);
  };

  /* ── toolbar actions ─────────────────────────────────────────────────── */
  const toggleMute = () => {
    if (isForceMuted) { Alert.alert("Muted by host", "The host has muted you. They need to unmute you before you can speak."); return; }
    setMuted(!isMuted); setIsMutedState(v => !v);
  };
  const toggleVideo = () => { setVideoOff(!isVideoOff); setIsVideoOffState(v => !v); };
  const toggleScreenShare = () => {
    if (isScreenSharing) { stopScreenShare(); setIsScreenSharing(false); return; }
    const ok = startScreenShare();
    if (!ok) { Alert.alert("Screen Share", "Could not start screen sharing. Please allow screen capture permission and try again."); return; }
    setIsScreenSharing(true);
    setIsVideoOffState(false);
  };
  const togglePanel = (p: Panel) => { if (p === "chat") setUnreadChat(0); setActivePanel(prev => prev === p ? null : p); };

  /* ── reactions ────────────────────────────────────────────────────────── */
  const addFloatingReaction = (emoji: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const left = 24 + Math.random() * (SCREEN_W - 80);
    setFloatingReactions(prev => [...prev, { id, emoji, left }]);
  };
  const removeFloatingReaction = (id: string) => setFloatingReactions(prev => prev.filter(r => r.id !== id));
  const sendReaction = async (emoji: string) => {
    setShowReactionPicker(false);
    addFloatingReaction(emoji); // show instantly for the sender, no need to wait for the next poll
    try { await client.post(`/live-classes/${classId}/react`, { emoji }); } catch {}
  };

  /* ── host: mute all co-hosts ─────────────────────────────────────────── */
  const muteAll = async () => {
    if (coHosts.length === 0) return;
    setMutingAll(true);
    try { await client.post(`/live-classes/${classId}/mute-all`); await pollState(); }
    catch { Alert.alert("Error", "Could not mute all participants."); }
    finally { setMutingAll(false); }
  };

  /* ── host: lock / unlock meeting ─────────────────────────────────────── */
  const toggleLock = async () => {
    setLockToggling(true);
    try {
      const { data } = await client.post(`/live-classes/${classId}/lock`, { locked: !locked });
      setLocked(!!data.locked);
    } catch { Alert.alert("Error", "Could not update meeting lock."); }
    finally { setLockToggling(false); }
  };

  /* ── host: cloud recording ───────────────────────────────────────────── */
  const toggleRecording = async () => {
    setRecordingBusy(true);
    try {
      if (recordingActive) {
        await client.post(`/live-classes/${classId}/recording/stop`);
        setRecordingActive(false);
      } else {
        await client.post(`/live-classes/${classId}/recording/start`);
        setRecordingActive(true);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? "Failed to update recording");
    } finally {
      setRecordingBusy(false);
    }
  };

  /* ── host: waiting room ──────────────────────────────────────────────── */
  const toggleWaitingRoom = async () => {
    setWaitingRoomToggling(true);
    try {
      const { data } = await client.post(`/live-classes/${classId}/waiting-room/toggle`, { enabled: !waitingRoomEnabled });
      setWaitingRoomEnabled(!!data.waitingRoomEnabled);
    } catch { Alert.alert("Error", "Could not update waiting room."); }
    finally { setWaitingRoomToggling(false); }
  };
  const admitFromWaitingRoom = async (userId: string) => {
    setAdmittingIds(ids => [...ids, userId]);
    try { await client.post(`/live-classes/${classId}/waiting-room/${userId}/admit`); await pollState(); }
    catch { Alert.alert("Error", "Could not admit this participant."); }
    finally { setAdmittingIds(ids => ids.filter(i => i !== userId)); }
  };
  const denyFromWaitingRoom = async (userId: string) => {
    setAdmittingIds(ids => [...ids, userId]);
    try { await client.post(`/live-classes/${classId}/waiting-room/${userId}/deny`); await pollState(); }
    catch { Alert.alert("Error", "Could not deny this participant."); }
    finally { setAdmittingIds(ids => ids.filter(i => i !== userId)); }
  };

  const sendMessage = async () => {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    try { await client.post(`/live-classes/${classId}/chat`, { text }); await pollState(); } catch {}
  };

  const toggleHand = async () => {
    try { const { data } = await client.post(`/live-classes/${classId}/hand`); setIsHandRaised(data.raised); } catch {}
  };

  const promoteUser = async (userId: string) => { try { await client.post(`/live-classes/${classId}/promote/${userId}`); await pollState(); } catch {} };
  const demoteUser  = async (userId: string) => { try { await client.delete(`/live-classes/${classId}/promote/${userId}`); await pollState(); } catch {} };
  const lowerHand   = async (userId: string) => { try { await client.delete(`/live-classes/${classId}/hand/${userId}`); setRaisedHands(p => p.filter(h => h.user !== userId)); } catch {} };
  const muteUser    = async (userId: string) => { try { await client.post(`/live-classes/${classId}/mute/${userId}`); await pollState(); } catch {} };
  const clearBoard  = async () => { try { await client.delete(`/live-classes/${classId}/whiteboard`); setWbStrokes([]); } catch {} };
  const createBreakout = async () => { try { await client.post(`/live-classes/${classId}/breakout`, { count: breakoutCount }); await pollState(); } catch {} };
  const endBreakout = async () => { try { await client.delete(`/live-classes/${classId}/breakout`); await pollState(); } catch {} };

  const onStrokeDone = (stroke: WbStroke) => {
    const s = { ...stroke, userId: String(user?._id || "") };
    setWbStrokes(prev => [...prev, s]);
    pendingStrokes.current.push(s);
  };

  const leaveRoom = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (role === "host") { client.post(`/live-classes/${classId}/end`).catch(() => {}); }
    destroyEngine();
    router.back();
  }, [classId, role]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { leaveRoom(); return true; });
    return () => sub.remove();
  }, [leaveRoom]);

  const canPublish = role === "host" || isCoHost || isOneToOneGuest;
  // Agora uids carry no identity info by themselves — the backend derives them
  // deterministically from each user's Mongo id (see mongoIdToUid server-side), so
  // every client can resolve the same uid back to a name the same way, with no extra
  // round-trip. Falls back to a role-based label when the uid isn't a known co-host.
  const nameForUid = (uid: number): string => {
    if (hostUid !== null && uid === hostUid) return "Host";
    const ch = coHosts.find(c => c.uid === uid);
    if (ch) return ch.name;
    const p = activeParticipants.find(p => p.uid === uid);
    if (p) return p.name;
    return isOneToOneGuest || role === "host" ? "Participant" : "Student";
  };
  const mutedUserUids = activeParticipants.filter(p => mutedUserIds.includes(p.user)).map(p => p.uid);
  const handBadge = role === "host" ? raisedHands.length + coHosts.length + waitingList.length : 0;

  /* ── render: connecting / error states ───────────────────────────────── */
  if (phase === "loading" || phase === "connecting") {
    return (
      <View style={st.centerScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={st.centerTxt}>{phase === "loading" ? "Loading class…" : "Joining live class…"}</Text>
      </View>
    );
  }
  if (phase === "waiting-room") {
    return (
      <View style={st.centerScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="hourglass-outline" size={44} color="#f59e0b" />
        <Text style={[st.centerTxt, { color: "#f59e0b", fontWeight: "700" }]}>Waiting for the host</Text>
        <Text style={[st.centerTxt, { fontSize: 13 }]}>The host has enabled a waiting room. You'll be let in automatically once they admit you.</Text>
        <ActivityIndicator size="small" color="#7c3aed" style={{ marginTop: 8 }} />
        <TouchableOpacity style={st.closeErrBtn} onPress={() => router.back()}>
          <Text style={st.closeErrTxt}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (phase === "error") {
    return (
      <View style={st.centerScreen}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="warning-outline" size={44} color="#f87171" />
        <Text style={[st.centerTxt, { color: "#f87171", fontWeight: "700" }]}>Could not connect</Text>
        <Text style={[st.centerTxt, { fontSize: 13 }]}>{errorMsg}</Text>
        <TouchableOpacity style={st.closeErrBtn} onPress={() => router.back()}>
          <Text style={st.closeErrTxt}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={st.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      {!isFullScreen && (
        <View style={[st.header, { paddingTop: insets.top + 10 }]}>
          <View style={st.headerLeft}>
            <View style={st.liveBadge}>
              <View style={st.liveDot} />
              <Text style={st.liveBadgeTxt}>{inBreakout ? "BREAKOUT" : "LIVE"}</Text>
            </View>
            <Text style={st.participantsTxt}>👥 {remoteUids.length + 1}</Text>
            {recordingActive && (
              <View style={st.recBadge}>
                <View style={st.recDot} />
                <Text style={st.recBadgeTxt}>REC</Text>
              </View>
            )}
            {isCoHost && <View style={st.coHostBadge}><Text style={st.coHostTxt}>CO-HOST</Text></View>}
          </View>
          <View style={st.headerRight}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <View style={[st.nqDot, { backgroundColor: nqColor(networkQuality) }]} />
              <Text style={st.nqTxt}>{nqLabel(networkQuality)}</Text>
            </View>
            {role === "host" && (
              <TouchableOpacity style={[st.lockBtn, locked && st.lockBtnActive]} onPress={toggleLock} disabled={lockToggling}>
                <Ionicons name={locked ? "lock-closed" : "lock-open-outline"} size={14} color={locked ? "#f59e0b" : "#9ca3af"} />
              </TouchableOpacity>
            )}
            {role === "host" && (
              <TouchableOpacity style={[st.lockBtn, waitingRoomEnabled && st.lockBtnActive]} onPress={toggleWaitingRoom} disabled={waitingRoomToggling}>
                <Ionicons name="people-circle-outline" size={15} color={waitingRoomEnabled ? "#f59e0b" : "#9ca3af"} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={st.lockBtn} onPress={() => setIsFullScreen(true)}>
              <Ionicons name="expand" size={14} color="#9ca3af" />
            </TouchableOpacity>
            <TouchableOpacity style={st.leaveBtn} onPress={inBreakout ? returnFromBreakout : leaveRoom}>
              <Text style={st.leaveBtnTxt}>{inBreakout ? "↩ Main" : role === "host" ? "End" : "Leave"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Breakout notice banner */}
      {breakoutNotice && !inBreakout && myBreakout && (
        <View style={st.noticeBar}>
          <Text style={st.noticeTxt}>🏠 {breakoutNotice}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity style={st.noticeBtn} onPress={() => joinBreakout(myBreakout)}>
              <Text style={st.noticeBtnTxt}>Join Room</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setBreakoutNotice(null)}>
              <Text style={st.noticeDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Video area */}
      <View style={st.videoArea}>
        {/* Main view: the other participant(s) — like Zoom's speaker view */}
        {remoteUids.length > 0 ? (
          remoteUids.map(uid => (
            <View key={uid} style={st.tile}>
              <RtcSurfaceView canvas={{ uid }} style={StyleSheet.absoluteFill} />
              <Text style={st.tileLabel}>{inBreakout ? "Participant" : nameForUid(uid)}{mutedUserUids.includes(uid) ? " 🔇" : ""}</Text>
            </View>
          ))
        ) : connInfo && canPublish && localUid !== null ? (
          // Nobody else here yet — nothing to show as "main", so your own video fills the space
          <View style={st.tile}>
            {isScreenSharing ? (
              <View style={st.screenSharingBox}>
                <Ionicons name="tv-outline" size={40} color="#a78bfa" />
                <Text style={st.screenSharingTxt}>You're sharing your screen</Text>
              </View>
            ) : (
              <RtcSurfaceView canvas={{ uid: 0 }} style={StyleSheet.absoluteFill} />
            )}
            <Text style={st.tileLabel}>You {role === "host" ? "(Host)" : isOneToOneGuest ? "" : "(Co-host)"}{isMuted ? " 🔇" : ""}{isScreenSharing ? " 🖥️" : ""}</Text>
          </View>
        ) : (
          <View style={st.waitingBox}>
            <Text style={{ fontSize: 40 }}>⏳</Text>
            <Text style={st.waitingTxt}>Waiting for host…</Text>
            {isHandRaised && <Text style={st.handTxt}>✋ Hand raised — host can see your request</Text>}
          </View>
        )}

        {/* Your own video — small corner thumbnail once someone else is on the main view */}
        {remoteUids.length > 0 && connInfo && canPublish && localUid !== null && (
          <View style={st.localPip}>
            {isScreenSharing ? (
              <View style={st.screenSharingBox}>
                <Ionicons name="tv-outline" size={20} color="#a78bfa" />
              </View>
            ) : (
              <RtcSurfaceView canvas={{ uid: 0 }} style={StyleSheet.absoluteFill} />
            )}
            <Text style={st.pipLabel}>You{isMuted ? " 🔇" : ""}</Text>
          </View>
        )}

        {/* Floating reactions */}
        {floatingReactions.map(r => (
          <FloatingReaction key={r.id} emoji={r.emoji} left={r.left} onDone={() => removeFloatingReaction(r.id)} />
        ))}

        {/* Reaction picker popup */}
        {showReactionPicker && (
          <View style={st.reactionPicker}>
            {REACTION_EMOJIS.map(e => (
              <TouchableOpacity key={e} style={st.reactionPickerBtn} onPress={() => sendReaction(e)}>
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Full-screen: minimal floating control bar, since the regular header/toolbar are hidden */}
        {isFullScreen && (
          <View style={[st.fsOverlay, { top: insets.top + 10 }]}>
            <TouchableOpacity style={st.fsBtn} onPress={() => setIsFullScreen(false)}>
              <Ionicons name="contract" size={18} color="#fff" />
            </TouchableOpacity>
            {canPublish && (
              <>
                <TouchableOpacity style={[st.fsBtn, isMuted && st.fsBtnActive]} onPress={toggleMute}>
                  <Ionicons name={isMuted ? "mic-off" : "mic"} size={18} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[st.fsBtn, isVideoOff && st.fsBtnActive]} onPress={toggleVideo}>
                  <Ionicons name={isVideoOff ? "videocam-off" : "videocam"} size={18} color="#fff" />
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={[st.fsBtn, { backgroundColor: "#dc2626" }]} onPress={inBreakout ? returnFromBreakout : leaveRoom}>
              <Ionicons name="call" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom toolbar */}
      {!isFullScreen && (
      <View style={[st.toolbar, { paddingBottom: insets.bottom + 10 }]}>
        {canPublish && (
          <>
            <TBtn icon={isMuted ? "mic-off" : "mic"} active={isMuted} onPress={toggleMute} />
            {!isScreenSharing && <TBtn icon={isVideoOff ? "videocam-off" : "videocam"} active={isVideoOff} onPress={toggleVideo} />}
            {!isScreenSharing && <TBtn icon="camera-reverse" onPress={switchCamera} />}
            {role === "host" && <TBtn icon={isScreenSharing ? "tv" : "tv-outline"} active={isScreenSharing} onPress={toggleScreenShare} />}
            {role === "host" && <TBtn icon="radio-button-on" active={recordingActive} disabled={recordingBusy} onPress={toggleRecording} />}
            <View style={st.toolbarSep} />
          </>
        )}
        <TBtn icon="happy-outline" active={showReactionPicker} onPress={() => setShowReactionPicker(v => !v)} />
        <TBtn icon="people" active={activePanel === "participants"} badge={handBadge} onPress={() => togglePanel("participants")} />
        <TBtn icon="chatbubble-ellipses" active={activePanel === "chat"} badge={unreadChat} onPress={() => togglePanel("chat")} />
        <TBtn icon="brush" active={activePanel === "whiteboard"} onPress={() => togglePanel("whiteboard")} />
        {role === "host" && <TBtn icon="grid" active={activePanel === "breakout"} badge={breakoutActive ? 1 : 0} onPress={() => togglePanel("breakout")} />}
        {role === "audience" && !isCoHost && <TBtn icon="hand-left" active={isHandRaised} onPress={toggleHand} />}
      </View>
      )}

      {/* Panel modal (bottom sheet) */}
      <Modal visible={!!activePanel} transparent animationType="slide" onRequestClose={() => setActivePanel(null)}>
        <View style={st.panelBackdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setActivePanel(null)} />
          <View style={st.panelSheet}>
            <View style={st.panelHandle} />
            <View style={st.panelTabs}>
              {(["participants", "chat", "whiteboard", ...(role === "host" ? ["breakout" as Panel] : [])] as Panel[]).map(p => (
                <TouchableOpacity key={p as string} style={[st.panelTab, activePanel === p && st.panelTabActive]}
                  onPress={() => { setActivePanel(p); if (p === "chat") setUnreadChat(0); }}>
                  <Text style={[st.panelTabTxt, activePanel === p && st.panelTabTxtActive]}>
                    {{ participants: "👥 People", chat: "💬 Chat", whiteboard: "🖊 Board", breakout: "🏠 Rooms" }[p as string]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activePanel === "participants" && (
              <ScrollView style={st.panelBody}>
                {role === "host" && waitingList.length > 0 && (
                  <>
                    <Text style={st.panelSectionTitle}>🚪 WAITING ROOM ({waitingList.length})</Text>
                    {waitingList.map(w => (
                      <View key={w.user} style={st.personRow}>
                        <Text style={st.personName}>{w.name}</Text>
                        {admittingIds.includes(w.user) ? (
                          <ActivityIndicator size="small" color="#7c3aed" />
                        ) : (
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <TouchableOpacity style={st.smallBtnGhost} onPress={() => denyFromWaitingRoom(w.user)}><Text style={st.smallBtnGhostTxt}>Deny</Text></TouchableOpacity>
                            <TouchableOpacity style={st.smallBtnPrimary} onPress={() => admitFromWaitingRoom(w.user)}><Text style={st.smallBtnTxt}>Admit</Text></TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}
                {raisedHands.length > 0 && (
                  <>
                    <Text style={st.panelSectionTitle}>✋ RAISED HANDS ({raisedHands.length})</Text>
                    {raisedHands.map(h => (
                      <View key={h.user} style={st.personRow}>
                        <Text style={st.personName}>{h.name}</Text>
                        {role === "host" && (
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <TouchableOpacity style={st.smallBtnPrimary} onPress={() => promoteUser(h.user)}><Text style={st.smallBtnTxt}>Let Speak</Text></TouchableOpacity>
                            <TouchableOpacity style={st.smallBtnGhost} onPress={() => lowerHand(h.user)}><Text style={st.smallBtnGhostTxt}>Lower</Text></TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}
                {coHosts.length > 0 && (
                  <>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={st.panelSectionTitle}>🎤 SPEAKING ({coHosts.length})</Text>
                      {role === "host" && (
                        <TouchableOpacity style={st.muteAllBtn} disabled={mutingAll} onPress={muteAll}>
                          {mutingAll ? <ActivityIndicator size="small" color="#f87171" /> : <Text style={st.muteAllBtnTxt}>Mute All</Text>}
                        </TouchableOpacity>
                      )}
                    </View>
                    {coHosts.map(ch => (
                      <View key={ch.user} style={st.personRow}>
                        <Text style={st.personName}>{ch.name}</Text>
                        {role === "host" && (
                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <TouchableOpacity style={st.smallBtnDanger} onPress={() => muteUser(ch.user)}><Text style={st.smallBtnDangerTxt}>Mute</Text></TouchableOpacity>
                            <TouchableOpacity style={st.smallBtnGhost} onPress={() => demoteUser(ch.user)}><Text style={st.smallBtnGhostTxt}>Remove</Text></TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </>
                )}
                <Text style={st.panelSectionTitle}>IN SESSION ({remoteUids.length + 1})</Text>
                <View style={st.personRow}>
                  <Text style={st.personName}>{user?.name || "You"} {role === "host" ? "(Host)" : isCoHost ? "(Co-host)" : ""}</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {isMuted && <Ionicons name="mic-off" size={13} color="#f87171" />}
                    {isVideoOff && <Ionicons name="videocam-off" size={13} color="#f87171" />}
                  </View>
                </View>
                {remoteUids.map(uid => {
                  const p = activeParticipants.find(ap => ap.uid === uid);
                  const isMutedRemote = mutedUserUids.includes(uid);
                  return (
                    <View key={uid} style={st.personRow}>
                      <Text style={st.personName}>{inBreakout ? "Participant" : nameForUid(uid)}</Text>
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        {isMutedRemote && <Ionicons name="mic-off" size={13} color="#f87171" />}
                        {role === "host" && p && (
                          <TouchableOpacity style={isMutedRemote ? st.smallBtnGhost : st.smallBtnDanger} onPress={() => muteUser(p.user)}>
                            <Text style={isMutedRemote ? st.smallBtnGhostTxt : st.smallBtnDangerTxt}>{isMutedRemote ? "Unmute" : "Mute"}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {activePanel === "chat" && (
              <View style={{ flex: 1 }}>
                <ScrollView style={st.panelBody}>
                  {messages.length === 0 && <Text style={st.emptyChatTxt}>No messages yet 👋</Text>}
                  {messages.map((m, i) => {
                    const isSelf = m.name === user?.name;
                    return (
                      <View key={i} style={{ alignItems: isSelf ? "flex-end" : "flex-start", marginBottom: 8 }}>
                        <Text style={st.chatSender}>{m.name}</Text>
                        <View style={[st.chatBubble, { backgroundColor: isSelf ? "#7c3aed" : "#1e1b4b" }]}>
                          <Text style={st.chatBubbleTxt}>{m.text}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
                <View style={[st.chatInputRow, { paddingBottom: 10 + insets.bottom }]}>
                  <TextInput value={chatInput} onChangeText={setChatInput} placeholder="Message…"
                    placeholderTextColor="#6b7280" style={st.chatInput} />
                  <TouchableOpacity style={st.chatSendBtn} disabled={!chatInput.trim()} onPress={sendMessage}>
                    <Ionicons name="send" size={15} color={chatInput.trim() ? "#fff" : "#6b7280"} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {activePanel === "whiteboard" && (
              <View style={{ flex: 1 }}>
                <View style={st.wbToolbar}>
                  <TouchableOpacity style={[st.wbToolBtn, wbTool === "pen" && st.wbToolBtnActive]} onPress={() => setWbTool("pen")}>
                    <Text style={st.wbToolTxt}>✏️ Pen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.wbToolBtn, wbTool === "eraser" && st.wbToolBtnActive]} onPress={() => setWbTool("eraser")}>
                    <Text style={st.wbToolTxt}>🧹 Erase</Text>
                  </TouchableOpacity>
                  {["#ffffff", "#f87171", "#34d399", "#60a5fa", "#fbbf24", "#a78bfa"].map(c => (
                    <TouchableOpacity key={c} onPress={() => { setWbColor(c); setWbTool("pen"); }}
                      style={[st.wbColorDot, { backgroundColor: c, borderColor: wbColor === c ? "#fff" : "transparent" }]} />
                  ))}
                  {role === "host" && (
                    <TouchableOpacity style={st.wbClearBtn} onPress={clearBoard}>
                      <Text style={st.wbClearTxt}>🗑 Clear</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Whiteboard strokes={wbStrokes} canDraw={canPublish} tool={wbTool} color={wbColor} size={wbSize} onStrokeDone={onStrokeDone} />
                {!canPublish && <Text style={st.wbViewOnly}>View only — raise hand to request drawing access</Text>}
              </View>
            )}

            {activePanel === "breakout" && role === "host" && (
              <ScrollView style={st.panelBody}>
                {!breakoutActive ? (
                  <>
                    <Text style={st.breakoutDesc}>Split students into small groups for collaborative exercises.</Text>
                    <Text style={st.panelSectionTitle}>NUMBER OF ROOMS</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
                      {[2, 3, 4].map(n => (
                        <TouchableOpacity key={n} style={[st.roomCountBtn, breakoutCount === n && st.roomCountBtnActive]} onPress={() => setBreakoutCount(n)}>
                          <Text style={[st.roomCountTxt, breakoutCount === n && st.roomCountTxtActive]}>{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={st.startBreakoutBtn} onPress={createBreakout}>
                      <Text style={st.startBreakoutTxt}>🏠 Start Breakout Sessions</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={st.breakoutActiveTxt}>✅ Breakout sessions active</Text>
                    {breakoutRooms.map(rm => (
                      <View key={rm.id} style={st.roomCard}>
                        <Text style={st.roomCardTitle}>{rm.name}</Text>
                        <Text style={st.roomCardSub}>👥 {rm.participantCount} participant{rm.participantCount !== 1 ? "s" : ""}</Text>
                      </View>
                    ))}
                    <TouchableOpacity style={st.endBreakoutBtn} onPress={endBreakout}>
                      <Text style={st.endBreakoutTxt}>End All Breakouts</Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const TBtn: React.FC<{ icon: React.ComponentProps<typeof Ionicons>["name"]; active?: boolean; badge?: number; disabled?: boolean; onPress: () => void }> =
  ({ icon, active, badge, disabled, onPress }) => (
    <TouchableOpacity style={[st.tBtn, active && st.tBtnActive]} onPress={onPress} disabled={disabled}>
      <Ionicons name={icon} size={20} color={disabled ? "#6b7280" : active ? "#a78bfa" : "#d1d5db"} />
      {!!badge && badge > 0 && <View style={st.tBtnBadge}><Text style={st.tBtnBadgeTxt}>{badge > 9 ? "9+" : badge}</Text></View>}
    </TouchableOpacity>
  );

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0a0910" },
  centerScreen: { flex: 1, backgroundColor: "#0a0910", alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  centerTxt: { color: "#9ca3af", textAlign: "center" },
  closeErrBtn: { marginTop: 16, borderWidth: 1, borderColor: "#3730a3", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  closeErrTxt: { color: "#a78bfa", fontWeight: "700" },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#13122a", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#1e1b4b" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(239,68,68,0.15)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(239,68,68,0.4)" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveBadgeTxt: { color: "#ef4444", fontSize: 10, fontWeight: "800" },
  participantsTxt: { color: "#9ca3af", fontSize: 12 },
  recBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(220,38,38,0.15)", borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(220,38,38,0.4)" },
  recDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#dc2626" },
  recBadgeTxt: { color: "#dc2626", fontSize: 10, fontWeight: "800" },
  coHostBadge: { backgroundColor: "rgba(124,58,237,0.2)", borderWidth: 1, borderColor: "rgba(124,58,237,0.4)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  coHostTxt: { color: "#a78bfa", fontSize: 10, fontWeight: "700" },
  nqDot: { width: 7, height: 7, borderRadius: 4 },
  nqTxt: { color: "#9ca3af", fontSize: 10 },
  leaveBtn: { backgroundColor: "#dc2626", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  leaveBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  lockBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  lockBtnActive: { backgroundColor: "rgba(245,158,11,0.18)" },
  reactionPicker: { position: "absolute", bottom: 10, left: 12, right: 12, flexDirection: "row", justifyContent: "space-around", backgroundColor: "rgba(19,18,42,0.95)", borderRadius: 26, paddingVertical: 8, borderWidth: 1, borderColor: "#1e1b4b" },
  reactionPickerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  muteAllBtn: { borderWidth: 1, borderColor: "rgba(239,68,68,0.4)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, minWidth: 60, alignItems: "center" },
  muteAllBtnTxt: { color: "#f87171", fontSize: 11, fontWeight: "700" },
  fsOverlay: { position: "absolute", right: 12, flexDirection: "row", gap: 8, zIndex: 50 },
  fsBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.55)" },
  fsBtnActive: { backgroundColor: "rgba(220,38,38,0.7)" },

  noticeBar: { backgroundColor: "rgba(245,158,11,0.12)", borderBottomWidth: 1, borderBottomColor: "rgba(245,158,11,0.3)", padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noticeTxt: { color: "#f59e0b", fontSize: 13, fontWeight: "600", flex: 1 },
  noticeBtn: { backgroundColor: "#f59e0b", borderRadius: 7, paddingHorizontal: 12, paddingVertical: 5 },
  noticeBtnTxt: { color: "#000", fontSize: 12, fontWeight: "700" },
  noticeDismiss: { color: "#f59e0b", fontSize: 12 },

  videoArea: { flex: 1, backgroundColor: "#000" },
  tile: { flex: 1, backgroundColor: "#111", position: "relative", minHeight: 160 },
  tileLabel: { position: "absolute", bottom: 8, left: 8, backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 11, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 5 },
  localPip: { position: "absolute", bottom: 14, right: 14, width: 110, height: 148, borderRadius: 10, overflow: "hidden", backgroundColor: "#111", borderWidth: 2, borderColor: "#3730a3", elevation: 6, zIndex: 5 },
  pipLabel: { position: "absolute", bottom: 5, left: 5, backgroundColor: "rgba(0,0,0,0.7)", color: "#fff", fontSize: 9, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  waitingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  waitingTxt: { color: "#6b7280", fontSize: 14 },
  screenSharingBox: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#1e1b4b" },
  screenSharingTxt: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },
  handTxt: { color: "#f59e0b", fontSize: 12 },

  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#13122a", borderTopWidth: 1, borderTopColor: "#1e1b4b", paddingHorizontal: 14, paddingVertical: 10, justifyContent: "center" },
  toolbarSep: { width: 1, height: 28, backgroundColor: "#2a274a" },
  tBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", position: "relative" },
  tBtnActive: { backgroundColor: "rgba(124,58,237,0.25)" },
  tBtnBadge: { position: "absolute", top: 0, right: 0, backgroundColor: "#ef4444", borderRadius: 9, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  tBtnBadgeTxt: { color: "#fff", fontSize: 9, fontWeight: "800" },

  panelBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  panelSheet: { height: "62%", backgroundColor: "#13122a", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },
  panelHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginTop: 10, marginBottom: 4 },
  panelTabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1e1b4b" },
  panelTab: { flex: 1, paddingVertical: 11, alignItems: "center", borderBottomWidth: 2, borderBottomColor: "transparent" },
  panelTabActive: { borderBottomColor: "#7c3aed" },
  panelTabTxt: { color: "#6b7280", fontSize: 11, fontWeight: "700" },
  panelTabTxtActive: { color: "#a78bfa" },
  panelBody: { flex: 1, padding: 12 },
  panelSectionTitle: { color: "#a78bfa", fontSize: 10, fontWeight: "800", letterSpacing: 0.6, marginBottom: 6, marginTop: 6 },
  personRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(124,58,237,0.08)", borderRadius: 8, padding: 9, marginBottom: 5 },
  personName: { color: "#f3f4f6", fontSize: 13, fontWeight: "600" },
  personNameMuted: { color: "#9ca3af", fontSize: 13 },
  smallBtnPrimary: { backgroundColor: "#7c3aed", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  smallBtnTxt: { color: "#fff", fontSize: 10, fontWeight: "700" },
  smallBtnGhost: { borderWidth: 1, borderColor: "#3730a3", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  smallBtnGhostTxt: { color: "#a78bfa", fontSize: 10, fontWeight: "700" },
  smallBtnDanger: { borderWidth: 1, borderColor: "rgba(239,68,68,0.4)", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  smallBtnDangerTxt: { color: "#f87171", fontSize: 10, fontWeight: "700" },

  emptyChatTxt: { color: "#6b7280", fontSize: 13, textAlign: "center", marginTop: 36 },
  chatSender: { color: "#6b7280", fontSize: 9, marginBottom: 2, paddingHorizontal: 4 },
  chatBubble: { maxWidth: "78%", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14 },
  chatBubbleTxt: { color: "#f3f4f6", fontSize: 13 },
  chatInputRow: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: "#1e1b4b" },
  chatInput: { flex: 1, backgroundColor: "#0a0910", borderWidth: 1, borderColor: "#1e1b4b", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, color: "#f3f4f6", fontSize: 13 },
  chatSendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center" },

  wbToolbar: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderBottomWidth: 1, borderBottomColor: "#1e1b4b", flexWrap: "wrap" },
  wbToolBtn: { borderWidth: 1, borderColor: "#1e1b4b", borderRadius: 6, paddingHorizontal: 9, paddingVertical: 4 },
  wbToolBtnActive: { borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.2)" },
  wbToolTxt: { color: "#d1d5db", fontSize: 11 },
  wbColorDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  wbClearBtn: { marginLeft: "auto", borderWidth: 1, borderColor: "rgba(239,68,68,0.4)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  wbClearTxt: { color: "#f87171", fontSize: 10 },
  wbViewOnly: { textAlign: "center", color: "#6b7280", fontSize: 11, padding: 6 },

  breakoutDesc: { color: "#9ca3af", fontSize: 12, marginBottom: 12 },
  roomCountBtn: { flex: 1, paddingVertical: 10, borderWidth: 1.5, borderColor: "#1e1b4b", borderRadius: 10, alignItems: "center" },
  roomCountBtnActive: { borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.2)" },
  roomCountTxt: { color: "#9ca3af", fontSize: 16, fontWeight: "800" },
  roomCountTxtActive: { color: "#a78bfa" },
  startBreakoutBtn: { backgroundColor: "#7c3aed", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  startBreakoutTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  breakoutActiveTxt: { color: "#22c55e", fontSize: 12, fontWeight: "700", marginBottom: 10 },
  roomCard: { backgroundColor: "#1e1b4b", borderRadius: 10, padding: 12, marginBottom: 8 },
  roomCardTitle: { color: "#f3f4f6", fontSize: 13, fontWeight: "700", marginBottom: 3 },
  roomCardSub: { color: "#9ca3af", fontSize: 11 },
  endBreakoutBtn: { backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.4)", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 6 },
  endBreakoutTxt: { color: "#f87171", fontWeight: "700", fontSize: 13 },
});
