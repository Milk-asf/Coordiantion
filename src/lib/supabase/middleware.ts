import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && url.startsWith("http") && key.length > 20)
}

export async function updateSession(request: NextRequest) {
  const authPaths = ["/login", "/signup", "/reset-password", "/update-password"]
  const publicPaths = ["/auth/callback"]
  const isAuthPage = authPaths.includes(request.nextUrl.pathname)
  const isPublicPath = publicPaths.includes(request.nextUrl.pathname)

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

  if (request.nextUrl.pathname === "/update-password") {
    return supabaseResponse
  }

  if (isAuthPage || request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone()
    url.pathname = "/tasks"
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value)
    })
    return redirectResponse
  }

  return supabaseResponse
}
