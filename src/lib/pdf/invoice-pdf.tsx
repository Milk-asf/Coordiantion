import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  Image,
  Link,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer"
import type { Invoice, WorkspaceEmailSettings } from "@/lib/types"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  logo: {
    width: 48,
    height: 48,
    objectFit: "contain" as const,
    marginBottom: 8,
  },
  orgName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  orgDetail: {
    fontSize: 9,
    color: "#666",
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    textAlign: "right" as const,
  },
  invoiceNumber: {
    fontSize: 11,
    color: "#666",
    textAlign: "right" as const,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  metaBlock: {
    width: "48%",
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#999",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  table: {
    marginTop: 8,
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 6,
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 8,
  },
  colDescription: {
    width: "30%",
    paddingRight: 8,
  },
  colServiceDate: {
    width: "14%",
    paddingRight: 8,
  },
  colChargeNo: {
    width: "16%",
    paddingRight: 8,
  },
  colQty: {
    width: "12%",
    textAlign: "right" as const,
    paddingRight: 8,
  },
  colRate: {
    width: "14%",
    textAlign: "right" as const,
    paddingRight: 8,
  },
  colAmount: {
    width: "14%",
    textAlign: "right" as const,
  },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#999",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  totalsSection: {
    alignItems: "flex-end",
    marginBottom: 32,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: "#666",
    width: 100,
  },
  totalValue: {
    fontSize: 10,
    color: "#1a1a1a",
    width: 100,
    textAlign: "right" as const,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: 200,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    marginTop: 4,
  },
  totalLabelFinal: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    width: 100,
  },
  totalValueFinal: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    width: 100,
    textAlign: "right" as const,
  },
  gstFreeNote: {
    fontSize: 8,
    color: "#999",
    marginTop: 6,
    textAlign: "right" as const,
  },
  payNowSection: {
    alignItems: "center" as const,
    marginBottom: 24,
  },
  payNowButton: {
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    paddingVertical: 10,
    paddingHorizontal: 28,
    textDecoration: "none",
  },
  payNowHint: {
    color: "#999",
    fontSize: 8,
    marginTop: 6,
  },
  paymentSection: {
    backgroundColor: "#f7f7f7",
    borderRadius: 4,
    padding: 16,
    marginBottom: 24,
  },
  paymentTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  paymentLabel: {
    fontSize: 9,
    color: "#666",
    width: 110,
  },
  paymentValue: {
    fontSize: 9,
    color: "#1a1a1a",
  },
  notesSection: {
    marginBottom: 24,
  },
  notesTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#999",
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 10,
    color: "#4a4a4a",
    lineHeight: 1.5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  footerText: {
    fontSize: 8,
    color: "#999",
    textAlign: "center" as const,
  },
})

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function unitAbbrev(unit: string | undefined): string {
  if (unit === "hour") return "hr"
  if (unit === "each") return "ea"
  if (unit === "km") return "km"
  return unit || ""
}

function formatServiceDate(dateStr: string | undefined): string {
  if (!dateStr) return "—"
  const parsed = new Date(dateStr + "T00:00:00")
  if (isNaN(parsed.getTime())) return "—"
  return parsed.toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })
}

interface InvoicePDFProps {
  invoice: Invoice
  participantNdisNumber?: string
  orgSettings: Partial<WorkspaceEmailSettings>
  payNowUrl?: string
}

