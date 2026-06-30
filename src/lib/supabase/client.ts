"use client"

import { createBrowserClient } from "@supabase/ssr"
import { getSupabasePublicEnv, isSupabaseConfigured } from "@/lib/supabase/config"

export { isSupabaseConfigured }

export function createClient() {
  const env = getSupabasePublicEnv()
  if (!env) return null

  return createBrowserClient(env.url, env.key)
}
