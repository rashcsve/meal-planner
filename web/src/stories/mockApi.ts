import { spyOn } from "storybook/test";

export interface MockRoute {
  method: string;
  path: RegExp;
  status?: number;
  body: unknown | ((request: RecordedRequest) => unknown);
}

export interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
}

export function mockApi(routes: MockRoute[]) {
  const requests: RecordedRequest[] = [];
  const spy = spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const request = { method, url, body };
    requests.push(request);
    const route = routes.find((r) => r.method === method && r.path.test(url));
    if (!route) throw new Error(`Unmocked request: ${method} ${url}`);
    const payload = typeof route.body === "function" ? await route.body(request) : route.body;
    return new Response(JSON.stringify(payload), {
      status: route.status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  return {
    requestsTo: (method: string, path: RegExp) =>
      requests.filter((r) => r.method === method && path.test(r.url)),
    restore: () => spy.mockRestore(),
  };
}
