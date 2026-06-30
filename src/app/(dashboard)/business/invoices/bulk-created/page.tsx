import { redirect } from "next/navigation"

// Batches are now a view toggle on the Invoices ledger.
export default function BulkCreatedRedirectPage() {
  redirect("/invoices")
}
