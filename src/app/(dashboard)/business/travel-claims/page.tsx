"use client"

import { MapPin } from "lucide-react"
import { BusinessPlaceholderPage } from "@/components/business-placeholder-page"

export default function TravelClaimsPage() {
  return (
    <BusinessPlaceholderPage
      icon={MapPin}
      title="Travel claims"
      description="Manage travel and transport claims. This section is coming soon."
    />
  )
}
