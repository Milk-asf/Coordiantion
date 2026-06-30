"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { motion } from "@/lib/motion"

interface FormModalProps {
  onClose: () => void
  children: ReactNode
  /** Max width of the modal card in pixels. */
  width?: number
  className?: string
  /** When false, clicking the blurred backdrop will not close the modal. */
  closeOnBackdrop?: boolean
  /** "center" (default) shows a centered card; "right" docks a full-height panel to the right edge. */
  position?: "center" | "right"
}

/**
 * Backdrop-blurred modal for create/edit forms. Defaults to a centered card,
 * but can dock a full-height panel to the right edge (position="right"). The
 * card caps at the viewport height, letting the form's own scrollable body take
 * over for tall content.
 *
 * Rendered through a portal on <body> so the blurred backdrop always covers the
 * whole viewport, independent of any transformed/scrolling ancestor.
 */
export function FormModal({
  onClose,
  children,
  width = 480,
  className,
  closeOnBackdrop = true,
  position = "center",
}: FormModalProps) {
  const isRight = position === "right"
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[100] flex",
        isRight ? "justify-end p-[16px]" : "items-center justify-center p-[16px]",
        motion.overlayIn,
      )}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-white/60 [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)]"
        onClick={closeOnBackdrop ? onClose : undefined}
      />
      <div
        className={cn(
          "relative z-10 flex w-full flex-col overflow-hidden bg-white",
          isRight
            ? "h-full rounded-[16px] border border-folk-border-strong shadow-[0_16px_48px_rgba(0,0,0,0.18)]"
            : "max-h-[calc(100vh-32px)] rounded-[16px] border border-[#bababa] shadow-[0_16px_48px_rgba(0,0,0,0.18)]",
          isRight ? motion.slideInRight : motion.scaleIn,
          className,
        )}
        style={{ maxWidth: width }}
      >
        <div className="flex min-h-0 flex-auto flex-col">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
