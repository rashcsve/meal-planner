export interface ReasonTagInfo {
  variant: "save" | "pantry";
  label: string;
  detail: string;
}

export function categorizeReasons(reasons: string[]): ReasonTagInfo[] {
  const tags: ReasonTagInfo[] = [];
  const promoReasons = reasons.filter((r) => r.startsWith("promo:"));
  const pantryReasons = reasons.filter((r) => r.startsWith("uses") && r.includes("expiring"));

  if (promoReasons.length > 0) {
    tags.push({ variant: "save", label: "on sale", detail: promoReasons.join("; ") });
  }
  if (pantryReasons.length > 0) {
    tags.push({ variant: "pantry", label: "uses pantry", detail: pantryReasons.join("; ") });
  }
  return tags;
}
