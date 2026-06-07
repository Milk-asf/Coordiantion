"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Check } from "lucide-react"

export function useSaveIndicator() {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSaved = useCallback(() => {
    setIsVisible(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => setIsVisible(false), 2000)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return { isVisible, showSaved }
}

export function SaveIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null

  return (
    <div className="flex items-center gap-[4px] text-[12px] text-[#2563EB] animate-in fade-in duration-200">
      <Check className="h-[12px] w-[12px]" strokeWidth={2} />
      <span>Saved</span>
    </div>
  )
}
