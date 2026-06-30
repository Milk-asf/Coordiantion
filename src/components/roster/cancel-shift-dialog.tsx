"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Ban, Building2, User } from "lucide-react"
import { motion } from "@/lib/motion"
import { getCancellationClaimSuggestion } from "@/lib/roster/compliance"
import type { RosterShift, RosterShiftCancelledBy } from "@/lib/roster/types"
import { cn } from "@/lib/utils"

interface CancelShiftDialogProps {
  isOpen: boolean
  shift?: Pick<RosterShift, "date" | "chargeTypes">
  onConfirm: (cancelledBy: RosterShiftCancelledBy, cancellationReason: string) => void
  onCancel: () => void
}

const CANCELLED_BY_OPTIONS: {
  value: RosterShiftCancelledBy
  label: string
  description: string
  icon: typeof User
}[] = [
  {
    value: "client",
    label: "By client",
    description: "The participant or their representative cancelled this shift.",
    icon: User,
  },
  {
    value: "organisation",
    label: "By organisation",
    description: "Your organisation cancelled this shift.",
    icon: Building2,
  },
]

export function CancelShiftDialog({ isOpen, shift, onConfirm, onCancel }: CancelShiftDialogProps) {
  const [cancelledBy, setCancelledBy] = useState<RosterShiftCancelledBy>("client")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const reasonRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!isOpen) return
    setCancelledBy("client")
    setReason("")
    setError(null)
    setTimeout(() => reasonRef.current?.focus(), 50)
  }, [isOpen])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === "Escape") onCancel()
  }, [onCancel])

  const handleConfirm = () => {
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      setError("Enter a reason for cancelling this shift.")
      reasonRef.current?.focus()
      return
    }

    onConfirm(cancelledBy, trimmedReason)
  }

  const claimSuggestion = shift ? getCancellationClaimSuggestion(cancelledBy, shift) : null

  if (!isOpen) return null

  return (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/40 ${motion.overlayIn}`}
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-shift-title"
    >
      <div
        className={`mx-[16px] w-full max-w-[420px] rounded-none bg-folk-surface p-[24px] shadow-folk ${motion.scaleIn}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-[12px] text-center">
          <div className="flex h-[44px] w-[44px] items-center justify-center rounded-full bg-[#fff7ed] text-[#c2410c]">
            <Ban className="h-[20px] w-[20px]" strokeWidth={1.5} />
          </div>
          <h3 id="cancel-shift-title" className="text-[15px] font-semibold text-folk-text">
            Cancel shift
          </h3>
          <p className="text-[13px] leading-[1.5] text-folk-secondary">
            Choose who cancelled this shift and add a brief reason. The shift will stay on the roster with a cancelled style.
          </p>
        </div>

        <div className="mt-[18px] space-y-[14px]">
          <div>
            <p className="mb-[8px] text-[12px] font-medium text-folk-secondary">Cancelled by</p>
            <div className="grid gap-[8px]" role="radiogroup" aria-label="Cancelled by">
              {CANCELLED_BY_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = cancelledBy === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setCancelledBy(option.value)}
                    className={cn(
                      "flex w-full items-start gap-[10px] rounded-none border px-[12px] py-[10px] text-left transition-colors",
                      isSelected
                        ? "border-[#fdba74] bg-[#fff7ed]"
                        : "border-folk-border bg-folk-page hover:bg-folk-hover"
                    )}
                    tabIndex={0}
                  >
                    <Icon
                      className={cn("mt-[1px] h-[14px] w-[14px] shrink-0", isSelected ? "text-[#c2410c]" : "text-folk-secondary")}
                      strokeWidth={1.5}
                    />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-folk-text">{option.label}</span>
                      <span className="mt-[2px] block text-[12px] leading-snug text-folk-secondary">
                        {option.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary" htmlFor="cancel-shift-reason">
              Reason
            </label>
            <textarea
              id="cancel-shift-reason"
              ref={reasonRef}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value)
                if (error) setError(null)
              }}
              placeholder="Why was this shift cancelled?"
              className="min-h-[88px] w-full resize-y rounded-none border border-folk-border bg-folk-page px-[12px] py-[8px] text-[13px] font-medium leading-[1.5] text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#bababa] focus:border-[#a3c4f3]"
            />
            {error && (
              <p className="mt-[6px] text-[12px] font-medium text-red-600">{error}</p>
            )}
          </div>

          {claimSuggestion && (
            <div className="rounded-none border border-[#fde68a] bg-[#fffbeb] px-[12px] py-[10px] text-left">
              <p className="text-[12px] font-semibold text-amber-900">NDIS billing note</p>
              <p className="mt-[4px] text-[12px] leading-snug text-amber-900/90">{claimSuggestion}</p>
            </div>
          )}
        </div>

        <div className="mt-[20px] flex items-center gap-[10px]">
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 rounded-none border border-folk-border bg-folk-surface px-[14px] py-[9px] text-[13px] font-medium text-folk-secondary ${motion.interactive} hover:bg-folk-hover`}
            tabIndex={0}
          >
            Keep shift
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={handleConfirm}
            className={`flex-1 rounded-none bg-[#c2410c] px-[14px] py-[9px] text-[13px] font-medium text-white ${motion.interactive} hover:bg-[#9a3412]`}
            tabIndex={0}
          >
            Cancel shift
          </button>
        </div>
      </div>
    </div>
  )
}
