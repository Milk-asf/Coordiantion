"use client"

import { useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"
import { UploadCancelledError, type UploadProgress } from "@/lib/upload-attachments"
import { cn } from "@/lib/utils"

interface FileUploadControlProps {
  onUpload: (files: File[], signal: AbortSignal, onProgress: (progress: UploadProgress) => void) => Promise<void>
  onUploadingChange?: (isUploading: boolean) => void
  buttonLabel?: string
  ariaLabel?: string
  disabled?: boolean
  className?: string
}

export function FileUploadControl({
  onUpload,
  onUploadingChange,
  buttonLabel = "Upload files",
  ariaLabel = "Upload files",
  disabled = false,
  className,
}: FileUploadControlProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort()
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0 || disabled) return

    const controller = new AbortController()
    abortControllerRef.current = controller
    setIsUploading(true)
    onUploadingChange?.(true)
    setProgress({ current: 1, total: files.length, fileName: files[0].name })

    try {
      await onUpload(files, controller.signal, setProgress)
    } catch (error) {
      if (!(error instanceof UploadCancelledError)) {
        console.error("Upload failed", error)
      }
    } finally {
      abortControllerRef.current = null
      setIsUploading(false)
      onUploadingChange?.(false)
      setProgress(null)
    }
  }

  if (isUploading) {
    const label = progress
      ? `Uploading ${progress.fileName} (${progress.current} of ${progress.total})…`
      : "Uploading…"

    return (
      <div
        className={cn(
          "flex h-[36px] w-full items-center justify-between gap-[8px] rounded-[6px] border border-dashed border-folk-border-strong bg-folk-hover px-[10px] text-[13px] font-medium text-folk-text",
          className,
        )}
        aria-live="polite"
      >
        <span className="flex min-w-0 items-center gap-[6px]">
          <Loader2 className="h-[14px] w-[14px] shrink-0 animate-spin text-folk-secondary" strokeWidth={1.5} />
          <span className="truncate">{label}</span>
        </span>
        <button
          type="button"
          onClick={handleCancelUpload}
          className="shrink-0 text-[12px] font-medium text-[#dc2626] transition-colors hover:underline"
          tabIndex={0}
          aria-label="Cancel upload"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <>
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        className={cn(
          "flex h-[36px] w-full items-center justify-center gap-[6px] rounded-[6px] border border-dashed border-folk-border-strong bg-folk-surface text-[13px] font-medium text-folk-secondary transition-colors hover:border-folk-border hover:bg-folk-hover hover:text-folk-text disabled:opacity-50",
          className,
        )}
        tabIndex={0}
        aria-label={ariaLabel}
      >
        <Upload className="h-[14px] w-[14px]" strokeWidth={1.5} />
        {buttonLabel}
      </button>
    </>
  )
}
