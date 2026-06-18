"use client"

import { AlignLeft } from "lucide-react"
import { BusinessPlaceholderPage } from "@/components/business-placeholder-page"
import { InvoicingNav } from "@/app/(dashboard)/invoicing/_components/invoicing-nav"

export default function BulkCreatedInvoicesPage() {
  return (
    <div className="flex h-full flex-col">
      <InvoicingNav />
      <BusinessPlaceholderPage
        icon={AlignLeft}
        title="Bulk Created"
        description="View invoices created in bulk. This section is coming soon."
      />
    </div>
  )
}
