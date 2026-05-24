"use client"

import { SettingsGuard } from "@/components/settings-guard"

export default function BillingSettingsPage() {
  return (
    <SettingsGuard requireSuperAdmin>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-[#262626]">Billing</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Manage your subscription and billing details.
        </p>
      </div>
      <div className="flex items-center justify-center py-[48px]">
        <p className="text-[13px] text-[#bbb]">Coming soon</p>
      </div>
    </SettingsGuard>
  )
}
