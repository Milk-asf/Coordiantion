import type { Metadata } from "next"
import { LegalShell, LegalSection } from "../_components/legal-shell"

export const metadata: Metadata = {
  title: "Privacy Policy — Coordination",
  description: "How Coordination collects, uses, stores, and protects your data.",
}

const supportEmail = "privacy@coordination.app"

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updatedAt={lastUpdated}>
      <p>
        Coordination (&quot;we&quot;, &quot;us&quot;) provides NDIS support coordination management software. This
        policy explains what personal information we collect, how we use and protect it, and the choices you have. We
        are committed to handling participant and organisation data securely and in line with the obligations of the
        platforms we connect to.
      </p>

      <LegalSection heading="Information we collect">
        <p>
          We collect information you provide directly — account details, workspace and team member information,
          participant profiles, NDIS plan and budget details, tasks, notes, documents, and invoicing data. We also
          collect limited technical data (such as log and device information) needed to operate and secure the service.
        </p>
      </LegalSection>

      <LegalSection heading="How we use information">
        <p>
          We use your information to provide and improve the service, manage workspaces and access, generate and send
          invoices, and meet legal and security obligations. We do not sell your personal information.
        </p>
      </LegalSection>

      <LegalSection heading="Third-party integrations">
        <p>
          When you connect a third-party service (for example, an accounting provider such as Xero), we access only the
          data needed to provide the connected feature, and only with your authorisation. Access and refresh tokens for
          connected services are encrypted at rest and are never exposed to your browser. You can disconnect an
          integration at any time, which revokes our stored access.
        </p>
      </LegalSection>

      <LegalSection heading="How we store and protect data">
        <p>
          Data is hosted on managed, single-tenant cloud infrastructure (Supabase and Vercel), not on shared hosting.
          All connections are encrypted in transit using TLS/SSL. Sensitive credentials, including third-party
          integration tokens, are encrypted at rest. Access to production data is restricted to authorised personnel
          under role-based controls, and database access is enforced with row-level security scoped to each workspace.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention">
        <p>
          We retain your information for as long as your account is active or as needed to provide the service and
          comply with legal obligations. You can request deletion of your workspace data by contacting us.
        </p>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You may request access to, correction of, or deletion of your personal information, subject to legal and
          contractual limits. To exercise these rights, contact us using the details below.
        </p>
      </LegalSection>

      <LegalSection heading="Security incidents">
        <p>
          We maintain an incident response process. In the event of a security breach affecting your data — or that of a
          connected provider — we will notify affected parties and the relevant providers without undue delay.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          Questions about this policy or your data can be sent to{" "}
          <a href={`mailto:${supportEmail}`} className="font-medium text-green-700 underline">
            {supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  )
}

const lastUpdated = "7 June 2026"
