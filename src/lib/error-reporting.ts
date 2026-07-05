interface RequestInfo {
  path?: string
  method?: string
}

interface RequestContext {
  routerKind?: string
  routePath?: string
  routeType?: string
}

/**
 * Central server-side error reporting, invoked by Next's onRequestError hook
 * (src/instrumentation.ts) for every uncaught error in renders, routes, and
 * server actions.
 *
 * - Always emits one structured JSON line, which Vercel log drains (Datadog,
 *   Better Stack, Axiom) ingest as-is.
 * - When ERROR_WEBHOOK_URL is set, also POSTs the payload there — point it at
 *   Slack, Better Stack, or any collector.
 * - Swapping in Sentry later: call Sentry.captureException here (or replace
 *   the hook) — nothing else in the app needs to change.
 */
export async function reportServerError(
  error: unknown,
  request?: RequestInfo,
  context?: RequestContext,
) {
  const err = error instanceof Error ? error : new Error(String(error))

  const payload = {
    level: "error",
    message: err.message,
    name: err.name,
    // Next attaches a digest that matches what the client error boundary shows.
    digest: (err as { digest?: string }).digest,
    stack: err.stack?.split("\n").slice(0, 12).join("\n"),
    path: request?.path,
    method: request?.method,
    routeType: context?.routeType,
    routePath: context?.routePath,
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev",
    timestamp: new Date().toISOString(),
  }

  console.error(JSON.stringify(payload))

  const webhook = process.env.ERROR_WEBHOOK_URL
  if (!webhook) return

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // Reporting must never take down the request path.
      signal: AbortSignal.timeout(3_000),
    })
  } catch {
    // Nothing sensible to do if the reporter itself is down.
  }
}
