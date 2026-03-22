"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Plus, MoreHorizontal, X, ChevronDown, Mail } from "lucide-react"
import { useMembers } from "@/lib/hooks/use-members"
import type { WorkspaceMember } from "@/lib/types"

type Role = WorkspaceMember["role"]

const roleConfig: Record<Role, { label: string; description: string; color: string }> = {
  "super-admin": { label: "Super Admin", description: "Full access. Can manage billing, members, and delete workspace.", color: "bg-purple-50 text-purple-600" },
  admin: { label: "Admin", description: "Can manage members, settings, and all data.", color: "bg-blue-50 text-blue-600" },
  "support-worker": { label: "Support Worker", description: "Can view and edit clients, tasks, and contacts.", color: "bg-green-50 text-green-600" },
}

const allRoles: Role[] = ["super-admin", "admin", "support-worker"]

export default function MembersSettingsPage() {
  const { members, inviteMember, updateMemberRole, removeMember } = useMembers()
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<Role>("support-worker")
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [memberMenuId, setMemberMenuId] = useState<string | null>(null)
  const [roleChangeId, setRoleChangeId] = useState<string | null>(null)

  const handleInvite = async () => {
    if (!inviteEmail || !inviteEmail.includes("@")) return
    await inviteMember(inviteEmail, inviteRole)
    setInviteEmail("")
    setInviteRole("support-worker")
    setIsInviteOpen(false)
  }

  const handleChangeRole = async (memberId: string, newRole: Role) => {
    await updateMemberRole(memberId, newRole)
    setRoleChangeId(null)
  }

  const handleRemoveMember = async (memberId: string) => {
    await removeMember(memberId)
    setMemberMenuId(null)
  }

  const inputClass = "h-[38px] w-full rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] text-[14px] text-[#262626] outline-none transition-colors focus:border-[#bbb] focus:bg-white"

  return (
    <>
      <div className="mb-[28px] flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Members</h1>
          <p className="mt-[4px] text-[14px] text-sidebar-muted">
            Manage who has access to this workspace.
          </p>
        </div>
        <button
          onClick={() => setIsInviteOpen(true)}
          className="flex h-[34px] items-center gap-[6px] rounded-[6px] bg-[#262626] px-[14px] text-[13px] font-medium text-white transition-colors hover:bg-[#3d3d3d]"
        >
          <Plus className="h-[14px] w-[14px]" strokeWidth={2} />
          Invite member
        </button>
      </div>

      {isInviteOpen && (
        <div className="mb-[24px] rounded-[8px] border border-sidebar-border p-[20px]">
          <div className="mb-[16px] flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-[#1a1a1a]">Invite a new member</h3>
            <button
              onClick={() => { setIsInviteOpen(false); setInviteEmail(""); setIsRoleDropdownOpen(false) }}
              className="text-sidebar-muted transition-colors hover:text-sidebar-text"
            >
              <X className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>
          </div>

          <div className="flex gap-[12px]">
            <div className="flex-1">
              <label className="mb-[6px] block text-[13px] font-medium text-sidebar-muted">Email address</label>
              <div className="relative">
                <Mail className="absolute left-[10px] top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-sidebar-muted" strokeWidth={1.75} />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className={cn(inputClass, "pl-[32px]")}
                  placeholder="colleague@company.com"
                  onKeyDown={(e) => { if (e.key === "Enter") handleInvite() }}
                />
              </div>
            </div>

            <div className="w-[140px]">
              <label className="mb-[6px] block text-[13px] font-medium text-sidebar-muted">Role</label>
              <div className="relative">
                <button
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] text-[14px] text-[#262626] transition-colors hover:bg-white"
                >
                  {roleConfig[inviteRole].label}
                  <ChevronDown className="h-[14px] w-[14px] text-sidebar-muted" strokeWidth={1.75} />
                </button>
                {isRoleDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-[4px] rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    {allRoles.filter((r) => r !== "super-admin").map((role) => (
                      <button
                        key={role}
                        onClick={() => { setInviteRole(role); setIsRoleDropdownOpen(false) }}
                        className="flex w-full flex-col px-[12px] py-[6px] text-left transition-colors hover:bg-[#f5f5f5]"
                      >
                        <span className="text-[13px] font-medium text-[#262626]">{roleConfig[role].label}</span>
                        <span className="text-[11px] text-sidebar-muted">{roleConfig[role].description}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-[16px]">
            <button
              onClick={handleInvite}
              disabled={!inviteEmail}
              className={cn(
                "h-[34px] rounded-[6px] px-[16px] text-[13px] font-medium transition-colors",
                inviteEmail
                  ? "bg-[#262626] text-white hover:bg-[#3d3d3d]"
                  : "bg-sidebar-hover text-[#bbb] cursor-not-allowed"
              )}
            >
              Send invite
            </button>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-[12px] text-[14px] font-semibold text-[#1a1a1a]">
          Members ({members.length})
        </h2>
        <table className="w-full">
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
                          roleConfig[member.role].color,
                          member.role !== "super-admin" && "cursor-pointer hover:opacity-80"
                        )}
                        disabled={member.role === "super-admin"}
                      >
                        {roleConfig[member.role].label}
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
                              <button className="flex w-full items-center px-[12px] py-[6px] text-[13px] text-[#262626] transition-colors hover:bg-[#f5f5f5]">
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
