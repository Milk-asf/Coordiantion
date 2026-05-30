"use client"

import { useMemo } from "react"
import { useStaff } from "@/lib/hooks/use-staff"
import { useMembers } from "@/lib/hooks/use-members"
import { useWorkspace } from "@/lib/workspace-context"

// Returns the full set of names a client can be assigned to: every staff
// member, every workspace member (including the current user / owner), and
// the current user themselves. This guarantees an admin can always assign a
// coordinator — even to themselves and even in a brand-new solo workspace
// where no separate staff records exist yet.
export function useAssignableCoordinators(): string[] {
  const { staffNames } = useStaff()
  const { members } = useMembers()
  const { currentUserName } = useWorkspace()

  return useMemo(() => {
    const names = new Set<string>()

    for (const name of staffNames) {
      const trimmed = name?.trim()
      if (trimmed) names.add(trimmed)
    }

    for (const member of members) {
      if (member.status === "deactivated") continue
      const name = (member.name || member.email || member.invited_email || "").trim()
      if (name) names.add(name)
    }

    const self = currentUserName?.trim()
    if (self && self !== "You") names.add(self)

    return Array.from(names).sort((a, b) => a.localeCompare(b))
  }, [staffNames, members, currentUserName])
}
