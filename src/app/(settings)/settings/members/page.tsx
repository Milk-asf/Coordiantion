"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { MoreHorizontal, ChevronDown, Plus, X } from "lucide-react"
import { useMembers } from "@/lib/hooks/use-members"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useStaff } from "@/lib/hooks/use-staff"
import { useWorkspace } from "@/lib/workspace-context"
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
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("coordinator")
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const inviteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isInviteOpen) setTimeout(() => inviteInputRef.current?.focus(), 50)
  }, [isInviteOpen])

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
    <div className="flex items-center justify-center rounded-[14px] border border-[#e5e5e5] bg-[#fafafa] py-[48px]">
      <p className="text-[14px] text-[#888]">You don&apos;t have permission to manage members.</p>
    </div>
  )

  const activeMembers = members.filter((m) => m.status !== "deactivated")
  const deactivatedMembers = members.filter((m) => m.status === "deactivated")

  const isMemberSuperAdminEmail = (m: WorkspaceMember) =>
    (m.email === SUPER_ADMIN_EMAIL || m.invited_email === SUPER_ADMIN_EMAIL)

  const canEditRole = (member: WorkspaceMember) => {
    if (!isSuperAdmin) return false
    if (isMemberSuperAdminEmail(member)) return false
    return true
  }

  const canToggleStatus = (member: WorkspaceMember) => {
    if (isMemberSuperAdminEmail(member)) return false
    return true
  }

  return (
    <>
      <div className="mb-[32px] flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-[#262626]">Members</h1>
          <p className="mt-[4px] text-[14px] text-[#888]">
            Manage who has access to this workspace.
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="primary-btn flex items-center gap-[5px] rounded-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors"
          tabIndex={0}
        >
          <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
          Invite member
        </button>
      </div>

      {isInviteOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setIsInviteOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]">
            <div className="w-full max-w-[420px] rounded-[14px] border border-[#e5e5e5] bg-white p-[24px] shadow-[0_12px_40px_rgba(0,0,0,0.12)]">
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
                className="mb-[12px] w-full rounded-[8px] border border-[#e0e0e0] bg-white px-[12px] py-[9px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
              />
              <label className="mb-[4px] block text-[13px] font-medium text-[#555]">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="mb-[16px] w-full rounded-[8px] border border-[#e0e0e0] bg-white px-[12px] py-[9px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb]"
              >
                {(isSuperAdmin ? allRoles : allRoles.filter((r) => r !== "super-admin")).map((r) => (
                  <option key={r} value={r}>{roleConfig[r].label}</option>
                ))}
              </select>
              {inviteError && <p className="mb-[12px] text-[13px] text-red-500">{inviteError}</p>}
              <div className="flex justify-end gap-[8px]">
                <button onClick={() => setIsInviteOpen(false)} className="rounded-[8px] border border-[#e0e0e0] bg-white px-[14px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
                  Cancel
                </button>
                <button
                  onClick={handleInvite}
                  disabled={isInviting || !inviteEmail?.includes("@")}
                  className="primary-btn rounded-[8px] px-[14px] py-[7px] text-[13px] font-medium transition-colors disabled:opacity-50"
                  tabIndex={0}
                >
                  {isInviting ? "Sending…" : "Send invite"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Active members */}
      <div className="overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#fafafa]">
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

        {members.length === 0 && (
          <div className="px-[20px] py-[40px] text-center text-[13px] text-[#bbb]">
            No members
          </div>
        )}
      </div>

      {/* Deactivated members */}
      {deactivatedMembers.length > 0 && (
        <div className="mt-[28px]">
          <h2 className="mb-[10px] text-[13px] font-semibold uppercase tracking-wide text-[#999]">Deactivated</h2>
          <div className="overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#fafafa]">
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
          isDisabledRow ? "bg-[#e8e8e8] text-[#bbb]" : "bg-[#e8e8e8] text-[#666]"
        )}>
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-[8px]">
            <span className="truncate text-[14px] font-medium text-[#262626]">
              {displayName}
            </span>
            {(member.status === "pending" || member.status === "invited") && (
              <span className="shrink-0 rounded-full bg-yellow-50 px-[8px] py-[2px] text-[11px] font-medium text-yellow-600">
                {member.status === "invited" ? "Invited" : "Pending"}
              </span>
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
              "flex items-center gap-[4px] rounded-full border px-[10px] py-[3px] text-[11px] font-medium transition-colors hover:opacity-80",
              roleConfig[member.role as Role]?.color ?? "bg-gray-50 text-gray-600 border-gray-100"
            )}
            tabIndex={0}
          >
            {roleConfig[member.role as Role]?.label ?? member.role}
            <ChevronDown className="h-[10px] w-[10px]" strokeWidth={1.5} />
          </button>
        ) : (
          <span className={cn(
            "inline-flex rounded-full border px-[10px] py-[3px] text-[11px] font-medium",
            isDisabledRow ? "bg-gray-50 text-[#ccc] border-gray-100" : (roleConfig[member.role as Role]?.color ?? "bg-gray-50 text-gray-600 border-gray-100")
          )}>
            {roleConfig[member.role as Role]?.label ?? member.role}
          </span>
        )}

        {isRoleOpen && canEditRole && (
          <>
            <div className="fixed inset-0 z-[9]" onClick={onRoleToggle} />
            <div className="absolute left-0 top-full z-10 mt-[4px] w-[260px] rounded-[10px] border border-[#e5e5e5] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
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
        {canToggle ? (
          <button
            type="button"
            onClick={onToggleStatus}
            className="relative h-[22px] w-[40px] rounded-full transition-colors"
            style={{ backgroundColor: isActive ? "#262626" : "#d4d4d4" }}
            tabIndex={0}
            aria-label={isActive ? "Deactivate member" : "Activate member"}
            aria-checked={isActive}
            role="switch"
          >
            <span
              className={cn(
                "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
                isActive ? "left-[20px]" : "left-[2px]"
              )}
            />
          </button>
        ) : (
          <button
            type="button"
            className="relative h-[22px] w-[40px] cursor-not-allowed rounded-full opacity-50"
            style={{ backgroundColor: "#262626" }}
            disabled
            tabIndex={-1}
            aria-label="Super admin — always active"
            aria-checked
            role="switch"
          >
            <span className="absolute left-[20px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm" />
          </button>
        )}
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
                <div className="absolute right-0 top-full z-10 mt-[4px] w-[160px] rounded-[10px] border border-[#e5e5e5] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
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
