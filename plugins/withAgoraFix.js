/**
 * Expo config plugin: AGP 8.x / RN 0.81 compatibility fixes for react-native-agora.
 *
 * Fix 1 — react-native-agora: Remove AGP 7.2.1 buildscript block.
 * Fix 2 — react-native-razorpay: Inject namespace (required by AGP 8.5+).
 * Fix 3 — gradle.properties: JVM heap, pickFirst, META-INF excludes, Jetifier,
 *           legacy packaging mode (for Agora .so compat), worker limit, arm64-v8a.
 * Fix 4 — react-native-agora: Replace com.android.Version (removed in AGP 8.x)
 *           in supportsNamespace() with a hardcoded return true.
 * Fix 5 — android/build.gradle: Force Kotlin stdlib to 2.1.20 across all modules
 *           to prevent DuplicateFilesException from mixed Kotlin versions.
 * Fix 6 — AndroidManifest: android:largeHeap="true" to prevent runtime OOM
 *           in okio/OkHttp network buffers (okio.Segment.<init> crashes).
 * Fix 7 — react-native-iap: Remove AGP 7.4.2 buildscript block (same conflict as Fix 1).
 * Fix 8 — react-native-safe-area-context: Remove AGP 7.3.1 buildscript block + fix
 *           com.android.Version reference (class removed in AGP 8.x).
 * Fix 9 — react-native-screens: Remove AGP classpath from buildscript + remove
 *           `import com.android.Version` top-level import (crashes config phase in AGP 8.x).
 * Fix 10 — @react-native-async-storage/async-storage: Inline namespace block
 *           (same com.android.Version pattern as safe-area-context).
 * Fix 11 — react-native-svg: Inline buildFeatures block (same com.android.Version pattern,
 *           checks >= 8 but we're always on AGP 8.x).
 */
const { withDangerousMod, withAndroidManifest } = require("@expo/config-plugins");
const fs   = require("fs");
const path = require("path");

// ── helpers ────────────────────────────────────────────────────────────────

function removeBuildscriptBlock(content) {
  const start = content.indexOf("buildscript");
  if (start === -1) return content;
  const openBrace = content.indexOf("{", start);
  if (openBrace === -1) return content;
  let depth = 0, end = -1;
  for (let i = openBrace; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end === -1) return content;
  while (end < content.length && "\n\r ".includes(content[end])) end++;
  return content.slice(0, start) + content.slice(end);
}

function addRazorpayNamespace(content) {
  if (content.includes("namespace")) return content;
  const idx = content.indexOf("android {");
  if (idx === -1) return content;
  const brace = content.indexOf("{", idx);
  if (brace === -1) return content;
  return content.slice(0, brace + 1) + '\n    namespace "com.razorpay.rn"' + content.slice(brace + 1);
}

// Replace supportsNamespace() — com.android.Version was removed in AGP 8.x.
// We use AGP 8.x which always supports namespace, so just return true.
function fixSupportsNamespace(content) {
  if (!content.includes("com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION")) return content;
  return content.replace(
    /def supportsNamespace\(\)\s*\{[\s\S]*?\n\}/,
    "def supportsNamespace() { return true }"
  );
}

