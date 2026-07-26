import { Platform, PermissionsAndroid } from "react-native";
import {
  createAgoraRtcEngine,
  IRtcEngine,
  IRtcEngineEventHandler,
  ChannelProfileType,
  ClientRoleType,
  RtcConnection,
} from "react-native-agora";

export type AgoraRole = "host" | "audience";

interface AgoraCallbacks {
  onJoined?: (localUid: number) => void;
  onUserJoined?: (uid: number) => void;
  onUserOffline?: (uid: number) => void;
  onNetworkQuality?: (quality: number) => void;
  onError?: (msg: string) => void;
  onLeft?: () => void;
}

let engine: IRtcEngine | null = null;
let initializedAppId = "";
let activeHandler: IRtcEngineEventHandler | null = null;

export async function requestMediaPermissions(): Promise<boolean> {
  if (Platform.OS !== "android") return true;
  try {
    const res = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
    return (
      res[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED &&
      res[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED
    );
  } catch {
    return false;
  }
}

export function getEngine(appId: string): IRtcEngine {
  if (engine && initializedAppId === appId) return engine;
  if (engine) { try { engine.release(); } catch {} engine = null; }
  engine = createAgoraRtcEngine();
  engine.initialize({ appId, channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting });
  engine.enableVideo();
  engine.enableAudio();
  initializedAppId = appId;
  return engine;
}

/** Attach event listeners for this call session. Returns a cleanup function. */
export function attachHandlers(cb: AgoraCallbacks): () => void {
  if (!engine) return () => {};
  if (activeHandler) { try { engine.unregisterEventHandler(activeHandler); } catch {} }
  const handler: IRtcEngineEventHandler = {
    onJoinChannelSuccess: (connection: RtcConnection) => cb.onJoined?.(connection.localUid ?? 0),
    onUserJoined: (_connection, remoteUid) => cb.onUserJoined?.(remoteUid),
    onUserOffline: (_connection, remoteUid) => cb.onUserOffline?.(remoteUid),
    onNetworkQuality: (_connection, remoteUid, txQuality, rxQuality) => {
      if (remoteUid === 0) cb.onNetworkQuality?.(Math.max(txQuality, rxQuality));
    },
    onError: (_err, msg) => cb.onError?.(msg),
    onLeaveChannel: () => cb.onLeft?.(),
  };
  activeHandler = handler;
  engine.registerEventHandler(handler);
  return () => {
    if (!engine) return;
    try { engine.unregisterEventHandler(handler); } catch {}
    activeHandler = null;
  };
}

export function joinChannel(channel: string, token: string, role: AgoraRole, uid: number = 0) {
  if (!engine) return;
  const isHost = role === "host";
  engine.setClientRole(isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience);
  engine.joinChannel(token, channel, uid, {
    clientRoleType: isHost ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience,
    publishCameraTrack: isHost,
    publishMicrophoneTrack: isHost,
    autoSubscribeAudio: true,
    autoSubscribeVideo: true,
  });
}

export function leaveChannel() {
  if (!engine) return;
  try { engine.leaveChannel(); } catch {}
}

export function destroyEngine() {
  if (!engine) return;
  try { engine.leaveChannel(); } catch {}
  try { engine.release(); } catch {}
  engine = null;
  initializedAppId = "";
  activeHandler = null;
}

export function setMuted(muted: boolean) { engine?.muteLocalAudioStream(muted); }
export function setVideoOff(off: boolean) { engine?.enableLocalVideo(!off); engine?.muteLocalVideoStream(off); }
export function switchCamera() { engine?.switchCamera(); }

/** Audience member promoted to co-host — start publishing camera/mic without leaving the channel. */
export function promoteToCoHost() {
  if (!engine) return;
  engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
  engine.updateChannelMediaOptions({ publishCameraTrack: true, publishMicrophoneTrack: true });
}

/** Co-host demoted back to audience — stop publishing. */
export function demoteToAudience() {
  if (!engine) return;
  engine.updateChannelMediaOptions({ publishCameraTrack: false, publishMicrophoneTrack: false });
  engine.setClientRole(ClientRoleType.ClientRoleAudience);
}

/** Start sharing the device screen (or a PPT app in split-screen/picture-in-picture) instead of the camera. */
export function startScreenShare(): boolean {
  if (!engine) return false;
  const r1 = engine.startScreenCapture({ captureVideo: true, captureAudio: false });
  if (r1 !== 0) return false;
  engine.updateChannelMediaOptions({ publishScreenCaptureVideo: true, publishCameraTrack: false });
  return true;
}

/** Stop sharing the screen and resume publishing the camera. */
export function stopScreenShare() {
  if (!engine) return;
  try { engine.stopScreenCapture(); } catch {}
  engine.updateChannelMediaOptions({ publishScreenCaptureVideo: false, publishCameraTrack: true });
}

export { ClientRoleType };
