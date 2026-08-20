export function emptyToUndefined(v: string): string | undefined {
  return v === "" ? undefined : v;
}

export function emptyToUndefinedNumber(v: string): number | undefined {
  return v === "" ? undefined : Number(v);
}