function InvoicePDFDocument({ invoice, participantNdisNumber, orgSettings, payNowUrl }: InvoicePDFProps) {
  const issueDate = invoice.issueDate
    ? new Date(invoice.issueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : ""
  const dueDate = invoice.dueDate
    ? new Date(invoice.dueDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })
    : ""

  const documentTitle = invoice.kind === "credit-note"
    ? "CREDIT NOTE"
    : invoice.gst > 0
    ? "TAX INVOICE"
    : "INVOICE"
  const isGstFree = invoice.gst <= 0

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            {orgSettings.logoUrl && <Image src={orgSettings.logoUrl} style={styles.logo} />}
            <Text style={styles.orgName}>{orgSettings.orgName || "Organisation"}</Text>
            {orgSettings.orgAbn && <Text style={styles.orgDetail}>ABN: {orgSettings.orgAbn}</Text>}
            {orgSettings.orgAddress && <Text style={styles.orgDetail}>{orgSettings.orgAddress}</Text>}
            {orgSettings.orgPhone && <Text style={styles.orgDetail}>{orgSettings.orgPhone}</Text>}
            {orgSettings.orgEmail && <Text style={styles.orgDetail}>{orgSettings.orgEmail}</Text>}
          </View>
          <View>
            <Text style={styles.invoiceTitle}>{documentTitle}</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Bill To</Text>
            <Text style={styles.metaValue}>{invoice.clientName}</Text>
            {participantNdisNumber && <Text style={styles.metaValue}>NDIS: {participantNdisNumber}</Text>}
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaLabel}>Invoice Date</Text>
            <Text style={styles.metaValue}>{issueDate}</Text>
            <Text style={{ ...styles.metaLabel, marginTop: 8 }}>Due Date</Text>
            <Text style={styles.metaValue}>{dueDate}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.colDescription}><Text style={styles.headerText}>Description</Text></View>
            <View style={styles.colServiceDate}><Text style={styles.headerText}>Service Date</Text></View>
            <View style={styles.colChargeNo}><Text style={styles.headerText}>Item No.</Text></View>
            <View style={styles.colQty}><Text style={styles.headerText}>Qty</Text></View>
            <View style={styles.colRate}><Text style={styles.headerText}>Rate</Text></View>
            <View style={styles.colAmount}><Text style={styles.headerText}>Amount</Text></View>
          </View>

          {invoice.lineItems.map((item) => (
            <View key={item.id} style={styles.tableRow}>
              <View style={styles.colDescription}>
                <Text style={styles.cellText}>{item.description || item.chargeName}</Text>
              </View>
              <View style={styles.colServiceDate}>
                <Text style={styles.cellText}>{formatServiceDate(item.serviceDate)}</Text>
              </View>
              <View style={styles.colChargeNo}>
                <Text style={styles.cellText}>{item.chargeItemNumber}</Text>
              </View>
              <View style={styles.colQty}>
                <Text style={styles.cellText}>{item.quantity.toFixed(2)} {unitAbbrev(item.unit)}</Text>
              </View>
              <View style={styles.colRate}>
                <Text style={styles.cellText}>{formatCurrency(item.rate)}</Text>
              </View>
              <View style={styles.colAmount}>
                <Text style={styles.cellText}>{formatCurrency(item.amount)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.gst)}</Text>
          </View>
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Total</Text>
            <Text style={styles.totalValueFinal}>{formatCurrency(invoice.total)}</Text>
          </View>
          {isGstFree && (
            <Text style={styles.gstFreeNote}>All supports are GST-free (NDIS)</Text>
          )}
        </View>

        {payNowUrl && (
          <View style={styles.payNowSection}>
            <Link src={payNowUrl} style={styles.payNowButton}>Pay now</Link>
            <Text style={styles.payNowHint}>Secure online payment via Xero</Text>
          </View>
        )}

        {(orgSettings.bankName || orgSettings.bankBsb || orgSettings.bankAccountNumber) && (
          <View style={styles.paymentSection}>
            <Text style={styles.paymentTitle}>Payment Details</Text>
            {orgSettings.bankName && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Bank</Text>
                <Text style={styles.paymentValue}>{orgSettings.bankName}</Text>
              </View>
            )}
            {orgSettings.bankAccountName && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Account Name</Text>
                <Text style={styles.paymentValue}>{orgSettings.bankAccountName}</Text>
              </View>
            )}
            {orgSettings.bankBsb && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>BSB</Text>
                <Text style={styles.paymentValue}>{orgSettings.bankBsb}</Text>
              </View>
            )}
            {orgSettings.bankAccountNumber && (
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Account Number</Text>
                <Text style={styles.paymentValue}>{orgSettings.bankAccountNumber}</Text>
              </View>
            )}
          </View>
        )}

        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {orgSettings.orgName || "Organisation"}{orgSettings.orgAbn ? ` · ABN ${orgSettings.orgAbn}` : ""}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

export async function generateInvoicePDF(
  invoice: Invoice,
  orgSettings: Partial<WorkspaceEmailSettings>,
  participantNdisNumber?: string,
  payNowUrl?: string,
): Promise<Buffer> {
  const buffer = await renderToBuffer(
    <InvoicePDFDocument
      invoice={invoice}
      orgSettings={orgSettings}
      participantNdisNumber={participantNdisNumber}
      payNowUrl={payNowUrl}
    />
  )
  return Buffer.from(buffer)
}