function patchGradleProperties(gradlePropsPath) {
  if (!fs.existsSync(gradlePropsPath)) return;
  let content = fs.readFileSync(gradlePropsPath, "utf8");

  // 1. Increase JVM heap to 4 GB (Agora 139 MB SDK needs headroom for D8 dexing)
  if (content.includes("org.gradle.jvmargs")) {
    content = content.replace(
      /org\.gradle\.jvmargs=.*/,
      "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError"
    );
  } else {
    content += "\norg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError\n";
  }

  // 2. Limit Gradle workers to reduce memory pressure
  if (!content.includes("org.gradle.workers.max")) {
    content += "\norg.gradle.workers.max=2\n";
  }

  // 3. pickFirst for duplicate native libs (Agora + RN both ship these)
  const pickFirstKey = "android.packagingOptions.pickFirsts";
  const pickFirstValue = "**/libc++_shared.so,**/libfbjni.so,**/libjsc.so";
  if (!content.includes(pickFirstKey)) {
    content += `\n${pickFirstKey}=${pickFirstValue}\n`;
  }

  // 4. Exclude duplicate META-INF files (Agora + Kotlin libs cause DuplicateFilesException)
  const excludeKey = "android.packagingOptions.excludes";
  const excludeValue = [
    "**/META-INF/*.kotlin_module",
    "**/META-INF/DEPENDENCIES",
    "**/META-INF/LICENSE*",
    "**/META-INF/NOTICE*",
    "**/META-INF/*.version",
    "**/META-INF/proguard/*",
    "**/META-INF/services/javax.annotation.processing.Processor",
    "**/META-INF/gradle/incremental.annotation.processors"
  ].join(",");
  if (!content.includes(excludeKey)) {
    content += `\n${excludeKey}=${excludeValue}\n`;
  }

  // 5. Enable Jetifier for older libraries
  if (!content.includes("android.enableJetifier")) {
    content += "\nandroid.enableJetifier=true\n";
  }

  // 6. Use legacy packaging mode so Agora .so files aren't mis-handled
  if (content.includes("expo.useLegacyPackaging=false")) {
    content = content.replace("expo.useLegacyPackaging=false", "expo.useLegacyPackaging=true");
  } else if (!content.includes("expo.useLegacyPackaging")) {
    content += "\nexpo.useLegacyPackaging=true\n";
  }

  // 7. Enable R8 / ProGuard in release builds
  if (content.includes("android.enableProguardInReleaseBuilds=false")) {
    content = content.replace("android.enableProguardInReleaseBuilds=false", "android.enableProguardInReleaseBuilds=true");
  } else if (!content.includes("android.enableProguardInReleaseBuilds")) {
    content += "\nandroid.enableProguardInReleaseBuilds=true\n";
  }

  // 9. Disable PNG crunch — some project PNGs have non-standard encoding
  //    (embedded ICC profiles, 32-bit depth, etc.) that AAPT2 can't optimize.
  //    Disabling crunch lets them pass through as-is, fixing mergeReleaseResources.
  if (content.includes("android.enablePngCrunchInReleaseBuilds=true")) {
    content = content.replace(
      "android.enablePngCrunchInReleaseBuilds=true",
      "android.enablePngCrunchInReleaseBuilds=false"
    );
  } else if (!content.includes("android.enablePngCrunchInReleaseBuilds")) {
    content += "\nandroid.enablePngCrunchInReleaseBuilds=false\n";
  }

  // 8. arm64-v8a only for faster / lighter preview builds
  if (content.includes("reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64")) {
    content = content.replace(
      "reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64",
      "reactNativeArchitectures=arm64-v8a"
    );
  }

  fs.writeFileSync(gradlePropsPath, content, "utf8");
}

// Inject Kotlin stdlib resolution strategy into allprojects {} in root build.gradle.
// This forces all transitive deps (Agora, Razorpay) to use Kotlin 2.1.20 stdlib,
// preventing DuplicateFilesException from mixed kotlin-stdlib-jdk7/jdk8 versions.
function patchRootBuildGradle(buildGradlePath) {
  if (!fs.existsSync(buildGradlePath)) return;
  let content = fs.readFileSync(buildGradlePath, "utf8");

  const marker = "// [compat] kotlin-resolution-strategy";
  if (content.includes(marker)) return; // already patched

  const resolutionBlock = `
${marker}
allprojects {
    configurations.all {
        resolutionStrategy {
            force "org.jetbrains.kotlin:kotlin-stdlib:2.1.20"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:2.1.20"
            force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:2.1.20"
        }
    }
}
`;

  // Append before the final apply plugin lines
  const applyIdx = content.lastIndexOf("apply plugin:");
  if (applyIdx !== -1) {
    content = content.slice(0, applyIdx) + resolutionBlock + "\n" + content.slice(applyIdx);
  } else {
    content += resolutionBlock;
  }

  fs.writeFileSync(buildGradlePath, content, "utf8");
}

// Remove only the AGP classpath line(s) from a buildscript dependencies block,
// leaving the rest of the block intact (needed for libs that define helpers inside buildscript).
// Handles: classpath 'group:a:1', classpath "group:a:1", classpath('group:a:1'), classpath("group:a:1")
function removeAGPClasspathFromBuildscript(content) {
  return content.replace(/^\s*classpath\s*\(?\s*["']com\.android\.tools\.build:gradle:[^"']+["']\s*\)?\s*\n/gm, "");
}

