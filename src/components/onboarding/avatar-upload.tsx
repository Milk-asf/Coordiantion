"use client"

import { useRef, useState } from "react"
import { Upload, User as UserIcon } from "lucide-react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

interface AvatarUploadProps {
  userId: string
  value: string
  onChange: (url: string) => void
}

export function AvatarUpload({ userId, value, onChange }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState("")

  const handleUpload = async (file: File) => {
    setError("")
    if (file.size > 2 * 1024 * 1024) {
      setError("File must be under 2 MB")
      return
    }
    if (!isSupabaseConfigured()) {
      setError("Storage not configured")
      return
    }
    const supabase = createClient()
    if (!supabase) return

    setIsUploading(true)
    try {
      const ext = file.name.split(".").pop() || "png"
      const path = `${userId}/avatar.${ext}`

      await supabase.storage.from("avatars").remove([path])

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        setError(uploadError.message)
        return
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`
      onChange(url)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemove = () => {
    onChange("")
    setError("")
  }

  return (
    <div className="flex items-center gap-[16px]">
      <div className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden rounded-full border border-folk-border-subtle bg-folk-page">
        {value ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={value} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <UserIcon className="h-[24px] w-[24px] text-folk-placeholder" strokeWidth={1.5} />
        )}
      </div>
      <div>
        <p className="mb-[2px] text-[13px] font-semibold text-folk-text">Profile picture</p>
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-[6px] rounded-none bg-[var(--folk-border-subtle)] px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-[#e8e8e8] disabled:opacity-50"
            tabIndex={0}
          >
            <Upload className="h-[12px] w-[12px]" strokeWidth={1.75} />
            {isUploading ? "Uploading..." : value ? "Change" : "Upload image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
              tabIndex={0}
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-[4px] text-[11px] text-[#aaa]">PNG or JPG up to 2MB</p>
        {error && <p className="mt-[4px] text-[11px] font-medium text-red-500">{error}</p>}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
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
