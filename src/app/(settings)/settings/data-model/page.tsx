"use client"

import { useState } from "react"
import { Plus, MoreHorizontal, X, Settings2, EyeOff, Eye, FileText, Layers, AlignLeft } from "lucide-react"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { cn } from "@/lib/utils"
import { SettingsGuard } from "@/components/settings-guard"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { Switch } from "@/components/switch"
import { Button } from "@/components/button"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { useToast } from "@/components/toast"
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
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null)
  const { toast } = useToast()

  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState<FieldType>("text")
  const [newDescription, setNewDescription] = useState("")
  const [isTypeOpen, setIsTypeOpen] = useState(false)

  const [editName, setEditName] = useState("")
  const [editType, setEditType] = useState<FieldType>("text")
  const [editDescription, setEditDescription] = useState("")
  const [isEditTypeOpen, setIsEditTypeOpen] = useState(false)

  const showToast = (message: string) => toast(message, "success")

  const query = search.trim().toLowerCase()
  const tabFields = fields.filter((f) => {
    if (f.entity !== activeTab) return false
    if (!query) return true
    return [f.name, fieldTypeLabels[f.type], f.description]
      .some((field) => (field || "").toLowerCase().includes(query))
  })
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
  }

  const handleDelete = (id: string) => {
    showToast("Field deleted")
    void id
  }

  return (
    <SettingsGuard requireAdmin>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-folk-text">Data model</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Manage field definitions for your account.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-[20px] flex h-[44px] items-center gap-[2px] border-b border-folk-border bg-white">
        {entityTabs.map((tab) => (
          <ProfileTabButton
            key={tab}
            isActive={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            label={entityTabLabels[tab]}
          />
        ))}
      </div>

      {/* Create field button + search */}
      <div className="mb-[16px] flex items-center gap-[10px]">
        <ExpandableTableSearch
          value={search}
          onChange={setSearch}
          placeholder="Search fields…"
          ariaLabel="Search fields"
        />
        <Button onClick={() => setIsCreateOpen(true)} className="ml-auto h-[36px] shrink-0 px-[12px]">
          <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
          Create field
        </Button>
      </div>

      {/* Fields table */}
      <div className="overflow-hidden">
        <div className="grid grid-cols-[35%_20%_20%_15%_10%] items-center border-b border-[#d9d9d9] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-folk-secondary">Name</span>
          <span className="text-[12px] font-medium text-folk-secondary">Type</span>
          <span className="text-[12px] font-medium text-folk-secondary">Editable by</span>
          <span className="text-[12px] font-medium text-folk-secondary">Enabled</span>
          <span />
        </div>

        {enabledFields.map((field) => (
          <FieldRow
            key={field.id}
            field={field}
            onRowClick={() => handleOpenEdit(field)}
            onToggleEnabled={() => handleToggleEnabled(field.id)}
            onDelete={() => handleDelete(field.id)}
          />
        ))}

        {disabledFields.length > 0 && (
          <>
            <div className="border-b border-[#d9d9d9] px-[20px] pb-[8px] pt-[20px]">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-folk-secondary">Disabled fields</span>
            </div>
            {disabledFields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                onRowClick={() => handleOpenEdit(field)}
                onToggleEnabled={() => handleToggleEnabled(field.id)}
                onDelete={() => handleDelete(field.id)}
                isDisabledRow
              />
            ))}
          </>
        )}

        {enabledFields.length === 0 && disabledFields.length === 0 && (
          <div className="px-[20px] py-[40px] text-center text-[13px] text-folk-placeholder">
            {query ? `No fields match “${search.trim()}”.` : "No fields defined"}
          </div>
        )}
      </div>

      {/* Create field modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[120px]">
          <div className="absolute inset-0 bg-black/20" onClick={() => { setIsCreateOpen(false); setIsTypeOpen(false) }} />
          <div className="relative z-10 w-[480px] rounded-[6px] border border-folk-border-subtle bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <Settings2 className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-folk-text">Create field</h2>
              </div>
              <button
                onClick={() => { setIsCreateOpen(false); setIsTypeOpen(false) }}
                className="icon-btn flex h-[28px] w-[28px] items-center justify-center text-folk-secondary hover:text-folk-text"
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
                  <div className="flex items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] transition-colors hover:bg-folk-page">
                    <FileText className={`h-[13px] w-[13px] shrink-0 ${newName ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Empty"
                      className="w-full bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none"
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
                      className="flex w-full items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] text-left text-[13px] font-medium text-folk-text outline-none transition-colors hover:bg-folk-page"
                      tabIndex={0}
                    >
                      <Layers className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      {fieldTypeLabels[newType]}
                    </button>
                    {isTypeOpen && (
                      <>
                        <div className="fixed inset-0 z-[59]" onClick={() => setIsTypeOpen(false)} />
                        <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                          {fieldTypes.map((ft) => (
                            <button
                              key={ft}
                              onClick={() => { setNewType(ft); setIsTypeOpen(false) }}
                              className={cn(
                                "flex w-full items-center px-[12px] py-[7px] text-[13px] font-medium text-[#555] transition-colors hover:bg-folk-hover",
                                newType === ft && "bg-[var(--folk-border-subtle)] text-folk-text"
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
                  <div className="flex items-start gap-[7px] rounded-[6px] px-[8px] py-[6px] transition-colors hover:bg-folk-page">
                    <AlignLeft className={`mt-[2px] h-[13px] w-[13px] shrink-0 ${newDescription ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Empty"
                      rows={2}
                      className="w-full resize-none bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-[16px] flex justify-end">
                <button
                  onClick={handleCreate}
                  disabled={!newName.trim()}
                  className={cn(
                    "px-[16px] py-[7px] text-[13px] font-medium transition-colors",
                    newName.trim()
                      ? "primary-btn"
                      : "cursor-not-allowed bg-[#e8e8e8] text-folk-placeholder"
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
          <div className="relative z-10 w-[480px] rounded-[6px] border border-folk-border-subtle bg-folk-surface shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between px-[24px] pt-[20px]">
              <div className="flex items-center gap-[8px]">
                <Settings2 className="h-[16px] w-[16px] text-[#555]" strokeWidth={1.5} />
                <h2 className="text-[15px] font-semibold text-folk-text">
                  {editingField.isSystem ? "View field" : "Edit field"}
                </h2>
              </div>
              <button
                onClick={handleCloseEdit}
                className="icon-btn flex h-[28px] w-[28px] items-center justify-center text-folk-secondary hover:text-folk-text"
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
                      <FileText className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-folk-secondary">{editName}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] transition-colors hover:bg-folk-page">
                      <FileText className={`h-[13px] w-[13px] shrink-0 ${editName ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Empty"
                        className="w-full bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none"
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
                      <Layers className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-folk-secondary">{fieldTypeLabels[editType]}</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsEditTypeOpen(!isEditTypeOpen)}
                        className="flex w-full items-center gap-[7px] rounded-[6px] px-[8px] py-[6px] text-left text-[13px] font-medium text-folk-text outline-none transition-colors hover:bg-folk-page"
                        tabIndex={0}
                      >
                        <Layers className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                        {fieldTypeLabels[editType]}
                      </button>
                      {isEditTypeOpen && (
                        <>
                          <div className="fixed inset-0 z-[59]" onClick={() => setIsEditTypeOpen(false)} />
                          <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[200px] min-w-[180px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.1)]">
                            {fieldTypes.map((ft) => (
                              <button
                                key={ft}
                                onClick={() => { setEditType(ft); setIsEditTypeOpen(false) }}
                                className={cn(
                                  "flex w-full items-center px-[12px] py-[7px] text-[13px] font-medium text-[#555] transition-colors hover:bg-folk-hover",
                                  editType === ft && "bg-[var(--folk-border-subtle)] text-folk-text"
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
                      <AlignLeft className="mt-[2px] h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span className="text-[13px] font-medium text-folk-secondary">{editDescription || <span className="text-[#ccc]">Empty</span>}</span>
                    </div>
                  ) : (
                    <div className="flex items-start gap-[7px] rounded-[6px] px-[8px] py-[6px] transition-colors hover:bg-folk-page">
                      <AlignLeft className={`mt-[2px] h-[13px] w-[13px] shrink-0 ${editDescription ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                      <textarea
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Empty"
                        rows={2}
                        className="w-full resize-none bg-transparent text-[13px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-[100px_minmax(0,1fr)] items-center gap-[12px]">
                  <span className="text-[13px] font-medium text-[#8d8d8d]">Editable by</span>
                  <div className="flex items-center gap-[7px] px-[8px] py-[6px]">
                    <Settings2 className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <span className="text-[13px] font-medium text-folk-secondary">{editingField.editableBy === "system" ? "System only" : "Anyone"}</span>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[8px]">
                  {!editingField.isSystem && (
                    <button
                      onClick={() => { handleToggleEnabled(editingField.id); setEditingField(null) }}
                      className="outline-btn flex items-center gap-[6px] px-[12px] py-[7px] text-[13px] font-medium"
                      tabIndex={0}
                    >
                      {editingField.isEnabled ? (
                        <>
                          <EyeOff className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                          Disable
                        </>
                      ) : (
                        <>
                          <Eye className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                          Enable
                        </>
                      )}
                    </button>
                  )}
                  {!editingField.isSystem && (
                    <DeleteActionsMenu
                      onDelete={() => { handleDelete(editingField.id); setEditingField(null) }}
                      itemName={editingField.name}
                      confirmTitle="Delete field"
                      menuPlacement="top"
                    />
                  )}
                </div>

                {!editingField.isSystem ? (
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editName.trim()}
                    className={cn(
                      "px-[16px] py-[7px] text-[13px] font-medium transition-colors",
                      editName.trim()
                        ? "primary-btn"
                        : "cursor-not-allowed bg-[#e8e8e8] text-folk-placeholder"
                    )}
                    tabIndex={0}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    onClick={handleCloseEdit}
                    className="outline-btn px-[16px] py-[7px] text-[13px] font-medium"
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
    </SettingsGuard>
  )
}

function FieldRow({
  field,
  onRowClick,
  onToggleEnabled,
  onDelete,
  isDisabledRow,
}: {
  field: FieldDefinition
  onRowClick: () => void
  onToggleEnabled: () => void
  onDelete: () => void
  isDisabledRow?: boolean
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[35%_20%_20%_15%_10%] items-center border-b border-[#d9d9d9] px-[20px] py-[10px] transition-colors cursor-pointer last:border-b-0",
        isDisabledRow ? "opacity-60" : "hover:bg-folk-hover"
      )}
      onClick={onRowClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onRowClick() }}
    >
      <span className="text-[13px] font-medium text-folk-text">{field.name}</span>
      <span className="text-[13px] text-folk-secondary">{fieldTypeLabels[field.type]}</span>
      <span className="text-[13px] text-folk-secondary">{field.editableBy === "system" ? "System only" : "Anyone"}</span>

      <div onClick={(e) => e.stopPropagation()}>
        <Switch
          checked={field.isSystem ? true : field.isEnabled}
          onChange={onToggleEnabled}
          disabled={field.isSystem}
          ariaLabel={field.isSystem ? "System field — always enabled" : (field.isEnabled ? "Disable field" : "Enable field")}
        />
      </div>

      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
        {!field.isSystem ? (
          <DeleteActionsMenu
            onDelete={onDelete}
            itemName={field.name}
            confirmTitle="Delete field"
            stopPropagation
            ariaLabel="Field actions"
          />
        ) : (
          <span className="inline-flex h-[28px] w-[28px] items-center justify-center text-[var(--folk-border)]">
            <MoreHorizontal className="h-[16px] w-[16px]" strokeWidth={1.75} />
          </span>
        )}
      </div>
    </div>
  )
}