// Fix com.android.Version usage — always inline the namespace block since we
// always run AGP 8.x (version check would crash because the class was removed in AGP 8.x).
function fixAndroidVersionCheck(content) {
  if (!content.includes("com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION")) return content;
  return content.replace(
    /def agpVersion\s*=\s*com\.android\.Version\.ANDROID_GRADLE_PLUGIN_VERSION\s*\n\s*if\s*\(agpVersion\.tokenize\(['"]\.['"]\)\[0\]\.toInteger\(\)\s*>=\s*\d+\)\s*\{([\s\S]*?)\n\s*\}/,
    (_, body) => body.trimEnd()
  );
}

// Remove `import com.android.Version` top-level import — crashes Gradle configuration
// phase in AGP 8.x because the class no longer exists.
function removeAndroidVersionImport(content) {
  return content.replace(/^import\s+com\.android\.Version\s*\n/m, "");
}

// ── R8 / ProGuard ──────────────────────────────────────────────────────────

const PROGUARD_RULES = `
# ── React Native ──────────────────────────────────────────────────
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.soloader.** { *; }
-dontwarn com.facebook.**

# ── Agora RTC ─────────────────────────────────────────────────────
-keep class io.agora.** { *; }
-keepclassmembers class io.agora.** { *; }
-dontwarn io.agora.**

# ── Razorpay ──────────────────────────────────────────────────────
-keep class com.razorpay.** { *; }
-keepclassmembers class com.razorpay.** { *; }
-dontwarn com.razorpay.**
-keep class proguard.annotation.Keep { *; }
-keep class proguard.annotation.KeepClassMembers { *; }

# ── OkHttp / okio ─────────────────────────────────────────────────
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep class okio.** { *; }
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# ── Expo modules ──────────────────────────────────────────────────
-keep class expo.modules.** { *; }
-keep class expo.** { *; }
-dontwarn expo.**

# ── Kotlin ────────────────────────────────────────────────────────
-keep class kotlin.** { *; }
-dontwarn kotlin.**

# ── Google Gson / Retrofit (used by Razorpay) ─────────────────────
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# ── Native JNI (Agora .so bridge) ─────────────────────────────────
-keepclasseswithmembernames class * {
    native <methods>;
}

# ── Preserve enums ────────────────────────────────────────────────
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ── Keep Parcelable ───────────────────────────────────────────────
-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

# ── Keep Serializable ─────────────────────────────────────────────
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}
`;

function enableR8(appBuildGradlePath, proguardRulesPath) {
  // Write ProGuard rules
  fs.writeFileSync(proguardRulesPath, PROGUARD_RULES.trim(), "utf8");

  if (!fs.existsSync(appBuildGradlePath)) return;
  let content = fs.readFileSync(appBuildGradlePath, "utf8");

  // Enable minify in release — handles both boolean literal and variable patterns
  if (content.includes("minifyEnabled false")) {
    content = content.replace(/minifyEnabled\s+false/g, "minifyEnabled true");
    console.log("[compat] ✓ R8: set minifyEnabled true in release build");
  } else if (content.includes("enableProguardInReleaseBuilds")) {
    // Variable-driven pattern — override the variable directly in gradle.properties instead
    console.log("[compat] R8: minifyEnabled uses variable; enabling via gradle.properties");
  }

  // Ensure proguard files line references our custom rules
  if (!content.includes("proguard-rules.pro")) {
    content = content.replace(
      /minifyEnabled\s+true/,
      `minifyEnabled true\n            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'`
    );
  }

  fs.writeFileSync(appBuildGradlePath, content, "utf8");
}

// ── plugin ─────────────────────────────────────────────────────────────────

module.exports = function withNativeCompatFixes(config) {
  // Fix 6: largeHeap — prevents runtime OOM when okio/OkHttp allocates network buffers
  //         on low-memory devices or after Agora SDK loads its large native libs.
  config = withAndroidManifest(config, (cfg) => {
    const application = cfg.modResults.manifest.application[0];
    application.$["android:largeHeap"] = "true";
    console.log("[compat] ✓ set android:largeHeap=true");
    return cfg;
  });

  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const root = path.resolve(__dirname, "..");

      // Fix 1: agora buildscript block removal
      const agradle = path.join(root, "node_modules/react-native-agora/android/build.gradle");
      if (fs.existsSync(agradle)) {
        let orig = fs.readFileSync(agradle, "utf8");
        let fixed = orig;

        if (orig.includes("buildscript")) {
          fixed = removeBuildscriptBlock(fixed);
          console.log("[compat] ✓ removed agora buildscript block");
        } else {
          console.log("[compat] agora buildscript already clean");
        }

        // Fix 4: replace supportsNamespace() to avoid com.android.Version (AGP 8.x removed it)
        if (fixed.includes("com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION")) {
          fixed = fixSupportsNamespace(fixed);
          console.log("[compat] ✓ fixed agora supportsNamespace() (com.android.Version removed in AGP 8.x)");
        }

        if (fixed !== orig) {
          fs.writeFileSync(agradle, fixed, "utf8");
        }
      }

      // Fix 7: react-native-iap buildscript block removal (same AGP conflict as agora)
      const iapgradle = path.join(root, "node_modules/react-native-iap/android/build.gradle");
      if (fs.existsSync(iapgradle)) {
        const orig = fs.readFileSync(iapgradle, "utf8");
        if (orig.includes("buildscript")) {
          const fixed = removeBuildscriptBlock(orig);
          if (fixed !== orig) {
            fs.writeFileSync(iapgradle, fixed, "utf8");
            console.log("[compat] ✓ removed react-native-iap buildscript block");
          }
        } else {
          console.log("[compat] react-native-iap buildscript already clean");
        }
      }

      // Fix 8: react-native-safe-area-context — remove buildscript + fix com.android.Version
      const sacgradle = path.join(root, "node_modules/react-native-safe-area-context/android/build.gradle");
      if (fs.existsSync(sacgradle)) {
        let orig = fs.readFileSync(sacgradle, "utf8");
        let fixed = orig;
        if (fixed.includes("buildscript")) {
          fixed = removeBuildscriptBlock(fixed);
          console.log("[compat] ✓ removed react-native-safe-area-context buildscript block");
        }
        if (fixed.includes("com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION")) {
          fixed = fixAndroidVersionCheck(fixed);
          console.log("[compat] ✓ fixed safe-area-context com.android.Version reference");
        }
        if (fixed !== orig) fs.writeFileSync(sacgradle, fixed, "utf8");
      }

      // Fix 9: react-native-screens — remove AGP classpath + remove `import com.android.Version`
      const screensgradle = path.join(root, "node_modules/react-native-screens/android/build.gradle");
      if (fs.existsSync(screensgradle)) {
        let orig = fs.readFileSync(screensgradle, "utf8");
        let fixed = orig;
        if (fixed.includes("com.android.tools.build:gradle")) {
          fixed = removeAGPClasspathFromBuildscript(fixed);
          console.log("[compat] ✓ removed AGP classpath from react-native-screens buildscript");
        }
        if (fixed.includes("import com.android.Version")) {
          fixed = removeAndroidVersionImport(fixed);
          console.log("[compat] ✓ removed import com.android.Version from react-native-screens");
        }
        if (fixed !== orig) fs.writeFileSync(screensgradle, fixed, "utf8");
      }

      // Fix 10: @react-native-async-storage/async-storage — fix com.android.Version
      const asyncStorageGradle = path.join(root, "node_modules/@react-native-async-storage/async-storage/android/build.gradle");
      if (fs.existsSync(asyncStorageGradle)) {
        let orig = fs.readFileSync(asyncStorageGradle, "utf8");
        let fixed = orig;
        if (fixed.includes("com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION")) {
          fixed = fixAndroidVersionCheck(fixed);
          console.log("[compat] ✓ fixed async-storage com.android.Version reference");
        }
        if (fixed !== orig) fs.writeFileSync(asyncStorageGradle, fixed, "utf8");
      }

      // Fix 11: react-native-svg — fix com.android.Version in android block
      const svggradle = path.join(root, "node_modules/react-native-svg/android/build.gradle");
      if (fs.existsSync(svggradle)) {
        const orig = fs.readFileSync(svggradle, "utf8");
        if (orig.includes("com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION")) {
          const fixed = fixAndroidVersionCheck(orig);
          if (fixed !== orig) {
            fs.writeFileSync(svggradle, fixed, "utf8");
            console.log("[compat] ✓ fixed react-native-svg com.android.Version reference");
          }
        } else {
          console.log("[compat] react-native-svg already clean");
        }
      }

      // Fix 2: razorpay namespace
      const rzgradle = path.join(root, "node_modules/react-native-razorpay/android/build.gradle");
      if (fs.existsSync(rzgradle)) {
        const orig = fs.readFileSync(rzgradle, "utf8");
        if (orig.includes("namespace")) {
          console.log("[compat] razorpay namespace already present");
        } else {
          const fixed = addRazorpayNamespace(orig);
          fs.writeFileSync(rzgradle, fixed, "utf8");
          console.log("[compat] ✓ added razorpay namespace");
        }
      }

      // Fix 3: gradle.properties patches
      const gradleProps = path.join(root, "android/gradle.properties");
      patchGradleProperties(gradleProps);
      console.log("[compat] ✓ patched gradle.properties");

      // Fix 5: root build.gradle — Kotlin stdlib resolution strategy
      const rootBuildGradle = path.join(root, "android/build.gradle");
      patchRootBuildGradle(rootBuildGradle);
      console.log("[compat] ✓ patched root build.gradle (kotlin resolution strategy)");

      // R8 / ProGuard: enable minification in release + write keep rules
      const appBuildGradle   = path.join(root, "android/app/build.gradle");
      const proguardRules    = path.join(root, "android/app/proguard-rules.pro");
      enableR8(appBuildGradle, proguardRules);
      console.log("[compat] ✓ R8 enabled (proguard-rules.pro written)");

      return cfg;
    },
  ]);
};
