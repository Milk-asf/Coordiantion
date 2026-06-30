import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isSupabaseConfigured } from "@/lib/supabase/config"

function isConfigured() {
  return isSupabaseConfigured()
}

export async function updateSession(request: NextRequest) {
  const authPaths = ["/login", "/signup", "/reset-password", "/update-password"]
  const publicPaths = ["/auth/callback", "/auth/confirm", "/privacy", "/support", "/api/xero/webhook"]
  const path = request.nextUrl.pathname
  const isAuthPage = authPaths.includes(path)
  const isPublicPath = publicPaths.includes(path)
  const isOnboardingPath = path.startsWith("/onboarding")
  const isApiPath = path.startsWith("/api")

  if (!isConfigured()) {
    if (isAuthPage) return NextResponse.next({ request })
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
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

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const onboardingComplete = Boolean(meta.onboarding_completed_at)

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
