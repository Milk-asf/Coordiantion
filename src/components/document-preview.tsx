"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Download, File, FileImage, FileText, FileSpreadsheet, FileVideo } from "lucide-react"
import type { Document } from "@/lib/types"
import { motion } from "@/lib/motion"

interface DocumentPreviewProps {
  doc: Document
  getDownloadUrl: (storagePath: string) => Promise<string | null>
  onClose: () => void
}

function getDocIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage
  if (mimeType === "application/pdf" || mimeType.startsWith("text/")) return FileText
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel")) return FileSpreadsheet
  if (mimeType.startsWith("video/")) return FileVideo
  return File
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
  return (bytes / (1024 * 1024)).toFixed(1) + " MB"
}

function isPreviewable(mimeType: string) {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("text/")
  )
}

export function DocumentPreview({ doc, getDownloadUrl, onClose }: DocumentPreviewProps) {
  const [url, setUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    getDownloadUrl(doc.storagePath).then((signedUrl) => {
      if (cancelled) return
      setUrl(signedUrl)
      setIsLoading(false)
    })
    return () => { cancelled = true }
  }, [doc.storagePath, getDownloadUrl])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onClose])

  const handleDownload = useCallback(() => {
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = doc.name
    a.click()
  }, [url, doc.name])

  const DocIcon = getDocIcon(doc.mimeType)
  const canPreview = isPreviewable(doc.mimeType) && url

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/50 ${motion.overlayIn}`}>
      <div
        className={`relative flex h-[90vh] w-[90vw] max-w-[900px] flex-col overflow-hidden rounded-none border border-folk-border bg-folk-surface shadow-[0_8px_32px_rgba(0,0,0,0.12)] ${motion.scaleIn}`}
      >
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-white px-[20px]">
          <div className="flex min-w-0 items-center gap-[10px]">
            <DocIcon className="h-[16px] w-[16px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
            <div className="min-w-0">
              <h3 className="truncate text-[14px] font-semibold text-folk-text">{doc.name}</h3>
              <p className="text-[11px] text-folk-secondary">{formatFileSize(doc.size)}</p>
            </div>
          </div>
          <div className="flex items-center gap-[6px]">
            <button
              onClick={handleDownload}
              disabled={!url}
              className="flex h-[29px] items-center gap-[6px] rounded-none border border-folk-border px-[10px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-40"
              tabIndex={0}
              aria-label="Download file"
            >
              <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
              Download
            </button>
            <button
              onClick={onClose}
              className="flex h-[29px] w-[29px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              tabIndex={0}
              aria-label="Close preview"
            >
              <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center overflow-hidden bg-folk-surface">
          {isLoading ? (
            <div className="flex flex-col items-center gap-[12px]">
              <div className="h-[24px] w-[24px] animate-spin rounded-full border-2 border-folk-border border-t-[#888]" />
              <span className="text-[13px] font-medium text-folk-secondary">Loading preview…</span>
            </div>
          ) : !url ? (
            <div className="flex flex-col items-center gap-[12px]">
              <DocIcon className="h-[48px] w-[48px] text-[#ccc]" strokeWidth={1} />
              <span className="text-[13px] font-medium text-folk-secondary">Preview unavailable</span>
            </div>
          ) : !canPreview ? (
            <div className="flex flex-col items-center gap-[16px]">
              <DocIcon className="h-[56px] w-[56px] text-[#ccc]" strokeWidth={1} />
              <div className="text-center">
                <p className="text-[14px] font-medium text-folk-text">{doc.name}</p>
                <p className="mt-[4px] text-[12px] text-folk-secondary">
                  No preview available for this file type
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-[6px] rounded-none border border-folk-border bg-folk-surface px-[14px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                tabIndex={0}
              >
                <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                Download to view
              </button>
            </div>
          ) : doc.mimeType.startsWith("image/") ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={url}
              alt={doc.name}
              className="max-h-full max-w-full object-contain"
            />
          ) : doc.mimeType === "application/pdf" ? (
            <iframe
              src={url}
              title={doc.name}
              className="h-full w-full border-0"
            />
          ) : doc.mimeType.startsWith("video/") ? (
            <video
              src={url}
              controls
              className="max-h-full max-w-full"
            >
              Your browser does not support video playback.
            </video>
          ) : doc.mimeType.startsWith("audio/") ? (
            <div className="flex flex-col items-center gap-[20px]">
              <DocIcon className="h-[56px] w-[56px] text-[#ccc]" strokeWidth={1} />
              <audio src={url} controls className="w-[400px] max-w-full" />
            </div>
          ) : doc.mimeType.startsWith("text/") ? (
            <TextPreview url={url} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null)

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("Unable to load text content."))
  }, [url])

  if (content === null) return (
    <div className="flex items-center gap-[8px] text-[13px] text-folk-secondary">
      <div className="h-[16px] w-[16px] animate-spin rounded-full border-2 border-folk-border border-t-[#888]" />
      Loading…
    </div>
  )

  return (
    <pre className="h-full w-full overflow-auto whitespace-pre-wrap p-[24px] font-mono text-[13px] text-folk-text">
      {content}
    </pre>
  )
}
