export type GoldIconTier = "small" | "medium" | "large" | "green";

export const GOLD_ICON_PATHS:Record<GoldIconTier,string> = {
  small:"assets/currency/gold-small.png",
  medium:"assets/currency/gold-medium.png",
  large:"assets/currency/gold-large.png",
  green:"assets/currency/gold-green.png",
};

export function normalizeGold(amount:number|undefined|null) {
  if (!Number.isFinite(amount)) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER,Math.max(0,Math.floor(amount ?? 0)));
}

export function addGold(balance:number,amount:number) {
  return normalizeGold(normalizeGold(balance)+Math.max(0,Math.floor(Number.isFinite(amount) ? amount : 0)));
}

export function removeGold(balance:number,amount:number) {
  return normalizeGold(normalizeGold(balance)-Math.max(0,Math.floor(Number.isFinite(amount) ? amount : 0)));
}

export function getGoldTier(amount:number):GoldIconTier {
  const balance = normalizeGold(amount);
  if (balance>=1_000_000) return "green";
  if (balance>=100_000) return "large";
  if (balance>=10_000) return "medium";
  return "small";
}

export function getGoldIcon(amount:number) {
  return GOLD_ICON_PATHS[getGoldTier(amount)];
}

export function formatGold(amount:number) {
  return normalizeGold(amount).toLocaleString("en-US");
}
