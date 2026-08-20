const COMBINING_MARK_RANGE = [0x0300, 0x036f] as const;

export function normalizeForSearch(value: string): string {
  return Array.from(value.normalize("NFD"))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < COMBINING_MARK_RANGE[0] || code > COMBINING_MARK_RANGE[1];
    })
    .join("")
    .toLowerCase();
}
