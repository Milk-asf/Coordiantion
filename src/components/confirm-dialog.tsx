"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle } from "lucide-react"
import { motion } from "@/lib/motion"

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    setTimeout(() => confirmRef.current?.focus(), 50)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") onCancel()
    },
    [onCancel],
  )

  if (!isOpen || !mounted) return null

  const confirmColors =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-200"
      : "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-200"

  const iconColors =
    variant === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/25 p-[16px] ${motion.overlayIn}`}
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div
        className={`w-full min-w-[280px] max-w-[400px] rounded-folk-modal bg-folk-surface p-[20px] shadow-folk ${motion.scaleIn}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-[12px]">
          <div className={`flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full ${iconColors}`}>
            <AlertTriangle className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-title" className="text-[14px] font-semibold leading-[1.3] text-folk-text">
              {title}
            </h3>
            <p className="mt-[4px] text-[13px] leading-[1.5] text-folk-secondary">{description}</p>
          </div>
        </div>
        <div className="mt-[18px] flex items-center justify-end gap-[8px]">
          <button
            onClick={onCancel}
            className={`outline-btn folk-pill-btn px-[14px] py-[6px] text-[13px] font-medium ${motion.interactive}`}
            tabIndex={0}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`folk-pill-btn px-[14px] py-[6px] text-[13px] font-medium text-white outline-none transition-colors focus-visible:ring-2 ${confirmColors} ${motion.interactive}`}
            tabIndex={0}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
