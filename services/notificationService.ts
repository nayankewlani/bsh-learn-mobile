import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
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

export async function registerPushToken(): Promise<void> {
  try {
    if (!Constants.isDevice) return;

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: EXPO_PROJECT_ID });

    await client.post("/auth/push-token", { token: tokenData.data }).catch(() => {});
  } catch {
    // Non-critical — silently fail on simulator or permission denied
  }
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
