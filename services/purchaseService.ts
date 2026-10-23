import { Platform, Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import { RAZORPAY_KEY_ID } from "../constants";
import { nearestTierProductId, ALL_IAP_SKUS } from "../constants/iapTiers";

// react-native-iap requires a native dev/production build — guard for Expo Go,
// same pattern used for Agora elsewhere in this app.
let RNIap: typeof import("react-native-iap") | null = null;
try { RNIap = require("react-native-iap"); } catch {}

const _rzpMod = (() => { try { return require("react-native-razorpay"); } catch { return null; } })();
const RazorpayCheckout: {
  open: (opts: any) => Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>;
} | null = _rzpMod?.default?.open ? _rzpMod.default : _rzpMod?.open ? _rzpMod : null;

export interface PurchaseResult { success: boolean; cancelled?: boolean; errorMessage?: string }

type ContentType = "course" | "program" | "consultation";

// Access itself is tied to the user's account (Enrollment/ProgramAccess are
// keyed by userId, not device), so a reinstall + re-login already restores
// visible access on its own — no Apple-side restore needed for that case.
// What CAN go wrong: StoreKit charges the user, but the app crashes/loses
// network before our /apple/verify call completes, leaving a real Apple
// transaction that was never redeemed into an Enrollment/ProgramAccess. We
// track "purchase in flight" locally so Restore Purchases can find exactly
// which course/program an unfinished transaction was for and resubmit it.
const PENDING_KEY_PREFIX = "pendingIAPPurchase:";

async function setPending(productId: string, contentType: ContentType, contentId: string): Promise<void> {
  await AsyncStorage.setItem(PENDING_KEY_PREFIX + productId, JSON.stringify({ contentType, contentId }));
}
async function clearPending(productId: string): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY_PREFIX + productId);
}
async function getPending(productId: string): Promise<{ contentType: ContentType; contentId: string } | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY_PREFIX + productId);
  return raw ? JSON.parse(raw) : null;
}

let iapReady = false;
async function ensureIAPReady(): Promise<boolean> {
  if (!RNIap) return false;
  if (iapReady) return true;
  try {
    RNIap.setup({ storekitMode: "STOREKIT2_MODE" });
    await RNIap.initConnection();
    // Finish any transactions that are still in the StoreKit queue but were
    // already redeemed on our backend (no local pending record = already done).
    // Without this, StoreKit2 replays them via purchaseUpdatedListener and our
    // backend rejects them as "already used for different content".
    try {
      const stale = await RNIap.getAvailablePurchases();
      for (const p of stale) {
        if (!p.productId) continue;
        const pending = await getPending(p.productId);
        if (!pending) await RNIap.finishTransaction({ purchase: p }).catch(() => {});
      }
    } catch {}
    const products = await RNIap.getProducts({ skus: ALL_IAP_SKUS });
    if (products.length === 0) {
      console.error("[purchaseService] getProducts returned 0 products — store not ready");
      return false;
    }
    iapReady = true;
    return true;
  } catch (err) {
    console.error("[purchaseService] initConnection failed:", err);
    return false;
  }
}

/**
 * iOS purchase path: StoreKit2 listener-based flow. In react-native-iap v13+
 * with StoreKit2, the JWS receipt arrives via purchaseUpdatedListener, NOT
 * from the return value of requestPurchase. We set up the listener first,
 * then trigger the purchase, and resolve when the listener fires.
 */
async function purchaseIOS(contentType: ContentType, contentId: string, pricePaise: number, extraBody?: Record<string, unknown>): Promise<PurchaseResult> {
  const ready = await ensureIAPReady();
  if (!ready || !RNIap) {
    Alert.alert("Payment Not Available", "In-app purchases require the full BSH app build.");
    return { success: false };
  }
  const productId = nearestTierProductId(pricePaise);
  await setPending(productId, contentType, contentId);
  const purchaseStartTime = Date.now();

  return new Promise<PurchaseResult>((resolve) => {
    let settled = false;
    const settle = (result: PurchaseResult) => {
      if (settled) return;
      settled = true;
      purchaseSub?.remove();
      errorSub?.remove();
      if (!result.success && !result.cancelled) {
        // leave pending record so Restore Purchases can recover it
      } else {
        clearPending(productId).catch(() => {});
      }
      resolve(result);
    };

    const purchaseSub = RNIap!.purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId !== productId) return;
      const receipt = purchase.transactionReceipt
        || (purchase as any).verificationResultIOS
        || (purchase as any).jwsRepresentationIos;
      if (!receipt) {
        // StoreKit2 fires the listener with a pending/deferred state before the
        // real JWS arrives. Ignore silently — the second callback will have it.
        return;
      }
      // If this transaction predates the current purchase flow by more than 30s,
      // it's a stale transaction StoreKit2 is replaying from a previous purchase.
      // Finish it silently — it was already redeemed; don't send to the API.
      const txDate = purchase.transactionDate
        ? new Date(purchase.transactionDate).getTime()
        : null;
      if (txDate && txDate < purchaseStartTime - 30000) {
        RNIap!.finishTransaction({ purchase }).catch(() => {});
        return;
      }
      try {
        await client.post("/payments/apple/verify", {
          transactionReceipt: receipt,
          contentType,
          contentId,
          ...extraBody,
        });
        await RNIap!.finishTransaction({ purchase });
        settle({ success: true });
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || "Could not complete purchase. If you were charged, use \"Restore Purchases\" to recover access.";
        settle({ success: false, errorMessage: msg });
        // Alert is intentionally NOT shown here — the caller checks enrollment
        // first and only shows the error if the user is genuinely not enrolled.
      }
    });

    const errorSub = RNIap!.purchaseErrorListener((error: any) => {
      if (error?.productId && error.productId !== productId) return;
      if (error?.code === "E_USER_CANCELLED") {
        settle({ success: false, cancelled: true });
      } else {
        settle({ success: false, errorMessage: error?.message || "Could not complete purchase." });
      }
    });

    RNIap!.requestPurchase({ sku: productId }).catch((err: any) => {
      if (err?.code === "E_USER_CANCELLED") {
        settle({ success: false, cancelled: true });
      } else {
        settle({ success: false, errorMessage: err?.message || "Could not complete purchase." });
      }
    });
  });
}

