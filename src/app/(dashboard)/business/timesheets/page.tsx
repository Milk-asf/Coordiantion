"use client"

import { Clock } from "lucide-react"
import { BusinessPlaceholderPage } from "@/components/business-placeholder-page"

export default function TimesheetsPage() {
  return (
    <BusinessPlaceholderPage
      icon={Clock}
      title="Timesheets"
      description="Review and approve timesheets. This section is coming soon."
    />
  )
}
