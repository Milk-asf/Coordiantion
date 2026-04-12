"use client"

import { useState, useEffect, useRef } from "react"
import {
  Building2,
  Hash,
  Phone,
  Mail,
  MapPin,
  Reply,
  FileText,
  Landmark,
  CreditCard,
  Save,
  Check,
  Upload,
  X,
  ImageIcon,
} from "lucide-react"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"

interface FieldRowProps {
  label: string
  value: string
  onChange: (val: string) => void
  icon: React.ReactNode
  placeholder?: string
  type?: string
}

function FieldRow({ label, value, onChange, icon, placeholder, type = "text" }: FieldRowProps) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-center border-b border-[#f0f0f0] px-[16px]">
      <div className="flex items-center gap-[8px] py-[10px]">
        {icon}
        <span className="text-[13px] font-medium text-[#888]">{label}</span>
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Empty"}
        className="w-full bg-transparent py-[10px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#ccc]"
      />
    </div>
  )
}

export default function GeneralSettingsPage() {
  const { settings, updateSettings } = useWorkspaceSettings()
  const { activeWorkspace } = useWorkspace()
  const [local, setLocal] = useState(settings)
  const [saved, setSaved] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  const isDirty = JSON.stringify(local) !== JSON.stringify(settings)

  const handleSave = () => {
    updateSettings(local)
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
      <div className="mb-[28px] flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a1a1a]">General</h1>
          <p className="mt-[4px] text-[14px] text-sidebar-muted">
            Organisation details used in invoices and emails.
          </p>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            className="flex items-center gap-[6px] rounded-[8px] bg-[#1a1a1a] px-[14px] py-[7px] text-[13px] font-medium text-white transition-colors hover:bg-[#333]"
            tabIndex={0}
            aria-label="Save changes"
          >
            <Save className="h-[13px] w-[13px]" strokeWidth={2} />
            Save
          </button>
        )}
        {saved && !isDirty && (
          <div className="flex items-center gap-[6px] rounded-[8px] bg-green-50 px-[14px] py-[7px] text-[13px] font-medium text-green-700">
            <Check className="h-[13px] w-[13px]" strokeWidth={2} />
            Saved
          </div>
        )}
      </div>

      {/* Logo upload */}
      <div className="mb-[24px]">
        <h2 className="mb-[10px] text-[13px] font-semibold text-[#1a1a1a]">Logo</h2>
        <p className="mb-[10px] px-[4px] text-[12px] text-[#bbb]">
          Displayed in the sidebar and on invoices.
        </p>
        <div className="overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-[#fafafa] p-[16px]">
          <div className="flex items-center gap-[16px]">
            {local.logoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={local.logoUrl}
                  alt="Organisation logo"
                  className="h-[64px] w-[64px] rounded-[8px] border border-[#e5e5e5] object-contain bg-[#fafafa]"
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
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[8px] border border-dashed border-[#dcdcdc] bg-[#fafafa]">
                <ImageIcon className="h-[20px] w-[20px] text-[#ccc]" strokeWidth={1.5} />
              </div>
            )}
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-[6px] rounded-[6px] border border-[#dcdcdc] bg-white px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5] disabled:opacity-50"
                tabIndex={0}
              >
                <Upload className="h-[13px] w-[13px]" strokeWidth={1.75} />
                {isUploading ? "Uploading..." : local.logoUrl ? "Change logo" : "Upload logo"}
              </button>
              <p className="mt-[4px] text-[11px] text-[#bbb]">PNG, JPG, or SVG. Max 2 MB.</p>
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

      <div className="mb-[24px]">
        <h2 className="mb-[10px] text-[13px] font-semibold text-[#1a1a1a]">Organisation Details</h2>
        <div className="overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-[#fafafa]">
          <FieldRow
            label="Organisation"
            value={local.orgName}
            onChange={update("orgName")}
            icon={<Building2 className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="Your organisation name"
          />
          <FieldRow
            label="ABN"
            value={local.orgAbn}
            onChange={update("orgAbn")}
            icon={<Hash className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="XX XXX XXX XXX"
          />
          <FieldRow
            label="Phone"
            value={local.orgPhone}
            onChange={update("orgPhone")}
            icon={<Phone className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="(XX) XXXX XXXX"
          />
          <FieldRow
            label="Email"
            value={local.orgEmail}
            onChange={update("orgEmail")}
            icon={<Mail className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="admin@yourbusiness.com.au"
            type="email"
          />
          <FieldRow
            label="Address"
            value={local.orgAddress}
            onChange={update("orgAddress")}
            icon={<MapPin className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="123 Main St, Brisbane QLD 4000"
          />
          <div className="border-b-0">
            <FieldRow
              label="Reply-to Email"
              value={local.replyToEmail}
              onChange={update("replyToEmail")}
              icon={<Reply className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
              placeholder="Same as email if empty"
              type="email"
            />
          </div>
        </div>
        <p className="mt-[6px] px-[4px] text-[12px] text-[#bbb]">
          Replies to invoice emails will go to the reply-to address, or the organisation email if not set.
        </p>
      </div>

      <div className="mb-[24px]">
        <h2 className="mb-[10px] text-[13px] font-semibold text-[#1a1a1a]">Bank Details</h2>
        <p className="mb-[10px] px-[4px] text-[12px] text-[#bbb]">
          Included on invoices and invoice emails so plan managers can process payment.
        </p>
        <div className="overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-[#fafafa]">
          <FieldRow
            label="Bank"
            value={local.bankName}
            onChange={update("bankName")}
            icon={<Landmark className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="Commonwealth Bank"
          />
          <FieldRow
            label="Account Name"
            value={local.bankAccountName}
            onChange={update("bankAccountName")}
            icon={<FileText className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="Your Business Pty Ltd"
          />
          <FieldRow
            label="BSB"
            value={local.bankBsb}
            onChange={update("bankBsb")}
            icon={<Hash className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="XXX-XXX"
          />
          <FieldRow
            label="Account Number"
            value={local.bankAccountNumber}
            onChange={update("bankAccountNumber")}
            icon={<CreditCard className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />}
            placeholder="XXXX XXXX"
          />
        </div>
      </div>

      <div className="mb-[24px]">
        <h2 className="mb-[10px] text-[13px] font-semibold text-[#1a1a1a]">Email Footer</h2>
        <div className="overflow-hidden rounded-[10px] border border-[#e5e5e5] bg-[#fafafa]">
          <textarea
            value={local.emailFooter}
            onChange={(e) => setLocal((prev) => ({ ...prev, emailFooter: e.target.value }))}
            placeholder="Optional footer text added to all outgoing emails"
            rows={3}
            className="w-full resize-none bg-transparent px-[16px] py-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#ccc]"
          />
        </div>
      </div>
    </>
  )
}
