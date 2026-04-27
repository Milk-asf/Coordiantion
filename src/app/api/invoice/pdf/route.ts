import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateInvoicePDF } from "@/lib/pdf/invoice-pdf"
import type { Invoice, WorkspaceEmailSettings } from "@/lib/types"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { invoice, orgSettings, ndisNumber, workspaceId } = await request.json() as {
    invoice: Invoice
    orgSettings: Partial<WorkspaceEmailSettings>
    ndisNumber?: string
    workspaceId?: string
  }

  if (!workspaceId)
    return NextResponse.json({ error: "Missing workspace ID" }, { status: 400 })

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .single()

  if (!membership) return NextResponse.json({ error: "Not a workspace member" }, { status: 403 })

  const invoiceWsId = (invoice as unknown as Record<string, unknown>)?.workspace_id as string | undefined
  if (invoiceWsId && invoiceWsId !== workspaceId)
    return NextResponse.json({ error: "Invoice does not belong to this workspace" }, { status: 403 })

  if (!invoice?.invoiceNumber)
    return NextResponse.json({ error: "Invalid invoice data" }, { status: 400 })

  try {
    const pdfBuffer = await generateInvoicePDF(invoice, orgSettings, ndisNumber)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}_${invoice.clientName.replace(/\s+/g, "_")}.pdf"`,
      },
    })
  } catch (err: unknown) {
    console.error("Failed to generate PDF:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate PDF" },
      { status: 500 },
    )
  }
}
