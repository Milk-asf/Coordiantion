import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function codeEmailHtml(code: string): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px;color:#262626;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:#16a34a;color:#fff;font-weight:600;font-size:16px;">C</div>
    </div>
    <h1 style="font-size:18px;font-weight:600;text-align:center;margin:0 0 8px;">Your verification code</h1>
    <p style="font-size:14px;color:#666;text-align:center;line-height:1.5;margin:0 0 24px;">
      Enter this code to verify your account and continue setting up Coordination.
    </p>
    <div style="text-align:center;margin:0 0 24px;">
      <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;background:#f5f5f5;border-radius:10px;padding:16px 24px;color:#111;">${code}</span>
    </div>
    <p style="font-size:12px;color:#aaa;text-align:center;margin:0;">
      This code expires in 1 hour. If you didn't request it, you can ignore this email.
    </p>
  </div>`
}

export async function POST(request: Request) {
  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const email = (body.email || "").trim().toLowerCase()
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  }

  const rl = rateLimit(`send-code:${email}`, { maxRequests: 5, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before trying again." },
      { status: 429, headers: getRateLimitHeaders(rl) }
    )
  }

  const admin = createAdminClient()
  if (!admin) {
    return NextResponse.json(
      { error: "Server not configured for email sign-in. Add SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    )
  }

  // generateLink creates the user if they don't exist and returns the OTP
  // without sending Supabase's own email, so we control the email content.
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  })

  if (error || !data.properties?.email_otp) {
    return NextResponse.json(
      { error: error?.message || "Could not generate a sign-in code." },
      { status: 400 }
    )
  }

  try {
    const { sendEmail } = await import("@/lib/email/send")
    await sendEmail({
      to: email,
      subject: "Your Coordination verification code",
      fromName: "Coordination",
      html: codeEmailHtml(data.properties.email_otp),
    })
  } catch (err: unknown) {
    console.error("Failed to send verification code:", err)
    return NextResponse.json(
      { error: "Could not send the code. Please try again." },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
