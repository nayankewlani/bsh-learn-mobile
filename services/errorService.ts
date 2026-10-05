import * as Sentry from "@sentry/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SENTRY_DSN } from "../constants";

const CRASH_KEY = "@bsh_last_crash";

// ErrorUtils is a React Native global — not exported from the package in RN 0.73+
const EU = (global as any).ErrorUtils;

let initialized = false;

export function initErrorTracking() {
  if (initialized) return;
  initialized = true;

  if (SENTRY_DSN) {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: __DEV__ ? "development" : "production",
      tracesSampleRate: 0.1,
      enabled: !__DEV__,
    });
  }

  // On each launch, send any crash that was saved from the previous session.
  // This is the only reliable way to report fatal JS crashes without the native Sentry SDK,
  // since fatal crashes kill the process before in-flight network requests can complete.
  if (!__DEV__) {
    flushSavedCrash();
  }

  if (!EU) return;

  const prev = EU.getGlobalHandler();
  EU.setGlobalHandler((error: Error, isFatal: boolean) => {
    if (SENTRY_DSN && !__DEV__) {
      Sentry.captureException(error, { extra: { isFatal } });

      if (isFatal) {
        // Write crash to disk before the process dies. AsyncStorage writes to
        // SQLite locally — this typically completes in <50ms, well before the
        // OS terminates the process (~200–500ms grace period).
        AsyncStorage.setItem(
          CRASH_KEY,
          JSON.stringify({
            message: error?.message ?? "Unknown error",
            stack: error?.stack ?? "",
            timestamp: new Date().toISOString(),
          })
        ).catch(() => {});
      }
    } else {
      console.error(`[GlobalError] ${isFatal ? "FATAL" : "non-fatal"}:`, error?.message);
    }
    if (isFatal) {
      prev?.(error, isFatal);
    }
  });
}

async function flushSavedCrash() {
  try {
    const raw = await AsyncStorage.getItem(CRASH_KEY);
    if (!raw) return;
    await AsyncStorage.removeItem(CRASH_KEY);

    const crash = JSON.parse(raw);
    const recovered = new Error(crash.message);
    recovered.stack = crash.stack;

    Sentry.captureException(recovered, {
      tags: { crash_recovery: "true" },
      extra: {
        crashedAt: crash.timestamp,
        reportedAt: new Date().toISOString(),
        note: "Fatal crash — captured on next app launch",
      },
    });

    // Flush with a 4s timeout so the event is actually sent before
    // the rest of the app continues initialising.
    await Sentry.flush(4000);
  } catch {
    // Never let crash-recovery code crash the app.
  }
}

