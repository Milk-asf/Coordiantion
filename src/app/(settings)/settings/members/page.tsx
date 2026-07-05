"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { MoreHorizontal, ChevronDown, Plus, X, Users } from "lucide-react"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { Switch } from "@/components/switch"
import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { EntityIcon } from "@/components/entity-icon"
import { useMembers } from "@/lib/hooks/use-members"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useStaff } from "@/lib/hooks/use-staff"
import { useWorkspace } from "@/lib/workspace-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { SETTINGS_INPUT_CLASS, SETTINGS_LABEL_CLASS, SETTINGS_SECTION_CLASS, SettingsSelect } from "@/components/settings-ui"
import type { WorkspaceMember } from "@/lib/types"

type Role = WorkspaceMember["role"]

const SUPER_ADMIN_EMAIL = "izakjosef@gmail.com"

// Folk chip palette tones (see chip-colors.ts) so role chips match the app.
const roleConfig: Record<Role, { label: string; description: string; color: string }> = {
  "super-admin": { label: "Super Admin", description: "Full access. Can manage billing, members, and account settings.", color: "bg-[#f3e5f5] text-[#7b1fa2] border-[#e1bee7]" },
  admin: { label: "Team Leader", description: "Can manage members, settings, and all data.", color: "bg-[#e3f2fd] text-[#1565c0] border-[#bbdefb]" },
  coordinator: { label: "Coordinator", description: "Can view and edit assigned clients, own tasks, and contacts.", color: "bg-[#e8f5e9] text-[#2e7d32] border-[#c8e6c9]" },
  "support-worker": { label: "Support Worker", description: "Limited access to their roster, incidents, and assigned clients only.", color: "bg-[#fff8e1] text-[#f57f17] border-[#ffe082]" },
}

const roleChipFallback = "bg-[#eef2f6] text-[#334155] border-[#cfd8dc]"

const allRoles: Role[] = ["super-admin", "admin", "coordinator", "support-worker"]

