#!/usr/bin/env node
/**
 * postinstall patch script — runs after npm ci on EAS Build (and locally).
 * Fixes AGP 8.x incompatibilities in React Native library build.gradle files:
 *   - com.android.Version (class removed in AGP 8.x)
 *   - conflicting buildscript blocks that re-declare old AGP versions
 *   - import com.android.Version top-level imports
 */
const fs   = require("fs");
const path = require("path");

const nm = path.resolve(__dirname, "../node_modules");

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

// Inline the namespace/buildFeatures check — always true on AGP 8.x (>= 7 or >= 8)
function fixAndroidVersionCheck(content) {
  if (!content.includes("com.android.Version.ANDROID_GRADLE_PLUGIN_VERSION")) return content;
  return content.replace(
    /def agpVersion\s*=\s*com\.android\.Version\.ANDROID_GRADLE_PLUGIN_VERSION[\s\S]*?if\s*\(agpVersion\.tokenize\(['"]\.['"]\)\[0\]\.toInteger\(\)\s*>=\s*\d+\)\s*\{([\s\S]*?)\n(\s*)\}/,
    (_, body) => body.trimEnd()
  );
}

function removeAndroidVersionImport(content) {
  return content.replace(/^import\s+com\.android\.Version\s*[\r\n]+/m, "");
}

function removeAGPClasspath(content) {
  return content.replace(/^\s*classpath\s*\(?\s*["']com\.android\.tools\.build:gradle:[^"']+["']\s*\)?\s*[\r\n]+/gm, "");
}

function patch(file, ...transforms) {
  if (!fs.existsSync(file)) return;
  let orig = fs.readFileSync(file, "utf8");
  let content = orig;
  for (const fn of transforms) content = fn(content);
  if (content !== orig) {
    fs.writeFileSync(file, content, "utf8");
    console.log("[patch-gradle] ✓ patched", path.relative(nm, file));
  }
}

// ── patches ────────────────────────────────────────────────────────────────

// react-native-iap: remove AGP 7.4.2 buildscript block
patch(path.join(nm, "react-native-iap/android/build.gradle"),
  removeBuildscriptBlock);

// react-native-safe-area-context: remove buildscript + fix com.android.Version
patch(path.join(nm, "react-native-safe-area-context/android/build.gradle"),
  removeBuildscriptBlock, fixAndroidVersionCheck);

// react-native-screens: remove import + remove AGP classpath from buildscript
patch(path.join(nm, "react-native-screens/android/build.gradle"),
  removeAndroidVersionImport, removeAGPClasspath);

// @react-native-async-storage/async-storage: fix com.android.Version
patch(path.join(nm, "@react-native-async-storage/async-storage/android/build.gradle"),
  fixAndroidVersionCheck);

// react-native-svg: fix com.android.Version in android block
patch(path.join(nm, "react-native-svg/android/build.gradle"),
  fixAndroidVersionCheck);

console.log("[patch-gradle] done");
