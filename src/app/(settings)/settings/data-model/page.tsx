"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, MoreHorizontal, X, ChevronDown, Settings2, Check, EyeOff, Eye, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  getDefaultFields,
  FIELD_CONFIG_STORAGE_KEY,
  fieldTypeLabels,
  entityTabLabels,
  type FieldDefinition,
  type FieldType,
  type EntityTab,
} from "@/lib/field-definitions"

const entityTabs: EntityTab[] = ["participants", "contacts", "staff"]
const fieldTypes: FieldType[] = ["text", "date", "markdown", "single-select", "multi-select", "url", "number", "address", "phone", "email"]

function loadFields(): FieldDefinition[] {
  if (typeof window === "undefined") return getDefaultFields()
  const stored = localStorage.getItem(FIELD_CONFIG_STORAGE_KEY)
  if (!stored) return getDefaultFields()
  try { return JSON.parse(stored) } catch { return getDefaultFields() }
}

function saveFields(fields: FieldDefinition[]) {
  localStorage.setItem(FIELD_CONFIG_STORAGE_KEY, JSON.stringify(fields))
  window.dispatchEvent(new Event("field-config-updated"))
}

export default function DataModelSettingsPage() {
  const [fields, setFields] = useState<FieldDefinition[]>(getDefaultFields)
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

  useEffect(() => { setFields(loadFields()) }, [])

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
    const newField: FieldDefinition = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: newName.trim(),
      type: newType,
      description: newDescription.trim(),
      editableBy: "anyone",
      isSystem: false,
      isEnabled: true,
      isCustom: true,
      entity: activeTab,
    }
    const updated = [...fields, newField]
    setFields(updated)
    saveFields(updated)
    setNewName("")
    setNewType("text")
    setNewDescription("")
    setIsCreateOpen(false)
    showToast("Field created successfully")
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
    const updated = fields.map((f) =>
      f.id === editingField.id
        ? { ...f, name: editName.trim(), type: editType, description: editDescription.trim() }
        : f
    )
    setFields(updated)
    saveFields(updated)
    setEditingField(null)
    showToast("Field updated")
  }

  const handleCloseEdit = () => {
    setEditingField(null)
    setIsEditTypeOpen(false)
  }

  const handleToggleEnabled = (id: string) => {
    const updated = fields.map((f) => f.id === id ? { ...f, isEnabled: !f.isEnabled } : f)
    setFields(updated)
    saveFields(updated)
    const field = fields.find((f) => f.id === id)
    showToast(field?.isEnabled ? "Field disabled" : "Field enabled")
    setMenuFieldId(null)
  }

  const handleDelete = (id: string) => {
    const updated = fields.filter((f) => f.id !== id)
    setFields(updated)
    saveFields(updated)
    showToast("Field deleted")
    setMenuFieldId(null)
  }

  return (
    <>
      <div className="mb-[28px]">
        <h1 className="text-[22px] font-semibold text-[#1a1a1a]">Data model</h1>
        <p className="mt-[4px] text-[14px] text-sidebar-muted">
          Manage field definitions for your workspace.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-[20px] flex items-center gap-[4px] border-b border-sidebar-border">
        {entityTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setMenuFieldId(null) }}
            className={cn(
              "relative px-[14px] py-[10px] text-[13px] font-medium transition-colors",
              activeTab === tab ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"
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
          className="flex items-center gap-[6px] rounded-[6px] border border-sidebar-border px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
          tabIndex={0}
        >
          <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
          Create field
        </button>
      </div>

      {/* Fields table */}
      <div className="overflow-hidden rounded-[8px] border border-sidebar-border">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-sidebar-border bg-[#fafafa]">
              <th className="w-[40%] px-[20px] py-[10px] text-[12px] font-medium text-[#888]">Name</th>
              <th className="w-[25%] px-[20px] py-[10px] text-[12px] font-medium text-[#888]">Type</th>
              <th className="w-[25%] px-[20px] py-[10px] text-[12px] font-medium text-[#888]">Editable by</th>
              <th className="w-[10%] px-[12px] py-[10px]" />
            </tr>
          </thead>
          <tbody>
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
                <tr>
                  <td colSpan={4} className="border-t border-sidebar-border bg-[#fafafa] px-[20px] py-[8px]">
                    <span className="text-[11px] font-medium tracking-wide text-[#999]">DISABLED FIELDS</span>
                  </td>
                </tr>
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
              <tr>
                <td colSpan={4} className="px-[20px] py-[32px] text-center text-[13px] font-medium text-[#bbb]">
                  No fields defined
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
              <div className="mb-[16px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Field name"
                  className="h-[38px] w-full rounded-[6px] border border-sidebar-border bg-white px-[12px] text-[14px] text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#bbb]"
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate() }}
                  autoFocus
                />
              </div>

              <div className="relative mb-[16px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Type</label>
                <button
                  type="button"
                  onClick={() => setIsTypeOpen(!isTypeOpen)}
                  className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-sidebar-border bg-white px-[12px] text-[14px] text-[#262626] transition-colors hover:border-[#bbb]"
                  tabIndex={0}
                >
                  {fieldTypeLabels[newType]}
                  <ChevronDown className={cn("h-[14px] w-[14px] text-[#888] transition-transform", isTypeOpen && "rotate-180")} strokeWidth={1.5} />
                </button>
                {isTypeOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-[4px] max-h-[200px] overflow-y-auto rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    {fieldTypes.map((ft) => (
                      <button
                        key={ft}
                        onClick={() => { setNewType(ft); setIsTypeOpen(false) }}
                        className={cn(
                          "flex w-full items-center px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]",
                          newType === ft && "bg-[#f5f5f5]"
                        )}
                        tabIndex={0}
                      >
                        {fieldTypeLabels[ft]}
                        {newType === ft && <Check className="ml-auto h-[13px] w-[13px] text-[#262626]" strokeWidth={2} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-[20px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Brief explanation of what this field describes"
                  rows={3}
                  className="w-full resize-y rounded-[6px] border border-sidebar-border bg-white px-[12px] py-[10px] text-[14px] text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#bbb]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className={cn(
                    "rounded-[6px] px-[16px] py-[7px] text-[13px] font-medium transition-colors",
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
              {/* Name */}
              <div className="mb-[16px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Name</label>
                {editingField.isSystem ? (
                  <div className="flex h-[38px] items-center rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] text-[14px] text-[#888]">
                    {editName}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Field name"
                    className="h-[38px] w-full rounded-[6px] border border-sidebar-border bg-white px-[12px] text-[14px] text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#bbb]"
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit() }}
                    autoFocus
                  />
                )}
              </div>

              {/* Type */}
              <div className="relative mb-[16px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Type</label>
                {editingField.isSystem ? (
                  <div className="flex h-[38px] items-center rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] text-[14px] text-[#888]">
                    {fieldTypeLabels[editType]}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditTypeOpen(!isEditTypeOpen)}
                      className="flex h-[38px] w-full items-center justify-between rounded-[6px] border border-sidebar-border bg-white px-[12px] text-[14px] text-[#262626] transition-colors hover:border-[#bbb]"
                      tabIndex={0}
                    >
                      {fieldTypeLabels[editType]}
                      <ChevronDown className={cn("h-[14px] w-[14px] text-[#888] transition-transform", isEditTypeOpen && "rotate-180")} strokeWidth={1.5} />
                    </button>
                    {isEditTypeOpen && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-[4px] max-h-[200px] overflow-y-auto rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                        {fieldTypes.map((ft) => (
                          <button
                            key={ft}
                            onClick={() => { setEditType(ft); setIsEditTypeOpen(false) }}
                            className={cn(
                              "flex w-full items-center px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]",
                              editType === ft && "bg-[#f5f5f5]"
                            )}
                            tabIndex={0}
                          >
                            {fieldTypeLabels[ft]}
                            {editType === ft && <Check className="ml-auto h-[13px] w-[13px] text-[#262626]" strokeWidth={2} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Description */}
              <div className="mb-[20px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Description</label>
                {editingField.isSystem ? (
                  <div className="min-h-[60px] rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] py-[10px] text-[14px] text-[#888]">
                    {editDescription || <span className="text-[#ccc]">No description</span>}
                  </div>
                ) : (
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Brief explanation of what this field describes"
                    rows={3}
                    className="w-full resize-y rounded-[6px] border border-sidebar-border bg-white px-[12px] py-[10px] text-[14px] text-[#262626] placeholder-[#bbb] outline-none transition-colors focus:border-[#bbb]"
                  />
                )}
              </div>

              {/* Editable by (read-only display) */}
              <div className="mb-[20px]">
                <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Editable by</label>
                <div className="flex h-[38px] items-center rounded-[6px] border border-sidebar-border bg-[#fafafa] px-[12px] text-[14px] text-[#888]">
                  {editingField.editableBy === "system" ? "System only" : "Anyone"}
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  {!editingField.isSystem && (
                    <button
                      onClick={() => { handleToggleEnabled(editingField.id); setEditingField(null) }}
                      className="flex items-center gap-[6px] rounded-[6px] border border-sidebar-border px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
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
                      className="flex items-center gap-[6px] rounded-[6px] border border-red-200 px-[12px] py-[7px] text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
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
                      "rounded-[6px] px-[16px] py-[7px] text-[13px] font-medium transition-colors",
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
                    className="rounded-[6px] border border-sidebar-border px-[16px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
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
        <div className="fixed bottom-[32px] left-1/2 z-50 -translate-x-1/2">
          <div className="flex items-center gap-[8px] rounded-[8px] border border-sidebar-border bg-white px-[16px] py-[10px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
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
  const textColor = isDisabledRow ? "text-[#bbb]" : "text-[#262626]"
  const mutedColor = isDisabledRow ? "text-[#ccc]" : "text-[#888]"

  return (
    <tr
      className={cn(
        "border-t border-sidebar-border transition-colors cursor-pointer",
        isDisabledRow ? "bg-[#fafafa] hover:bg-[#f3f3f3]" : "bg-white hover:bg-[#fafafa]"
      )}
      onClick={onRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onRowClick() }}
    >
      <td className={cn("px-[20px] py-[12px] text-[13px] font-medium", textColor)}>
        {field.name}
      </td>
      <td className={cn("px-[20px] py-[12px] text-[13px] font-medium", mutedColor)}>
        {fieldTypeLabels[field.type]}
      </td>
      <td className={cn("px-[20px] py-[12px] text-[13px] font-medium", mutedColor)}>
        {field.editableBy === "system" ? "System only" : "Anyone"}
      </td>
      <td className="px-[12px] py-[12px] text-right" onClick={(e) => e.stopPropagation()}>
        {!field.isSystem && (
          <div className="relative inline-block" ref={menuRef}>
            <button
              onClick={onMenuToggle}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[4px] text-[#888] transition-colors hover:bg-[#ebebeb] hover:text-[#262626]"
              tabIndex={0}
              aria-label="Field actions"
            >
              <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-[4px] w-[180px] rounded-[6px] border border-sidebar-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <button
                  onClick={onToggleEnabled}
                  className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  {field.isEnabled ? (
                    <>
                      <EyeOff className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.5} />
                      Disable
                    </>
                  ) : (
                    <>
                      <Eye className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.5} />
                      Enable
                    </>
                  )}
                </button>
                <button
                  onClick={onDelete}
                  className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
                  tabIndex={0}
                >
                  <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
        {field.isSystem && (
          <span className="inline-flex h-[28px] w-[28px] items-center justify-center text-[#ccc]">
            <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </span>
        )}
      </td>
    </tr>
  )
}
