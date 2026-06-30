import { redirect } from "next/navigation"

// Timesheet billing is now folded into Create invoices: approved timesheets
// flow in automatically as billable entries.
export default function TimesheetBillingRedirectPage() {
  redirect("/business/invoices")
}
