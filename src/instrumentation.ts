export async function register() {
  // Validate configuration once per server boot (node runtime only — the
  // edge middleware bundle doesn't need it and can't use Buffer).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertEnv } = await import("@/lib/env")
    assertEnv()
  }
}

// Uncaught errors from renders, route handlers, and server actions land here.
export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  const { reportServerError } = await import("@/lib/error-reporting")
  await reportServerError(error, request, context)
}
