import { Resend } from "resend"

let resend: Resend | null = null

function getResend() {
  if (!resend) {
    const key = process.env.RESEND_API_KEY
    if (!key) throw new Error("RESEND_API_KEY is not set")
    resend = new Resend(key)
  }
  return resend
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"

interface SendEmailOptions {
  to: string | string[]
  subject: string
  react?: React.ReactElement
  html?: string
  replyTo?: string
  fromName?: string
  attachments?: {
    filename: string
    content: Buffer
    contentType?: string
  }[]
}

export async function sendEmail({
  to,
  subject,
  react,
  html,
  replyTo,
  fromName,
  attachments,
}: SendEmailOptions) {
  const from = fromName ? `"${fromName}" <${DEFAULT_FROM}>` : DEFAULT_FROM

  const client = getResend()

  const payload: Parameters<typeof client.emails.send>[0] = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || "",
  }
  if (react) payload.react = react
  if (replyTo) payload.replyTo = replyTo
  if (attachments) payload.attachments = attachments

  const { data, error } = await client.emails.send(payload)

  if (error) throw new Error(error.message)
  return data
}
