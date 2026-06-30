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
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-amber-600 text-white hover:bg-amber-700"

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
        className={`w-full max-w-[380px] min-w-[280px] rounded-folk-modal bg-folk-surface p-[24px] shadow-folk ${motion.scaleIn}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-[12px] text-center">
          <div className={`flex h-[44px] w-[44px] items-center justify-center rounded-full ${iconColors}`}>
            <AlertTriangle className="h-[20px] w-[20px]" strokeWidth={1.5} />
          </div>
          <h3 id="confirm-title" className="text-[15px] font-semibold text-folk-text">
            {title}
          </h3>
          <p className="text-[13px] leading-[1.5] text-folk-secondary">{description}</p>
        </div>
        <div className="mt-[20px] flex items-center gap-[10px]">
          <button
            onClick={onCancel}
            className={`flex-1 rounded-none border border-folk-border bg-folk-surface px-[14px] py-[9px] text-[13px] font-medium text-folk-secondary ${motion.interactive} hover:bg-folk-hover`}
            tabIndex={0}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 rounded-none px-[14px] py-[9px] text-[13px] font-medium ${motion.interactive} ${confirmColors}`}
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
