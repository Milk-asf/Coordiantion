"use client"

import { useState, useEffect, useRef } from "react"
import {
  Save,
  Check,
  Upload,
  X,
  ImageIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"

const inputClass = "h-[44px] w-full rounded-[10px] border border-[#e5e5e5] bg-[#fafafa] px-[14px] text-[14px] text-[#262626] outline-none transition-colors placeholder:text-[#c0c0c0] focus:border-[#c0c0c0] focus:ring-2 focus:ring-[#e8e8e8]"
const labelClass = "mb-[8px] block text-[13px] font-semibold text-[#262626]"

export default function GeneralSettingsPage() {
  const { settings, updateSettings } = useWorkspaceSettings()
  const { activeWorkspace, renameWorkspace } = useWorkspace()
  const [local, setLocal] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  const isDirty = JSON.stringify(local) !== JSON.stringify(settings)

  const handleSave = async () => {
    updateSettings(local)
    if (local.orgName && local.orgName !== activeWorkspace?.name) {
      await renameWorkspace(local.orgName)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = (key: keyof typeof local) => (val: string) => {
    setLocal((prev) => ({ ...prev, [key]: val }))
  }

  const handleLogoUpload = async (file: File) => {
    if (!activeWorkspace || !isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setIsUploading(true)
    try {
      const ext = file.name.split(".").pop() || "png"
      const path = `${activeWorkspace.id}/logo.${ext}`

      await supabase.storage.from("logos").remove([path])

      const { error } = await supabase.storage
        .from("logos")
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) { console.error("Logo upload failed:", error.message); return }

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`

      setLocal((prev) => ({ ...prev, logoUrl }))
      updateSettings({ ...local, logoUrl })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setLocal((prev) => ({ ...prev, logoUrl: "" }))
    updateSettings({ ...local, logoUrl: "" })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="mb-[32px] flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#262626]">General</h1>
          <p className="mt-[4px] text-[14px] text-[#888]">
            Organisation details used in invoices and emails.
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          {saved && !isDirty && (
            <div className="flex items-center gap-[6px] text-[13px] font-medium text-green-600">
              <Check className="h-[14px] w-[14px]" strokeWidth={2} />
              Saved
            </div>
          )}
          {isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-[6px] rounded-[8px] border border-[#e0e0e0] bg-white px-[16px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
              tabIndex={0}
              aria-label="Save changes"
            >
              <Save className="h-[13px] w-[13px]" strokeWidth={2} />
              Save
            </button>
          )}
        </div>
      </div>

      {/* Logo */}
      <div className="mb-[28px]">
        <h2 className="mb-[8px] text-[15px] font-bold text-[#262626]">Logo</h2>
        <p className="mb-[12px] text-[13px] text-[#888]">Displayed in the sidebar and on invoices.</p>
        <div className="rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] p-[20px]">
          <div className="flex items-center gap-[16px]">
            {local.logoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={local.logoUrl}
                  alt="Organisation logo"
                  className="h-[64px] w-[64px] rounded-[10px] border border-[#e5e5e5] object-contain bg-white"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -right-[6px] -top-[6px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#262626] text-white transition-colors hover:bg-red-500"
                  aria-label="Remove logo"
                  tabIndex={0}
                >
                  <X className="h-[10px] w-[10px]" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[10px] border border-dashed border-[#d4d4d4] bg-white">
                <ImageIcon className="h-[20px] w-[20px] text-[#ccc]" strokeWidth={1.5} />
              </div>
            )}
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-[6px] rounded-[8px] border border-[#e0e0e0] bg-white px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
                tabIndex={0}
              >
                <Upload className="h-[13px] w-[13px]" strokeWidth={1.75} />
                {isUploading ? "Uploading..." : local.logoUrl ? "Change logo" : "Upload logo"}
              </button>
              <p className="mt-[6px] text-[12px] text-[#bbb]">PNG, JPG, or SVG. Max 2 MB.</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 2 * 1024 * 1024) { alert("File must be under 2 MB"); return }
              handleLogoUpload(file)
              e.target.value = ""
            }}
          />
        </div>
      </div>

      {/* Organisation Details */}
      <div className="mb-[28px]">
        <h2 className="mb-[8px] text-[15px] font-bold text-[#262626]">Organisation Details</h2>
        <p className="mb-[12px] text-[13px] text-[#888]">This information appears on your invoices and emails.</p>
        <div className="space-y-[16px] rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] p-[24px]">
          <div>
            <label className={labelClass}>Organisation name</label>
            <input type="text" value={local.orgName} onChange={(e) => update("orgName")(e.target.value)} placeholder="Your organisation name" className={inputClass} />
          </div>
          <div className="grid gap-[16px] sm:grid-cols-2">
            <div>
              <label className={labelClass}>ABN</label>
              <input type="text" value={local.orgAbn} onChange={(e) => update("orgAbn")(e.target.value)} placeholder="XX XXX XXX XXX" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>NDIS registration number</label>
              <input type="text" value={local.ndisNumber} onChange={(e) => update("ndisNumber")(e.target.value)} placeholder="4-XXXXXXXXX" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input type="text" value={local.orgPhone} onChange={(e) => update("orgPhone")(e.target.value)} placeholder="(XX) XXXX XXXX" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={local.orgEmail} onChange={(e) => update("orgEmail")(e.target.value)} placeholder="admin@yourbusiness.com.au" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input type="text" value={local.orgAddress} onChange={(e) => update("orgAddress")(e.target.value)} placeholder="123 Main St, Brisbane QLD 4000" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Reply-to email</label>
            <input type="email" value={local.replyToEmail} onChange={(e) => update("replyToEmail")(e.target.value)} placeholder="Same as email if empty" className={inputClass} />
            <p className="mt-[6px] text-[12px] text-[#bbb]">Replies to invoice emails will go to this address, or the organisation email if not set.</p>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="mb-[28px]">
        <h2 className="mb-[8px] text-[15px] font-bold text-[#262626]">Bank Details</h2>
        <p className="mb-[12px] text-[13px] text-[#888]">Included on invoices so plan managers can process payment.</p>
        <div className="space-y-[16px] rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] p-[24px]">
          <div>
            <label className={labelClass}>Bank</label>
            <input type="text" value={local.bankName} onChange={(e) => update("bankName")(e.target.value)} placeholder="Commonwealth Bank" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Account name</label>
            <input type="text" value={local.bankAccountName} onChange={(e) => update("bankAccountName")(e.target.value)} placeholder="Your Business Pty Ltd" className={inputClass} />
          </div>
          <div className="grid gap-[16px] sm:grid-cols-2">
            <div>
              <label className={labelClass}>BSB</label>
              <input type="text" value={local.bankBsb} onChange={(e) => update("bankBsb")(e.target.value)} placeholder="XXX-XXX" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Account number</label>
              <input type="text" value={local.bankAccountNumber} onChange={(e) => update("bankAccountNumber")(e.target.value)} placeholder="XXXX XXXX" className={inputClass} />
            </div>
          </div>
        </div>
      </div>

      {/* Email Footer */}
      <div className="mb-[28px]">
        <h2 className="mb-[8px] text-[15px] font-bold text-[#262626]">Email Footer</h2>
        <p className="mb-[12px] text-[13px] text-[#888]">Optional footer text added to all outgoing emails.</p>
        <div className="rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] p-[24px]">
          <textarea
            value={local.emailFooter}
            onChange={(e) => setLocal((prev) => ({ ...prev, emailFooter: e.target.value }))}
            placeholder="Enter footer text..."
            rows={3}
            className={cn(inputClass, "h-auto min-h-[100px] resize-none py-[12px]")}
          />
        </div>
      </div>
    </>
  )
}