export default function MembersSettingsPage() {
  const { members, updateMemberRole, updateMemberStatus, removeMember, refetch } = useMembers()
  const { canManageMembers, isSuperAdmin } = usePermissions()
  const { staff, updateStaff } = useStaff()
  const { activeWorkspace } = useWorkspace()
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null)
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null)
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("coordinator")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteWarning, setInviteWarning] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string } | null>(null)
  const inviteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isInviteOpen) setTimeout(() => inviteInputRef.current?.focus(), 50)
  }, [isInviteOpen])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setCurrentUser({
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split("@")[0] || "You",
        email: user.email || "",
      })
    })
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail?.includes("@") || !activeWorkspace) return
    setIsInviting(true)
    setInviteError(null)
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), workspaceId: activeWorkspace.id, role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to invite member")

      await refetch()
      setInviteEmail("")
      setInviteRole("coordinator")
      setIsInviteOpen(false)
      setInviteWarning(
        data.emailSent === false
          ? (data.warning || "Member added, but the invite email couldn't be sent. Use \u201CResend invite\u201D to try again.")
          : null,
      )
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to invite member")
    }
    setIsInviting(false)
  }

  const handleResendInvite = async (member: WorkspaceMember) => {
    if (!activeWorkspace) return
    const email = member.invited_email || member.email
    if (!email) return
    try {
      await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, workspaceId: activeWorkspace.id }),
      })
    } catch { /* toast could go here */ }
  }

  const handleChangeRole = async (memberId: string, newRole: Role) => {
    await updateMemberRole(memberId, newRole)
    setRoleChangeId(null)
  }

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId)
    setMemberMenuId(null)
  }

  const handleToggleStatus = (member: WorkspaceMember) => {
    const newStatus = member.status === "deactivated" ? "active" : "deactivated"
    updateMemberStatus(member.id, newStatus)

    const matchedStaff = staff.find((s) => {
      const memberEmail = member.email || member.invited_email || ""
      return (memberEmail && s.invitedEmail === memberEmail) || s.name === (member.name || "")
    })
    if (matchedStaff) {
      updateStaff(matchedStaff.id, { status: newStatus === "deactivated" ? "inactive" : "active" })
    }
  }

  if (!canManageMembers) return (
    <div className="flex items-center justify-center py-[48px]">
      <p className="text-[14px] text-folk-secondary">You don&apos;t have permission to manage members.</p>
    </div>
  )

  const ownerUserId = activeWorkspace?.created_by ?? null
  const isOwnerMember = (m: WorkspaceMember) => !!ownerUserId && m.user_id === ownerUserId

  // Always surface the workspace owner (the account holder paying for the software),
  // even if their membership row hasn't been hydrated into the members list yet.
  const ownerInList = !!ownerUserId && members.some((m) => m.user_id === ownerUserId)
  const syntheticOwner: WorkspaceMember | null = !ownerInList && ownerUserId
    ? {
        id: `owner-${ownerUserId}`,
        workspace_id: activeWorkspace?.id || "",
        user_id: ownerUserId,
        role: "super-admin",
        status: "active",
        invited_email: null,
        team: null,
        created_at: activeWorkspace?.created_at || new Date().toISOString(),
        name: currentUser?.id === ownerUserId ? currentUser.name : "Account owner",
        email: currentUser?.id === ownerUserId ? currentUser.email : "",
      }
    : null

  const mergedMembers = syntheticOwner ? [syntheticOwner, ...members] : members
  const query = search.trim().toLowerCase()
  const matchesSearch = (m: WorkspaceMember) => {
    if (!query) return true
    return [m.name, m.email, m.invited_email]
      .some((field) => (field || "").toLowerCase().includes(query))
  }
  const allMembers = mergedMembers.filter(matchesSearch)
  const activeMembers = allMembers.filter((m) => m.status !== "deactivated")
  const deactivatedMembers = allMembers.filter((m) => m.status === "deactivated")

  const isMemberSuperAdminEmail = (m: WorkspaceMember) =>
    (m.email === SUPER_ADMIN_EMAIL || m.invited_email === SUPER_ADMIN_EMAIL)

  const canEditRole = (member: WorkspaceMember) => {
    if (!isSuperAdmin) return false
    if (isMemberSuperAdminEmail(member)) return false
    if (isOwnerMember(member)) return false
    return true
  }

  const canToggleStatus = (member: WorkspaceMember) => {
    if (isMemberSuperAdminEmail(member)) return false
    if (isOwnerMember(member)) return false
    return true
  }

  return (
    <>
      <div className="mb-[24px]">
        <h1 className="text-[20px] font-bold text-folk-text">Members</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Manage who has access to this workspace.
        </p>
      </div>

      {isInviteOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsInviteOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[420px] rounded-[6px] border border-folk-border bg-folk-surface p-[24px] shadow-folk">
              <div className="mb-[16px] flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-folk-text">Invite a member</h2>
                <button onClick={() => setIsInviteOpen(false)} className="icon-btn flex h-[28px] w-[28px] items-center justify-center text-folk-secondary" tabIndex={0} aria-label="Close">
                  <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
                </button>
              </div>
              <label className={SETTINGS_LABEL_CLASS}>Email address</label>
              <input
                ref={inviteInputRef}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite() }}
                placeholder="colleague@example.com"
                className={cn(SETTINGS_INPUT_CLASS, "mb-[12px]")}
              />
              <div className="mb-[16px]">
                <SettingsSelect
                  label="Role"
                  value={roleConfig[inviteRole].label}
                  options={(isSuperAdmin ? allRoles : allRoles.filter((r) => r !== "super-admin")).map((r) => roleConfig[r].label)}
                  onChange={(label) =>
                    setInviteRole(allRoles.find((r) => roleConfig[r].label === label) ?? "coordinator")
                  }
                />
              </div>
              {inviteError && <p className="mb-[12px] text-[13px] text-red-500">{inviteError}</p>}
              <div className="flex justify-end gap-[8px]">
                <Button variant="secondary" onClick={() => setIsInviteOpen(false)} className="px-[14px] py-[6px]">
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail?.includes("@")}
                  className="px-[14px] py-[6px]"
                >
                  {isInviting ? "Sending…" : "Send invite"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {inviteWarning && (
        <div className="mb-[12px] flex items-start justify-between gap-[12px] rounded-[6px] border border-amber-100 bg-amber-50 px-[14px] py-[10px]">
          <p className="text-[13px] text-amber-700">{inviteWarning}</p>
          <button
            onClick={() => setInviteWarning(null)}
            className="shrink-0 text-amber-500 transition-colors hover:text-amber-700"
            tabIndex={0}
            aria-label="Dismiss"
          >
            <X className="h-[15px] w-[15px]" strokeWidth={1.75} />
          </button>
        </div>
      )}

      <div className="mb-[16px] flex items-center gap-[10px]">
        <ExpandableTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search members…"
          ariaLabel="Search members"
        />
        <Button onClick={() => setIsInviteOpen(true)} className="ml-auto h-[36px] shrink-0 px-[12px]">
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          Invite member
        </Button>
      </div>

      {/* Active members */}
      <div className={cn(SETTINGS_SECTION_CLASS, "overflow-hidden")}>
        <div className="grid grid-cols-[1fr_120px_80px_48px] items-center border-b border-folk-border-subtle px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-folk-secondary">Name</span>
          <span className="text-[12px] font-medium text-folk-secondary">Role</span>
          <span className="text-[12px] font-medium text-folk-secondary">Active</span>
          <span />
        </div>

        {activeMembers.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            isSuperAdmin={isSuperAdmin}
            canEditRole={canEditRole(member)}
            canToggle={canToggleStatus(member)}
            isRoleOpen={roleChangeId === member.id}
            isMenuOpen={memberMenuId === member.id}
            onRoleToggle={() => setRoleChangeId(roleChangeId === member.id ? null : member.id)}
            onRoleChange={(role) => handleChangeRole(member.id, role)}
            onMenuToggle={() => setMemberMenuId(memberMenuId === member.id ? null : member.id)}
            onToggleStatus={() => handleToggleStatus(member)}
            onRemove={() => handleRemoveMember(member.id)}
            onResendInvite={() => handleResendInvite(member)}
          />
        ))}

        {allMembers.length === 0 && (
          query ? (
            <div className="px-[20px] py-[40px] text-center text-[13px] text-folk-placeholder">
              No members match “{search.trim()}”.
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No members yet"
              description="Invite a colleague to collaborate in this workspace."
              action={{ label: "Invite member", onClick: () => setIsInviteOpen(true) }}
            />
          )
        )}
      </div>

      {/* Deactivated members */}
      {deactivatedMembers.length > 0 && (
        <div className="mt-[28px]">
          <h2 className="mb-[10px] text-[13px] font-semibold text-folk-text">Deactivated</h2>
          <div className={cn(SETTINGS_SECTION_CLASS, "overflow-hidden")}>
            {deactivatedMembers.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                isSuperAdmin={isSuperAdmin}
                canEditRole={canEditRole(member)}
                canToggle={canToggleStatus(member)}
                isRoleOpen={roleChangeId === member.id}
                isMenuOpen={memberMenuId === member.id}
                onRoleToggle={() => setRoleChangeId(roleChangeId === member.id ? null : member.id)}
                onRoleChange={(role) => handleChangeRole(member.id, role)}
                onMenuToggle={() => setMemberMenuId(memberMenuId === member.id ? null : member.id)}
                onToggleStatus={() => handleToggleStatus(member)}
                onRemove={() => handleRemoveMember(member.id)}
                onResendInvite={() => handleResendInvite(member)}
                isDisabledRow
              />
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function MemberRow({
  member,
  isSuperAdmin,
  canEditRole,
  canToggle,
  isRoleOpen,
  isMenuOpen,
  onRoleToggle,
  onRoleChange,
  onMenuToggle,
  onToggleStatus,
  onRemove,
  onResendInvite,
  isDisabledRow,
}: {
  member: WorkspaceMember
  isSuperAdmin: boolean
  canEditRole: boolean
  canToggle: boolean
  isRoleOpen: boolean
  isMenuOpen: boolean
  onRoleToggle: () => void
  onRoleChange: (role: Role) => void
  onMenuToggle: () => void
  onToggleStatus: () => void
  onRemove: () => void
  onResendInvite: () => void
  isDisabledRow?: boolean
}) {
  const displayName = member.name || member.email || member.invited_email || "Unknown"
  const displayEmail = member.email || member.invited_email || ""
  const isActive = member.status !== "deactivated"
  const availableRoles = isSuperAdmin ? allRoles : allRoles.filter((r) => r !== "super-admin")

  return (
    <div className={cn(
      "grid grid-cols-[1fr_120px_80px_48px] items-center border-b border-[#f5f5f5] px-[20px] py-[10px] transition-colors last:border-b-0",
      isDisabledRow ? "opacity-60" : "hover:bg-folk-hover"
    )}>
      <div className="flex items-center gap-[12px]">
        <EntityIcon
          text={displayName.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "?"}
          size="base"
          className={isDisabledRow ? "opacity-50" : undefined}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-[8px]">
            <span className="truncate text-[13px] font-medium text-folk-text">
              {displayName}
            </span>
            {(member.status === "pending" || member.status === "invited") && (
              <Badge variant="warning" className="shrink-0">
                {member.status === "invited" ? "Invited" : "Pending"}
              </Badge>
            )}
          </div>
          {displayEmail && <p className="truncate text-[12px] text-folk-secondary">{displayEmail}</p>}
        </div>
      </div>

      <div className="relative">
        {canEditRole ? (
          <button
            onClick={onRoleToggle}
            className={cn(
              "flex items-center gap-[4px] rounded-full border px-[10px] py-[3px] text-[11px] font-medium transition-colors hover:opacity-80",
              roleConfig[member.role as Role]?.color ?? roleChipFallback
            )}
            tabIndex={0}
          >
            {roleConfig[member.role as Role]?.label ?? member.role}
            <ChevronDown className="h-[10px] w-[10px]" strokeWidth={1.5} />
          </button>
        ) : (
          <span className={cn(
            "inline-flex rounded-full border px-[10px] py-[3px] text-[11px] font-medium",
            isDisabledRow ? "border-folk-border-subtle bg-folk-hover text-folk-placeholder" : (roleConfig[member.role as Role]?.color ?? roleChipFallback)
          )}>
            {roleConfig[member.role as Role]?.label ?? member.role}
          </span>
        )}

        {isRoleOpen && canEditRole && (
          <>
            <div className="fixed inset-0 z-[9]" onClick={onRoleToggle} />
            <div className="absolute left-0 top-full z-10 mt-[4px] w-[260px] rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk-sm">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={cn(
                    "flex w-full flex-col px-[14px] py-[10px] text-left transition-colors hover:bg-folk-hover",
                    member.role === role && "bg-folk-hover"
                  )}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[13px] font-medium text-folk-text">{roleConfig[role].label}</span>
                    {member.role === role && <span className="text-[11px] text-folk-text">✓</span>}
                  </div>
                  <span className="text-[11px] text-folk-secondary">{roleConfig[role].description}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <Switch
          checked={canToggle ? isActive : true}
          onChange={onToggleStatus}
          disabled={!canToggle}
          ariaLabel={canToggle ? (isActive ? "Deactivate member" : "Activate member") : "Super admin — always active"}
        />
      </div>

      <div className="flex justify-end">
        {canToggle ? (
          <div className="relative">
            <button
              onClick={onMenuToggle}
              className="icon-btn flex h-[28px] w-[28px] items-center justify-center text-folk-placeholder hover:text-folk-secondary"
              tabIndex={0}
              aria-label="Member actions"
            >
              <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-[9]" onClick={onMenuToggle} />
                <div className="absolute right-0 top-full z-10 mt-[4px] w-[160px] rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-folk-sm">
                  {(member.status === "pending" || member.status === "invited") && (
                    <button
                      onClick={async () => {
                        await onResendInvite()
                        onMenuToggle()
                      }}
                      className="flex w-full items-center px-[14px] py-[8px] text-[13px] text-folk-text transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                    >
                      Resend invite
                    </button>
                  )}
                  <button
                    onClick={onRemove}
                    className="flex w-full items-center px-[14px] py-[8px] text-[13px] text-red-500 transition-colors hover:bg-red-50"
                    tabIndex={0}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="inline-flex h-[28px] w-[28px] items-center justify-center text-[var(--folk-border)]">
            <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  )
}
