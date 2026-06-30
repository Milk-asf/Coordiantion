"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronDown, Download, Paperclip, Upload, X } from "lucide-react"
import { Button } from "@/components/button"
import {
  getReimbursementCategoryLabel,
  getReimbursementStatusClasses,
  getReimbursementStatusLabel,
  isReimbursementEditable,
  reimbursementCategories,
  reimbursementStatuses,
} from "@/lib/reimbursements"
import { FixedSelectDropdown, FixedSelectOption, FixedDropdownEmptyMessage } from "@/components/fixed-select-dropdown"
import { useClients } from "@/lib/hooks/use-clients"
import { useRosterContext } from "@/lib/roster-context"
import type { ReimbursementInput } from "@/lib/hooks/use-reimbursements"
import type { Reimbursement, ReimbursementCategory, ReimbursementStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

interface ReimbursementSidebarFormProps {
  mode: "add" | "edit"
  reimbursement?: Reimbursement | null
  isAdmin: boolean
  isSaving: boolean
  onSave: (input: ReimbursementInput, file: File | null) => Promise<void>
  onSend?: () => Promise<void>
  onApprove?: () => Promise<void>
  onReturn?: (note: string) => Promise<void>
  onDelete?: () => Promise<void>
  onDownloadAttachment?: () => Promise<void>
  getAttachmentUrl?: (storagePath: string) => Promise<string | null>
  onClose: () => void
}

const emptyForm: ReimbursementInput = {
  title: "",
  amount: 0,
  category: "travel",
  clientId: null,
  clientName: "",
  shiftId: null,
  dateIncurred: new Date().toISOString().slice(0, 10),
  description: "",
  status: "draft",
}

function formatShiftLabel(date: string, startTime: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  const day = Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
  return startTime ? `${day} · ${startTime}` : day
}

export function ReimbursementSidebarForm({
  mode,
  reimbursement,
  isAdmin,
  isSaving,
  onSave,
  onSend,
  onApprove,
  onReturn,
  onDelete,
  onDownloadAttachment,
  getAttachmentUrl,
  onClose,
}: ReimbursementSidebarFormProps) {
  const isEditing = mode === "edit"
  const editable = !reimbursement || isReimbursementEditable(reimbursement.status)
  const { clients } = useClients()
  const { shifts } = useRosterContext()
  const [form, setForm] = useState<ReimbursementInput>(() =>
    reimbursement
      ? {
          title: reimbursement.title,
          amount: reimbursement.amount,
          category: reimbursement.category,
          clientId: reimbursement.clientId,
          clientName: reimbursement.clientName,
          shiftId: reimbursement.shiftId,
          dateIncurred: reimbursement.dateIncurred,
          description: reimbursement.description,
          status: reimbursement.status,
        }
      : emptyForm,
  )
  const [file, setFile] = useState<File | null>(null)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isClientOpen, setIsClientOpen] = useState(false)
  const [isShiftOpen, setIsShiftOpen] = useState(false)
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [isReturning, setIsReturning] = useState(false)
  const [returnNote, setReturnNote] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const categoryBtnRef = useRef<HTMLButtonElement>(null)
  const clientBtnRef = useRef<HTMLButtonElement>(null)
  const shiftBtnRef = useRef<HTMLButtonElement>(null)
  const statusBtnRef = useRef<HTMLButtonElement>(null)

  const attachmentLabel = file?.name || reimbursement?.attachmentName || ""
  const statusChanged = !!reimbursement && form.status !== reimbursement.status
  const canSave = form.title.trim().length > 0 && form.amount >= 0 && (editable || statusChanged)

  const clientShifts = useMemo(() => {
    if (!form.clientId) return []
    return shifts
      .filter((shift) => shift.clientId === form.clientId)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30)
  }, [shifts, form.clientId])

  const selectedShift = useMemo(
    () => clientShifts.find((shift) => shift.id === form.shiftId) ?? null,
    [clientShifts, form.shiftId],
  )

  // Resolve a signed URL so image receipts can be previewed inline.
  const isImageReceipt = !file && (reimbursement?.attachmentMimeType || "").startsWith("image/")
  const localPreviewUrl = file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null

  useEffect(() => {
    let cancelled = false
    if (!isImageReceipt || !reimbursement?.attachmentStoragePath || !getAttachmentUrl) {
      setPreviewUrl(null)
      return
    }
    getAttachmentUrl(reimbursement.attachmentStoragePath).then((url) => {
      if (!cancelled) setPreviewUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [isImageReceipt, reimbursement?.attachmentStoragePath, getAttachmentUrl])

  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl)
    }
  }, [localPreviewUrl])

  const handleSave = async () => {
    if (!canSave) return
    await onSave(form, file)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <div>
          <h2 className="text-[13px] font-semibold text-folk-text">
            {isEditing ? "Reimbursement" : "New reimbursement"}
          </h2>
          {reimbursement && (
            <span className={cn("mt-[6px] inline-flex h-[22px] items-center rounded-none px-[8px] text-[11px] font-medium", getReimbursementStatusClasses(form.status))}>
              {getReimbursementStatusLabel(form.status)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Close reimbursement form"
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-[24px] py-[14px]">
          {reimbursement?.status === "returned" && reimbursement.reviewNote && (
            <div className="mb-[14px] rounded-none border border-amber-200 bg-amber-50 px-[12px] py-[10px]">
              <p className="text-[12px] font-semibold text-amber-900">Returned for changes</p>
              <p className="mt-[4px] text-[12px] leading-snug text-amber-800">{reimbursement.reviewNote}</p>
            </div>
          )}

          {reimbursement?.createdByName && (
            <div className="mb-[14px] rounded-none border border-folk-border bg-folk-page px-[12px] py-[10px]">
              <p className="text-[11px] font-medium text-folk-secondary">Submitted by</p>
              <p className="mt-[2px] text-[13px] font-medium text-folk-text">{reimbursement.createdByName}</p>
              {reimbursement.approvedByName && (
                <>
                  <p className="mt-[8px] text-[11px] font-medium text-folk-secondary">Approved by</p>
                  <p className="mt-[2px] text-[13px] font-medium text-folk-text">{reimbursement.approvedByName}</p>
                </>
              )}
            </div>
          )}

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Status</label>
            <button
              ref={statusBtnRef}
              type="button"
              onClick={() => setIsStatusOpen((open) => !open)}
              className="flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border bg-folk-surface px-[10px] text-left transition-colors hover:border-[#bababa]"
              tabIndex={0}
            >
              <span className="text-[13px] font-medium text-folk-text">{getReimbursementStatusLabel(form.status)}</span>
              <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
            </button>
            <FixedSelectDropdown
              isOpen={isStatusOpen}
              anchorRef={statusBtnRef}
              onClose={() => setIsStatusOpen(false)}
              estimatedHeight={reimbursementStatuses.length * 32 + 8}
            >
              {reimbursementStatuses.map((status) => (
                <FixedSelectOption
                  key={status.value}
                  isActive={form.status === status.value}
                  onClick={() => {
                    setForm((current) => ({ ...current, status: status.value as ReimbursementStatus }))
                    setIsStatusOpen(false)
                  }}
                >
                  {status.label}
                </FixedSelectOption>
              ))}
            </FixedSelectDropdown>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">What is this for?</label>
            <input
              type="text"
              value={form.title}
              disabled={!editable}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="h-[36px] w-full rounded-none border border-folk-border px-[10px] text-[13px] font-medium text-folk-text outline-none transition-colors focus:border-[#a3c4f3] disabled:bg-folk-page disabled:text-folk-secondary"
              placeholder="e.g. Parking at appointment"
            />
          </div>

          <div className="mb-[14px] grid grid-cols-2 gap-[12px]">
            <div>
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-folk-secondary">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount === 0 ? "" : form.amount}
                  disabled={!editable}
                  placeholder="0.00"
                  onChange={(event) => {
                    const raw = event.target.value
                    const parsed = Number(raw)
                    setForm((current) => ({ ...current, amount: raw === "" || Number.isNaN(parsed) ? 0 : parsed }))
                  }}
                  className="h-[36px] w-full rounded-none border border-folk-border pl-[22px] pr-[10px] text-[13px] font-medium text-folk-text outline-none transition-colors focus:border-[#a3c4f3] disabled:bg-folk-page disabled:text-folk-secondary"
                />
              </div>
            </div>
            <div>
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Date incurred</label>
              <input
                type="date"
                value={form.dateIncurred ?? ""}
                disabled={!editable}
                onChange={(event) => setForm((current) => ({ ...current, dateIncurred: event.target.value || null }))}
                className="h-[36px] w-full rounded-none border border-folk-border px-[10px] text-[13px] font-medium text-folk-text outline-none transition-colors focus:border-[#a3c4f3] disabled:bg-folk-page disabled:text-folk-secondary"
              />
            </div>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Category</label>
            <button
              ref={categoryBtnRef}
              type="button"
              disabled={!editable}
              onClick={() => editable && setIsCategoryOpen((open) => !open)}
              className={cn(
                "flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border px-[10px] text-left transition-colors",
                editable ? "bg-folk-surface hover:border-[#bababa]" : "cursor-not-allowed bg-folk-page text-folk-secondary",
              )}
              tabIndex={0}
            >
              <span className="text-[13px] font-medium text-folk-text">{getReimbursementCategoryLabel(form.category)}</span>
              <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
            </button>
            <FixedSelectDropdown
              isOpen={isCategoryOpen}
              anchorRef={categoryBtnRef}
              onClose={() => setIsCategoryOpen(false)}
              estimatedHeight={reimbursementCategories.length * 32 + 8}
            >
              {reimbursementCategories.map((category) => (
                <FixedSelectOption
                  key={category.value}
                  isActive={form.category === category.value}
                  onClick={() => {
                    setForm((current) => ({ ...current, category: category.value as ReimbursementCategory }))
                    setIsCategoryOpen(false)
                  }}
                >
                  {category.label}
                </FixedSelectOption>
              ))}
            </FixedSelectDropdown>
          </div>

          <div className="mb-[14px] grid grid-cols-2 gap-[12px]">
            <div>
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Participant</label>
              <button
                ref={clientBtnRef}
                type="button"
                disabled={!editable}
                onClick={() => editable && setIsClientOpen((open) => !open)}
                className={cn(
                  "flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border px-[10px] text-left transition-colors",
                  editable ? "bg-folk-surface hover:border-[#bababa]" : "cursor-not-allowed bg-folk-page text-folk-secondary",
                )}
                tabIndex={0}
              >
                <span className={cn("truncate text-[13px] font-medium", form.clientId ? "text-folk-text" : "text-folk-secondary")}>
                  {form.clientName || "None"}
                </span>
                <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
              </button>
              <FixedSelectDropdown
                isOpen={isClientOpen}
                anchorRef={clientBtnRef}
                onClose={() => setIsClientOpen(false)}
              >
                <FixedSelectOption
                  muted
                  isActive={!form.clientId}
                  onClick={() => {
                    setForm((current) => ({ ...current, clientId: null, clientName: "", shiftId: null }))
                    setIsClientOpen(false)
                  }}
                >
                  None
                </FixedSelectOption>
                {clients.map((client) => (
                  <FixedSelectOption
                    key={client.id}
                    isActive={form.clientId === client.id}
                    onClick={() => {
                      setForm((current) => ({ ...current, clientId: client.id, clientName: client.displayName, shiftId: null }))
                      setIsClientOpen(false)
                    }}
                  >
                    {client.displayName}
                  </FixedSelectOption>
                ))}
              </FixedSelectDropdown>
            </div>
            <div>
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Shift</label>
              <button
                ref={shiftBtnRef}
                type="button"
                disabled={!editable || !form.clientId}
                onClick={() => editable && form.clientId && setIsShiftOpen((open) => !open)}
                className={cn(
                  "flex h-[36px] w-full items-center justify-between rounded-none border border-folk-border px-[10px] text-left transition-colors",
                  editable && form.clientId ? "bg-folk-surface hover:border-[#bababa]" : "cursor-not-allowed bg-folk-page text-folk-secondary",
                )}
                tabIndex={0}
              >
                <span className={cn("truncate text-[13px] font-medium", selectedShift ? "text-folk-text" : "text-folk-secondary")}>
                  {selectedShift ? formatShiftLabel(selectedShift.date, selectedShift.startTime) : form.clientId ? "None" : "Pick participant"}
                </span>
                <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
              </button>
              <FixedSelectDropdown
                isOpen={isShiftOpen}
                anchorRef={shiftBtnRef}
                onClose={() => setIsShiftOpen(false)}
                isEmpty={clientShifts.length === 0}
              >
                {clientShifts.length === 0 ? (
                  <FixedDropdownEmptyMessage>No shifts for this participant</FixedDropdownEmptyMessage>
                ) : (
                  <>
                    <FixedSelectOption
                      muted
                      isActive={!form.shiftId}
                      onClick={() => {
                        setForm((current) => ({ ...current, shiftId: null }))
                        setIsShiftOpen(false)
                      }}
                    >
                      None
                    </FixedSelectOption>
                    {clientShifts.map((shift) => (
                      <FixedSelectOption
                        key={shift.id}
                        isActive={form.shiftId === shift.id}
                        onClick={() => {
                          setForm((current) => ({ ...current, shiftId: shift.id }))
                          setIsShiftOpen(false)
                        }}
                      >
                        {formatShiftLabel(shift.date, shift.startTime)}
                      </FixedSelectOption>
                    ))}
                  </>
                )}
              </FixedSelectDropdown>
            </div>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Description</label>
            <textarea
              value={form.description}
              disabled={!editable}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              rows={4}
              className="w-full resize-none rounded-none border border-folk-border px-[10px] py-[8px] text-[13px] font-medium text-folk-text outline-none transition-colors focus:border-[#a3c4f3] disabled:bg-folk-page disabled:text-folk-secondary"
              placeholder="Add any details about this expense"
            />
          </div>

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Receipt</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              disabled={!editable}
              onChange={(event) => {
                const selected = event.target.files?.[0]
                if (selected) setFile(selected)
                event.target.value = ""
              }}
            />
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                disabled={!editable}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-[6px] rounded-none border border-folk-border px-[10px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:cursor-not-allowed disabled:opacity-50"
                tabIndex={0}
              >
                <Upload className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>{attachmentLabel ? "Replace receipt" : "Upload receipt"}</span>
              </button>
              {attachmentLabel && (
                <span className="inline-flex min-w-0 items-center gap-[4px] truncate text-[12px] font-medium text-folk-secondary">
                  <Paperclip className="h-[12px] w-[12px] shrink-0" strokeWidth={1.5} />
                  <span className="truncate">{attachmentLabel}</span>
                </span>
              )}
              {reimbursement?.attachmentStoragePath && onDownloadAttachment && (
                <button
                  type="button"
                  onClick={onDownloadAttachment}
                  className="flex h-[30px] w-[30px] items-center justify-center rounded-none border border-folk-border text-folk-secondary transition-colors hover:bg-folk-hover"
                  tabIndex={0}
                  aria-label="Download receipt"
                >
                  <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
                </button>
              )}
            </div>
            {(localPreviewUrl || previewUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={localPreviewUrl || previewUrl || ""}
                alt={attachmentLabel || "Receipt preview"}
                className="mt-[10px] max-h-[220px] w-full rounded-none border border-folk-border object-contain"
              />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-folk-border px-[24px] py-[14px]">
        {isReturning ? (
          <div className="space-y-[10px]">
            <textarea
              value={returnNote}
              onChange={(event) => setReturnNote(event.target.value)}
              placeholder="Reason for returning (optional)"
              rows={3}
              className="w-full resize-y rounded-none border border-folk-border px-[10px] py-[8px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-[8px]">
              <Button variant="secondary" onClick={() => setIsReturning(false)} disabled={isSaving} className="h-[34px] rounded-none px-[14px]">
                Cancel
              </Button>
              <Button onClick={() => onReturn?.(returnNote.trim())} disabled={isSaving} className="h-[34px] rounded-none px-[14px]">
                {isSaving ? "Returning…" : "Return reimbursement"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-[8px]">
            {(editable || statusChanged) && (
              <Button onClick={handleSave} disabled={!canSave || isSaving} className="h-[36px] rounded-none px-[16px]">
                {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create reimbursement"}
              </Button>
            )}
            {editable && onSend && reimbursement && (reimbursement.status === "draft" || reimbursement.status === "returned") && (
              <Button variant="secondary" onClick={onSend} disabled={isSaving} className="h-[36px] rounded-none px-[16px]">
                Send for approval
              </Button>
            )}
            {isAdmin && reimbursement?.status === "sent" && onApprove && (
              <Button onClick={onApprove} disabled={isSaving} className="h-[36px] rounded-none px-[16px]">
                Approve
              </Button>
            )}
            {isAdmin && reimbursement?.status === "sent" && onReturn && (
              <Button variant="secondary" onClick={() => setIsReturning(true)} disabled={isSaving} className="h-[36px] rounded-none px-[16px]">
                Return
              </Button>
            )}
            {onDelete && reimbursement && (reimbursement.status === "draft" || isAdmin) && (
              <Button variant="danger" onClick={onDelete} disabled={isSaving} className="h-[36px] rounded-none px-[16px]">
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
