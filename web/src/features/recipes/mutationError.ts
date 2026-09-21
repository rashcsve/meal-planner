interface ErroredMutation {
  isError: boolean;
  error: Error | null;
}

export function firstMutationError(...mutations: ErroredMutation[]): string | undefined {
  return mutations.find((m) => m.isError)?.error?.message;
}

interface LineMutation extends ErroredMutation {
  variables?: { lineId: number };
}

export function lineMutationError(
  lineId: number,
  ...mutations: LineMutation[]
): string | undefined {
  return mutations.find((m) => m.isError && m.variables?.lineId === lineId)?.error?.message;
}
