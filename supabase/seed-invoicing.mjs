#!/usr/bin/env node
/**
 * Invoicing test data seeder.
 *
 * Creates a DEDICATED, throwaway test login + a brand-new workspace owned by it,
 * then drops in a full walk-the-whole-pipeline dataset so you can test every step
 * of the finance flow without touching your real workspaces:
 *
 *   billable work (tasks / timesheets / travel claims / shift notes)
 *     -> Approvals inbox
 *       -> Billable entries
 *         -> Create invoices  (plan-managed participants)
 *         -> Invoices  (+ optional Xero push)
 *         -> NDIS claim period -> PACE bulk payment request CSV  (NDIA-managed)
 *
 * Because the app loads the single OLDEST workspace a user belongs to (no
 * switcher), the test login only ever belongs to this one workspace, so logging
 * in with it lands you straight in the test data.
 *
 * Re-running is safe: it wipes the test login's previous workspace(s) first.
 *
 * Usage:
 *   node supabase/seed-invoicing.mjs
 *
 * Requires .env.local with:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  try {
    const content = readFileSync(resolve(__dirname, "../.env.local"), "utf-8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eqIdx = trimmed.indexOf("=")
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const value = trimmed.slice(eqIdx + 1).trim()
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // env may be provided externally
  }
}

loadEnv()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// --- Test login -------------------------------------------------------------
const TEST_EMAIL = process.env.SEED_TEST_EMAIL || "invoicing-tester@example.com"
const TEST_PASSWORD = process.env.SEED_TEST_PASSWORD || "TestInvoicing123!"
const WORKSPACE_NAME = "Invoicing Test"

// --- Charges ----------------------------------------------------------------
const HOUR_CHARGE = {
  id: "07_002_0106_8_3",
  name: "Support Coordination Level 2: Coordination of Supports",
  itemNumber: "07_002_0106_8_3",
  claimType: "direct-service",
  price: 100.14,
  unit: "hour",
  gstCode: "P2",
  reference: "Coordination of Supports",
  status: "active",
}
const KM_CHARGE = {
  id: "07_799_0106_6_3_KM",
  name: "Provider Travel — Kilometres",
  itemNumber: "07_799_0106_6_3_KM",
  claimType: "provider-travel",
  price: 0.99,
  unit: "km",
  gstCode: "P2",
  reference: "Travel (km)",
  status: "active",
}

// --- Dates (keep inside the current month) ----------------------------------
const now = new Date()
function isoDaysAgo(n) {
  const d = new Date(now)
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}
function isoTime() {
  return new Date().toISOString()
}

// --- Participants -----------------------------------------------------------
const clients = [
  {
    name: "Olivia Reed", icon_text: "OR", icon_color: "#6366f1", icon_shape: "circle",
    status: "active", owner: "Alex Carer", summary: "Plan-managed participant — invoice path.",
    industry: ["NDIS"],
    participant: {
      firstName: "Olivia", lastName: "Reed", preferredName: "Olivia", dateOfBirth: "1992-02-18",
      gender: "Female", pronouns: "She/Her", email: "olivia.reed@example.com", mobile: "0412 000 111",
      ndisNumber: "430000111", fundingType: "plan-managed", planManagerName: "Plan Co Manager",
      planManagerEmail: "accounts@planco.example.com", planManagerOrg: "Plan Co",
      planStartDate: isoDaysAgo(120), planEndDate: isoDaysAgo(-245), serviceCommencementDate: isoDaysAgo(200),
    },
  },
  {
    name: "Marcus Hill", icon_text: "MH", icon_color: "#f59e0b", icon_shape: "circle",
    status: "active", owner: "Alex Carer", summary: "Plan-managed participant — invoice path.",
    industry: ["NDIS"],
    participant: {
      firstName: "Marcus", lastName: "Hill", preferredName: "Marcus", dateOfBirth: "1985-06-09",
      gender: "Male", pronouns: "He/Him", email: "marcus.hill@example.com", mobile: "0412 000 222",
      ndisNumber: "430000222", fundingType: "plan-managed", planManagerName: "Better Plans",
      planManagerEmail: "ap@betterplans.example.com", planManagerOrg: "Better Plans",
      planStartDate: isoDaysAgo(150), planEndDate: isoDaysAgo(-215), serviceCommencementDate: isoDaysAgo(180),
    },
  },
  {
    name: "Priya Nair", icon_text: "PN", icon_color: "#10b981", icon_shape: "circle",
    status: "active", owner: "Alex Carer", summary: "NDIA-managed participant — NDIS claim / PACE CSV path.",
    industry: ["NDIS"],
    participant: {
      firstName: "Priya", lastName: "Nair", preferredName: "Priya", dateOfBirth: "1998-12-01",
      gender: "Female", pronouns: "She/Her", email: "priya.nair@example.com", mobile: "0412 000 333",
      ndisNumber: "430000333", fundingType: "ndia-managed",
      planStartDate: isoDaysAgo(90), planEndDate: isoDaysAgo(-275), serviceCommencementDate: isoDaysAgo(160),
    },
  },
]

const STAFF_NAME = "Alex Carer"

// ---------------------------------------------------------------------------

async function findUserByEmail(email) {
  // listUsers is paginated; this seed only ever has a handful of users.
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 200) return null
  }
  return null
}

async function ensureTestUser() {
  const existing = await findUserByEmail(TEST_EMAIL)
  if (existing) {
    // Wipe any workspaces this test user owns so re-runs stay clean.
    const { data: owned } = await supabase.from("workspaces").select("id").eq("created_by", existing.id)
    for (const ws of owned || []) {
      await supabase.from("workspaces").delete().eq("id", ws.id) // cascades
    }
    return existing.id
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: "Invoicing Tester" },
  })
  if (error) throw new Error(`createUser: ${error.message}`)
  return data.user.id
}

async function seed() {
  console.log("Ensuring test login...")
  const ownerId = await ensureTestUser()
  console.log(`  ${TEST_EMAIL}`)

  console.log("Creating fresh workspace...")
  const { data: workspaceId, error: wsError } = await supabase.rpc("create_workspace_for_user", {
    workspace_name: WORKSPACE_NAME,
    owner_id: ownerId,
  })
  if (wsError) throw new Error(`create_workspace_for_user: ${wsError.message}`)
  console.log(`  ${WORKSPACE_NAME} (${workspaceId})`)

  console.log("Enabling charges (hour + km)...")
  const charges = [HOUR_CHARGE, KM_CHARGE]
  const { error: chargeError } = await supabase.from("charges_config").upsert(
    {
      workspace_id: workspaceId,
      charge_items: charges,
      enabled_charges: charges.map((c) => c.itemNumber),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id" },
  )
  if (chargeError) throw new Error(`charges_config: ${chargeError.message}`)

  console.log("Setting provider ABN + NDIS registration number...")
  const { error: settingsError } = await supabase.from("workspace_settings").upsert(
    { workspace_id: workspaceId, org_name: WORKSPACE_NAME, org_abn: "53004085616", ndis_number: "4050001234" },
    { onConflict: "workspace_id" },
  )
  if (settingsError) throw new Error(`workspace_settings: ${settingsError.message}`)

  console.log("Inserting participants...")
  const { data: insertedClients, error: clientError } = await supabase
    .from("clients")
    .insert(clients.map((c) => ({ ...c, workspace_id: workspaceId })))
    .select("id, name")
  if (clientError) throw new Error(`clients: ${clientError.message}`)
  const [olivia, marcus, priya] = insertedClients
  console.log(`  ${insertedClients.length} participants`)

  console.log("Inserting support worker...")
  const { data: insertedStaff, error: staffError } = await supabase
    .from("staff")
    .insert({
      workspace_id: workspaceId, name: STAFF_NAME, icon_text: "AC", status: "active",
      details: { firstName: "Alex", lastName: "Carer", role: "Support Worker", email: "alex@example.com" },
    })
    .select("id")
    .single()
  if (staffError) throw new Error(`staff: ${staffError.message}`)
  const staffId = insertedStaff.id
  console.log("  1 support worker")

  console.log("Inserting completed roster shifts...")
  const { data: insertedShifts, error: shiftError } = await supabase
    .from("roster_shifts")
    .insert([
      {
        workspace_id: workspaceId, staff_id: staffId, client_id: olivia.id, shift_date: isoDaysAgo(6),
        start_time: "09:00", end_time: "12:00", title: "Community access — Olivia", location: "Brisbane CBD",
        status: "completed", charge_type: HOUR_CHARGE.itemNumber, charge_types: [HOUR_CHARGE.itemNumber],
        progress_note: {
          supportProvided: "Supported Olivia with community access and a coffee catch-up to practise social skills.",
          goalProgress: "Initiated two conversations independently.", observations: "Bright and engaged throughout.",
          concerns: "", incidentOccurred: false, followUp: "Book the same outing next week.",
          authorStaffId: staffId, authorName: STAFF_NAME, signature: "",
          recordedAt: isoTime(), updatedAt: isoTime(), approvalStatus: "none",
        },
      },
      {
        workspace_id: workspaceId, staff_id: staffId, client_id: marcus.id, shift_date: isoDaysAgo(5),
        start_time: "13:00", end_time: "16:00", title: "Skill building — Marcus", location: "Marcus' home",
        status: "completed", charge_type: HOUR_CHARGE.itemNumber, charge_types: [HOUR_CHARGE.itemNumber],
      },
    ])
    .select("id, shift_date")
  if (shiftError) throw new Error(`roster_shifts: ${shiftError.message}`)
  const [oliviaShift, marcusShift] = insertedShifts
  console.log(`  ${insertedShifts.length} shifts (1 with a progress note pending approval)`)

  console.log("Inserting submitted timesheets + a travel claim...")
  const { error: tsError } = await supabase.from("timesheets").insert([
    {
      workspace_id: workspaceId, staff_id: staffId, submitted_by_name: STAFF_NAME, shift_id: oliviaShift.id,
      start_date: oliviaShift.shift_date, end_date: oliviaShift.shift_date, start_time: "09:00", end_time: "12:00",
      break_minutes: 0, worked_minutes: 180, notes: "Standard 3h community access shift.", status: "sent",
      travel_claims: [
        {
          id: crypto.randomUUID(), clientIds: [olivia.id], startLocation: "Office", endLocation: "Brisbane CBD",
          distanceKm: 18, purpose: "Transport participant to community activity", notes: "Return trip included.",
          status: "sent", reviewNote: "",
        },
      ],
    },
    {
      workspace_id: workspaceId, staff_id: staffId, submitted_by_name: STAFF_NAME, shift_id: marcusShift.id,
      start_date: marcusShift.shift_date, end_date: marcusShift.shift_date, start_time: "13:00", end_time: "16:00",
      break_minutes: 0, worked_minutes: 180, notes: "Skill building session.", status: "sent", travel_claims: [],
    },
  ])
  if (tsError) throw new Error(`timesheets: ${tsError.message}`)
  console.log("  2 timesheets (1 includes a travel claim)")

  console.log("Inserting done + charged tasks pending approval...")
  const { error: taskError } = await supabase.from("tasks").insert([
    {
      workspace_id: workspaceId, title: "Plan review write-up — Olivia Reed",
      description: "Wrote up the plan review report after the meeting.", status: "done", assignee: STAFF_NAME,
      client_name: olivia.name, client_id: olivia.id, due_date: isoDaysAgo(2),
      charge_type: HOUR_CHARGE.itemNumber, time_spent: 90, billing_approval: "none",
    },
    {
      workspace_id: workspaceId, title: "Provider liaison calls — Marcus Hill",
      description: "Coordinated with SIL and therapy providers.", status: "done", assignee: STAFF_NAME,
      client_name: marcus.name, client_id: marcus.id, due_date: isoDaysAgo(3),
      charge_type: HOUR_CHARGE.itemNumber, time_spent: 60, billing_approval: "none",
    },
    {
      workspace_id: workspaceId, title: "Service agreement — Priya Nair",
      description: "Prepared and issued service agreement.", status: "done", assignee: STAFF_NAME,
      client_name: priya.name, client_id: priya.id, due_date: isoDaysAgo(4),
      charge_type: HOUR_CHARGE.itemNumber, time_spent: 45, billing_approval: "none",
    },
  ])
  if (taskError) throw new Error(`tasks: ${taskError.message}`)
  console.log("  3 tasks")

  console.log("Inserting ready-to-bill billable entries...")
  function hourEntry(client, days, hours, desc) {
    return {
      workspace_id: workspaceId, client_id: client.id, client_name: client.name, staff_id: staffId,
      staff_name: STAFF_NAME, source: "manual", source_id: null, service_date: isoDaysAgo(days),
      charge_item_number: HOUR_CHARGE.itemNumber, charge_name: HOUR_CHARGE.name, claim_type: "direct-service",
      unit: "hour", quantity: hours, rate: HOUR_CHARGE.price, amount: +(hours * HOUR_CHARGE.price).toFixed(2),
      gst_code: "P2", gst_amount: 0, description: desc, status: "unpaid", created_by_name: STAFF_NAME,
    }
  }
  function kmEntry(client, days, km, desc) {
    return {
      workspace_id: workspaceId, client_id: client.id, client_name: client.name, staff_id: staffId,
      staff_name: STAFF_NAME, source: "manual", source_id: null, service_date: isoDaysAgo(days),
      charge_item_number: KM_CHARGE.itemNumber, charge_name: KM_CHARGE.name, claim_type: "provider-travel",
      unit: "km", quantity: km, rate: KM_CHARGE.price, amount: +(km * KM_CHARGE.price).toFixed(2),
      gst_code: "P2", gst_amount: 0, description: desc, status: "unpaid", created_by_name: STAFF_NAME,
    }
  }
  const { error: entryError } = await supabase.from("billable_entries").insert([
    hourEntry(olivia, 8, 2, "Coordination of supports"),
    kmEntry(olivia, 8, 24, "Travel to participant"),
    hourEntry(marcus, 7, 1.5, "Coordination of supports"),
    hourEntry(priya, 9, 2, "Coordination of supports — NDIA"),
    kmEntry(priya, 9, 31, "Travel to participant — NDIA"),
  ])
  if (entryError) throw new Error(`billable_entries: ${entryError.message}`)
  console.log("  5 unpaid billable entries")

  console.log("\nSeed complete.\n")
  console.log("Log in with:")
  console.log(`  Email:    ${TEST_EMAIL}`)
  console.log(`  Password: ${TEST_PASSWORD}\n`)

  console.log("Walk the pipeline:")
  console.log("  1. Approvals inbox — approve the tasks, timesheets, travel claim & shift note.")
  console.log("  2. Billable entries — approved items appear next to the 5 seeded ones.")
  console.log("  3. Create invoices — Olivia & Marcus (plan-managed) appear; create an invoice.")
  console.log("  4. Invoices — view / send (push to Xero if connected).")
  console.log("  5. NDIS claims — create a claim period covering this month, then export the PACE CSV.\n")

  console.log("ACTION REQUIRED for the NDIS-claims path (the NDIA flag lives in your browser):")
  console.log("After logging in, paste this in the browser DevTools console, then reload:\n")
  console.log("  (() => {")
  console.log(`    const k = 'client-recipients-${workspaceId}'`)
  console.log("    const m = JSON.parse(localStorage.getItem(k) || '{}')")
  console.log(`    m['${priya.id}'] = { invoiceContactId: null, ndiaClaims: true }`)
  console.log("    localStorage.setItem(k, JSON.stringify(m))")
  console.log("    console.log('Priya flagged for NDIA claims — reload the page')")
  console.log("  })()\n")
}

seed().catch((err) => {
  console.error("\nSeed failed:", err.message || err)
  process.exit(1)
})
