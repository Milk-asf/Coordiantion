"use client"

import { useCallback, useEffect, useRef } from "react"
import { AlertTriangle } from "lucide-react"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: "danger" | "warning"
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) setTimeout(() => confirmRef.current?.focus(), 50)
  }, [isOpen])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") onCancel()
  }, [onCancel])

  if (!isOpen) return null

  const confirmColors = variant === "danger"
    ? "bg-red-600 text-white hover:bg-red-700"
    : "bg-amber-600 text-white hover:bg-amber-700"

  const iconColors = variant === "danger"
    ? "bg-red-50 text-red-600"
    : "bg-amber-50 text-amber-600"

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40"
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className="mx-[16px] w-full max-w-[380px] rounded-[12px] bg-white p-[24px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-[12px] text-center">
          <div className={`flex h-[44px] w-[44px] items-center justify-center rounded-full ${iconColors}`}>
            <AlertTriangle className="h-[20px] w-[20px]" strokeWidth={1.5} />
          </div>
          <h3 id="confirm-title" className="text-[15px] font-semibold text-[#262626]">{title}</h3>
          <p className="text-[13px] leading-[1.5] text-[#888]">{description}</p>
        </div>
        <div className="mt-[20px] flex items-center gap-[10px]">
          <button
            onClick={onCancel}
            className="flex-1 rounded-[8px] border border-[#e0e0e0] bg-white px-[14px] py-[9px] text-[13px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 rounded-[8px] px-[14px] py-[9px] text-[13px] font-medium transition-colors ${confirmColors}`}
            tabIndex={0}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
