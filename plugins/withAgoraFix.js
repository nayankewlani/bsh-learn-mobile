/**
 * Expo config plugin: removes the standalone buildscript block from
 * react-native-agora's android/build.gradle before Gradle runs.
 *
 * That block declares AGP 7.2.1 as a classpath dependency, which crashes
 * at Gradle configuration time when EAS uses AGP 8.x. Removing it is safe
 * because the block only matters when the library is the root project.
 */
const { withDangerousMod } = require("@expo/config-plugins");
const fs   = require("fs");
const path = require("path");

/** Remove the outermost `buildscript { ... }` block using brace counting. */
function removeBuildscriptBlock(content) {
  const keyword = "buildscript";
  const start = content.indexOf(keyword);
  if (start === -1) return content; // nothing to remove

  // Find the opening brace
  const openBrace = content.indexOf("{", start);
  if (openBrace === -1) return content;

  // Walk forward counting braces until the block closes
  let depth = 0;
  let end = -1;
  for (let i = openBrace; i < content.length; i++) {
    if (content[i] === "{") depth++;
    else if (content[i] === "}") {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end === -1) return content; // malformed — leave untouched

  // Skip the trailing blank line after the closing brace
  while (end < content.length && (content[end] === "\n" || content[end] === "\r" || content[end] === " ")) {
    end++;
  }

  return content.slice(0, start) + content.slice(end);
}

module.exports = function withAgoraFix(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const agoraBuildGradle = path.resolve(
        __dirname,
        "../node_modules/react-native-agora/android/build.gradle"
      );

      if (!fs.existsSync(agoraBuildGradle)) {
        console.warn("[withAgoraFix] agora build.gradle not found — skipping");
        return cfg;
      }

      const original = fs.readFileSync(agoraBuildGradle, "utf8");

      if (!original.includes("buildscript")) {
        console.log("[withAgoraFix] agora build.gradle already clean — skipping");
        return cfg;
      }

      const patched = removeBuildscriptBlock(original);

      if (patched === original) {
        console.warn("[withAgoraFix] Could not remove buildscript block — leaving file unchanged");
        return cfg;
      }

      fs.writeFileSync(agoraBuildGradle, patched, "utf8");
      console.log("[withAgoraFix] ✓ Removed conflicting buildscript block from react-native-agora/android/build.gradle");
      return cfg;
    },
  ]);
};
