import { useEffect, useRef, useState } from "react";
import { Alert, Linking, LogBox, Platform } from "react-native";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuthStore } from "../stores/authStore";
import { COLORS, API_URL } from "../constants";
import AppSplash from "../components/AppSplash";
import ErrorBoundary from "../components/ErrorBoundary";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { loadTokenFromStore, setMemoryToken } from "../api/client";
import { restoreCredential } from "../lib/restoreCredentials";
import { initErrorTracking } from "../services/errorService";

// Boot crash tracking before anything else — catches all global errors and unhandled rejections
initErrorTracking();

// Suppress expo-notifications Expo Go warning (harmless, but shows as red overlay)
LogBox.ignoreLogs([
  "`expo-notifications` functionality is not fully supported in Expo Go",
  "expo-notifications",
]);

function RootLayout() {
  const { loadUser, user } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  // true in dev (skip OTA), false in prod until OTA check settles
  const [otaReady, setOtaReady] = useState(__DEV__);
  const [splashAnimDone, setSplashAnimDone] = useState(false);
  // Track cleanup fn from notification listener
  const notifCleanup = useRef<(() => void) | undefined>(undefined);
  // Prevents cold-start notification from being handled twice
  const coldStartHandledRef = useRef(false);

  // OTA update — runs during the 3s splash animation window.
  // If download finishes within 5s: reloadAsync() fires while splash is still
  // covering the screen → user sees nothing, app restarts clean.
  // If slow network (>5s): give up, apply on next launch, don't block user.
  useEffect(() => {
    if (__DEV__) return;
    let timedOut = false;
    const t = setTimeout(() => {
      timedOut = true;
      setOtaReady(true); // fallback — proceed without reload, update applies next launch
    }, 5000);

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
          if (!timedOut) {
            clearTimeout(t);
            await Updates.reloadAsync(); // splash still visible — user sees nothing
            return; // never reached after reload
          }
          // Slow network: bundle cached, will apply automatically next launch
        }
      } catch { /* network error or no channel — continue normally */ }
      if (!timedOut) {
        clearTimeout(t);
        setOtaReady(true);
      }
    })();

    return () => clearTimeout(t);
  }, []);

  // Hide splash once BOTH the animation AND OTA check are done.
  // splashAnimDone is state (not a ref) so changing it re-triggers this effect,
  // fixing the stale-closure bug where AppSplash captures onDone at mount time.
  useEffect(() => {
    if (otaReady && splashAnimDone) setShowSplash(false);
  }, [otaReady, splashAnimDone]);

  const handleSplashDone = () => setSplashAnimDone(true);

  useEffect(() => {
    // Check for app updates — shows alert if a newer version is on the Play Store
    (async () => {
      try {
        const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
        const r = await fetch(`${API_URL}/auth/app-version`);
        if (!r.ok) return;
        const { latestVersion, playStoreUrl, appStoreUrl } = await r.json();
        const isNewer = (latest: string, current: string) => {
          const [lM,lN,lP] = latest.split(".").map(Number);
          const [cM,cN,cP] = current.split(".").map(Number);
          if (lM !== cM) return lM > cM;
          if (lN !== cN) return lN > cN;
          return (lP ?? 0) > (cP ?? 0);
        };
        if (isNewer(latestVersion, currentVersion)) {
          const storeUrl  = Platform.OS === "ios" ? appStoreUrl : playStoreUrl;
          const storeName = Platform.OS === "ios" ? "App Store" : "Play Store";
          Alert.alert(
            "Update Available",
            `A new version (${latestVersion}) of BSH Healers is available on the ${storeName}. Update now for the latest features.`,
            [
              { text: "Later", style: "cancel" },
              { text: "Update Now", onPress: () => Linking.openURL(storeUrl) },
            ]
          );
        }
      } catch { /* ignore network errors */ }
    })();

    // Set up Android notification channel with HIGH importance so images display.
    if (Platform.OS === "android") {
      import("expo-notifications").then(async (Notifications) => {
        await Notifications.setNotificationChannelAsync("default", {
          name: "BSH Notifications",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#7c3aed",
          showBadge: true,
        });
      }).catch(() => {});
    }

    // Request notification permission and register this device immediately on launch.
    import("../services/notificationService").then(async (mod) => {
      await mod.requestNotificationPermission();
      await mod.registerDeviceToken();
    }).catch(() => {});

    // Load token into memory cache; if none found, attempt zero-tap restore after reinstall/device transfer.
    (async () => {
      const existing = await loadTokenFromStore();
      if (!existing) {
        const restored = await restoreCredential();
        if (restored) {
          await SecureStore.setItemAsync("accessToken", restored);
          setMemoryToken(restored);
        }
      }
      loadUser();
    })();
  }, []);

  useEffect(() => {
    // Suppress the expo-notifications Expo Go console.warn/error BEFORE the
    // module loads — Metro HMR captures all console output during require().
    const origWarn  = console.warn;
    const origError = console.error;
    const suppress  = (...a: any[]) => {
      if (String(a[0] ?? '').includes('expo-notifications')) return;
      origWarn.apply(console, a);
    };
    const suppressErr = (...a: any[]) => {
      if (String(a[0] ?? '').includes('expo-notifications')) return;
      origError.apply(console, a);
    };
    console.warn  = suppress;
    console.error = suppressErr;

    import("../services/notificationService").then(async (mod) => {
      console.warn  = origWarn;
      console.error = origError;

      const handleResponse = (response: any) => {
          const data = response.notification.request.content.data as {
            type?:         string;
            deepLinkType?: string;
            deepLinkId?:   string;
            classId?:      string;
            broadcastId?:  string;
            link?:         string;
          };

          // Track open for analytics (fire-and-forget)
          if (data?.broadcastId) {
            mod.trackNotificationOpened(data.broadcastId);
          }

          // Resolve destination pathname + params from notification data
          let destPathname: string | null = null;
          let destParams: Record<string, string> = {};

          if ((data?.type === "live_session_started" || data?.type === "live_class_started") && data.classId) {
            destPathname = "/live-room";
            destParams   = { classId: data.classId };
          } else if (data?.type === "session_scheduled") {
            destPathname = "/(tabs)/live";
          } else {
            const dlType = data?.deepLinkType;
            const dlId   = data?.deepLinkId || "";
            if      (dlType === "live_room"    && dlId) { destPathname = "/live-room";       destParams = { classId: dlId }; }
            else if (dlType === "member_area"  && dlId) { destPathname = "/class-hub/[id]";  destParams = { id: dlId }; }
            else if (dlType === "course"       && dlId) { destPathname = "/course/[id]";     destParams = { id: dlId }; }
            else if (dlType === "program"      && dlId) { destPathname = "/program/[slug]";  destParams = { slug: dlId }; }
            else if (dlType === "educator"     && dlId) { destPathname = "/educator/[slug]"; destParams = { slug: dlId }; }
            else if (dlType === "live_tab")              { destPathname = "/(tabs)/live"; }
            else if (dlType === "explore")               { destPathname = "/(tabs)/explore"; }
            else if (dlType === "consultation")          { destPathname = "/(tabs)/consultation"; }
            else if (dlType === "store")                 { destPathname = "/(tabs)/store"; }
            else if (dlType === "dashboard")             { destPathname = "/(tabs)/dashboard"; }
            else if (dlType === "home")                  { destPathname = "/(tabs)/index"; }
            // "none" / "custom_url" — no navigation
          }

          if (!destPathname) return;

          // Auth guard: if user is not logged in, send to login with redirect info
          const currentUser = useAuthStore.getState().user;
          if (!currentUser) {
            const loginParams: Record<string, string> = { redirectTo: destPathname };
            if (Object.keys(destParams).length > 0) {
              loginParams.redirectParams = JSON.stringify(destParams);
            }
            router.push({ pathname: "/(auth)/login" as any, params: loginParams });
            return;
          }

          router.push({ pathname: destPathname as any, params: destParams });
      };

      try { notifCleanup.current = mod.setupNotificationListeners(undefined, handleResponse); } catch {}

      // Cold-start: app was killed, user tapped a notification to open it.
      // addNotificationResponseReceivedListener won't fire in this case because the
      // listener isn't registered until after the tap — getLastNotificationResponseAsync
      // is the only way to retrieve that initial tap response.
      if (!coldStartHandledRef.current) {
        coldStartHandledRef.current = true;
        try {
          const lastResponse = await mod.getLastNotificationResponse();
          // Skip stale notifications from previous sessions (older than 5 minutes)
          if (lastResponse && (Date.now() - lastResponse.notification.date) < 5 * 60 * 1000) {
            handleResponse(lastResponse);
          }
        } catch {}
      }
    }).catch(() => { console.warn = origWarn; console.error = origError; });
    return () => notifCleanup.current?.();
  }, []);

  useEffect(() => {
    if (!user) return;
    import("../services/notificationService").then((mod) =>
      mod.registerPushToken()
    ).catch(() => {});
  }, [user]);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          contentStyle: { backgroundColor: COLORS.bg },
          headerBackTitle: "Back",
        }}
      >
        <Stack.Screen name="(tabs)"           options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"           options={{ headerShown: false }} />
        <Stack.Screen name="admin"            options={{ headerShown: false }} />
        <Stack.Screen name="course/[id]"      options={{ headerShown: false }} />
        <Stack.Screen name="watch/[lessonId]" options={{ headerShown: false }} />
        <Stack.Screen name="consultation"     options={{ headerShown: false }} />
        <Stack.Screen name="educator/[slug]"  options={{ headerShown: false }} />
        <Stack.Screen name="coming-soon"      options={{ headerShown: false }} />
        <Stack.Screen name="program/[slug]"   options={{ headerShown: false }} />
        <Stack.Screen name="class-hub/[id]"   options={{ headerShown: false }} />
        <Stack.Screen name="module/[id]"      options={{ headerShown: false }} />
        <Stack.Screen name="healing-tools"    options={{ headerShown: false }} />
        <Stack.Screen name="horoscope"        options={{ headerShown: false }} />
        <Stack.Screen name="kundli"           options={{ headerShown: false }} />
        <Stack.Screen name="numerology"       options={{ headerShown: false }} />
        <Stack.Screen name="panchang"         options={{ headerShown: false }} />
        <Stack.Screen name="puja"             options={{ headerShown: false }} />
        <Stack.Screen name="profile"          options={{ headerShown: false }} />
        <Stack.Screen name="book-session"     options={{ headerShown: false }} />
        <Stack.Screen name="mou"              options={{ headerShown: false }} />
      </Stack>
      {showSplash && <AppSplash onDone={handleSplashDone} />}
    </ErrorBoundary>
  );
}

export default RootLayout;
