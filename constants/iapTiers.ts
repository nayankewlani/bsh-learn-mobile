/**
 * Mirror of API-server/src/config/iapTiers.ts — must stay in sync manually.
 * See that file for the full rationale (Apple requires pre-created,
 * App-Review-approved products; prices are rounded to the nearest tier
 * rather than a product being minted per course/program).
 */
export interface IapTier {
  productId: string;
  /** Price in paise (INR smallest unit) that this Apple product is closest to. */
  pricePaise: number;
}

export const IAP_TIERS: IapTier[] = [
  { productId: "com.bshlearn.app.tier01", pricePaise: 9_900 },     // ₹99
  { productId: "com.bshlearn.app.tier02", pricePaise: 19_900 },    // ₹199
  { productId: "com.bshlearn.app.tier03", pricePaise: 29_900 },    // ₹299
  { productId: "com.bshlearn.app.tier04", pricePaise: 49_900 },    // ₹499
  { productId: "com.bshlearn.app.tier05", pricePaise: 69_900 },    // ₹699
  { productId: "com.bshlearn.app.tier06", pricePaise: 99_900 },    // ₹999
  { productId: "com.bshlearn.app.tier07", pricePaise: 149_900 },   // ₹1,499
  { productId: "com.bshlearn.app.tier08", pricePaise: 199_900 },   // ₹1,999
  { productId: "com.bshlearn.app.tier09", pricePaise: 299_900 },   // ₹2,999
  { productId: "com.bshlearn.app.tier10", pricePaise: 399_900 },   // ₹3,999
  { productId: "com.bshlearn.app.tier11", pricePaise: 499_900 },   // ₹4,999
  { productId: "com.bshlearn.app.tier12", pricePaise: 699_900 },   // ₹6,999
  { productId: "com.bshlearn.app.tier13", pricePaise: 999_900 },   // ₹9,999
  { productId: "com.bshlearn.app.tier14", pricePaise: 1_499_900 }, // ₹14,999
  { productId: "com.bshlearn.app.tier15", pricePaise: 2_499_900 }, // ₹24,999
  { productId: "com.bshlearn.app.tier16", pricePaise: 2_999_900 }, // ₹29,999
  { productId: "com.bshlearn.app.tier17", pricePaise: 279_900 },  // ₹2,799
  { productId: "com.bshlearn.app.tier18", pricePaise: 539_900 },  // ₹5,399
];

export function nearestTierProductId(pricePaise: number): string {
  return IAP_TIERS.reduce((closest, tier) =>
    Math.abs(tier.pricePaise - pricePaise) < Math.abs(closest.pricePaise - pricePaise) ? tier : closest
  ).productId;
}

/** All product IDs — pass to react-native-iap's getProducts/initConnection. */
export const ALL_IAP_SKUS = IAP_TIERS.map(t => t.productId);
