/**
 * Expo config plugin: Create a HIGH-importance Android notification channel at the
 * native level (MainApplication.onCreate) so it exists BEFORE the first JS bundle
 * runs and BEFORE the first notification is delivered.
 *
 * Also sets com.google.firebase.messaging.default_notification_channel_id metadata
 * so FCM uses our channel for background notification delivery.
 *
 * Channel: "bsh_high" / IMPORTANCE_HIGH
 * This is a NEW channel ID (not "default") to avoid Android's restriction that
 * prevents apps from upgrading a channel's importance once set.
 */
const { withDangerousMod, withAndroidManifest } = require("@expo/config-plugins");
const fs   = require("fs");
const path = require("path");

const CHANNEL_ID   = "bsh_high";
const CHANNEL_NAME = "BSH Notifications";

module.exports = function withNotificationChannel(config) {
  // ── Step 1: Add FCM default channel metadata to AndroidManifest ──────────────
  config = withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application[0];
    if (!application["meta-data"]) application["meta-data"] = [];

    const FCM_META = "com.google.firebase.messaging.default_notification_channel_id";
    const already  = application["meta-data"].find((m) => m.$?.["android:name"] === FCM_META);
    if (!already) {
      application["meta-data"].push({
        $: { "android:name": FCM_META, "android:value": CHANNEL_ID },
      });
      console.log(`[channel] ✓ set FCM default notification channel to "${CHANNEL_ID}"`);
    }
    return cfg;
  });

  // ── Step 2: Patch MainApplication.kt to create the channel in onCreate() ─────
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const root        = path.resolve(__dirname, "..");
      const mainAppDir  = path.join(root, "android/app/src/main/java/com/bshlearn/app");
      const mainAppPath = path.join(mainAppDir, "MainApplication.kt");

      if (!fs.existsSync(mainAppPath)) {
        console.warn("[channel] MainApplication.kt not found — skipping native channel setup");
        return cfg;
      }

      let content = fs.readFileSync(mainAppPath, "utf8");
      const marker = "// [bsh-channel]";
      if (content.includes(marker)) {
        console.log("[channel] MainApplication.kt already patched");
        return cfg;
      }

      // Add imports (insert before first `import expo.` line)
      const expoImportIdx = content.indexOf("import expo.");
      if (expoImportIdx !== -1) {
        const importBlock =
          "import android.app.NotificationChannel\n" +
          "import android.app.NotificationManager\n" +
          "import android.os.Build\n";
        content = content.slice(0, expoImportIdx) + importBlock + content.slice(expoImportIdx);
      }

      // Insert channel creation after ApplicationLifecycleDispatcher.onApplicationCreate(this)
      // which is always the last line in Expo's generated onCreate()
      const dispatcherLine = "ApplicationLifecycleDispatcher.onApplicationCreate(this)";
      if (content.includes(dispatcherLine)) {
        const channelBlock =
          `\n    ${marker}\n` +
          `    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {\n` +
          `      val ch = NotificationChannel("${CHANNEL_ID}", "${CHANNEL_NAME}", NotificationManager.IMPORTANCE_HIGH)\n` +
          `      ch.enableVibration(true)\n` +
          `      ch.enableLights(true)\n` +
          `      getSystemService(NotificationManager::class.java)?.createNotificationChannel(ch)\n` +
          `    }`;
        content = content.replace(dispatcherLine, dispatcherLine + channelBlock);
        console.log(`[channel] ✓ inserted channel "${CHANNEL_ID}" creation in MainApplication.kt`);
      } else {
        console.warn("[channel] Could not find ApplicationLifecycleDispatcher in MainApplication.kt");
      }

      fs.writeFileSync(mainAppPath, content, "utf8");
      return cfg;
    },
  ]);

  return config;
};
