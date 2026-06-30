import type { StaffMember, WorkspaceMember } from "@/lib/types"

export type InviteMemberRole = WorkspaceMember["role"]

export const INVITE_MEMBER_ROLE_LABELS: Record<InviteMemberRole, string> = {
  "super-admin": "Super Admin",
  admin: "Team Leader",
  coordinator: "Coordinator",
  "support-worker": "Support Worker",
}

export const INVITE_MEMBER_ROLES: InviteMemberRole[] = [
  "super-admin",
  "admin",
  "coordinator",
  "support-worker",
]

export function staffRoleLabelFromInviteRole(role: InviteMemberRole): string {
  return INVITE_MEMBER_ROLE_LABELS[role]
}

export function parseInviteFullName(fullName: string) {
  const trimmed = fullName.trim()
  const parts = trimmed.split(/\s+/).filter(Boolean)
  const firstName = parts[0] || ""
  const lastName = parts.slice(1).join(" ")
  return { firstName, lastName, displayName: trimmed || firstName }
}

export interface InviteMemberInput {
  fullName: string
  email: string
  role: InviteMemberRole
  workspaceId: string
}

export interface InviteMemberResult {
  success: boolean
  error?: string
  warning?: string | null
  staff?: StaffMember | null
}

export async function inviteMemberAndCreateStaff(
  input: InviteMemberInput,
  options: {
    addStaff: (payload: {
      name: string
      iconText?: string
      details?: Partial<StaffMember["details"]>
      status?: string
      invitedEmail?: string
    }) => Promise<StaffMember | null>
    existingStaff: StaffMember[]
  },
): Promise<InviteMemberResult> {
  const email = input.email.trim().toLowerCase()
  const { firstName, lastName, displayName } = parseInviteFullName(input.fullName)
  const name = displayName || email.split("@")[0] || "Unnamed"

  const res = await fetch("/api/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      workspaceId: input.workspaceId,
      role: input.role,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return { success: false, error: data.error || "Failed to invite member" }
  }

  const warning =
    data.emailSent === false
      ? (data.warning || "Member added, but the invite email couldn't be sent.")
      : null

  const existing = options.existingStaff.find((member) => {
    const invited = member.invitedEmail?.toLowerCase() || ""
    const detailsEmail = member.details.email?.toLowerCase() || ""
    return invited === email || detailsEmail === email
  })

  if (existing) {
    return { success: true, warning, staff: existing }
  }

  const staff = await options.addStaff({
    name,
    iconText: name[0]?.toUpperCase() || "?",
    details: {
      firstName,
      lastName,
      email,
      role: staffRoleLabelFromInviteRole(input.role),
    },
    status: "invited",
    invitedEmail: email,
  })

  if (!staff) {
    return {
      success: true,
      warning: warning
        ? `${warning} Staff profile could not be created — try refreshing.`
        : "Invite sent, but the staff profile could not be created.",
      staff: null,
    }
  }

  return { success: true, warning, staff }
}
