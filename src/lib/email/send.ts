import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

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

  const payload: Parameters<typeof resend.emails.send>[0] = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || "",
  }
  if (react) payload.react = react
  if (replyTo) payload.replyTo = replyTo
  if (attachments) payload.attachments = attachments

  const { data, error } = await resend.emails.send(payload)

  if (error) throw new Error(error.message)
  return data
}
