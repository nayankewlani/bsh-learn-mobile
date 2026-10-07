import * as Notifications from "expo-notifications";
import { Alert, Linking, Platform } from "react-native";
import client from "../api/client";

const EXPO_PROJECT_ID = "3f5623c8-423c-43ce-9d72-b5fd322b7f07";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert:  true,
    shouldPlaySound:  true,
    shouldSetBadge:   true,
    shouldShowBanner: true,
    shouldShowList:   true,
  }),
});

// ── Called on app launch (before login) ──────────────────────────────────────
// Shows the OS permission dialog on first open. If previously denied and
// the OS won't prompt again, shows an alert directing the user to Settings.
export async function requestNotificationPermission(): Promise<void> {
  try {
    const { status: existing, canAskAgain } = await Notifications.getPermissionsAsync();

    if (existing === "granted") return;

    if (!canAskAgain) {
      // User permanently denied — direct to Settings
      Alert.alert(
        "Enable Notifications",
        "BSH Healers needs notification permission to send you class updates and announcements. Please enable it in your device Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "android") {
                Linking.openSettings();
              } else {
                Linking.openURL("app-settings:");
              }
            },
          },
        ]
      );
      return;
    }

    // Ask the OS
    await Notifications.requestPermissionsAsync();
  } catch (err: any) {
    console.error("[push] requestNotificationPermission error:", err?.message ?? err);
  }
}

// ── Called after login (user is authenticated) ────────────────────────────────
// Gets Expo push token and saves it to the server. Permission must already
// be granted (via requestNotificationPermission called at launch).
// Called on app launch — no login required.
// Registers this device so it receives "all users" broadcasts even without an account.
export async function registerDeviceToken(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
    // Public endpoint — no auth header needed
    await client.post("/auth/register-device", { token: tokenData.data });
  } catch {
    // Non-critical — silent fail (simulator / no Play Services)
  }
}

// Called after login — links the device token to the user account.
// Enables targeted broadcasts (students, specific course, etc.).
export async function registerPushToken(): Promise<void> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });
    await client.post("/auth/push-token", { token: tokenData.data });
  } catch {
    // Non-critical — silent fail
  }
}

// Track that a user opened a broadcast notification (for analytics)
export async function trackNotificationOpened(broadcastId: string): Promise<void> {
  try {
    await client.post("/notifications/opened", { broadcastId });
  } catch {}
}

export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

export function setupNotificationListeners(
  onNotification?: (n: Notifications.Notification) => void,
  onResponse?: (r: Notifications.NotificationResponse) => void,
): () => void {
  const subs: { remove: () => void }[] = [];

  if (onNotification) {
    subs.push(Notifications.addNotificationReceivedListener(onNotification));
  }
  if (onResponse) {
    subs.push(Notifications.addNotificationResponseReceivedListener(onResponse));
  }

  return () => subs.forEach(s => s.remove());
}
