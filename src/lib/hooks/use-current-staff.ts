"use client"

import { useMemo } from "react"
import { useStaff } from "@/lib/hooks/use-staff"
import { usePermissions } from "@/lib/hooks/use-permissions"

/**
 * Resolve the signed-in user to their staff record id by matching on the
 * invited email (falling back to the staff details email). Returns null when no
 * matching staff record exists. Used to scope a support worker to their own
 * shifts, incidents and assigned participants.
 */
export function useCurrentStaffId(): string | null {
  const { staff } = useStaff()
  const { userEmail } = usePermissions()

  return useMemo(() => {
    const email = (userEmail || "").trim().toLowerCase()
    if (!email) return null
    const match = staff.find((member) => {
      const invited = (member.invitedEmail || "").trim().toLowerCase()
      const detailEmail = (member.details?.email || "").trim().toLowerCase()
      return invited === email || detailEmail === email
    })
    return match?.id ?? null
  }, [staff, userEmail])
}
