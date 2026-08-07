/**
 * Expo config plugin: removes the standalone buildscript block from
 * react-native-agora's android/build.gradle.
 *
 * That block declares AGP 7.2.1 as a classpath dependency, which crashes
 * at Gradle configuration time when EAS uses AGP 8.x. The block is not
 * needed when agora is a library dependency (only needed when it is the
 * root project), so removing it is safe.
 *
 * This runs during expo prebuild (before Gradle), so it is more reliable
 * than patch-package (which can be skipped or fail silently in some CI
 * environments).
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs   = require("fs");
const path = require("path");

const AGORA_BUILD_GRADLE = path.resolve(
  __dirname,
  "../node_modules/react-native-agora/android/build.gradle"
);

module.exports = function withAgoraFix(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      if (!fs.existsSync(AGORA_BUILD_GRADLE)) {
        console.warn("[withAgoraFix] agora build.gradle not found — skipping");
        return cfg;
      }

      let content = fs.readFileSync(AGORA_BUILD_GRADLE, "utf8");

      // Already patched (starts with 'def isNewArchitectureEnabled')
      if (!content.trimStart().startsWith("buildscript")) {
        console.log("[withAgoraFix] agora build.gradle already patched — skipping");
        return cfg;
      }

      // Remove the entire buildscript { ... } block at the top of the file
      content = content.replace(/^buildscript\s*\{[^}]*(?:\{[^}]*\}[^}]*)?\}\s*\n?/m, "");

      fs.writeFileSync(AGORA_BUILD_GRADLE, content, "utf8");
      console.log("[withAgoraFix] ✓ Removed conflicting buildscript block from react-native-agora");
      return cfg;
    },
  ]);
};
