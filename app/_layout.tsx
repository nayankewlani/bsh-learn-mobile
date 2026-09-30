import { useEffect, useRef, useState } from "react";
import { Alert, Linking, LogBox } from "react-native";
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

// Suppress expo-notifications Expo Go warning (harmless, but shows as red overlay)
LogBox.ignoreLogs([
  "`expo-notifications` functionality is not fully supported in Expo Go",
  "expo-notifications",
]);

export default function RootLayout() {
  const { loadUser, user } = useAuthStore();
  const [showSplash, setShowSplash] = useState(true);
  // true in dev (skip OTA), false in prod until OTA check settles
  const [otaReady, setOtaReady] = useState(__DEV__);
  const [splashAnimDone, setSplashAnimDone] = useState(false);
  // Track cleanup fn from notification listener
  const notifCleanup = useRef<(() => void) | undefined>(undefined);

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
        const { latestVersion, playStoreUrl } = await r.json();
        const isNewer = (latest: string, current: string) => {
          const [lM,lN,lP] = latest.split(".").map(Number);
          const [cM,cN,cP] = current.split(".").map(Number);
          if (lM !== cM) return lM > cM;
          if (lN !== cN) return lN > cN;
          return (lP ?? 0) > (cP ?? 0);
        };
        if (isNewer(latestVersion, currentVersion)) {
          Alert.alert(
            "Update Available",
            `A new version (${latestVersion}) of BSH Healers is available on the Play Store. Update now for the latest features.`,
            [
              { text: "Later", style: "cancel" },
              { text: "Update Now", onPress: () => Linking.openURL(playStoreUrl) },
            ]
          );
        }
      } catch { /* ignore network errors */ }
    })();

    // Request notification permission and register this device immediately on launch.
    import("../services/notificationService").then(async (mod) => {
      await mod.requestNotificationPermission();
      await mod.registerDeviceToken();
    });

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

    import("../services/notificationService").then((mod) => {
      console.warn  = origWarn;
      console.error = origError;
      notifCleanup.current = mod.setupNotificationListeners(
        undefined,
        (response) => {
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

          if (data?.type === "live_session_started" && data.classId) {
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
        }
      );
    });
    return () => notifCleanup.current?.();
  }, []);

  useEffect(() => {
    if (!user) return;
    import("../services/notificationService").then((mod) =>
      mod.registerPushToken()
    );
  }, [user]);

  return (
    <ErrorBoundary>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          contentStyle: { backgroundColor: COLORS.bg },
        }}
      >
        <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"          options={{ headerShown: false }} />
        <Stack.Screen name="admin"           options={{ headerShown: false }} />
        <Stack.Screen name="course/[id]"     options={{ title: "Course" }} />
        <Stack.Screen name="watch/[lessonId]" options={{ headerShown: false }} />
        <Stack.Screen name="consultation"    options={{ headerShown: false }} />
        <Stack.Screen name="educator/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="coming-soon"     options={{ headerShown: false }} />
        <Stack.Screen name="program/[slug]"  options={{ headerShown: false }} />
        <Stack.Screen name="class-hub/[id]"  options={{ headerShown: false }} />
      </Stack>
      {showSplash && <AppSplash onDone={handleSplashDone} />}
    </ErrorBoundary>
  );
}
