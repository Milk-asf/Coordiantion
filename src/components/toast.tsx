"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react"
import { motion } from "@/lib/motion"

type ToastType = "success" | "error" | "info"

interface Toast {
  id: string
  message: string
  type: ToastType
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle2 className="h-[20px] w-[20px] shrink-0 text-green-600" strokeWidth={1.5} />,
    error: <AlertTriangle className="h-[20px] w-[20px] shrink-0 text-red-600" strokeWidth={1.5} />,
    info: <Info className="h-[20px] w-[20px] shrink-0 text-blue-600" strokeWidth={1.5} />,
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-[280px] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-folk-modal border border-folk-border bg-folk-surface px-[14px] py-[12px] shadow-folk-toast ${motion.slideUp}`}
          >
            {icons[t.type]}
            <span className="flex-1 text-[13px] font-normal text-folk-text">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-folk-input text-folk-secondary hover:text-folk-text ${motion.interactive}`}
              aria-label="Dismiss"
              tabIndex={0}
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
