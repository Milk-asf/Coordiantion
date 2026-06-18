"use client"

import { useRef } from "react"
import { CalendarDays, Eye, FileText, Upload, X } from "lucide-react"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"

interface DocumentSidebarFormProps {
  isEditing: boolean
  name: string
  validFrom: string
  validTo: string
  file: File | null
  existingDocumentName?: string
  isSaving: boolean
  validFromPickerOpen: boolean
  validToPickerOpen: boolean
  onSetName: (value: string) => void
  onSetValidFrom: (value: string) => void
  onSetValidTo: (value: string) => void
  onSetFile: (file: File | null) => void
  onSetValidFromPickerOpen: (open: boolean) => void
  onSetValidToPickerOpen: (open: boolean) => void
  onSave: () => void
  onClose: () => void
  onPreview?: () => void
}

function formatPickerDate(dateStr: string) {
  if (!dateStr) return null
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function DocumentSidebarForm({
  isEditing,
  name,
  validFrom,
  validTo,
  file,
  existingDocumentName,
  isSaving,
  validFromPickerOpen,
  validToPickerOpen,
  onSetName,
  onSetValidFrom,
  onSetValidTo,
  onSetFile,
  onSetValidFromPickerOpen,
  onSetValidToPickerOpen,
  onSave,
  onClose,
  onPreview,
}: DocumentSidebarFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const validFromTriggerRef = useRef<HTMLButtonElement>(null)
  const validToTriggerRef = useRef<HTMLButtonElement>(null)
  const hasInvalidRange = Boolean(validFrom && validTo && validTo < validFrom)
  const canSave = isEditing ? !hasInvalidRange : Boolean(file) && !hasInvalidRange
  const attachmentLabel = file?.name || existingDocumentName

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <h2 className="text-[13px] font-semibold text-folk-text">
          {isEditing ? "Document details" : "Add document"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Close document form"
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-[24px] py-[14px]">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0]
              if (selected) {
                onSetFile(selected)
                if (!name.trim()) onSetName(selected.name)
              }
              e.target.value = ""
            }}
          />

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onSetName(e.target.value)}
              placeholder="Document name (optional)"
              className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
            />
          </div>

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Valid from</label>
            <div className="relative">
              <button
                ref={validFromTriggerRef}
                type="button"
                onClick={() => {
                  onSetValidFromPickerOpen(!validFromPickerOpen)
                  onSetValidToPickerOpen(false)
                }}
                className="flex h-[36px] w-full items-center gap-[8px] rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                tabIndex={0}
              >
                <CalendarDays className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                {validFrom ? (
                  <span className="text-folk-text">{formatPickerDate(validFrom)}</span>
                ) : (
                  <span className="text-folk-placeholder">Select date</span>
                )}
              </button>
              {validFrom && (
                <button
                  type="button"
                  onClick={() => onSetValidFrom("")}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 rounded-none p-[2px] text-folk-placeholder transition-colors hover:bg-[#eee] hover:text-folk-secondary"
                  tabIndex={0}
                  aria-label="Clear valid from date"
                >
                  <X className="h-[12px] w-[12px]" strokeWidth={2} />
                </button>
              )}
              {validFromPickerOpen && (
                <FixedDatePickerDropdown
                  isOpen={validFromPickerOpen}
                  anchorRef={validFromTriggerRef}
                  value={validFrom}
                  onChange={(value) => {
                    onSetValidFrom(value)
                    onSetValidFromPickerOpen(false)
                  }}
                  onClose={() => onSetValidFromPickerOpen(false)}
                />
              )}
            </div>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Valid to</label>
            <div className="relative">
              <button
                ref={validToTriggerRef}
                type="button"
                onClick={() => {
                  onSetValidToPickerOpen(!validToPickerOpen)
                  onSetValidFromPickerOpen(false)
                }}
                className="flex h-[36px] w-full items-center gap-[8px] rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                tabIndex={0}
              >
                <CalendarDays className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                {validTo ? (
                  <span className="text-folk-text">{formatPickerDate(validTo)}</span>
                ) : (
                  <span className="text-folk-placeholder">Select date</span>
                )}
              </button>
              {validTo && (
                <button
                  type="button"
                  onClick={() => onSetValidTo("")}
                  className="absolute right-[10px] top-1/2 -translate-y-1/2 rounded-none p-[2px] text-folk-placeholder transition-colors hover:bg-[#eee] hover:text-folk-secondary"
                  tabIndex={0}
                  aria-label="Clear valid to date"
                >
                  <X className="h-[12px] w-[12px]" strokeWidth={2} />
                </button>
              )}
              {validToPickerOpen && (
                <FixedDatePickerDropdown
                  isOpen={validToPickerOpen}
                  anchorRef={validToTriggerRef}
                  value={validTo}
                  onChange={(value) => {
                    onSetValidTo(value)
                    onSetValidToPickerOpen(false)
                  }}
                  onClose={() => onSetValidToPickerOpen(false)}
                />
              )}
            </div>
            {hasInvalidRange && (
              <p className="mt-[6px] text-[11px] font-medium text-red-500">Valid to must be on or after valid from</p>
            )}
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">
              Attachment{isEditing ? "" : " *"}
            </label>
            {file ? (
              <div className="flex items-center gap-[8px] rounded-none border border-folk-border bg-folk-page px-[12px] py-[8px]">
                <FileText className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-folk-text">{file.name}</span>
                <button
                  type="button"
                  onClick={() => onSetFile(null)}
                  className="shrink-0 rounded-none p-[2px] text-folk-secondary transition-colors hover:bg-[#eee] hover:text-folk-text"
                  tabIndex={0}
                  aria-label="Remove attachment"
                >
                  <X className="h-[12px] w-[12px]" strokeWidth={2} />
                </button>
              </div>
            ) : isEditing && existingDocumentName ? (
              <div className="flex items-center gap-[8px] rounded-none border border-folk-border bg-folk-page px-[12px] py-[8px]">
                <FileText className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-folk-text">{existingDocumentName}</span>
                {onPreview && (
                  <button
                    type="button"
                    onClick={onPreview}
                    className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-[#eee] hover:text-folk-text"
                    tabIndex={0}
                    aria-label="Preview document"
                  >
                    <Eye className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-[6px] rounded-none border border-dashed border-folk-border bg-folk-page px-[12px] py-[10px] text-[12px] font-medium text-folk-secondary transition-colors hover:border-[#bbb] hover:bg-[var(--folk-border-subtle)]"
                tabIndex={0}
              >
                <Upload className="h-[14px] w-[14px]" strokeWidth={1.5} />
                Add attachment
              </button>
            )}
            {isEditing && existingDocumentName && !file && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-[8px] text-[12px] font-medium text-folk-secondary transition-colors hover:text-folk-text"
                tabIndex={0}
              >
                Replace attachment
              </button>
            )}
            {!isEditing && !file && (
              <p className="mt-[6px] text-[11px] text-folk-secondary">Add an attachment before saving.</p>
            )}
            {isEditing && file && attachmentLabel && (
              <p className="mt-[6px] text-[11px] text-folk-secondary">Save to replace the current file.</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-none border border-folk-border bg-folk-surface px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
          tabIndex={0}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave || isSaving}
          className="primary-btn px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
          tabIndex={0}
        >
          {isSaving ? "Saving…" : "Save and close"}
        </button>
      </div>
    </div>
  )
}
