"use client"

import { useEffect, useRef, useState } from "react"
import { UserPlus, X } from "lucide-react"
import { FormModal } from "@/components/form-modal"
import { useToast } from "@/components/toast"
import { useStaff } from "@/lib/hooks/use-staff"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { useWorkspace } from "@/lib/workspace-context"
import {
  INVITE_MEMBER_ROLE_LABELS,
  INVITE_MEMBER_ROLES,
  inviteMemberAndCreateStaff,
  type InviteMemberRole,
} from "@/lib/invite-member"

interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const inputClass =
  "h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none transition-colors focus:border-[#a3c4f3]"

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const { activeWorkspace } = useWorkspace()
  const { staff, addStaff } = useStaff()
  const { isSuperAdmin } = usePermissions()
  const { toast } = useToast()

  const nameInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<InviteMemberRole>("coordinator")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const roleOptions = isSuperAdmin
    ? INVITE_MEMBER_ROLES
    : INVITE_MEMBER_ROLES.filter((item) => item !== "super-admin")

  useEffect(() => {
    if (!isOpen) return
    setFullName("")
    setEmail("")
    setRole("coordinator")
    setError(null)
    setTimeout(() => nameInputRef.current?.focus(), 50)
  }, [isOpen])

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const handleSubmit = async () => {
    if (!activeWorkspace) {
      setError("Workspace not ready.")
      return
    }

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    if (!trimmedName) {
      setError("Enter a name for this team member.")
      return
    }
    if (!trimmedEmail.includes("@")) {
      setError("Enter a valid email address.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    const result = await inviteMemberAndCreateStaff(
      {
        fullName: trimmedName,
        email: trimmedEmail,
        role,
        workspaceId: activeWorkspace.id,
      },
      { addStaff, existingStaff: staff },
    )

    setIsSubmitting(false)

    if (!result.success) {
      setError(result.error || "Failed to invite member")
      return
    }

    if (result.warning) toast(result.warning, "info")
    else toast("Invite sent and staff profile created", "success")

    onSuccess?.()
    onClose()
  }

  if (!isOpen) return null

  return (
    <FormModal onClose={handleClose} width={440}>
      <div className="flex items-center justify-between px-[24px] pt-[20px]">
        <div className="flex items-center gap-[8px]">
          <UserPlus className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
          <h2 className="text-[15px] font-semibold text-folk-text">Invite team member</h2>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Close"
        >
          <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-[24px] pb-[20px] pt-[16px]">
        <p className="mb-[16px] text-[13px] leading-[1.5] text-folk-secondary">
          Sends a workspace invite and creates their staff profile so you can assign shifts, clients, and tasks right away.
        </p>

        <div className="mb-[14px]">
          <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Full name *</label>
          <input
            ref={nameInputRef}
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit()
            }}
            placeholder="Alex Morgan"
            className={inputClass}
            aria-label="Full name"
          />
        </div>

        <div className="mb-[14px]">
          <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Email *</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSubmit()
            }}
            placeholder="name@company.com"
            className={inputClass}
            aria-label="Email address"
          />
        </div>

        <div className="mb-[16px]">
          <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Role</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as InviteMemberRole)}
            className={inputClass}
            aria-label="Workspace role"
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {INVITE_MEMBER_ROLE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="mb-[12px] text-[13px] text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-[10px]">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:text-folk-secondary disabled:opacity-50"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !fullName.trim() || !email.trim().includes("@")}
            className="primary-btn rounded-full px-[16px] py-[6px] text-[13px] font-medium disabled:opacity-50"
            tabIndex={0}
          >
            {isSubmitting ? "Sending…" : "Send invite"}
          </button>
        </div>
      </div>
    </FormModal>
  )
}
