"use client"

import { memo, useEffect, useRef, useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { GripVertical, ImagePlus, Loader2, Lock, Plus, Trash2 } from "lucide-react"
import { FixedDropdownMenu } from "@/components/fixed-dropdown-menu"
import { useToast } from "@/components/toast"
import { uploadAttachments } from "@/lib/upload-attachments"
import type { Form, FormField, FormSettings } from "@/lib/form-definitions"
import { cn } from "@/lib/utils"
import { FormFieldPreview } from "./form-field-preview"

const COVER_COLORS = [
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#64748b",
  "#1f2937",
]

const ICON_CHOICES = [
  "📄", "📝", "📋", "🗂️", "📁", "📌", "✅", "☑️",
  "🚨", "⚠️", "🛡️", "🩺", "💊", "🧾", "💰", "💳",
  "🛒", "🚗", "🚐", "🛠️", "🏠", "🤝", "👥", "🧑‍⚕️",
  "🎯", "📈", "📊", "⭐", "❤️", "🌴", "🔒", "💬",
]

interface FormCanvasProps {
  form: Form
  fields: FormField[]
  selectedFieldId: string | null
  onSelectField: (fieldId: string | null) => void
  onDeleteField: (fieldId: string) => void
  onOpenFormSettings: () => void
  onFormChange: (updates: Partial<Form>) => void
  onSettingsChange: (updates: Partial<FormSettings>) => void
}

export function FormCanvas({
  form,
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onOpenFormSettings,
  onFormChange,
  onSettingsChange,
}: FormCanvasProps) {
  const iconBtnRef = useRef<HTMLButtonElement>(null)
  const coverBtnRef = useRef<HTMLButtonElement>(null)
  const [isIconOpen, setIsIconOpen] = useState(false)
  const [isCoverOpen, setIsCoverOpen] = useState(false)

  const { coverColor, coverImage } = form.settings

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col px-[24px] py-[28px]">
      {form.settings.showCover && (
        <div
          className="group/cover relative mb-[16px] h-[120px] overflow-hidden rounded-[8px] bg-folk-hover"
          style={
            coverImage
              ? { backgroundImage: `url(${coverImage})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { backgroundColor: coverColor }
          }
        >
          <button
            type="button"
            ref={coverBtnRef}
            onClick={() => {
              onOpenFormSettings()
              setIsCoverOpen(true)
            }}
            className="absolute right-[10px] top-[10px] flex items-center gap-[6px] rounded-[6px] bg-white/90 px-[10px] py-[5px] text-[12px] font-medium text-folk-text opacity-0 shadow-sm backdrop-blur transition-opacity hover:bg-white group-hover/cover:opacity-100"
            tabIndex={0}
          >
            <ImagePlus className="h-[13px] w-[13px]" strokeWidth={1.75} />
            Edit cover
          </button>
        </div>
      )}

      <div className="flex items-center gap-[8px]">
        {form.settings.showIcon && (
          <button
            type="button"
            ref={iconBtnRef}
            onClick={() => {
              onOpenFormSettings()
              setIsIconOpen(true)
            }}
            className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[8px] text-[24px] transition-colors hover:bg-folk-hover"
            aria-label="Change form icon"
            tabIndex={0}
          >
            {form.icon}
          </button>
        )}
        <input
          value={form.name}
          onChange={(event) => onFormChange({ name: event.target.value })}
          onFocus={onOpenFormSettings}
          placeholder="Untitled form"
          aria-label="Form title"
          className="min-w-0 flex-1 bg-transparent text-[22px] font-bold text-folk-text outline-none placeholder:text-folk-placeholder"
          tabIndex={0}
        />
      </div>

      {form.settings.showFormDescription && (
        <AutoGrowTextarea
          value={form.description}
          onChange={(value) => onFormChange({ description: value })}
          onFocus={onOpenFormSettings}
          placeholder="Enter form description…"
          className="mt-[6px] w-full resize-none bg-transparent px-[2px] text-[13px] leading-[1.6] text-folk-secondary outline-none placeholder:text-folk-placeholder"
        />
      )}

      <div className="mt-[20px] flex flex-col gap-[10px]">
        {fields.map((field) => (
          <FieldCard
            key={field.id}
            field={field}
            isSelected={selectedFieldId === field.id}
            onSelect={onSelectField}
            onDelete={onDeleteField}
          />
        ))}

        <CanvasEndZone isEmpty={fields.length === 0} />
      </div>

      <FixedDropdownMenu
        isOpen={isIconOpen}
        anchorRef={iconBtnRef}
        onClose={() => setIsIconOpen(false)}
        estimatedHeight={220}
        minWidth={252}
        align="left"
        className="rounded-[10px] p-[12px]"
      >
        <IconPicker
          value={form.icon}
          onPick={(emoji) => {
            onFormChange({ icon: emoji })
            setIsIconOpen(false)
          }}
        />
      </FixedDropdownMenu>

      <FixedDropdownMenu
        isOpen={isCoverOpen}
        anchorRef={coverBtnRef}
        onClose={() => setIsCoverOpen(false)}
        estimatedHeight={240}
        minWidth={272}
        align="right"
        className="rounded-[10px] p-[14px]"
      >
        <CoverEditor settings={form.settings} onSettingsChange={onSettingsChange} />
      </FixedDropdownMenu>
    </div>
  )
}

interface AutoGrowTextareaProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  placeholder?: string
  className?: string
}

function AutoGrowTextarea({ value, onChange, onFocus, placeholder, className }: AutoGrowTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      placeholder={placeholder}
      rows={1}
      className={className}
      tabIndex={0}
    />
  )
}

interface IconPickerProps {
  value: string
  onPick: (emoji: string) => void
}

function IconPicker({ value, onPick }: IconPickerProps) {
  const [custom, setCustom] = useState("")

  return (
    <div className="w-[228px]">
      <div className="grid grid-cols-8 gap-[2px]">
        {ICON_CHOICES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onPick(emoji)}
            className={cn(
              "flex h-[26px] w-[26px] items-center justify-center rounded-[6px] text-[18px] transition-colors hover:bg-folk-hover",
              value === emoji && "bg-folk-hover ring-1 ring-[#a3c4f3]",
            )}
            tabIndex={0}
          >
            {emoji}
          </button>
        ))}
      </div>
      <div className="mt-[10px] flex items-center gap-[6px] border-t border-folk-border-subtle pt-[10px]">
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value)}
          placeholder="Paste any emoji"
          maxLength={4}
          className="h-[30px] flex-1 rounded-[6px] border border-folk-border bg-white px-[8px] text-[13px] text-folk-text outline-none focus:border-[#a3c4f3]"
          tabIndex={0}
        />
        <button
          type="button"
          onClick={() => custom.trim() && onPick(custom.trim())}
          disabled={!custom.trim()}
          className="h-[30px] rounded-[6px] bg-folk-text px-[10px] text-[12px] font-medium text-white transition-colors hover:bg-black disabled:opacity-40"
          tabIndex={0}
        >
          Set
        </button>
      </div>
    </div>
  )
}

interface CoverEditorProps {
  settings: FormSettings
  onSettingsChange: (updates: Partial<FormSettings>) => void
}

function CoverEditor({ settings, onSettingsChange }: CoverEditorProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

  const handleUpload = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file", "error")
      return
    }

    setIsUploading(true)
    try {
      const [attachment] = await uploadAttachments({
        files: [file],
        getStoragePath: (id, uploadFile) => `forms/covers/${id}-${uploadFile.name}`,
      })

      if (attachment?.url) {
        onSettingsChange({ coverImage: attachment.url })
      } else {
        // Avoid embedding a base64 data URL in the form row (bloats every fetch).
        toast("Could not upload image. Please try again.", "error")
      }
    } catch {
      toast("Could not upload image", "error")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-[244px]">
      <p className="mb-[8px] text-[11px] font-medium uppercase tracking-wide text-folk-tertiary">Cover colour</p>
      <div className="grid grid-cols-6 gap-[6px]">
        {COVER_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onSettingsChange({ coverColor: color, coverImage: "" })}
            className={cn(
              "h-[26px] w-[26px] rounded-[6px] transition-transform hover:scale-105",
              !settings.coverImage && settings.coverColor === color && "ring-2 ring-offset-1 ring-folk-text",
            )}
            style={{ backgroundColor: color }}
            aria-label={`Use ${color} cover`}
            tabIndex={0}
          />
        ))}
      </div>

      <div className="mt-[12px] border-t border-folk-border-subtle pt-[12px]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleUpload(event.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex w-full items-center justify-center gap-[6px] rounded-[6px] border border-folk-border bg-white px-[10px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover disabled:opacity-60"
          tabIndex={0}
        >
          {isUploading ? (
            <Loader2 className="h-[14px] w-[14px] animate-spin" strokeWidth={1.75} />
          ) : (
            <ImagePlus className="h-[14px] w-[14px]" strokeWidth={1.75} />
          )}
          {isUploading ? "Uploading…" : settings.coverImage ? "Replace image" : "Upload image"}
        </button>
        {settings.coverImage && (
          <button
            type="button"
            onClick={() => onSettingsChange({ coverImage: "" })}
            className="mt-[6px] flex w-full items-center justify-center gap-[6px] rounded-[6px] px-[10px] py-[6px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-red-50 hover:text-red-500"
            tabIndex={0}
          >
            <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.75} />
            Remove image
          </button>
        )}
      </div>
    </div>
  )
}

interface FieldCardProps {
  field: FormField
  isSelected: boolean
  onSelect: (fieldId: string) => void
  onDelete: (fieldId: string) => void
}

const FieldCard = memo(function FieldCard({ field, isSelected, onSelect, onDelete }: FieldCardProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `field:${field.id}`,
    data: { kind: "field-slot", fieldId: field.id },
  })
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `canvas:${field.id}`,
    data: { kind: "canvas", fieldId: field.id },
  })

  return (
    <div ref={setDropRef} className="relative">
      {isOver && <div className="absolute -top-[6px] left-0 right-0 h-[2px] rounded-full bg-[#3b82f6]" aria-hidden="true" />}
      <div
        ref={setDragRef}
        onClick={() => onSelect(field.id)}
        style={{ touchAction: "none" }}
        className={cn(
          "group relative cursor-grab select-none rounded-[8px] border bg-white px-[14px] py-[12px] transition-colors active:cursor-grabbing",
          isSelected ? "border-[#a3c4f3] shadow-[0_0_0_3px_rgba(163,196,243,0.25)]" : "border-folk-border hover:border-folk-border-strong",
          isDragging && "opacity-40",
        )}
        {...listeners}
        {...attributes}
      >
        <div className="flex items-start gap-[8px]">
          <span
            className="mt-[2px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] text-folk-placeholder opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          >
            <GripVertical className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </span>

          <div className="min-w-0 flex-1">
            <FormFieldPreview field={field} />
          </div>

          {field.system ? (
            <span
              className="flex h-[26px] shrink-0 items-center gap-[3px] rounded-[6px] bg-folk-hover px-[6px] text-[10px] font-medium text-folk-secondary"
              title="Required incident field — can't be removed"
            >
              <Lock className="h-[11px] w-[11px]" strokeWidth={1.75} />
              Required
            </span>
          ) : (
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation()
                onDelete(field.id)
              }}
              className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[6px] text-folk-placeholder opacity-0 transition-[opacity,color,background-color] hover:bg-folk-hover hover:text-red-500 focus-visible:opacity-100 group-hover:opacity-100"
              aria-label={`Delete ${field.label || "field"}`}
              tabIndex={0}
            >
              <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
})

function CanvasEndZone({ isEmpty }: { isEmpty: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas-end", data: { kind: "canvas-end" } })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center rounded-[8px] border border-dashed text-[13px] transition-colors",
        isEmpty ? "h-[120px]" : "h-[52px]",
        isOver ? "border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]" : "border-folk-border text-folk-tertiary",
      )}
    >
      <span className="flex items-center gap-[6px]">
        <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
        {isEmpty ? "Drag a field here or click one from the left" : "Drop here to add to the end"}
      </span>
    </div>
  )
}
