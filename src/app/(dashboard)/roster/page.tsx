"use client"

import { Suspense } from "react"
import { RosterShell } from "@/components/roster/roster-shell"

export default function RosterPage() {
  return (
    <Suspense fallback={null}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <RosterShell />
      </div>
    </Suspense>
  )
}
