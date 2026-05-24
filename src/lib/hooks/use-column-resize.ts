"use client"

import { useState, useCallback, useRef } from "react"

interface ColumnResizeOptions {
  minWidth?: number
  maxWidth?: number
  defaultWidth?: number
}

const DEFAULT_MIN_WIDTH = 80
const DEFAULT_MAX_WIDTH = 500
const DEFAULT_WIDTH = 200

export function useColumnResize(columnKeys: string[], options?: ColumnResizeOptions) {
  const minW = options?.minWidth ?? DEFAULT_MIN_WIDTH
  const maxW = options?.maxWidth ?? DEFAULT_MAX_WIDTH
  const defaultW = options?.defaultWidth ?? DEFAULT_WIDTH

  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    columnKeys.forEach((key) => { initial[key] = defaultW })
    return initial
  })

  const dragState = useRef<{ key: string; startX: number; startWidth: number } | null>(null)

  const getWidth = useCallback((key: string, fallback?: number) => {
    return widths[key] ?? fallback ?? defaultW
  }, [widths, defaultW])

  const handleMouseDown = useCallback((key: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startWidth = widths[key] ?? defaultW
    dragState.current = { key, startX, startWidth }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragState.current) return
      const diff = ev.clientX - dragState.current.startX
      const newWidth = Math.max(minW, Math.min(maxW, dragState.current.startWidth + diff))
      setWidths((prev) => ({ ...prev, [dragState.current!.key]: newWidth }))
    }

    const handleMouseUp = () => {
      dragState.current = null
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [widths, defaultW, minW, maxW])

  return { getWidth, handleMouseDown, widths }
}
