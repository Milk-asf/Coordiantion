"use client"

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { Eraser, PenLine } from "lucide-react"
import { cn } from "@/lib/utils"

interface SignaturePadProps {
  value: string
  onChange: (dataUrl: string) => void
  disabled?: boolean
  height?: number
  className?: string
}

const STROKE_COLOR = "#1f2937"
const STROKE_WIDTH = 2

/** Lightweight canvas signature capture that exports a PNG data URL. */
export function SignaturePad({ value, onChange, disabled = false, height = 140, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(Boolean(value))

  // Size the canvas to its container with a device-pixel-ratio backing store.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = window.devicePixelRatio || 1
    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0) return
      canvas.width = Math.round(rect.width * ratio)
      canvas.height = Math.round(rect.height * ratio)
      const ctx = canvas.getContext("2d")
      if (!ctx) return
      ctx.scale(ratio, ratio)
      ctx.lineCap = "round"
      ctx.lineJoin = "round"
      ctx.strokeStyle = STROKE_COLOR
      ctx.lineWidth = STROKE_WIDTH

      if (value) {
        const img = new Image()
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
        img.src = value
      }
    }

    setup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    event.preventDefault()
    canvasRef.current?.setPointerCapture(event.pointerId)
    isDrawingRef.current = true
    lastPointRef.current = getPoint(event)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawingRef.current) return
    const ctx = canvasRef.current?.getContext("2d")
    const last = lastPointRef.current
    if (!ctx || !last) return

    const point = getPoint(event)
    ctx.beginPath()
    ctx.moveTo(last.x, last.y)
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    lastPointRef.current = point
    if (!hasInk) setHasInk(true)
  }

  const commit = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    onChange(canvas.toDataURL("image/png"))
  }

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (disabled || !isDrawingRef.current) return
    isDrawingRef.current = false
    lastPointRef.current = null
    canvasRef.current?.releasePointerCapture(event.pointerId)
    commit()
  }

  const handleClear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    setHasInk(false)
    onChange("")
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "relative rounded-[6px] border border-dashed border-folk-border bg-folk-page",
          disabled && "opacity-70",
        )}
        style={{ height }}
      >
        {!hasInk && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-[6px] text-folk-placeholder">
            <PenLine className="h-[18px] w-[18px]" strokeWidth={1.5} />
            <span className="text-[12px] font-medium">{disabled ? "No signature" : "Sign here"}</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className={cn("h-full w-full touch-none", disabled ? "cursor-default" : "cursor-crosshair")}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
      </div>
      {!disabled && hasInk && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-[6px] inline-flex items-center gap-[5px] text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
          tabIndex={0}
        >
          <Eraser className="h-[12px] w-[12px]" strokeWidth={1.75} />
          Clear signature
        </button>
      )}
    </div>
  )
}
