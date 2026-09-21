export const PG_UNIQUE_VIOLATION = "23505";
export const PG_FOREIGN_KEY_VIOLATION = "23503";

export function pgErrorCode(err: unknown): string | undefined {
  const cause = err instanceof Error ? err.cause : undefined;
  if (cause && typeof cause === "object" && "code" in cause) {
    return cause.code as string;
  }
  return undefined;
}

export function pgErrorConstraint(err: unknown): string | undefined {
  const cause = err instanceof Error ? err.cause : undefined;
  if (cause && typeof cause === "object" && "constraint" in cause) {
    return cause.constraint as string;
  }
  return undefined;
}
