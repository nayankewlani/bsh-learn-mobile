import { Alert, Platform } from "react-native";

// Apple rejects apps that let users pay for digital content/services from
// inside the app through anything other than Apple's own In-App Purchase
// (guideline 3.1.1/3.1.3). We don't run IAP, so on iOS every purchase entry
// point must be blocked before it reaches Razorpay (native checkout or an
// external payment link) and point people to the website instead.
//
// No tappable link here on purpose — guideline 3.1.3 also prohibits buttons/
// links that direct users to an external purchase mechanism. Plain text only.
export const IOS_PURCHASE_BLOCKED = Platform.OS === "ios";

export function blockIOSPurchase(): boolean {
  if (!IOS_PURCHASE_BLOCKED) return false;
  Alert.alert(
    "Enroll on the Web",
    "Please visit bshhealers.com from your browser and log in with the same account to enroll. It'll unlock here automatically once purchased."
  );
  return true;
}
