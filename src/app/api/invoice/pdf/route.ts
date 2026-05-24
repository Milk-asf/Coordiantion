import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateInvoicePDF } from "@/lib/pdf/invoice-pdf"
import { generatePdfSchema } from "@/lib/validations"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import type { Invoice } from "@/lib/types"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rl = rateLimit(`generate-pdf:${user.id}`, { maxRequests: 20, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before generating another PDF." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    )
  }

  const raw = await request.json()
  const parsed = generatePdfSchema.safeParse(raw)

  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ")
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { invoice: invoiceData, orgSettings, ndisNumber, workspaceId } = parsed.data
  const invoice = invoiceData as unknown as Invoice

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .single()

  if (!membership) return NextResponse.json({ error: "Not a workspace member" }, { status: 403 })

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
