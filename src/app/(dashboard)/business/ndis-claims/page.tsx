"use client"

import { FileCheck } from "lucide-react"
import { BusinessPlaceholderPage } from "@/components/business-placeholder-page"

export default function NdisClaimsPage() {
  return (
    <BusinessPlaceholderPage
      icon={FileCheck}
      title="NDIS claims"
      description="Submit and track NDIS claims from here. This section is coming soon."
    />
  )
}
