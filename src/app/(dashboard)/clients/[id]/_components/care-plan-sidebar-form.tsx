"use client"

import { useRef } from "react"
import { CalendarDays, FileText, Upload, X } from "lucide-react"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"

interface CarePlanSidebarFormProps {
  isEditing: boolean
  existingDocumentName?: string
  createdDate: string
  renewalDate: string
  file: File | null
  isSaving: boolean
  createdPickerOpen: boolean
  renewalPickerOpen: boolean
  onSetCreatedDate: (value: string) => void
  onSetRenewalDate: (value: string) => void
  onSetFile: (file: File | null) => void
  onSetCreatedPickerOpen: (open: boolean) => void
  onSetRenewalPickerOpen: (open: boolean) => void
  onSave: () => void
  onClose: () => void
}

function formatPickerDate(dateStr: string) {
  if (!dateStr) return null
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function CarePlanSidebarForm({
  isEditing,
  existingDocumentName,
  createdDate,
  renewalDate,
  file,
  isSaving,
  createdPickerOpen,
  renewalPickerOpen,
  onSetCreatedDate,
  onSetRenewalDate,
  onSetFile,
  onSetCreatedPickerOpen,
  onSetRenewalPickerOpen,
  onSave,
  onClose,
}: CarePlanSidebarFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const createdDateRef = useRef<HTMLButtonElement>(null)
  const renewalDateRef = useRef<HTMLButtonElement>(null)
  const canSave = Boolean(createdDate && renewalDate && (file || isEditing))

  return (
    <>
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <h2 className="text-[13px] font-semibold text-folk-text">
          {isEditing ? "Edit care plan" : "Add care plan"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Close care plan form"
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-[24px] py-[14px]">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) onSetFile(e.target.files[0])
              e.target.value = ""
            }}
          />

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Created date *</label>
            <div className="relative">
              <button
                ref={createdDateRef}
                type="button"
                onClick={() => {
                  onSetCreatedPickerOpen(!createdPickerOpen)
                  onSetRenewalPickerOpen(false)
                }}
                className="flex h-[36px] w-full items-center gap-[8px] rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium transition-colors hover:border-[#bababa] focus:border-[#a3c4f3]"
                tabIndex={0}
              >
                <CalendarDays className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                {createdDate ? (
                  <span className="text-folk-text">{formatPickerDate(createdDate)}</span>
                ) : (
                  <span className="text-folk-placeholder">Select date</span>
                )}
              </button>
              <FixedDatePickerDropdown
                isOpen={createdPickerOpen}
                anchorRef={createdDateRef}
                value={createdDate}
                onChange={(value) => {
                  onSetCreatedDate(value)
                  onSetCreatedPickerOpen(false)
                }}
                onClose={() => onSetCreatedPickerOpen(false)}
              />
            </div>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">Renewal date *</label>
            <div className="relative">
              <button
                ref={renewalDateRef}
                type="button"
                onClick={() => {
                  onSetRenewalPickerOpen(!renewalPickerOpen)
                  onSetCreatedPickerOpen(false)
                }}
                className="flex h-[36px] w-full items-center gap-[8px] rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium transition-colors hover:border-[#bababa] focus:border-[#a3c4f3]"
                tabIndex={0}
              >
                <CalendarDays className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                {renewalDate ? (
                  <span className="text-folk-text">{formatPickerDate(renewalDate)}</span>
                ) : (
                  <span className="text-folk-placeholder">Select date</span>
                )}
              </button>
              <FixedDatePickerDropdown
                isOpen={renewalPickerOpen}
                anchorRef={renewalDateRef}
                value={renewalDate}
                onChange={(value) => {
                  onSetRenewalDate(value)
                  onSetRenewalPickerOpen(false)
                }}
                onClose={() => onSetRenewalPickerOpen(false)}
              />
            </div>
          </div>

          <div>
            <label className="mb-[6px] block text-[13px] font-medium text-folk-text">
              Care plan document{isEditing ? "" : " *"}
            </label>
            {file ? (
              <div className="flex items-center gap-[8px] rounded-[6px] border border-folk-border bg-folk-page px-[12px] py-[8px]">
                <FileText className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-folk-text">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onSetFile(null)}
                  className="shrink-0 rounded-[6px] p-[2px] text-folk-secondary transition-colors hover:bg-[#eee] hover:text-folk-text"
                  tabIndex={0}
                  aria-label="Remove file"
                >
                  <X className="h-[12px] w-[12px]" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-[6px] rounded-[6px] border border-dashed border-folk-border bg-folk-page px-[12px] py-[10px] text-[12px] font-medium text-folk-secondary transition-colors hover:border-[#bbb] hover:bg-[var(--folk-border-subtle)]"
                tabIndex={0}
              >
                <Upload className="h-[14px] w-[14px]" strokeWidth={1.5} />
                {isEditing && existingDocumentName ? `Replace ${existingDocumentName}` : "Upload file"}
              </button>
            )}
            {isEditing && existingDocumentName && !file && (
              <p className="mt-[6px] text-[11px] text-folk-secondary">Current file: {existingDocumentName}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[6px] border border-folk-border bg-folk-surface px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || isSaving}
          className="primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium transition-colors disabled:opacity-50"
          tabIndex={0}
        >
          {isSaving ? "Saving…" : isEditing ? "Save changes" : "Save care plan"}
        </button>
      </div>
    </>
  )
}
