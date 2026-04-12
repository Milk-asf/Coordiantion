"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { MoreHorizontal } from "lucide-react"
import { useMembers } from "@/lib/hooks/use-members"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { WorkspaceMember } from "@/lib/types"

type Role = WorkspaceMember["role"]

const roleConfig: Record<Role, { label: string; description: string; color: string }> = {
  "super-admin": { label: "Super Admin", description: "Full access. Can manage billing, members, and account settings.", color: "bg-purple-50 text-purple-600" },
  admin: { label: "Team Leader", description: "Can manage members, settings, and all data.", color: "bg-blue-50 text-blue-600" },
  coordinator: { label: "Coordinator", description: "Can view and edit assigned clients, own tasks, and contacts.", color: "bg-green-50 text-green-600" },
}

const allRoles: Role[] = ["super-admin", "admin", "coordinator"]

export default function MembersSettingsPage() {
  const { members, updateMemberRole, removeMember } = useMembers()
  const { canManageMembers } = usePermissions()
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

  if (!canManageMembers) return (
    <div className="py-[40px] text-center text-[14px] text-[#888]">You don&apos;t have permission to manage members.</div>
  )

  return (
    <>
      <div className="mb-[28px]">
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Members</h1>
        <p className="mt-[4px] text-[14px] text-sidebar-muted">
          Manage who has access to this account. To invite new staff, use the Invite button on the Staff page.
        </p>
      </div>

      <div>
        <h2 className="mb-[12px] text-[14px] font-semibold text-[#1a1a1a]">
          Members ({members.length})
        </h2>
        <table className="w-full rounded-lg bg-[#fafafa]">
          <thead>
            <tr className="border-b border-sidebar-border">
              <th className="pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Name</th>
              <th className="pb-[10px] text-left text-[12px] font-medium text-sidebar-muted">Role</th>
              <th className="pb-[10px] text-right text-[12px] font-medium text-sidebar-muted"></th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const displayName = member.name || member.email || member.invited_email || "Unknown"
              const displayEmail = member.email || member.invited_email || ""
              return (
                <tr key={member.id} className="border-b border-sidebar-border last:border-b-0">
                  <td className="py-[12px]">
                    <div className="flex items-center gap-[10px]">
                      <div className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[6px] bg-[#e8e8e8] text-[12px] font-semibold text-[#666]">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-[8px]">
                          <span className="truncate text-[13px] font-medium text-[#262626]">
                            {displayName}
                          </span>
                          {(member.status === "pending" || member.status === "invited") && (
                            <span className="shrink-0 rounded-[3px] bg-yellow-50 px-[6px] py-[1px] text-[10px] font-medium text-yellow-600">
                              {member.status === "invited" ? "Invited" : "Pending"}
                            </span>
                          )}
                        </div>
                        {displayEmail && <p className="truncate text-[12px] text-sidebar-muted">{displayEmail}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-[12px]">
                    <div className="relative">
                      <button
                        onClick={() => setRoleChangeId(roleChangeId === member.id ? null : member.id)}
                        className={cn(
                          "rounded-[4px] px-[8px] py-[3px] text-[11px] font-medium transition-colors",
                          roleConfig[member.role as Role]?.color ?? "bg-gray-50 text-gray-600",
                          member.role !== "super-admin" && "cursor-pointer hover:opacity-80"
                        )}
                        disabled={member.role === "super-admin"}
                      >
                        {roleConfig[member.role as Role]?.label ?? member.role}
                      </button>

                      {roleChangeId === member.id && member.role !== "super-admin" && (
                        <div className="absolute left-0 top-full z-10 mt-[4px] w-[200px] rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                          {allRoles.filter((r) => r !== "super-admin").map((role) => (
                            <button
                              key={role}
                              onClick={() => handleChangeRole(member.id, role)}
                              className={cn(
                                "flex w-full flex-col px-[12px] py-[6px] text-left transition-colors hover:bg-[#f5f5f5]",
                                member.role === role && "bg-[#f5f5f5]"
                              )}
                            >
                              <span className="text-[13px] font-medium text-[#262626]">{roleConfig[role].label}</span>
                              <span className="text-[11px] text-sidebar-muted">{roleConfig[role].description}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-[12px] text-right">
                    {member.role !== "super-admin" && (
                      <div className="relative inline-block">
                        <button
                          onClick={() => setMemberMenuId(memberMenuId === member.id ? null : member.id)}
                          className="flex h-[28px] w-[28px] items-center justify-center rounded-[4px] text-sidebar-muted transition-colors hover:bg-[#ebebeb] hover:text-sidebar-text"
                        >
                          <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
                        </button>

                        {memberMenuId === member.id && (
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
                                  setMemberMenuId(null)
                                }}
                                className="flex w-full items-center px-[12px] py-[6px] text-[13px] text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                              >
                                Resend invite
                              </button>
                            )}
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="flex w-full items-center px-[12px] py-[6px] text-[13px] text-red-500 transition-colors hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
