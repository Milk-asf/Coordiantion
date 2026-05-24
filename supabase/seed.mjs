#!/usr/bin/env node
/**
 * Seed script — populates a workspace with sample NDIS participants, contacts,
 * staff, and tasks so testers have data to work with immediately.
 *
 * Usage:
 *   node supabase/seed.mjs
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
    const envPath = resolve(__dirname, "../.env.local")
    const content = readFileSync(envPath, "utf-8")
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
    // .env.local may not exist if env vars are set externally
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

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const WORKSPACE_NAME = "Demo Workspace"

const clients = [
  {
    name: "Sarah Thompson",
    icon_text: "ST",
    icon_color: "#6366f1",
    icon_shape: "circle",
    status: "active",
    owner: "Emma Richards",
    summary: "Active participant with support coordination and therapy services.",
    about: "Sarah is a 30-year-old participant who lives independently. She requires assistance with daily living, physiotherapy, and community access.",
    industry: ["NDIS"],
    participant: {
      firstName: "Sarah",
      middleName: "Jane",
      lastName: "Thompson",
      preferredName: "Sarah",
      dateOfBirth: "1995-03-14",
      gender: "Female",
      pronouns: "She/Her",
      language: "English",
      primaryDiagnosis: "Cerebral Palsy",
      secondaryDiagnosis: "Anxiety Disorder",
      email: "sarah.thompson@email.com",
      mobile: "0412 345 678",
      ndisNumber: "431 234 567",
      fundingType: "plan-managed",
      planManagerName: "Rebecca Torres",
      planManagerEmail: "rebecca@myplanmanager.com.au",
      planManagerOrg: "My Plan Manager",
      planStartDate: "2025-07-01",
      planEndDate: "2026-06-30",
      serviceCommencementDate: "2024-01-15",
    },
  },
  {
    name: "James Wilson",
    icon_text: "JW",
    icon_color: "#f59e0b",
    icon_shape: "circle",
    status: "active",
    owner: "Sam Lee",
    summary: "Long-term participant with SIL and community participation.",
    about: "James lives in a Supported Independent Living arrangement. He works part-time at a local cafe with support and enjoys art classes on weekends.",
    industry: ["NDIS"],
    participant: {
      firstName: "James",
      lastName: "Wilson",
      preferredName: "Jimmy",
      dateOfBirth: "1988-11-22",
      gender: "Male",
      pronouns: "He/Him",
      language: "English",
      primaryDiagnosis: "Autism Spectrum Disorder",
      email: "james.wilson@email.com",
      mobile: "0423 456 789",
      ndisNumber: "431 345 678",
      fundingType: "plan-managed",
      planManagerName: "David Nguyen",
      planManagerEmail: "david@planpartners.com.au",
      planManagerOrg: "Plan Partners",
      planStartDate: "2025-06-01",
      planEndDate: "2026-05-31",
      serviceCommencementDate: "2023-06-01",
    },
  },
  {
    name: "Mei Chen",
    icon_text: "MC",
    icon_color: "#10b981",
    icon_shape: "circle",
    status: "active",
    owner: "Emma Richards",
    summary: "Young participant transitioning from school to adult services.",
    about: "Mei recently finished school and is exploring supported employment and further education options.",
    industry: ["NDIS"],
    participant: {
      firstName: "Mei",
      lastName: "Chen",
      preferredName: "Mei",
      dateOfBirth: "2001-07-03",
      gender: "Female",
      pronouns: "She/Her",
      language: "English, Mandarin",
      primaryDiagnosis: "Intellectual Disability",
      secondaryDiagnosis: "Epilepsy",
      email: "mei.chen@email.com",
      mobile: "0434 567 890",
      ndisNumber: "431 456 789",
      fundingType: "ndia-managed",
      planStartDate: "2025-09-01",
      planEndDate: "2026-08-31",
      serviceCommencementDate: "2024-03-10",
    },
  },
  {
    name: "Liam O'Brien",
    icon_text: "LO",
    icon_color: "#ef4444",
    icon_shape: "circle",
    status: "active",
    owner: "Sam Lee",
    summary: "Participant with complex needs requiring multi-disciplinary coordination.",
    about: "Liam sustained an acquired brain injury in 2018. He lives with his brother and has a strong therapy team.",
    industry: ["NDIS"],
    participant: {
      firstName: "Liam",
      middleName: "Patrick",
      lastName: "O'Brien",
      preferredName: "Liam",
      dateOfBirth: "1975-09-28",
      gender: "Male",
      pronouns: "He/Him",
      language: "English",
      primaryDiagnosis: "Acquired Brain Injury",
      secondaryDiagnosis: "Depression",
      mobile: "0445 678 901",
      ndisNumber: "431 567 890",
      fundingType: "plan-managed",
      planManagerName: "Lisa Crawford",
      planManagerEmail: "lisa@firstchoicepm.com.au",
      planManagerOrg: "First Choice Plan Management",
      planStartDate: "2025-04-01",
      planEndDate: "2026-03-31",
      serviceCommencementDate: "2022-11-01",
    },
  },
]

const contacts = [
  { name: "Rebecca Torres", relationship: "Plan Manager", email: "rebecca@myplanmanager.com.au", phone: "07 3210 4567", clientIndex: 0 },
  { name: "Dr. Andrew Kim", relationship: "Physiotherapist", email: "a.kim@therapyworks.com.au", phone: "07 3456 1234", clientIndex: 0 },
  { name: "David Nguyen", relationship: "Plan Manager", email: "david@planpartners.com.au", phone: "07 3222 8800", clientIndex: 1 },
  { name: "Karen Wilson", relationship: "Mother", email: "karen.wilson@email.com", phone: "0498 765 432", clientIndex: 1 },
  { name: "Dr. Michelle Park", relationship: "Neurologist", email: "m.park@brainhealth.com.au", phone: "07 3444 5566", clientIndex: 3 },
  { name: "Patrick O'Brien", relationship: "Brother / Guardian", email: "pat.obrien@email.com", phone: "0456 789 012", clientIndex: 3 },
]

const staffMembers = [
  { name: "Emma Richards", icon_text: "ER", status: "active", details: { firstName: "Emma", lastName: "Richards", role: "Senior Support Coordinator", email: "emma@coordination.com.au", phone: "0400 111 222" } },
  { name: "Sam Lee", icon_text: "SL", status: "active", details: { firstName: "Sam", lastName: "Lee", role: "Support Coordinator", email: "sam@coordination.com.au", phone: "0400 333 444" } },
  { name: "Jordan Patel", icon_text: "JP", status: "active", details: { firstName: "Jordan", lastName: "Patel", role: "Support Coordinator", email: "jordan@coordination.com.au", phone: "0400 555 666" } },
]

const today = new Date()
function daysFromNow(n) {
  const d = new Date(today)
  d.setDate(d.getDate() + n)
  return d.toISOString().split("T")[0]
}

const tasks = [
  { title: "Plan review meeting — Sarah Thompson", description: "Coordinate plan review with Sarah, her physio, and plan manager.", status: "todo", assignee: "Emma Richards", clientIndex: 0, due_date: daysFromNow(3), charge_type: "15_034_0127_8_3" },
  { title: "Service agreement renewal — James Wilson", description: "Draft and send updated service agreement for the new plan period.", status: "in-progress", assignee: "Sam Lee", clientIndex: 1, due_date: daysFromNow(1), charge_type: "15_034_0127_8_3" },
  { title: "SIL provider liaison — James Wilson", description: "Follow up with SIL provider regarding weekend activity scheduling.", status: "todo", assignee: "Sam Lee", clientIndex: 1, due_date: daysFromNow(7), charge_type: "15_034_0127_8_3" },
  { title: "School-to-work transition plan — Mei Chen", description: "Research supported employment options and schedule DES meeting.", status: "in-progress", assignee: "Emma Richards", clientIndex: 2, due_date: daysFromNow(5), charge_type: "15_034_0127_8_3" },
  { title: "Therapy team meeting — Liam O'Brien", description: "Organise multi-disciplinary meeting with OT, speech pathologist, and neuropsych.", status: "todo", assignee: "Sam Lee", clientIndex: 3, due_date: daysFromNow(10), charge_type: "15_034_0127_8_3" },
  { title: "Quote request for assistive tech — Liam O'Brien", description: "Get quotes for communication device upgrade from two suppliers.", status: "done", assignee: "Jordan Patel", clientIndex: 3, due_date: daysFromNow(-2), charge_type: "15_034_0127_8_3", time_spent: 45 },
]

// ---------------------------------------------------------------------------
// Seed execution
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Creating workspace...")

  // Create workspace via RPC
  const { data: workspaceId, error: wsError } = await supabase.rpc("create_workspace_for_user", {
    workspace_name: WORKSPACE_NAME,
    owner_id: "00000000-0000-0000-0000-000000000000", // placeholder; real user will be linked on first login
  })

  if (wsError) {
    console.error("Failed to create workspace:", wsError.message)
    process.exit(1)
  }

  console.log(`  Workspace created: ${workspaceId}`)

  // Insert clients
  console.log("Inserting clients...")
  const clientRows = clients.map((c) => ({ ...c, workspace_id: workspaceId }))
  const { data: insertedClients, error: clientError } = await supabase
    .from("clients")
    .insert(clientRows)
    .select("id, name")

  if (clientError) {
    console.error("  Failed:", clientError.message)
    process.exit(1)
  }
  console.log(`  ${insertedClients.length} clients inserted`)

  // Insert contacts
  console.log("Inserting contacts...")
  const contactRows = contacts.map((c) => ({
    workspace_id: workspaceId,
    name: c.name,
    relationship: c.relationship,
    email: c.email,
    phone: c.phone,
    client_id: insertedClients[c.clientIndex]?.id || null,
    client_name: clients[c.clientIndex]?.name || "",
  }))
  const { error: contactError } = await supabase.from("contacts").insert(contactRows)
  if (contactError) console.error("  Failed:", contactError.message)
  else console.log(`  ${contactRows.length} contacts inserted`)

  // Insert staff
  console.log("Inserting staff...")
  const staffRows = staffMembers.map((s) => ({ ...s, workspace_id: workspaceId }))
  const { error: staffError } = await supabase.from("staff").insert(staffRows)
  if (staffError) console.error("  Failed:", staffError.message)
  else console.log(`  ${staffRows.length} staff inserted`)

  // Insert tasks
  console.log("Inserting tasks...")
  const taskRows = tasks.map((t) => ({
    workspace_id: workspaceId,
    title: t.title,
    description: t.description,
    status: t.status,
    assignee: t.assignee,
    client_name: clients[t.clientIndex]?.name || "",
    client_id: insertedClients[t.clientIndex]?.id || null,
    due_date: t.due_date,
    charge_type: t.charge_type || "",
    time_spent: t.time_spent || 0,
  }))
  const { error: taskError } = await supabase.from("tasks").insert(taskRows)
  if (taskError) console.error("  Failed:", taskError.message)
  else console.log(`  ${taskRows.length} tasks inserted`)

  // Insert a sample note
  console.log("Inserting notes...")
  const { error: noteError } = await supabase.from("notes").insert({
    workspace_id: workspaceId,
    title: "Initial assessment summary",
    content: "Met with Sarah to discuss plan review goals. She wants to increase community access hours and add a new OT provider.",
    client_id: insertedClients[0]?.id || null,
    client_name: "Sarah Thompson",
    created_by: "Emma Richards",
  })
  if (noteError) console.error("  Failed:", noteError.message)
  else console.log("  1 note inserted")

  console.log("\nSeed complete! Workspace ID:", workspaceId)
  console.log("Sign up at http://localhost:3000/signup and the app will load this workspace.")
}

seed().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
