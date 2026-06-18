"use client"

import { FileSpreadsheet } from "lucide-react"
import { BusinessPlaceholderPage } from "@/components/business-placeholder-page"

export default function StatementsPage() {
  return (
    <BusinessPlaceholderPage
      icon={FileSpreadsheet}
      title="Statements"
      description="Generate and review participant statements. This section is coming soon."
    />
  )
}
