import { XeroClient, type TokenSet, Invoice, LineItem, LineAmountTypes } from "xero-node"
import { createAdminClient } from "@/lib/supabase/admin"
import { encryptSecret, decryptSecret } from "@/lib/crypto/secure-store"
import type { Invoice as AppInvoice } from "@/lib/types"

// Scopes: identity + offline access (for refresh tokens) + accounting invoices/contacts.
export const XERO_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "accounting.invoices",
  "accounting.contacts",
]

export interface IntegrationConnection {
  id: string
  workspace_id: string
  provider: string
  access_token_encrypted: string
  refresh_token_encrypted: string
  tenant_id: string | null
  scopes: string | null
  expires_at: string
  revenue_account_code: string
  sales_tax_type: string
  connected_by: string | null
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set`)
  return value
}

/** Builds a fresh, unauthenticated Xero client. Pass `state` for the consent flow. */
export function newXeroClient(state?: string): XeroClient {
  return new XeroClient({
    clientId: requireEnv("XERO_CLIENT_ID"),
    clientSecret: requireEnv("XERO_CLIENT_SECRET"),
    redirectUris: [requireEnv("XERO_REDIRECT_URI")],
    scopes: XERO_SCOPES,
    ...(state ? { state } : {}),
  })
}

function expiryIso(tokenSet: TokenSet): string {
  const seconds = tokenSet.expires_at ?? Math.floor(Date.now() / 1000) + (tokenSet.expires_in ?? 1800)
  return new Date(seconds * 1000).toISOString()
}

/** Loads the stored Xero connection for a workspace, or null if not connected. */
export async function loadConnection(workspaceId: string): Promise<IntegrationConnection | null> {
  const db = createAdminClient()
  if (!db) throw new Error("Server is not configured for integrations")

  const { data } = await db
    .from("integration_connections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "xero")
    .maybeSingle()

  return (data as IntegrationConnection | null) ?? null
}

/** Persists a token set (encrypted) for a workspace's Xero connection. */
async function persistTokenSet(workspaceId: string, tokenSet: TokenSet): Promise<void> {
  const db = createAdminClient()
  if (!db) throw new Error("Server is not configured for integrations")

  await db
    .from("integration_connections")
    .update({
      access_token_encrypted: encryptSecret(tokenSet.access_token!),
      refresh_token_encrypted: encryptSecret(tokenSet.refresh_token!),
      expires_at: expiryIso(tokenSet),
      ...(tokenSet.scope ? { scopes: tokenSet.scope } : {}),
    })
    .eq("workspace_id", workspaceId)
    .eq("provider", "xero")
}

const REFRESH_THRESHOLD_MS = 120_000

/**
 * Returns an authenticated Xero client + tenant id for a workspace, refreshing
 * the access token when it is close to expiry. Throws a user-friendly error if
 * the workspace has not connected Xero.
 */
export async function getXeroForWorkspace(workspaceId: string): Promise<{
  xero: XeroClient
  tenantId: string
  connection: IntegrationConnection
}> {
  const connection = await loadConnection(workspaceId)
  if (!connection) throw new Error("Xero is not connected for this workspace")
  if (!connection.tenant_id) throw new Error("Xero connection is missing a tenant")

  const xero = newXeroClient()
  await xero.initialize()
  xero.setTokenSet({
    access_token: decryptSecret(connection.access_token_encrypted),
    refresh_token: decryptSecret(connection.refresh_token_encrypted),
    expires_at: Math.floor(new Date(connection.expires_at).getTime() / 1000),
    token_type: "Bearer",
  })

  const isExpiringSoon = new Date(connection.expires_at).getTime() - Date.now() < REFRESH_THRESHOLD_MS
  if (isExpiringSoon) {
    const refreshed = await xero.refreshToken()
    await persistTokenSet(workspaceId, refreshed)
  }

  return { xero, tenantId: connection.tenant_id, connection }
}

/** Stores tokens for a freshly authorised connection (called from the OAuth callback). */
export async function upsertConnection(params: {
  workspaceId: string
  tokenSet: TokenSet
  tenantId: string
  connectedBy: string | null
}): Promise<void> {
  const db = createAdminClient()
  if (!db) throw new Error("Server is not configured for integrations")

  const { error } = await db.from("integration_connections").upsert(
    {
      workspace_id: params.workspaceId,
      provider: "xero",
      access_token_encrypted: encryptSecret(params.tokenSet.access_token!),
      refresh_token_encrypted: encryptSecret(params.tokenSet.refresh_token!),
      tenant_id: params.tenantId,
      scopes: params.tokenSet.scope ?? XERO_SCOPES.join(" "),
      expires_at: expiryIso(params.tokenSet),
      connected_by: params.connectedBy,
    },
    { onConflict: "workspace_id,provider" },
  )

  if (error) throw new Error(`Failed to save Xero connection: ${error.message}`)
}

/** Maps an app invoice's line items to Xero line items using the connection's mapping settings. */
export function toXeroLineItems(invoice: AppInvoice, connection: IntegrationConnection): LineItem[] {
  return invoice.lineItems.map((li) => ({
    description: li.chargeName ? `${li.chargeName} (${li.chargeItemNumber})` : li.description || "Service",
    quantity: li.quantity,
    unitAmount: li.rate,
    accountCode: connection.revenue_account_code,
    taxType: connection.sales_tax_type,
  }))
}

/** Builds the Xero ACCREC invoice payload for an app invoice + Xero contact id. */
export function toXeroInvoice(invoice: AppInvoice, contactID: string, connection: IntegrationConnection): Invoice {
  return {
    type: Invoice.TypeEnum.ACCREC,
    contact: { contactID },
    date: invoice.issueDate || undefined,
    dueDate: invoice.dueDate || undefined,
    lineAmountTypes: LineAmountTypes.Exclusive,
    lineItems: toXeroLineItems(invoice, connection),
    reference: invoice.invoiceNumber,
    status: Invoice.StatusEnum.AUTHORISED,
  }
}

/** App invoice status derived from a Xero invoice status. */
export function xeroStatusToAppStatus(xeroStatus: string): "sent" | "paid" | "void" | null {
  switch (xeroStatus) {
    case "PAID":
      return "paid"
    case "AUTHORISED":
    case "SUBMITTED":
      return "sent"
    case "VOIDED":
    case "DELETED":
      return "void"
    default:
      return null
  }
}
