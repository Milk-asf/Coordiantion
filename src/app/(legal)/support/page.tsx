import type { Metadata } from "next"
import { LegalShell, LegalSection } from "../_components/legal-shell"

export const metadata: Metadata = {
  title: "Support — Coordination",
  description: "Get help with Coordination, report an issue, or contact our team.",
}

const supportEmail = "support@coordination.app"
const securityEmail = "security@coordination.app"

export default function SupportPage() {
  return (
    <LegalShell title="Support" updatedAt={lastUpdated}>
      <p>
        Need a hand? We&apos;re here to help you get the most out of Coordination. Reach out and we&apos;ll get back to
        you as soon as we can.
      </p>

      <LegalSection heading="Get in touch">
        <p>
          For general help, account questions, or feature requests, email{" "}
          <a href={`mailto:${supportEmail}`} className="font-medium text-green-700 underline">
            {supportEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="Report a security issue">
        <p>
          If you believe you&apos;ve found a security vulnerability or a potential data breach, please contact{" "}
          <a href={`mailto:${securityEmail}`} className="font-medium text-green-700 underline">
            {securityEmail}
          </a>{" "}
          right away. Please do not disclose the issue publicly until we&apos;ve had a chance to investigate and respond.
        </p>
      </LegalSection>

      <LegalSection heading="Privacy and data requests">
        <p>
          To request access to, correction of, or deletion of your data, see our{" "}
          <a href="/privacy" className="font-medium text-green-700 underline">
            Privacy Policy
          </a>{" "}
          for details on how to make a request.
        </p>
      </LegalSection>
    </LegalShell>
  )
}

const lastUpdated = "7 June 2026"
