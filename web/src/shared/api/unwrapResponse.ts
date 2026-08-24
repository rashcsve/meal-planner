import { parseErrorResponse } from "./parseErrorResponse";

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    throw new Error(await parseErrorResponse(res));
  }
}

export async function unwrapResponse<T>(res: Response): Promise<T> {
  await assertOk(res);
  return res.json();
}

export async function unwrapEmptyResponse(res: Response): Promise<void> {
  await assertOk(res);
}
