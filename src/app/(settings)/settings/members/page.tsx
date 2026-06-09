"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { MoreHorizontal, ChevronDown, Plus, X, Users } from "lucide-react"
import { SearchBar } from "@/components/search-bar"
import { Switch } from "@/components/switch"
import { Badge } from "@/components/badge"
import { Button } from "@/components/button"
import { EmptyState } from "@/components/empty-state"
import { useMembers } from "@/lib/hooks/use-members"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useStaff } from "@/lib/hooks/use-staff"
import { useWorkspace } from "@/lib/workspace-context"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { WorkspaceMember } from "@/lib/types"

type Role = WorkspaceMember["role"]

const SUPER_ADMIN_EMAIL = "izakjosef@gmail.com"

const roleConfig: Record<Role, { label: string; description: string; color: string }> = {
  "super-admin": { label: "Super Admin", description: "Full access. Can manage billing, members, and account settings.", color: "bg-purple-50 text-purple-600 border-purple-100" },
  admin: { label: "Team Leader", description: "Can manage members, settings, and all data.", color: "bg-blue-50 text-blue-600 border-blue-100" },
  coordinator: { label: "Coordinator", description: "Can view and edit assigned clients, own tasks, and contacts.", color: "bg-green-50 text-green-600 border-green-100" },
}

const allRoles: Role[] = ["super-admin", "admin", "coordinator"]

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
      <p className="text-[14px] text-[#888]">You don&apos;t have permission to manage members.</p>
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
        <h1 className="text-[20px] font-bold text-[#262626]">Members</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Manage who has access to this workspace.
        </p>
      </div>

      {isInviteOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setIsInviteOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[420px] rounded-[8px] border border-[#f0f0f0] bg-white p-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
              <div className="mb-[16px] flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-[#262626]">Invite a member</h2>
                <button onClick={() => setIsInviteOpen(false)} className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#999] transition-colors hover:bg-[#f5f5f5]" tabIndex={0} aria-label="Close">
                  <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
                </button>
              </div>
              <label className="mb-[4px] block text-[13px] font-medium text-[#555]">Email address</label>
              <input
                ref={inviteInputRef}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleInvite() }}
                placeholder="colleague@example.com"
                className="mb-[12px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] py-[9px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
              />
              <label className="mb-[4px] block text-[13px] font-medium text-[#555]">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="mb-[16px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] py-[9px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
              >
                {(isSuperAdmin ? allRoles : allRoles.filter((r) => r !== "super-admin")).map((r) => (
                  <option key={r} value={r}>{roleConfig[r].label}</option>
                ))}
              </select>
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
        <div className="mb-[12px] flex items-start justify-between gap-[12px] rounded-[8px] border border-amber-100 bg-amber-50 px-[14px] py-[10px]">
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
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search members…"
          className="flex-1"
        />
        <Button onClick={() => setIsInviteOpen(true)} className="h-[36px] shrink-0 px-[12px]">
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          Invite member
        </Button>
      </div>

      {/* Active members */}
      <div className="overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_80px_48px] items-center border-b border-[#efefef] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-[#999]">Name</span>
          <span className="text-[12px] font-medium text-[#999]">Role</span>
          <span className="text-[12px] font-medium text-[#999]">Active</span>
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
            <div className="px-[20px] py-[40px] text-center text-[13px] text-[#bbb]">
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
          <h2 className="mb-[10px] text-[13px] font-semibold uppercase tracking-wide text-[#999]">Deactivated</h2>
          <div className="overflow-hidden">
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
      "grid grid-cols-[1fr_120px_80px_48px] items-center border-b border-[#efefef] px-[20px] py-[14px] transition-colors last:border-b-0",
      isDisabledRow ? "opacity-60" : "hover:bg-[#f5f5f5]"
    )}>
      <div className="flex items-center gap-[12px]">
        <div className={cn(
          "flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[8px] text-[12px] font-semibold",
          isDisabledRow ? "bg-[#DBEAFE]/50 text-[#2563EB]/40" : "bg-[#DBEAFE] text-[#2563EB]"
        )}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-[8px]">
            <span className="truncate text-[14px] font-medium text-[#262626]">
              {displayName}
            </span>
            {(member.status === "pending" || member.status === "invited") && (
              <Badge variant="warning" className="shrink-0">
                {member.status === "invited" ? "Invited" : "Pending"}
              </Badge>
            )}
          </div>
          {displayEmail && <p className="truncate text-[12px] text-[#999]">{displayEmail}</p>}
        </div>
      </div>

      <div className="relative">
        {canEditRole ? (
          <button
            onClick={onRoleToggle}
            className={cn(
              "flex items-center gap-[4px] rounded-[6px] border px-[10px] py-[3px] text-[11px] font-medium transition-colors hover:opacity-80",
              roleConfig[member.role as Role]?.color ?? "bg-gray-50 text-gray-600 border-gray-100"
            )}
            tabIndex={0}
          >
            {roleConfig[member.role as Role]?.label ?? member.role}
            <ChevronDown className="h-[10px] w-[10px]" strokeWidth={1.5} />
          </button>
        ) : (
          <span className={cn(
            "inline-flex rounded-[6px] border px-[10px] py-[3px] text-[11px] font-medium",
            isDisabledRow ? "bg-gray-50 text-[#ccc] border-gray-100" : (roleConfig[member.role as Role]?.color ?? "bg-gray-50 text-gray-600 border-gray-100")
          )}>
            {roleConfig[member.role as Role]?.label ?? member.role}
          </span>
        )}

        {isRoleOpen && canEditRole && (
          <>
            <div className="fixed inset-0 z-[9]" onClick={onRoleToggle} />
            <div className="absolute left-0 top-full z-10 mt-[4px] w-[260px] rounded-[8px] border border-[#f0f0f0] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
              {availableRoles.map((role) => (
                <button
                  key={role}
                  onClick={() => onRoleChange(role)}
                  className={cn(
                    "flex w-full flex-col px-[14px] py-[10px] text-left transition-colors hover:bg-[#f5f5f5]",
                    member.role === role && "bg-[#f5f5f5]"
                  )}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-[6px]">
                    <span className="text-[13px] font-medium text-[#262626]">{roleConfig[role].label}</span>
                    {member.role === role && <span className="text-[11px] text-blue-500">✓</span>}
                  </div>
                  <span className="text-[11px] text-[#888]">{roleConfig[role].description}</span>
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
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#bbb] transition-colors hover:bg-[#ebebeb] hover:text-[#666]"
              tabIndex={0}
              aria-label="Member actions"
            >
              <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-[9]" onClick={onMenuToggle} />
                <div className="absolute right-0 top-full z-10 mt-[4px] w-[160px] rounded-[8px] border border-[#f0f0f0] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                  {(member.status === "pending" || member.status === "invited") && (
                    <button
                      onClick={async () => {
                        await onResendInvite()
                        onMenuToggle()
                      }}
                      className="flex w-full items-center px-[14px] py-[8px] text-[13px] text-[#262626] transition-colors hover:bg-[#f5f5f5]"
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
          <span className="inline-flex h-[28px] w-[28px] items-center justify-center text-[#d4d4d4]">
            <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  )
}
