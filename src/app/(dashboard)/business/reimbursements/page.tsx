"use client"

import { Wallet } from "lucide-react"
import { BusinessPlaceholderPage } from "@/components/business-placeholder-page"

export default function ReimbursementsPage() {
  return (
    <BusinessPlaceholderPage
      icon={Wallet}
      title="Reimbursements"
      description="Track staff and participant reimbursements. This section is coming soon."
    />
  )
}
