"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, MoreHorizontal, X, Settings2, Check, EyeOff, Eye, Trash2, FileText, Layers, AlignLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import {
  fieldTypeLabels,
  entityTabLabels,
  type FieldDefinition,
  type FieldType,
  type EntityTab,
} from "@/lib/field-definitions"

const entityTabs: EntityTab[] = ["participants", "contacts", "staff"]
const fieldTypes: FieldType[] = ["text", "date", "markdown", "single-select", "multi-select", "url", "number", "address", "phone", "email"]

export default function DataModelSettingsPage() {
  const { fields, toggleField } = useFieldConfig()
  const [activeTab, setActiveTab] = useState<EntityTab>("participants")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)
  const [menuFieldId, setMenuFieldId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<FieldType>("text")
  const [newDescription, setNewDescription] = useState("")
  const [isTypeOpen, setIsTypeOpen] = useState(false)

  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState<FieldType>("text")
  const [editDescription, setEditDescription] = useState("")
  const [isEditTypeOpen, setIsEditTypeOpen] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuFieldId(null)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const showToast = (message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  const tabFields = fields.filter((f) => f.entity === activeTab)
  const enabledFields = tabFields.filter((f) => f.isEnabled)
  const disabledFields = tabFields.filter((f) => !f.isEnabled)

  const handleCreate = () => {
    if (!newName.trim()) return
    showToast("Custom fields coming soon")
    setNewName("")
    setNewType("text")
    setNewDescription("")
    setIsCreateOpen(false)
  }

  const handleOpenEdit = (field: FieldDefinition) => {
    setEditingField(field)
    setEditName(field.name)
    setEditType(field.type)
    setEditDescription(field.description)
    setIsEditTypeOpen(false)
    setMenuFieldId(null)
  }

  const handleSaveEdit = () => {
    if (!editingField || !editName.trim()) return
    setEditingField(null)
    showToast("Field updated")
  }

  const handleCloseEdit = () => {
    setEditingField(null)
    setIsEditTypeOpen(false)
  }

  const handleToggleEnabled = (id: string) => {
    const field = fields.find((f) => f.id === id)
    const wasEnabled = field?.isEnabled ?? true
    toggleField(id)
    showToast(wasEnabled ? "Field disabled" : "Field enabled")
    setMenuFieldId(null)
  }

  const handleDelete = (id: string) => {
    showToast("Field deleted")
    setMenuFieldId(null)
    void id
  }

  return (
    <>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-[#262626]">Data model</h1>
        <p className="mt-[4px] text-[14px] text-[#888]">
          Manage field definitions for your account.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-[20px] flex items-center gap-[4px] border-b border-[#e5e5e5]">
        {entityTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setMenuFieldId(null) }}
            className={cn(
              "relative px-[14px] py-[10px] text-[13px] font-medium transition-colors",
              activeTab === tab ? "text-[#262626]" : "text-[#999] hover:text-[#262626]"
            )}
            tabIndex={0}
          >
            {entityTabLabels[tab]}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-[14px] right-[14px] h-[2px] rounded-full bg-[#262626]" />
            )}
          </button>
        ))}
      </div>

      {/* Create field button */}
      <div className="mb-[16px]">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-[6px] rounded-[8px] border border-[#e0e0e0] bg-white px-[14px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
          tabIndex={0}
        >
          <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
          Create field
        </button>
      </div>

      {/* Fields table */}
      <div className="overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#fafafa]">
        <div className="grid grid-cols-[35%_20%_20%_15%_10%] items-center border-b border-[#efefef] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-[#999]">Name</span>
          <span className="text-[12px] font-medium text-[#999]">Type</span>
          <span className="text-[12px] font-medium text-[#999]">Editable by</span>
          <span className="text-[12px] font-medium text-[#999]">Enabled</span>
          <span />
        </div>

        {enabledFields.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            isMenuOpen={menuFieldId === field.id}
            onRowClick={() => handleOpenEdit(field)}
            onMenuToggle={() => setMenuFieldId(menuFieldId === field.id ? null : field.id)}
            onToggleEnabled={() => handleToggleEnabled(field.id)}
            onDelete={() => handleDelete(field.id)}
            menuRef={menuFieldId === field.id ? menuRef : undefined}
          />
        ))}

        {disabledFields.length > 0 && (
          <>
            <div className="border-b border-[#efefef] px-[20px] pb-[8px] pt-[20px]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#999]">Disabled fields</span>
            </div>
            {disabledFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                isMenuOpen={menuFieldId === field.id}
                onRowClick={() => handleOpenEdit(field)}
                onMenuToggle={() => setMenuFieldId(menuFieldId === field.id ? null : field.id)}
                onToggleEnabled={() => handleToggleEnabled(field.id)}
                onDelete={() => handleDelete(field.id)}
                menuRef={menuFieldId === field.id ? menuRef : undefined}
                isDisabledRow
              />
            ))}
          </>
        )}

        {enabledFields.length === 0 && disabledFields.length === 0 && (
          <div className="px-[20px] py-[40px] text-center text-[13px] text-[#bbb]">
            No fields defined
          </div>
        )}
      </div>

      {/* Create field modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[120px]">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsCreateOpen(false); setIsTypeOpen(false) }} />
          <div className="relative z-10 w-[480px] rounded-[10px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <Settings2 className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-[#262626]">Create field</h2>
              </div>
              <button
                onClick={() => { setIsCreateOpen(false); setIsTypeOpen(false) }}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="flex flex-col gap-[2px]">
                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Name</span>
                  <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                    <FileText className={`h-[13px] w-[13px] shrink-0 ${newName ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Empty"
                      className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                      onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Type</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTypeOpen(!isTypeOpen)}
                      className="flex w-full items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left text-[13px] font-medium text-[#262626] outline-none transition-colors hover:bg-[#f7f7f7]"
                      tabIndex={0}
                    >
                      <Layers className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                      {fieldTypeLabels[newType]}
                    </button>
                    {isTypeOpen && (
                      <>
                        <div className="fixed inset-0 z-[59]" onClick={() => setIsTypeOpen(false)} />
                        <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                          {fieldTypes.map((ft) => (
                            <button
                              key={ft}
                              onClick={() => { setNewType(ft); setIsTypeOpen(false) }}
                              className={cn(
                                "flex w-full items-center px-[12px] py-[7px] text-[13px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]",
                                newType === ft && "bg-[#f0f0f0] text-[#262626]"
                              )}
                              tabIndex={0}
                            >
                              {fieldTypeLabels[ft]}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-[12px]">
                  <span className="pt-[6px] text-[13px] font-medium text-[#8d8d8d]">Description</span>
                  <div className="flex items-start gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                    <AlignLeft className={`mt-[2px] h-[13px] w-[13px] shrink-0 ${newDescription ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Empty"
                      rows={2}
                      className="w-full resize-none bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-[16px] flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className={cn(
                    "rounded-[4px] px-[16px] py-[7px] text-[13px] font-medium transition-colors",
                    newName.trim()
                      ? "bg-[#262626] text-white hover:bg-[#3d3d3d]"
                      : "cursor-not-allowed bg-[#e8e8e8] text-[#bbb]"
                  )}
                  tabIndex={0}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit field modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[120px]">
          <div className="absolute inset-0 bg-black/20" onClick={handleCloseEdit} />
          <div className="relative z-10 w-[480px] rounded-[10px] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <Settings2 className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-[#262626]">
                  {editingField.isSystem ? "View field" : "Edit field"}
                </h2>
              </div>
              <button
                onClick={handleCloseEdit}
                className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
                tabIndex={0}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.5} />
              </button>
            </div>

            <div className="px-[24px] pb-[20px] pt-[16px]">
              <div className="flex flex-col gap-[2px]">
                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Name</span>
                  {editingField.isSystem ? (
                    <div className="flex items-center gap-[7px] px-[8px] py-[6px]">
                      <FileText className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#888]">{editName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                      <FileText className={`h-[13px] w-[13px] shrink-0 ${editName ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Empty"
                        className="w-full bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit() }}
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Type</span>
                  {editingField.isSystem ? (
                    <div className="flex items-center gap-[7px] px-[8px] py-[6px]">
                      <Layers className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#888]">{fieldTypeLabels[editType]}</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsEditTypeOpen(!isEditTypeOpen)}
                        className="flex w-full items-center gap-[7px] rounded-[10px] px-[8px] py-[6px] text-left text-[13px] font-medium text-[#262626] outline-none transition-colors hover:bg-[#f7f7f7]"
                        tabIndex={0}
                      >
                        <Layers className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                        {fieldTypeLabels[editType]}
                      </button>
                      {isEditTypeOpen && (
                        <>
                          <div className="fixed inset-0 z-[59]" onClick={() => setIsEditTypeOpen(false)} />
                          <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                            {fieldTypes.map((ft) => (
                              <button
                                key={ft}
                                onClick={() => { setEditType(ft); setIsEditTypeOpen(false) }}
                                className={cn(
                                  "flex w-full items-center px-[12px] py-[7px] text-[13px] font-medium text-[#555] transition-colors hover:bg-[#f5f5f5]",
                                  editType === ft && "bg-[#f0f0f0] text-[#262626]"
                                )}
                                tabIndex={0}
                              >
                                {fieldTypeLabels[ft]}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-start gap-[12px]">
                  <span className="pt-[6px] text-[13px] font-medium text-[#8d8d8d]">Description</span>
                  {editingField.isSystem ? (
                    <div className="flex items-start gap-[7px] px-[8px] py-[6px]">
                      <AlignLeft className="mt-[2px] h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-[#888]">{editDescription || <span className="text-[#ccc]">Empty</span>}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-[7px] rounded-[10px] px-[8px] py-[6px] transition-colors hover:bg-[#f7f7f7]">
                      <AlignLeft className={`mt-[2px] h-[13px] w-[13px] shrink-0 ${editDescription ? "text-[#888]" : "text-[#ccc]"}`} strokeWidth={1.5} />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Empty"
                        rows={2}
                        className="w-full resize-none bg-transparent text-[13px] font-medium text-[#262626] placeholder-[#ccc] outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Editable by</span>
                  <div className="flex items-center gap-[7px] px-[8px] py-[6px]">
                    <Settings2 className="h-[13px] w-[13px] shrink-0 text-[#888]" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium text-[#888]">{editingField.editableBy === "system" ? "System only" : "Anyone"}</span>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  {!editingField.isSystem && (
                    <button
                      onClick={() => { handleToggleEnabled(editingField.id); setEditingField(null) }}
                      className="flex items-center gap-[6px] rounded-[4px] border border-sidebar-border px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      {editingField.isEnabled ? (
                        <>
                          <EyeOff className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                          Disable
                        </>
                      ) : (
                        <>
                          <Eye className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                          Enable
                        </>
                      )}
                    </button>
                  )}
                  {!editingField.isSystem && (
                    <button
                      onClick={() => { handleDelete(editingField.id); setEditingField(null) }}
                      className="flex items-center gap-[6px] rounded-[4px] border border-red-200 px-[12px] py-[7px] text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
                      tabIndex={0}
                    >
                      <Trash2 className="h-[13px] w-[13px]" strokeWidth={1.5} />
                      Delete
                    </button>
                  )}
                </div>

                {!editingField.isSystem ? (
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editName.trim()}
                    className={cn(
                      "rounded-[4px] px-[16px] py-[7px] text-[13px] font-medium transition-colors",
                      editName.trim()
                        ? "bg-[#262626] text-white hover:bg-[#3d3d3d]"
                        : "cursor-not-allowed bg-[#e8e8e8] text-[#bbb]"
                    )}
                    tabIndex={0}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={handleCloseEdit}
                    className="rounded-[4px] border border-sidebar-border px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-[24px] left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-[8px] rounded-[10px] border border-[#e5e5e5] bg-white px-[16px] py-[10px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <Check className="h-[14px] w-[14px] text-green-500" strokeWidth={2} />
            <span className="text-[13px] font-medium text-[#262626]">{toast}</span>
          </div>
        </div>
      )}
    </>
  )
}

function FieldRow({
  field,
  isMenuOpen,
  onRowClick,
  onMenuToggle,
  onToggleEnabled,
  onDelete,
  menuRef,
  isDisabledRow,
}: {
  field: FieldDefinition
  isMenuOpen: boolean
  onRowClick: () => void
  onMenuToggle: () => void
  onToggleEnabled: () => void
  onDelete: () => void
  menuRef?: React.RefObject<HTMLDivElement | null>
  isDisabledRow?: boolean
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[35%_20%_20%_15%_10%] items-center border-b border-[#efefef] px-[20px] py-[14px] transition-colors cursor-pointer last:border-b-0",
        isDisabledRow ? "opacity-60" : "hover:bg-[#f5f5f5]"
      )}
      onClick={onRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onRowClick() }}
    >
      <span className="text-[13px] font-medium text-[#262626]">{field.name}</span>
      <span className="text-[13px] text-[#888]">{fieldTypeLabels[field.type]}</span>
      <span className="text-[13px] text-[#888]">{field.editableBy === "system" ? "System only" : "Anyone"}</span>

      <div onClick={(e) => e.stopPropagation()}>
        {!field.isSystem ? (
          <button
            type="button"
            onClick={onToggleEnabled}
            className={cn(
              "relative h-[22px] w-[40px] rounded-full transition-colors",
              field.isEnabled ? "bg-blue-400" : "bg-[#d4d4d4]"
            )}
            tabIndex={0}
            aria-label={field.isEnabled ? "Disable field" : "Enable field"}
            aria-checked={field.isEnabled}
            role="switch"
          >
            <span
              className={cn(
                "absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform",
                field.isEnabled ? "left-[20px]" : "left-[2px]"
              )}
            />
          </button>
        ) : (
          <button
            type="button"
            className="relative h-[22px] w-[40px] cursor-not-allowed rounded-full bg-blue-400 opacity-50"
            disabled
            tabIndex={-1}
            aria-label="System field — always enabled"
            aria-checked
            role="switch"
          >
            <span className="absolute left-[20px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm" />
          </button>
        )}
      </div>

      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        {!field.isSystem ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={onMenuToggle}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[6px] text-[#bbb] transition-colors hover:bg-[#ebebeb] hover:text-[#666]"
              tabIndex={0}
              aria-label="Field actions"
            >
              <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-[4px] w-[160px] rounded-[10px] border border-[#e5e5e5] bg-white py-[4px] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
                <button
                  onClick={onDelete}
                  className="flex w-full items-center gap-[8px] px-[14px] py-[8px] text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
                  tabIndex={0}
                >
                  <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                  Delete
                </button>
              </div>
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
