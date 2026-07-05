"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { usePermissions } from "@/lib/hooks/use-permissions"

/**
 * Areas hidden from support workers — coordinator/admin surfaces they should
 * never land on, even via a direct URL. Their world is My Day, roster,
 * participants, timesheets and incidents.
 */
const BLOCKED_PREFIXES = [
  "/tasks",
  "/notes",
  "/documents",
  "/forms",
  "/reports",
  "/contacts",
  "/staff",
  "/business",
  "/lists",
  "/budgets",
  "/compliance",
  "/invoices",
  "/invoicing",
  "/planned-spending",
]

export function SupportWorkerRouteGuard() {
  const { isSupportWorker, isLoading } = usePermissions()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (isLoading || !isSupportWorker) return
    const isBlocked = BLOCKED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
    if (isBlocked) router.replace("/my-day")
  }, [isLoading, isSupportWorker, pathname, router])

  return null
}
