"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Check, RefreshCw, AlertCircle, Plus } from "lucide-react"
import { useXero } from "@/lib/hooks/use-xero"
import { usePermissions } from "@/lib/hooks/use-permissions"

const taxTypeOptions = [
  { value: "EXEMPTOUTPUT", label: "GST Free Income (NDIS default)" },
  { value: "OUTPUT", label: "GST on Income" },
  { value: "NONE", label: "No GST" },
]

const errorMessages: Record<string, string> = {
  missing_workspace: "No workspace was selected.",
  not_configured: "Xero is not configured on the server. Add the XERO_* environment variables.",
  forbidden: "You don't have permission to connect Xero.",
  invalid_state: "The connection request expired or was invalid. Please try again.",
  connect_failed: "Connecting to Xero failed. Please try again.",
}

function IntegrationsContent() {
  const permissions = usePermissions()
  const { status, isLoading, error, connectUrl, saveSettings, disconnect } = useXero()
  const searchParams = useSearchParams()

  const [accountCode, setAccountCode] = useState("200")
  const [taxType, setTaxType] = useState("EXEMPTOUTPUT")
  const [autoPush, setAutoPush] = useState(false)
  const [includePayNow, setIncludePayNow] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [savedNote, setSavedNote] = useState(false)

  useEffect(() => {
    if (status?.connected) {
      setAccountCode(status.revenueAccountCode || "200")
      setTaxType(status.salesTaxType || "EXEMPTOUTPUT")
      setAutoPush(status.autoPush ?? false)
      setIncludePayNow(status.includePayNow ?? false)
    }
  }, [status])

  const connectedFlag = searchParams.get("connected")
  const errorFlag = searchParams.get("error")

  const handleSave = async () => {
    setIsSaving(true)
    setSavedNote(false)
    const ok = await saveSettings({
      revenueAccountCode: accountCode.trim(),
      salesTaxType: taxType,
      autoPush,
      includePayNow,
    })
    setIsSaving(false)
    if (ok) {
      setSavedNote(true)
      setTimeout(() => setSavedNote(false), 2500)
    }
  }

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    await disconnect()
    setIsDisconnecting(false)
  }

  if (!permissions.isLoading && !permissions.canManageWorkspaceSettings) {
    return (
      <>
        <Header />
        <p className="text-[14px] text-folk-secondary">You don&apos;t have permission to manage integrations.</p>
      </>
    )
  }

  return (
    <>
      <Header />

      {connectedFlag === "xero" && (
        <div className="mb-[20px] flex items-center gap-[8px] rounded-none border border-green-200 bg-green-50 px-[14px] py-[10px] text-[13px] text-green-700">
          <Check className="h-[15px] w-[15px]" strokeWidth={2} />
          Xero connected successfully.
        </div>
      )}
      {errorFlag && (
        <div className="mb-[20px] flex items-center gap-[8px] rounded-none border border-red-200 bg-red-50 px-[14px] py-[10px] text-[13px] text-red-700">
          <AlertCircle className="h-[15px] w-[15px]" strokeWidth={2} />
          {errorMessages[errorFlag] || "Something went wrong."}
        </div>
      )}

      <div className="rounded-[14px] border border-[#d9d9d9] bg-folk-surface p-[20px]">
        <div className="flex items-start justify-between gap-[16px]">
          <div className="flex items-start gap-[12px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/xero/xero-logo-square.png"
              alt="Xero"
              className="h-[40px] w-[40px] shrink-0 rounded-none"
            />
            <div>
              <h2 className="text-[15px] font-semibold text-folk-text">Xero</h2>
              <p className="mt-[2px] text-[13px] text-folk-secondary">
                Send invoices to Xero and keep their paid/sent status in sync.
              </p>
            </div>
          </div>

          {isLoading ? (
            <RefreshCw className="h-[16px] w-[16px] animate-spin text-folk-placeholder" />
          ) : status?.connected ? (
            <span className="inline-flex shrink-0 items-center gap-[5px] rounded-full bg-green-50 px-[10px] py-[4px] text-[12px] font-semibold text-green-700">
              <Check className="h-[12px] w-[12px]" strokeWidth={2.5} />
              Connected
            </span>
          ) : (
            <a
              href={connectUrl}
              className="outline-btn flex shrink-0 items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
              tabIndex={0}
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Connect to Xero</span>
            </a>
          )}
        </div>

        {error && !isLoading && (
          <p className="mt-[12px] text-[12px] text-red-600">{error}</p>
        )}

        {status?.connected && (
          <div className="mt-[20px] border-t border-folk-border-subtle pt-[20px]">
            <div className="grid gap-[16px] sm:grid-cols-2">
              <div>
                <label htmlFor="account-code" className="mb-[6px] block text-[13px] font-medium text-folk-text">
                  Revenue account code
                </label>
                <input
                  id="account-code"
                  type="text"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  className="w-full rounded-none border border-folk-border px-[12px] py-[8px] text-[13px] text-folk-text outline-none focus:border-[#1a1a1a]"
                  placeholder="200"
                />
                <p className="mt-[4px] text-[11px] text-[#aaa]">The Xero Chart of Accounts code applied to invoice lines.</p>
              </div>
              <div>
                <label htmlFor="tax-type" className="mb-[6px] block text-[13px] font-medium text-folk-text">
                  Tax type
                </label>
                <select
                  id="tax-type"
                  value={taxType}
                  onChange={(e) => setTaxType(e.target.value)}
                  className="w-full rounded-none border border-folk-border px-[12px] py-[8px] text-[13px] text-folk-text outline-none focus:border-[#1a1a1a]"
                >
                  {taxTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-[20px] flex flex-col gap-[16px] border-t border-folk-border-subtle pt-[20px]">
              <Toggle
                id="auto-push"
                label="Automatically send invoices to Xero"
                description="When you send an invoice, also create it in Xero automatically."
                checked={autoPush}
                onToggle={() => setAutoPush((prev) => !prev)}
              />
              <Toggle
                id="pay-now"
                label="Include a Pay now button on invoices"
                description="Adds a Pay now button (your Xero hosted invoice link) to the invoice email and PDF. Sending pushes the invoice to Xero to generate the link, and requires online payments to be enabled in your Xero account."
                checked={includePayNow}
                onToggle={() => setIncludePayNow((prev) => !prev)}
              />
            </div>

            <div className="mt-[20px] flex items-center justify-between">
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="outline-btn px-[14px] py-[8px] text-[13px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                tabIndex={0}
              >
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>

              <div className="flex items-center gap-[10px]">
                {savedNote && <span className="text-[12px] text-green-600">Saved</span>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="primary-btn disabled:opacity-50"
                  tabIndex={0}
                >
                  {isSaving ? "Saving…" : "Save settings"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

interface ToggleProps {
  id: string
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}

function Toggle({ id, label, description, checked, onToggle }: ToggleProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div className="flex items-start justify-between gap-[16px]">
      <div className="max-w-[440px]">
        <label htmlFor={id} className="block text-[13px] font-medium text-folk-text">{label}</label>
        <p className="mt-[2px] text-[11px] leading-[16px] text-[#aaa]">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className={`relative mt-[2px] inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors ${checked ? "bg-[#1a1a1a]" : "bg-[var(--folk-border)]"}`}
      >
        <span className={`inline-block h-[16px] w-[16px] transform rounded-full bg-folk-surface transition-transform ${checked ? "translate-x-[19px]" : "translate-x-[3px]"}`} />
      </button>
    </div>
  )
}

function Header() {
  return (
    <div className="mb-[32px]">
      <h1 className="text-[20px] font-bold text-folk-text">Integrations</h1>
      <p className="mt-[4px] text-[14px] text-folk-secondary">Connect Coordination to your other tools.</p>
    </div>
  )
}

export default function IntegrationsSettingsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsContent />
    </Suspense>
  )
}
