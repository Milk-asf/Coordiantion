"use client"

import { useState, useEffect, useRef } from "react"
import { Save, Upload, X, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { useWorkspaceSettings } from "@/lib/hooks/use-workspace-settings"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import { SettingsGuard } from "@/components/settings-guard"
import { useToast } from "@/components/toast"
import {
  SETTINGS_INPUT_CLASS,
  SETTINGS_LABEL_CLASS,
  SETTINGS_OUTLINE_BTN_CLASS,
  SETTINGS_PRIMARY_BTN_CLASS,
  SETTINGS_TEXTAREA_CLASS,
  SettingsSection,
  SettingsSearchSelect,
} from "@/components/settings-ui"

const australianBanks = [
  "Commonwealth Bank",
  "Westpac",
  "ANZ",
  "National Australia Bank (NAB)",
  "Macquarie Bank",
  "Bendigo Bank",
  "Bank of Queensland",
  "Suncorp Bank",
  "ING",
  "St.George Bank",
  "Bankwest",
  "ME Bank",
  "AMP Bank",
  "HSBC Australia",
  "Citibank Australia",
  "Bank of Melbourne",
  "BankSA",
  "Heritage Bank",
  "Greater Bank",
  "Newcastle Permanent",
  "Beyond Bank",
  "P&N Bank",
  "IMB Bank",
  "Teachers Mutual Bank",
  "UBank",
  "Up",
  "Judo Bank",
  "Tyro",
  "Rabobank Australia",
]

export default function GeneralSettingsPage() {
  const { settings, updateSettings } = useWorkspaceSettings()
  const { activeWorkspace, renameWorkspace } = useWorkspace()
  const { toast } = useToast()
  const [local, setLocal] = useState(settings)
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
    toast("Settings saved", "success")
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

      if (error) {
        toast(`Logo upload failed: ${error.message}`, "error")
        return
      }

      const { data: urlData } = supabase.storage.from("logos").getPublicUrl(path)
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`

      setLocal((prev) => ({ ...prev, logoUrl }))
      updateSettings({ ...local, logoUrl })
      toast("Logo updated", "success")
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setLocal((prev) => ({ ...prev, logoUrl: "" }))
    updateSettings({ ...local, logoUrl: "" })
    toast("Logo removed", "success")
  }

  return (
    <SettingsGuard requireAdmin>
      <div className="mb-[32px] flex items-start justify-between gap-[12px]">
        <div>
          <h1 className="text-[20px] font-bold text-folk-text">General</h1>
          <p className="mt-[4px] text-[14px] text-folk-secondary">
            Organisation details used in invoices and emails.
          </p>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            className={cn(SETTINGS_PRIMARY_BTN_CLASS, "shrink-0")}
            tabIndex={0}
            aria-label="Save changes"
          >
            <Save className="h-[13px] w-[13px]" strokeWidth={1.75} />
            Save
          </button>
        )}
      </div>

      <div className="space-y-[20px]">
        <SettingsSection title="Logo" description="Displayed in the sidebar and on invoices.">
          <div className="flex items-center gap-[16px]">
            {local.logoUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={local.logoUrl}
                  alt="Organisation logo"
                  className="h-[64px] w-[64px] rounded-[6px] border border-folk-border-subtle bg-folk-page object-contain"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -right-[6px] -top-[6px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1a1a1a] text-white transition-colors hover:bg-red-500"
                  aria-label="Remove logo"
                  tabIndex={0}
                >
                  <X className="h-[10px] w-[10px]" strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[6px] border border-dashed border-folk-border bg-folk-page">
                <ImageIcon className="h-[20px] w-[20px] text-[#ccc]" strokeWidth={1.5} />
              </div>
            )}
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={SETTINGS_OUTLINE_BTN_CLASS}
                tabIndex={0}
              >
                <Upload className="h-[13px] w-[13px]" strokeWidth={1.75} />
                {isUploading ? "Uploading…" : local.logoUrl ? "Change logo" : "Upload logo"}
              </button>
              <p className="mt-[6px] text-[12px] text-folk-placeholder">PNG, JPG, or SVG. Max 2 MB.</p>
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
              if (file.size > 2 * 1024 * 1024) {
                toast("File must be under 2 MB", "error")
                return
              }
              handleLogoUpload(file)
              e.target.value = ""
            }}
          />
        </SettingsSection>

        <SettingsSection
          title="Organisation details"
          description="This information appears on your invoices and emails."
        >
          <div className="space-y-[16px]">
            <div>
              <label className={SETTINGS_LABEL_CLASS}>Organisation name</label>
              <input type="text" value={local.orgName} onChange={(e) => update("orgName")(e.target.value)} placeholder="Your organisation name" className={SETTINGS_INPUT_CLASS} />
            </div>
            <div className="grid gap-[16px] sm:grid-cols-2">
              <div>
                <label className={SETTINGS_LABEL_CLASS}>ABN</label>
                <input type="text" value={local.orgAbn} onChange={(e) => update("orgAbn")(e.target.value)} placeholder="XX XXX XXX XXX" className={SETTINGS_INPUT_CLASS} />
              </div>
              <div>
                <label className={SETTINGS_LABEL_CLASS}>NDIS registration number</label>
                <input type="text" value={local.ndisNumber} onChange={(e) => update("ndisNumber")(e.target.value)} placeholder="4-XXXXXXXXX" className={SETTINGS_INPUT_CLASS} />
              </div>
            </div>
            <div>
              <label className={SETTINGS_LABEL_CLASS}>Phone</label>
              <input type="text" value={local.orgPhone} onChange={(e) => update("orgPhone")(e.target.value)} placeholder="(XX) XXXX XXXX" className={SETTINGS_INPUT_CLASS} />
            </div>
            <div>
              <label className={SETTINGS_LABEL_CLASS}>Email</label>
              <input type="email" value={local.orgEmail} onChange={(e) => update("orgEmail")(e.target.value)} placeholder="admin@yourbusiness.com.au" className={SETTINGS_INPUT_CLASS} />
            </div>
            <div>
              <label className={SETTINGS_LABEL_CLASS}>Address</label>
              <input type="text" value={local.orgAddress} onChange={(e) => update("orgAddress")(e.target.value)} placeholder="123 Main St, Brisbane QLD 4000" className={SETTINGS_INPUT_CLASS} />
            </div>
            <div>
              <label className={SETTINGS_LABEL_CLASS}>Reply-to email</label>
              <input type="email" value={local.replyToEmail} onChange={(e) => update("replyToEmail")(e.target.value)} placeholder="Same as email if empty" className={SETTINGS_INPUT_CLASS} />
              <p className="mt-[6px] text-[12px] text-folk-placeholder">Replies to invoice emails will go to this address, or the organisation email if not set.</p>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Bank details"
          description="Included on invoices so plan managers can process payment."
        >
          <div className="space-y-[16px]">
            <div>
              <label className={SETTINGS_LABEL_CLASS}>Bank</label>
              <SettingsSearchSelect
                value={local.bankName}
                onChange={update("bankName")}
                options={australianBanks}
                placeholder="Commonwealth Bank"
                ariaLabel="Bank"
              />
            </div>
            <div>
              <label className={SETTINGS_LABEL_CLASS}>Account name</label>
              <input type="text" value={local.bankAccountName} onChange={(e) => update("bankAccountName")(e.target.value)} placeholder="Your Business Pty Ltd" className={SETTINGS_INPUT_CLASS} />
            </div>
            <div className="grid gap-[16px] sm:grid-cols-2">
              <div>
                <label className={SETTINGS_LABEL_CLASS}>BSB</label>
                <input type="text" value={local.bankBsb} onChange={(e) => update("bankBsb")(e.target.value)} placeholder="XXX-XXX" className={SETTINGS_INPUT_CLASS} />
              </div>
              <div>
                <label className={SETTINGS_LABEL_CLASS}>Account number</label>
                <input type="text" value={local.bankAccountNumber} onChange={(e) => update("bankAccountNumber")(e.target.value)} placeholder="XXXX XXXX" className={SETTINGS_INPUT_CLASS} />
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Email footer"
          description="Optional footer text added to all outgoing emails."
        >
          <textarea
            value={local.emailFooter}
            onChange={(e) => setLocal((prev) => ({ ...prev, emailFooter: e.target.value }))}
            placeholder="Enter footer text…"
            rows={4}
            className={cn(SETTINGS_TEXTAREA_CLASS, "min-h-[100px]")}
          />
        </SettingsSection>

        <SettingsSection
          title="Data export"
          description="Download all of this workspace's data as a single JSON file. Limited to a few exports per hour."
        >
          <a
            href={activeWorkspace ? `/api/export?workspaceId=${activeWorkspace.id}` : "#"}
            download
            className={cn(SETTINGS_OUTLINE_BTN_CLASS, "inline-flex w-fit")}
          >
            Export workspace data
          </a>
        </SettingsSection>
      </div>
    </SettingsGuard>
  )
}
