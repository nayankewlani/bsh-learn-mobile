/**
 * Expo config plugin: Create a HIGH-importance Android notification channel at the
 * native level so it exists BEFORE the first JS bundle runs and BEFORE the first
 * notification is delivered.
 *
 * Two-pronged approach:
 * 1. BootReceiver — fires on MY_PACKAGE_REPLACED (every APK update) and
 *    BOOT_COMPLETED. Creates "bsh_high" channel at install time, before any user
 *    interaction and before any notification arrives.
 * 2. MainApplication.onCreate() — belt-and-suspenders: creates the same channel
 *    so it also exists when the app is opened normally.
 *
 * Also sets com.google.firebase.messaging.default_notification_channel_id metadata
 * so FCM uses our channel for all background notification delivery.
 *
 * Channel: "bsh_high" / IMPORTANCE_HIGH
 * New channel ID avoids Android's restriction that prevents upgrading an existing
 * channel's importance (the old "default" channel was likely IMPORTANCE_DEFAULT).
 */
const { withDangerousMod, withAndroidManifest } = require("@expo/config-plugins");
const fs   = require("fs");
const path = require("path");

const CHANNEL_ID   = "bsh_high";
const CHANNEL_NAME = "BSH Notifications";
const PKG          = "com.bshlearn.app";

// Kotlin source for a BroadcastReceiver that creates the channel on install/boot
const BOOT_RECEIVER_KT = `package ${PKG}

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class BshChannelReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        createChannel(context)
    }

    companion object {
        fun createChannel(context: Context) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    "${CHANNEL_ID}",
                    "${CHANNEL_NAME}",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    enableVibration(true)
                    enableLights(true)
                }
                context.getSystemService(NotificationManager::class.java)
                    ?.createNotificationChannel(channel)
            }
        }
    }
}
`;

module.exports = function withNotificationChannel(config) {
  // ── Step 1: AndroidManifest — FCM metadata + BootReceiver registration ───────
  config = withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application[0];

    // FCM default channel metadata
    if (!application["meta-data"]) application["meta-data"] = [];
    const FCM_META = "com.google.firebase.messaging.default_notification_channel_id";
    if (!application["meta-data"].some((m) => m.$?.["android:name"] === FCM_META)) {
      application["meta-data"].push({
        $: { "android:name": FCM_META, "android:value": CHANNEL_ID },
      });
      console.log(`[channel] ✓ set FCM default notification channel to "${CHANNEL_ID}"`);
    }

    // BootReceiver registration
    if (!application.receiver) application.receiver = [];
    const RECEIVER_CLASS = `${PKG}.BshChannelReceiver`;
    if (!application.receiver.some((r) => r.$?.["android:name"] === RECEIVER_CLASS)) {
      application.receiver.push({
        $: { "android:name": RECEIVER_CLASS, "android:exported": "false" },
        "intent-filter": [{
          action: [
            { $: { "android:name": "android.intent.action.MY_PACKAGE_REPLACED" } },
            { $: { "android:name": "android.intent.action.BOOT_COMPLETED" } },
          ],
        }],
      });
      console.log("[channel] ✓ registered BshChannelReceiver in AndroidManifest");
    }

    return cfg;
  });

  // ── Step 2: Create BshChannelReceiver.kt + patch MainApplication.kt ──────────
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const root       = path.resolve(__dirname, "..");
      const javaDir    = path.join(root, "android/app/src/main/java/com/bshlearn/app");

      if (!fs.existsSync(javaDir)) {
        console.warn("[channel] Java source dir not found — skipping (expected during prebuild)");
        return cfg;
      }

      // Write BshChannelReceiver.kt
      const receiverPath = path.join(javaDir, "BshChannelReceiver.kt");
      fs.writeFileSync(receiverPath, BOOT_RECEIVER_KT, "utf8");
      console.log("[channel] ✓ wrote BshChannelReceiver.kt");

      // Patch MainApplication.kt — belt-and-suspenders
      const mainAppPath = path.join(javaDir, "MainApplication.kt");
      if (!fs.existsSync(mainAppPath)) {
        console.warn("[channel] MainApplication.kt not found — skipping patch");
        return cfg;
      }

      let content = fs.readFileSync(mainAppPath, "utf8");
      const marker = "// [bsh-channel]";
      if (content.includes(marker)) {
        console.log("[channel] MainApplication.kt already patched");
        return cfg;
      }

      // Add channel creation call after ApplicationLifecycleDispatcher.onApplicationCreate(this)
      const dispatcherLine = "ApplicationLifecycleDispatcher.onApplicationCreate(this)";
      if (content.includes(dispatcherLine)) {
        content = content.replace(
          dispatcherLine,
          `${dispatcherLine}\n    ${marker}\n    BshChannelReceiver.createChannel(this)`
        );
        console.log("[channel] ✓ added BshChannelReceiver.createChannel() in MainApplication.kt");
      } else {
        console.warn("[channel] Could not find ApplicationLifecycleDispatcher in MainApplication.kt");
      }

      fs.writeFileSync(mainAppPath, content, "utf8");
      return cfg;
    },
  ]);

  return config;
};
