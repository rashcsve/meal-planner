type ErrorBody = { error?: { message?: string } };

function isErrorBody(value: unknown): value is ErrorBody {
  return typeof value === "object" && value !== null && "error" in value;
}

export async function parseErrorResponse(res: Response): Promise<string> {
  const body: unknown = await res.json().catch(() => null);
  if (isErrorBody(body)) {
    return body.error?.message ?? res.statusText;
  }
  return res.statusText;
}
