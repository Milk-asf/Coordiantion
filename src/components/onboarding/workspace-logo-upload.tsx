"use client"

import { useRef, useState } from "react"
import { Upload, ImageIcon } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

interface WorkspaceLogoUploadProps {
  workspaceId: string | null
  value: string
  onChange: (url: string) => void
}

export function WorkspaceLogoUpload({ workspaceId, value, onChange }: WorkspaceLogoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")

  const handleUpload = async (file: File) => {
    setError("")
    if (!workspaceId) {
      setError("Workspace not ready. Please try again.")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2 MB")
      return
    }
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setIsUploading(true)
    try {
      const ext = file.name.split(".").pop() || "png"
      const path = `${workspaceId}/logo.${ext}`

      await supabase.storage.from("logos").remove([path])

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      onChange(url)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-[16px]">
      <div className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-none border border-folk-border-subtle bg-folk-page">
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={value} alt="Company logo" className="h-full w-full object-contain" />
        ) : (
          <ImageIcon className="h-[20px] w-[20px] text-folk-placeholder" strokeWidth={1.5} />
        )}
      </div>
      <div>
        <p className="mb-[2px] text-[13px] font-semibold text-folk-text">Company logo</p>
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || !workspaceId}
            className="flex items-center gap-[6px] rounded-none bg-[var(--folk-border-subtle)] px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-[#e8e8e8] disabled:opacity-50"
            tabIndex={0}
          >
            <Upload className="h-[12px] w-[12px]" strokeWidth={1.75} />
            {isUploading ? "Uploading..." : value ? "Change" : "Upload image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
              tabIndex={0}
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-[4px] text-[11px] text-[#aaa]">PNG, JPG or SVG up to 2MB</p>
        {error && <p className="mt-[4px] text-[11px] font-medium text-red-500">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ""
        }}
      />
    </div>
  )
}
