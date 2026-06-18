"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { RosterShift } from "@/lib/roster/types"

type ShiftHoverTarget =
  | { kind: "shift"; shiftId: string }
  | { kind: "string"; stringId: string }

interface RosterShiftHoverContextValue {
  setHoverTarget: (target: ShiftHoverTarget | null) => void
  isShiftHighlighted: (shift: Pick<RosterShift, "id" | "shiftStringId">) => boolean
}

const RosterShiftHoverContext = createContext<RosterShiftHoverContextValue | null>(null)

export function RosterShiftHoverProvider({ children }: { children: ReactNode }) {
  const [hoverTarget, setHoverTarget] = useState<ShiftHoverTarget | null>(null)

  const isShiftHighlighted = useCallback(
    (shift: Pick<RosterShift, "id" | "shiftStringId">) => {
      if (!hoverTarget) return false

      if (hoverTarget.kind === "string" && shift.shiftStringId) {
        return hoverTarget.stringId === shift.shiftStringId
      }

      if (hoverTarget.kind === "shift") {
        return hoverTarget.shiftId === shift.id
      }

      return false
    },
    [hoverTarget]
  )

  const value = useMemo(
    () => ({
      setHoverTarget,
      isShiftHighlighted,
    }),
    [isShiftHighlighted]
  )

  return <RosterShiftHoverContext.Provider value={value}>{children}</RosterShiftHoverContext.Provider>
}

export function useRosterShiftHover() {
  return useContext(RosterShiftHoverContext)
}

export function getShiftHoverTarget(shift: Pick<RosterShift, "id" | "shiftStringId">): ShiftHoverTarget {
  if (shift.shiftStringId) {
    return { kind: "string", stringId: shift.shiftStringId }
  }

  return { kind: "shift", shiftId: shift.id }
}

export function shouldClearShiftHover(
  shift: Pick<RosterShift, "id" | "shiftStringId">,
  nextTarget: EventTarget | null
): boolean {
  if (!(nextTarget instanceof Element)) return true

  if (shift.shiftStringId) {
    const nextStringId = nextTarget.closest("[data-shift-string-id]")?.getAttribute("data-shift-string-id")
    return nextStringId !== shift.shiftStringId
  }

  const nextShiftId = nextTarget.closest("[data-shift-id]")?.getAttribute("data-shift-id")
  return nextShiftId !== shift.id
}
