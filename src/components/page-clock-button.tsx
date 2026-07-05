"use client"

import { useEffect, useState } from "react"
import { Play, Square } from "lucide-react"
import { folkClockBtnClass } from "@/lib/folk-ui"
import { useToast } from "@/components/toast"
import { useTimesheets } from "@/lib/timesheets-context"
import { TimesheetFormPanel } from "@/app/(dashboard)/timesheets/_components/timesheet-form-panel"
import { panelToggleButtonClass } from "@/components/panel-toggle-button"
import { Tooltip } from "@/components/tooltip"
import { cn } from "@/lib/utils"
import type { Timesheet } from "@/lib/timesheets/types"

export function formatClockElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

interface PageClockButtonProps {
  /** Pill in page header, or compact icon for sidebar / mobile nav. */
  variant?: "pill" | "icon"
  className?: string
}

export function PageClockButton({ variant = "pill", className }: PageClockButtonProps) {
  const { toast } = useToast()
  const { activeClock, clockOn, clockOff } = useTimesheets()
  const [isBusy, setIsBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [signOffTimesheet, setSignOffTimesheet] = useState<Timesheet | null>(null)

  useEffect(() => {
    if (!activeClock) return
    setNow(Date.now())
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [activeClock])

  const elapsedMs = activeClock?.clockedInAt ? now - new Date(activeClock.clockedInAt).getTime() : 0

  const handleClockOn = async () => {
    if (isBusy) return
    setIsBusy(true)
    const created = await clockOn()
    setIsBusy(false)
    if (created) toast("Clocked on", "success")
    else toast("Could not clock on", "error")
  }

  const handleClockOff = async () => {
    if (isBusy || !activeClock) return
    setIsBusy(true)
    const closed = await clockOff(activeClock.id)
    setIsBusy(false)
    if (!closed) {
      toast("Could not clock off", "error")
      return
    }
    toast("Clocked off — finish your timesheet", "success")
    setSignOffTimesheet(closed)
  }

  const signOffPanel = (
    <TimesheetFormPanel
      isOpen={Boolean(signOffTimesheet)}
      timesheet={signOffTimesheet}
      onClose={() => setSignOffTimesheet(null)}
    />
  )

  if (variant === "icon") {
    const iconButtonClass = (extra?: string) =>
      panelToggleButtonClass(cn(extra, className))

    if (activeClock) {
      return (
        <>
          <Tooltip label={`Clock off — ${formatClockElapsed(elapsedMs)}`} className="inline-flex shrink-0">
            <button
              type="button"
              onClick={handleClockOff}
              disabled={isBusy}
              aria-label="Clock off"
              className={iconButtonClass(
                "border-[#dc2626] bg-[#dc2626] text-white hover:border-[#b91c1c] hover:bg-[#b91c1c] hover:text-white disabled:opacity-50",
              )}
            >
              <Square className="h-[14px] w-[14px] fill-current" strokeWidth={0} />
            </button>
          </Tooltip>
          {signOffPanel}
        </>
      )
    }

    return (
      <Tooltip label="Clock on" className="inline-flex shrink-0">
        <button
          type="button"
          onClick={handleClockOn}
          disabled={isBusy}
          aria-label="Clock on"
          className={iconButtonClass("disabled:opacity-50")}
        >
          <Play className="h-[14px] w-[14px] fill-current text-folk-text" strokeWidth={0} />
        </button>
      </Tooltip>
    )
  }

  if (activeClock) {
    return (
      <>
        <button
          type="button"
          onClick={handleClockOff}
          disabled={isBusy}
          className={folkClockBtnClass("bg-[#dc2626] hover:bg-[#b91c1c]")}
          tabIndex={0}
          aria-label="Clock off"
        >
          <Square className="h-[12px] w-[12px] fill-current" strokeWidth={0} />
          <span>Clock off</span>
          <span className="ml-[2px] font-mono text-[12px] tabular-nums text-white/90">
            {formatClockElapsed(elapsedMs)}
          </span>
        </button>
        {signOffPanel}
      </>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClockOn}
      disabled={isBusy}
      className={folkClockBtnClass()}
      tabIndex={0}
      aria-label="Clock on"
    >
      <span>Clock on</span>
    </button>
  )
}