/** Android purchase path — unchanged Razorpay flow, just shared across courses/programs. */
async function purchaseAndroid(
  contentType: ContentType,
  contentId: string,
  title: string,
  pricePaise: number,
  razorpayPaymentLink: string | undefined,
  userName: string,
  userEmail: string,
): Promise<PurchaseResult> {
  if (razorpayPaymentLink) {
    Linking.openURL(razorpayPaymentLink).catch(() => {});
    return { success: false };
  }
  if (!RazorpayCheckout) {
    Alert.alert("Payment Not Available", "Payments require the full BSH app build. Please use our website to purchase.");
    return { success: false };
  }
  try {
    const body = contentType === "course" ? { type: "course", courseId: contentId } : { type: "program", programId: contentId };
    const { data } = await client.post("/payments/create-order", body);
    const order = data.order;
    const paymentData = await RazorpayCheckout.open({
      key: RAZORPAY_KEY_ID, amount: String(order.amount), currency: "INR",
      name: "BSH Healers", description: title,
      order_id: order.id, prefill: { name: userName, email: userEmail }, theme: { color: "#0c2461" },
    });
    await client.post("/payments/verify", {
      razorpayOrderId: paymentData.razorpay_order_id,
      razorpayPaymentId: paymentData.razorpay_payment_id,
      razorpaySignature: paymentData.razorpay_signature,
    });
    return { success: true };
  } catch (err: any) {
    if (err?.code === 0) return { success: false, cancelled: true };
    Alert.alert("Payment Failed", err?.response?.data?.message ?? err?.description ?? err?.message ?? "Payment failed.");
    return { success: false };
  }
}

export async function purchaseCourse(params: {
  courseId: string; title: string; priceRupees: number; discountPriceRupees?: number;
  razorpayPaymentLink?: string; userName: string; userEmail: string;
}): Promise<PurchaseResult> {
  const effectiveRupees = params.discountPriceRupees || params.priceRupees;
  const pricePaise = Math.round(effectiveRupees * 100);
  if (Platform.OS === "ios") return purchaseIOS("course", params.courseId, pricePaise);
  return purchaseAndroid("course", params.courseId, params.title, pricePaise, params.razorpayPaymentLink, params.userName, params.userEmail);
}

export async function purchaseProgram(params: {
  programId: string; title: string; pricePaise: number; discountPricePaise?: number;
  razorpayPaymentLink?: string; userName: string; userEmail: string;
}): Promise<PurchaseResult> {
  const effectivePaise = params.discountPricePaise || params.pricePaise;
  if (Platform.OS === "ios") return purchaseIOS("program", params.programId, effectivePaise);
  return purchaseAndroid("program", params.programId, params.title, effectivePaise, params.razorpayPaymentLink, params.userName, params.userEmail);
}

export async function purchaseConsultation(params: {
  trainerId: string; trainerName: string;
  sessions: number; durationMins: number; bonusSessions: number;
  totalPaise: number; ratePerMin: number;
  clientNote: string; preferredTime: string;
  userName: string; userEmail: string;
}): Promise<PurchaseResult> {
  return purchaseIOS("consultation", params.trainerId, params.totalPaise, {
    consultationData: {
      trainerName:   params.trainerName,
      sessions:      params.sessions,
      durationMins:  params.durationMins,
      bonusSessions: params.bonusSessions,
      ratePerMin:    params.ratePerMin,
      clientNote:    params.clientNote,
      preferredTime: params.preferredTime,
    },
  });
}

/**
 * Apple requires a Restore Purchases entry point for non-consumables. Recovers
 * any purchase that charged the user on Apple's side but never made it to our
 * backend (crash/network drop between StoreKit success and /apple/verify).
 * Purchases with no matching local pending record were already redeemed
 * successfully at the time of purchase — nothing to do for those.
 */
export async function restorePurchases(): Promise<{ restoredCount: number }> {
  if (Platform.OS !== "ios" || !RNIap) return { restoredCount: 0 };
  const ready = await ensureIAPReady();
  if (!ready) return { restoredCount: 0 };

  const purchases = await RNIap.getAvailablePurchases();
  let restoredCount = 0;
  for (const purchase of purchases) {
    const restoreReceipt = purchase.transactionReceipt
      || (purchase as any).verificationResultIOS
      || (purchase as any).jwsRepresentationIos;
    if (!restoreReceipt || !purchase.productId) continue;
    const pending = await getPending(purchase.productId);
    if (!pending) continue; // already redeemed previously, nothing to recover
    try {
      await client.post("/payments/apple/verify", {
        transactionReceipt: restoreReceipt,
        contentType: pending.contentType,
        contentId: pending.contentId,
      });
      await RNIap.finishTransaction({ purchase });
      await clearPending(purchase.productId);
      restoredCount++;
    } catch {
      // Leave pending — user can retry Restore Purchases again later.
    }
  }
  return { restoredCount };
}
