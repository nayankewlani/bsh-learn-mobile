import { Platform, Alert, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import { RAZORPAY_KEY_ID } from "../constants";
import { nearestTierProductId } from "../constants/iapTiers";

// react-native-iap requires a native dev/production build — guard for Expo Go,
// same pattern used for Agora elsewhere in this app.
let RNIap: typeof import("react-native-iap") | null = null;
try { RNIap = require("react-native-iap"); } catch {}

const _rzpMod = (() => { try { return require("react-native-razorpay"); } catch { return null; } })();
const RazorpayCheckout: {
  open: (opts: any) => Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }>;
} | null = _rzpMod?.default?.open ? _rzpMod.default : _rzpMod?.open ? _rzpMod : null;

export interface PurchaseResult { success: boolean; cancelled?: boolean }

type ContentType = "course" | "program";

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
    iapReady = true;
    return true;
  } catch (err) {
    console.error("[purchaseService] initConnection failed:", err);
    return false;
  }
}

/**
 * iOS purchase path: StoreKit product for the nearest price tier, verified
 * server-side, which grants access to the specific course/program requested.
 * See API-server/src/config/iapTiers.ts for why purchases round to a tier
 * instead of a product being created per course.
 */
async function purchaseIOS(contentType: ContentType, contentId: string, pricePaise: number): Promise<PurchaseResult> {
  const ready = await ensureIAPReady();
  if (!ready || !RNIap) {
    Alert.alert("Payment Not Available", "In-app purchases require the full BSH app build.");
    return { success: false };
  }
  const productId = nearestTierProductId(pricePaise);
  await setPending(productId, contentType, contentId);
  try {
    const purchase = await RNIap.requestPurchase({ sku: productId }) as import("react-native-iap").ProductPurchase;
    if (!purchase?.transactionReceipt) throw new Error("No transaction receipt returned by StoreKit");

    await client.post("/payments/apple/verify", {
      transactionReceipt: purchase.transactionReceipt,
      contentType,
      contentId,
    });
    await RNIap.finishTransaction({ purchase });
    await clearPending(productId);
    return { success: true };
  } catch (err: any) {
    if (err?.code === "E_USER_CANCELLED") { await clearPending(productId); return { success: false, cancelled: true }; }
    // Leave the pending record in place — if the purchase actually went through
    // on Apple's side despite our verify call failing, Restore Purchases can
    // recover it later using this same productId → contentId pairing.
    Alert.alert("Purchase Failed", err?.response?.data?.message || err?.message || "Could not complete purchase. If you were charged, use \"Restore Purchases\" to recover access.");
    return { success: false };
  }
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
    if (!purchase.transactionReceipt || !purchase.productId) continue;
    const pending = await getPending(purchase.productId);
    if (!pending) continue; // already redeemed previously, nothing to recover
    try {
      await client.post("/payments/apple/verify", {
        transactionReceipt: purchase.transactionReceipt,
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
