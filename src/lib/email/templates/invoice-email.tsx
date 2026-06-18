import {
  Html,
  Head,
  Body,
  Button,
  Container,
  Section,
  Text,
  Hr,
  Preview,
} from "@react-email/components"

interface InvoiceEmailProps {
  orgName: string
  recipientName: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  participantName: string
  ndisNumber: string
  total: string
  lineItemsSummary: string
  orgPhone?: string
  orgEmail?: string
  orgAddress?: string
  bankName?: string
  bankBsb?: string
  bankAccountNumber?: string
  bankAccountName?: string
  emailFooter?: string
  payNowUrl?: string
}

export function InvoiceEmail({
  orgName,
  recipientName,
  invoiceNumber,
  issueDate,
  dueDate,
  participantName,
  ndisNumber,
  total,
  lineItemsSummary,
  orgPhone,
  orgEmail,
  orgAddress,
  bankName,
  bankBsb,
  bankAccountNumber,
  bankAccountName,
  emailFooter,
  payNowUrl,
}: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} from {orgName} — {total}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={headerStyle}>
            <Text style={orgNameStyle}>{orgName}</Text>
          </Section>

          <Section style={contentStyle}>
            <Text style={greetingStyle}>
              Hi {recipientName},
            </Text>

            <Text style={paragraphStyle}>
              Please find attached invoice <strong>{invoiceNumber}</strong> for NDIS support services provided to <strong>{participantName}</strong>{ndisNumber ? ` (NDIS: ${ndisNumber})` : ""}.
            </Text>

            <Section style={invoiceBoxStyle}>
              <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                <tbody>
                  <tr>
                    <td style={labelCellStyle}>Invoice Number</td>
                    <td style={valueCellStyle}>{invoiceNumber}</td>
                  </tr>
                  <tr>
                    <td style={labelCellStyle}>Issue Date</td>
                    <td style={valueCellStyle}>{issueDate}</td>
                  </tr>
                  <tr>
                    <td style={labelCellStyle}>Due Date</td>
                    <td style={valueCellStyle}>{dueDate}</td>
                  </tr>
                  <tr>
                    <td style={labelCellStyle}>Participant</td>
                    <td style={valueCellStyle}>{participantName}</td>
                  </tr>
                  <tr>
                    <td style={{ ...labelCellStyle, borderBottom: "none" }}>Total</td>
                    <td style={{ ...valueCellStyle, borderBottom: "none", fontWeight: 600 }}>{total}</td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {payNowUrl && (
              <Section style={payNowSectionStyle}>
                <Button href={payNowUrl} style={payNowButtonStyle}>
                  Pay now
                </Button>
                <Text style={payNowHintStyle}>Secure online payment via Xero</Text>
              </Section>
            )}

            {lineItemsSummary && (
              <Text style={paragraphStyle}>
                <strong>Services:</strong> {lineItemsSummary}
              </Text>
            )}

            {(bankName || bankBsb || bankAccountNumber) && (
              <>
                <Hr style={hrStyle} />
                <Text style={subheadingStyle}>Payment Details</Text>
                <Section style={invoiceBoxStyle}>
                  <table style={tableStyle} cellPadding={0} cellSpacing={0}>
                    <tbody>
                      {bankName && (
                        <tr>
                          <td style={labelCellStyle}>Bank</td>
                          <td style={valueCellStyle}>{bankName}</td>
                        </tr>
                      )}
                      {bankAccountName && (
                        <tr>
                          <td style={labelCellStyle}>Account Name</td>
                          <td style={valueCellStyle}>{bankAccountName}</td>
                        </tr>
                      )}
                      {bankBsb && (
                        <tr>
                          <td style={labelCellStyle}>BSB</td>
                          <td style={valueCellStyle}>{bankBsb}</td>
                        </tr>
                      )}
                      {bankAccountNumber && (
                        <tr>
                          <td style={{ ...labelCellStyle, borderBottom: "none" }}>Account Number</td>
                          <td style={{ ...valueCellStyle, borderBottom: "none" }}>{bankAccountNumber}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </Section>
              </>
            )}

            <Text style={paragraphStyle}>
              Please process this invoice at your earliest convenience. If you have any questions, don&apos;t hesitate to reach out.
            </Text>

            <Text style={paragraphStyle}>
              Kind regards,<br />
              {orgName}
            </Text>
          </Section>

          <Hr style={hrStyle} />

          <Section style={footerStyle}>
            {orgAddress && <Text style={footerTextStyle}>{orgAddress}</Text>}
            {(orgPhone || orgEmail) && (
              <Text style={footerTextStyle}>
                {orgPhone}{orgPhone && orgEmail ? " · " : ""}{orgEmail}
              </Text>
            )}
            {emailFooter && <Text style={footerTextStyle}>{emailFooter}</Text>}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#f6f6f6",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
}

const containerStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  borderRadius: 8,
  margin: "40px auto",
  maxWidth: 560,
  overflow: "hidden",
  border: "1px solid var(--folk-border)",
}

const headerStyle: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  padding: "24px 32px",
}

const orgNameStyle: React.CSSProperties = {
  color: "#ffffff",
  fontSize: 18,
  fontWeight: 600,
  margin: 0,
}

const contentStyle: React.CSSProperties = {
  padding: "32px 32px 24px",
}

const greetingStyle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: 15,
  lineHeight: "24px",
  margin: "0 0 16px",
}

const paragraphStyle: React.CSSProperties = {
  color: "#4a4a4a",
  fontSize: 14,
  lineHeight: "22px",
  margin: "0 0 16px",
}

const subheadingStyle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: 14,
  fontWeight: 600,
  margin: "0 0 12px",
}

const payNowSectionStyle: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "4px 0 24px",
}

const payNowButtonStyle: React.CSSProperties = {
  backgroundColor: "#1a1a1a",
  borderRadius: 8,
  color: "#ffffff",
  display: "inline-block",
  fontSize: 14,
  fontWeight: 600,
  padding: "12px 28px",
  textDecoration: "none",
}

const payNowHintStyle: React.CSSProperties = {
  color: "#999",
  fontSize: 12,
  margin: "8px 0 0",
  textAlign: "center" as const,
}

const invoiceBoxStyle: React.CSSProperties = {
  backgroundColor: "#f7f7f7",
  borderRadius: 6,
  border: "1px solid #eee",
  marginBottom: 20,
  overflow: "hidden",
}

const tableStyle: React.CSSProperties = {
  width: "100%",
}

const labelCellStyle: React.CSSProperties = {
  color: "#888",
  fontSize: 13,
  padding: "10px 16px",
  borderBottom: "1px solid #eee",
  width: "40%",
}

const valueCellStyle: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: 13,
  padding: "10px 16px",
  borderBottom: "1px solid #eee",
  textAlign: "right" as const,
}

const hrStyle: React.CSSProperties = {
  borderTop: "1px solid #eee",
  margin: "8px 0",
}

const footerStyle: React.CSSProperties = {
  padding: "16px 32px 24px",
}

const footerTextStyle: React.CSSProperties = {
  color: "#999",
  fontSize: 12,
  lineHeight: "18px",
  margin: "0 0 4px",
  textAlign: "center" as const,
}
