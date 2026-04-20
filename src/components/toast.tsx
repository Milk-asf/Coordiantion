"use client"

import { createContext, useCallback, useContext, useState, type ReactNode } from "react"
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react"

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
    success: <CheckCircle2 className="h-[16px] w-[16px] shrink-0 text-green-500" strokeWidth={2} />,
    error: <AlertTriangle className="h-[16px] w-[16px] shrink-0 text-red-500" strokeWidth={2} />,
    info: <Info className="h-[16px] w-[16px] shrink-0 text-blue-500" strokeWidth={2} />,
  }

  const borderColors: Record<ToastType, string> = {
    success: "border-green-200",
    error: "border-red-200",
    info: "border-blue-200",
  }

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-2 ${borderColors[t.type]}`}
          >
            {icons[t.type]}
            <span className="text-[13px] font-medium text-[#262626]">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#999] transition-colors hover:text-[#262626]"
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
