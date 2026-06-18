"use client"

import { useState } from "react"
import { SettingsGuard } from "@/components/settings-guard"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { BillablesTab } from "./_components/billables-tab"

type PriceBookTab = "billables" | "price-book-import" | "settings"

const TABS: { key: PriceBookTab; label: string }[] = [
  { key: "billables", label: "Billables" },
  { key: "price-book-import", label: "Price Book Import" },
  { key: "settings", label: "Settings" },
]

export default function NdisPriceBookSettingsPage() {
  const [activeTab, setActiveTab] = useState<PriceBookTab>("billables")

  return (
    <SettingsGuard requireAdmin>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-folk-text">NDIS Price Book & Types</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          NDIS price book references, imports, and provider identification for claiming & invoicing
        </p>
      </div>

      <div className="mb-[28px] flex h-[44px] items-center gap-[2px] border-b border-folk-border bg-folk-nav">
        {TABS.map((tab) => (
          <ProfileTabButton
            key={tab.key}
            isActive={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            label={tab.label}
          />
        ))}
      </div>

      {activeTab === "billables" && <BillablesTab />}

      {activeTab === "price-book-import" && (
        <div className="rounded-none border border-folk-border-subtle bg-folk-page px-[24px] py-[48px] text-center">
          <p className="text-[14px] font-medium text-folk-text">Price book import</p>
          <p className="mt-[6px] text-[13px] text-folk-secondary">
            Upload and import NDIS price book items here. This will be available in step 2.
          </p>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="rounded-none border border-folk-border-subtle bg-folk-page px-[24px] py-[48px] text-center">
          <p className="text-[14px] font-medium text-folk-text">Provider settings</p>
          <p className="mt-[6px] text-[13px] text-folk-secondary">
            Provider identification and claiming defaults will be configured here in a later step.
          </p>
        </div>
      )}
    </SettingsGuard>
  )
}
