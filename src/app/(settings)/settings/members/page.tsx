"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MoreHorizontal, ChevronDown } from "lucide-react"
import { useMembers } from "@/lib/hooks/use-members"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { WorkspaceMember } from "@/lib/types"

type Role = WorkspaceMember["role"]

const SUPER_ADMIN_EMAIL = "izakjosef@gmail.com"

const roleConfig: Record<Role, { label: string; description: string; color: string }> = {
  "super-admin": { label: "Super Admin", description: "Full access. Can manage billing, members, and account settings.", color: "bg-purple-50 text-purple-600" },
  admin: { label: "Team Leader", description: "Can manage members, settings, and all data.", color: "bg-blue-50 text-blue-600" },
  coordinator: { label: "Coordinator", description: "Can view and edit assigned clients, own tasks, and contacts.", color: "bg-green-50 text-green-600" },
}

const allRoles: Role[] = ["super-admin", "admin", "coordinator"]

export default function MembersSettingsPage() {
  const { members, updateMemberRole, updateMemberStatus, removeMember } = useMembers()
  const { canManageMembers, isSuperAdmin } = usePermissions()
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null)
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null)

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
  }

  if (!canManageMembers) return (
    <div className="py-[40px] text-center text-[14px] text-[#888]">You don&apos;t have permission to manage members.</div>
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
      <div className="mb-[28px]">
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Members</h1>
        <p className="mt-[4px] text-[14px] text-sidebar-muted">
          Manage who has access to this account. To invite new staff, use the Invite button on the Staff page.
        </p>
      </div>

      <div>
        <table className="w-full rounded-lg bg-[#fafafa] text-left">
          <thead>
            <tr className="border-b border-sidebar-border">
              <th className="w-[40%] pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Name</th>
              <th className="w-[25%] pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Role</th>
              <th className="w-[15%] pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Active</th>
              <th className="w-[20%] pb-[10px]" />
            </tr>
          </thead>
          <tbody>
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
              />
            ))}

            {deactivatedMembers.length > 0 && (
              <>
                <tr>
                  <td colSpan={4} className="border-b border-sidebar-border pb-[8px] pt-[20px]">
                    <span className="text-[11px] font-medium tracking-wide text-[#999]">DEACTIVATED</span>
                  </td>
                </tr>
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
                    isDisabledRow
                  />
                ))}
              </>
            )}

            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-[20px] py-[32px] text-center text-[13px] font-medium text-[#bbb]">
                  No members
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
  isDisabledRow?: boolean
}) {
  const displayName = member.name || member.email || member.invited_email || "Unknown"
  const displayEmail = member.email || member.invited_email || ""
  const textColor = isDisabledRow ? "text-[#bbb]" : "text-[#262626]"
  const mutedColor = isDisabledRow ? "text-[#ccc]" : "text-sidebar-muted"
  const isActive = member.status !== "deactivated"
  const availableRoles = isSuperAdmin ? allRoles : allRoles.filter((r) => r !== "super-admin")

  return (
    <tr className="border-b border-sidebar-border transition-colors last:border-b-0 hover:bg-[#fafafa]">
      <td className="py-[12px]">
        <div className="flex items-center gap-[10px]">
          <div className={cn(
            "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] text-[10px] font-semibold",
            isDisabledRow ? "bg-[#e8e8e8] text-[#bbb]" : "bg-[#e8e8e8] text-[#666]"
          )}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-[8px]">
              <span className={cn("truncate text-[13px] font-medium", textColor)}>
                {displayName}
              </span>
              {(member.status === "pending" || member.status === "invited") && (
                <span className="shrink-0 rounded-[4px] bg-yellow-50 px-[6px] py-[1px] text-[10px] font-medium text-yellow-600">
                  {member.status === "invited" ? "Invited" : "Pending"}
                </span>
              )}
            </div>
            {displayEmail && <p className={cn("truncate text-[12px]", mutedColor)}>{displayEmail}</p>}
          </div>
        </div>
      </td>
      <td className="py-[12px]">
        <div className="relative">
          {canEditRole ? (
            <button
              onClick={onRoleToggle}
              className={cn(
                "flex items-center gap-[4px] rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium transition-colors hover:opacity-80",
                roleConfig[member.role as Role]?.color ?? "bg-gray-50 text-gray-600"
              )}
              tabIndex={0}
            >
              {roleConfig[member.role as Role]?.label ?? member.role}
              <ChevronDown className="h-[10px] w-[10px]" strokeWidth={1.5} />
            </button>
          ) : (
            <span className={cn(
              "inline-block rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium",
              isDisabledRow ? "bg-gray-50 text-[#ccc]" : (roleConfig[member.role as Role]?.color ?? "bg-gray-50 text-gray-600")
            )}>
              {roleConfig[member.role as Role]?.label ?? member.role}
            </span>
          )}

          {isRoleOpen && canEditRole && (
            <>
              <div className="fixed inset-0 z-[9]" onClick={onRoleToggle} />
              <div className="absolute left-0 top-full z-10 mt-[4px] w-[260px] rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                {availableRoles.map((role) => (
                  <button
                    key={role}
                    onClick={() => onRoleChange(role)}
                    className={cn(
                      "flex w-full flex-col px-[12px] py-[8px] text-left transition-colors hover:bg-[#f5f5f5]",
                      member.role === role && "bg-[#f5f5f5]"
                    )}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-[6px]">
                      <span className="text-[13px] font-medium text-[#262626]">{roleConfig[role].label}</span>
                      {member.role === role && <span className="text-[11px] text-blue-500">✓</span>}
                    </div>
                    <span className="text-[11px] text-sidebar-muted">{roleConfig[role].description}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </td>
      <td className="py-[12px]">
        {canToggle ? (
          <button
            type="button"
            onClick={onToggleStatus}
            className={cn(
              "relative h-[20px] w-[36px] rounded-full transition-colors",
              isActive ? "bg-blue-500" : "bg-[#d4d4d4]"
            )}
            tabIndex={0}
            aria-label={isActive ? "Deactivate member" : "Activate member"}
            aria-checked={isActive}
            role="switch"
          >
            <span
              className={cn(
                "absolute top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm transition-transform",
                isActive ? "left-[18px]" : "left-[2px]"
              )}
            />
          </button>
        ) : (
          <button
            type="button"
            className="relative h-[20px] w-[36px] cursor-not-allowed rounded-full bg-blue-500 opacity-50"
            disabled
            tabIndex={-1}
            aria-label="Super admin — always active"
            aria-checked
            role="switch"
          >
            <span className="absolute left-[18px] top-[2px] h-[16px] w-[16px] rounded-full bg-white shadow-sm" />
          </button>
        )}
      </td>
      <td className="py-[12px] text-right">
        {canToggle && (
          <div className="relative inline-block">
            <button
              onClick={onMenuToggle}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[4px] text-sidebar-muted transition-colors hover:bg-[#ebebeb] hover:text-sidebar-text"
              tabIndex={0}
              aria-label="Member actions"
            >
              <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-[9]" onClick={onMenuToggle} />
                <div className="absolute right-0 top-full z-10 mt-[4px] w-[160px] rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                  {(member.status === "pending" || member.status === "invited") && (
                    <button
                      onClick={async () => {
                        const email = member.invited_email || member.email
                        if (!email) return
                        try {
                          await fetch("/api/invite", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email, role: member.role }),
                          })
                        } catch { /* silent */ }
                        onMenuToggle()
                      }}
                      className="flex w-full items-center px-[12px] py-[6px] text-[13px] text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      Resend invite
                    </button>
                  )}
                  <button
                    onClick={onRemove}
                    className="flex w-full items-center px-[12px] py-[6px] text-[13px] text-red-500 transition-colors hover:bg-red-50"
                    tabIndex={0}
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        )}
        {!canToggle && (
          <span className="inline-flex h-[28px] w-[28px] items-center justify-center text-[#ccc]">
            <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </span>
        )}
      </td>
    </tr>
  )
}
