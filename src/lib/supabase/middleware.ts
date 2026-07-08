import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

function isConfigured() {
  return isSupabaseConfigured()
}

export async function updateSession(request: NextRequest) {
  const authPaths = ["/login", "/login/sso", "/signup", "/reset-password", "/update-password"]
  const publicPaths = ["/auth/callback", "/auth/confirm", "/privacy", "/support", "/api/xero/webhook", "/api/health"]
  const path = request.nextUrl.pathname
  const isAuthPage = authPaths.includes(path)
  const isPublicPath = publicPaths.includes(path)
  const isOnboardingPath = path.startsWith("/onboarding")
  const isApiPath = path.startsWith("/api")

  // Without Supabase the app runs in local demo mode (contexts fall back to
  // localStorage) — there is no session to protect, so let requests through.
  if (!isConfigured()) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    // API routes authenticate themselves and must answer with status codes,
    // not login-page HTML — fetch() follows redirects transparently, so a
    // 307 here would hand callers a 200 HTML page instead of a 401.
    if (isApiPath) return supabaseResponse
    if (!isAuthPage && !isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = "/login"
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    return supabaseResponse
  }

  if (path === "/update-password" || path === "/create-password") {
    return supabaseResponse
  }

  // MFA step-up: a user with a verified second factor must complete the TOTP
  // challenge (AAL2) before using the app. Reads the session locally — no
  // extra network round-trip.
  const mfaPath = "/login/mfa"
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  const needsMfaStepUp = aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2"

  if (needsMfaStepUp) {
    // API routes authenticate themselves; everything else goes to the challenge.
    if (path === mfaPath || isPublicPath || isApiPath) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = mfaPath
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const onboardingComplete = Boolean(meta.onboarding_completed_at)

  // Fully authenticated users have no business on the challenge page.
  if (path === mfaPath) {
    const url = request.nextUrl.clone()
    url.pathname = onboardingComplete ? "/tasks" : "/onboarding"
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // Logged in and on auth page or root: route based on onboarding state
  if (isAuthPage || path === "/") {
    const url = request.nextUrl.clone()
    url.pathname = onboardingComplete ? "/tasks" : "/onboarding"
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // If they're done with onboarding but try to visit /onboarding/*, send to app
  if (isOnboardingPath && onboardingComplete) {
    const url = request.nextUrl.clone()
    url.pathname = "/tasks"
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  // If they haven't finished onboarding, force them through it
  // (skip /onboarding itself and API routes so onboarding steps can call /api/invite etc.)
  if (!onboardingComplete && !isOnboardingPath && !isApiPath && !isPublicPath) {
    // Accounts that predate the onboarding flag (or joined a workspace via an
    // early invite) already belong somewhere — heal the flag once instead of
    // trapping them in the create-a-workspace flow.
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()
    if (membership) {
      await supabase.auth.updateUser({
        data: { onboarding_step: "done", onboarding_completed_at: new Date().toISOString() },
      })
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = "/onboarding"
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}
