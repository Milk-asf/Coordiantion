"use client"

import { useRef, useState } from "react"
import { CalendarRange, CalendarDays, Users, Building2, Plus } from "lucide-react"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { ShiftTagColorPicker } from "@/components/roster/shift-tag-color-picker"
import { SettingsGuard } from "@/components/settings-guard"
import { Switch } from "@/components/switch"
import { useRosterSettings } from "@/lib/hooks/use-roster-settings"
import { createSessionTypeId, getNextSessionTypeTone } from "@/lib/roster/settings"
import type { RosterAssigneeView, RosterViewMode, SessionTypeTone } from "@/lib/roster/types"
import { getToneChipClasses } from "@/lib/chip-colors"
import { useToast } from "@/components/toast"
import { cn } from "@/lib/utils"
import { RosterComplianceSettingsSection } from "./_components/roster-compliance-settings-section"

const labelClass = "text-[14px] font-medium text-folk-text"
const descriptionClass = "mt-[2px] text-[13px] text-folk-secondary"
const sectionClass = "rounded-[6px] border border-folk-border-subtle bg-folk-surface"
const rowClass = "flex items-start justify-between gap-[16px] border-b border-[#f5f5f5] px-[20px] py-[16px] last:border-b-0"

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string; icon?: React.ComponentType<{ className?: string; strokeWidth?: number }> }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-[4px] rounded-full border border-folk-border bg-folk-surface p-[3px]">
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const isActive = value === optionValue
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={cn(
              "flex items-center gap-[5px] rounded-full px-[10px] py-[4px] text-[12px] font-medium transition-colors",
              isActive
                ? "bg-folk-surface text-folk-text shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "text-folk-secondary hover:text-folk-secondary"
            )}
            aria-pressed={isActive}
            tabIndex={0}
          >
            {Icon && <Icon className="h-[13px] w-[13px]" strokeWidth={1.5} />}
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SettingsRow({
  label,
  description,
  children,
}: {
  label: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className={rowClass}>
      <div className="min-w-0 flex-1">
        <p className={labelClass}>{label}</p>
        <p className={descriptionClass}>{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function RosteringSettingsPage() {
  const { settings, updateSettings } = useRosterSettings()
  const { toast } = useToast()
  const [newSessionTypeLabel, setNewSessionTypeLabel] = useState("")
  const [newSessionTypeTone, setNewSessionTypeTone] = useState<SessionTypeTone>("blue")
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null)
  const [renameTagValue, setRenameTagValue] = useState("")
  const renameInputRef = useRef<HTMLInputElement>(null)

  const handleStartRename = (id: string, label: string) => {
    setRenamingTagId(id)
    setRenameTagValue(label)
    window.setTimeout(() => renameInputRef.current?.focus(), 0)
  }

  const handleCancelRename = () => {
    setRenamingTagId(null)
    setRenameTagValue("")
  }

  const handleRenameSessionType = (id: string) => {
    const label = renameTagValue.trim()
    if (!label) {
      handleCancelRename()
      return
    }

    const current = settings.sessionTypes.find((item) => item.id === id)
    if (!current) {
      handleCancelRename()
      return
    }

    if (current.label.toLowerCase() === label.toLowerCase()) {
      handleCancelRename()
      return
    }

    if (settings.sessionTypes.some((item) => item.id !== id && item.label.toLowerCase() === label.toLowerCase())) {
      toast("A tag with this name already exists", "error")
      renameInputRef.current?.focus()
      return
    }

    updateSettings({
      sessionTypes: settings.sessionTypes.map((item) =>
        item.id === id ? { ...item, label } : item
      ),
    })
    handleCancelRename()
    toast("Tag renamed", "success")
  }

  const handleAddSessionType = () => {
    const label = newSessionTypeLabel.trim()
    if (!label) return

    if (settings.sessionTypes.some((item) => item.label.toLowerCase() === label.toLowerCase())) {
      toast("A tag with this name already exists", "error")
      return
    }

    const id = createSessionTypeId(label, settings.sessionTypes)
    updateSettings({
      sessionTypes: [...settings.sessionTypes, { id, label, tone: newSessionTypeTone }],
    })
    setNewSessionTypeLabel("")
    setNewSessionTypeTone(getNextSessionTypeTone([...settings.sessionTypes, { id, label, tone: newSessionTypeTone }]))
    toast(`Added ${label}`, "success")
  }

  const handleUpdateSessionTypeTone = (id: string, tone: SessionTypeTone) => {
    updateSettings({
      sessionTypes: settings.sessionTypes.map((item) =>
        item.id === id ? { ...item, tone } : item
      ),
    })
  }

  const handleRemoveSessionType = (id: string) => {
    if (settings.sessionTypes.length <= 1) {
      toast("At least one tag is required", "error")
      return
    }

    updateSettings({
      sessionTypes: settings.sessionTypes.filter((item) => item.id !== id),
    })
  }

  return (
    <SettingsGuard requireAdmin>
      <div className="mb-[32px]">
        <h1 className="text-[20px] font-bold text-folk-text">Rostering</h1>
        <p className="mt-[4px] text-[14px] text-folk-secondary">
          Configure default roster views and scheduling behaviour for your workspace.
        </p>
      </div>

      <div className="space-y-[20px]">
        <section className={sectionClass}>
          <div className="border-b border-[#f5f5f5] px-[20px] py-[14px]">
            <h2 className="text-[13px] font-semibold text-folk-text">Display defaults</h2>
          </div>

          <SettingsRow
            label="Default view"
            description="Which calendar view opens when you visit the roster."
          >
            <SegmentedControl<RosterViewMode>
              value={settings.defaultViewMode}
              onChange={(value) => updateSettings({ defaultViewMode: value })}
              options={[
                { value: "week", label: "Week", icon: CalendarRange },
                { value: "day", label: "Day", icon: CalendarDays },
              ]}
            />
          </SettingsRow>

          <SettingsRow
            label="Default rows"
            description="Whether the roster shows staff or clients first."
          >
            <SegmentedControl<RosterAssigneeView>
              value={settings.defaultAssigneeView}
              onChange={(value) => updateSettings({ defaultAssigneeView: value })}
              options={[
                { value: "employees", label: "Staff", icon: Users },
                { value: "clients", label: "Clients", icon: Building2 },
              ]}
            />
          </SettingsRow>

          <SettingsRow
            label="Week starts on"
            description="The first day shown in week view."
          >
            <SegmentedControl<"monday" | "sunday">
              value={settings.weekStartsOn === 0 ? "sunday" : "monday"}
              onChange={(value) => updateSettings({ weekStartsOn: value === "sunday" ? 0 : 1 })}
              options={[
                { value: "monday", label: "Monday" },
                { value: "sunday", label: "Sunday" },
              ]}
            />
          </SettingsRow>
        </section>

        <section className={sectionClass}>
          <div className="border-b border-[#f5f5f5] px-[20px] py-[14px]">
            <h2 className="text-[13px] font-semibold text-folk-text">Shift tags</h2>
            <p className="mt-[4px] text-[12px] font-medium text-folk-secondary">
              Tags appear as session types on shifts and colour the shift card on the roster.
            </p>
          </div>

          {settings.sessionTypes.map((item) => (
            <div key={item.id} className={rowClass}>
              <div className="flex min-w-0 flex-1 items-start gap-[12px]">
                {renamingTagId === item.id ? (
                  <input
                    ref={renameInputRef}
                    value={renameTagValue}
                    onChange={(event) => setRenameTagValue(event.target.value)}
                    onBlur={() => handleRenameSessionType(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleRenameSessionType(item.id)
                      if (event.key === "Escape") handleCancelRename()
                    }}
                    className="mt-[2px] h-[28px] min-w-0 flex-1 rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
                    aria-label={`Rename ${item.label}`}
                  />
                ) : (
                  <span className={cn(getToneChipClasses(item.tone ?? "slate", "sm"), "mt-[2px] shrink-0")}>
                    {item.label}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <ShiftTagColorPicker
                    value={item.tone ?? "slate"}
                    onChange={(tone) => handleUpdateSessionTypeTone(item.id, tone)}
                  />
                </div>
              </div>
              <DeleteActionsMenu
                onRename={() => handleStartRename(item.id, item.label)}
                onDelete={
                  settings.sessionTypes.length > 1
                    ? () => handleRemoveSessionType(item.id)
                    : undefined
                }
                itemName={item.label}
                confirmTitle="Remove shift tag"
                buttonClassName="icon-btn flex h-[29px] w-[29px] items-center justify-center text-folk-secondary hover:text-folk-text"
                ariaLabel={`Actions for ${item.label}`}
              />
            </div>
          ))}

          <div className="space-y-[12px] border-t border-[#f5f5f5] px-[20px] py-[16px]">
            <div className="flex flex-col gap-[12px] sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="new-shift-tag" className="mb-[6px] block text-[12px] font-medium text-folk-secondary">
                  Tag name
                </label>
                <input
                  id="new-shift-tag"
                  value={newSessionTypeLabel}
                  onChange={(event) => setNewSessionTypeLabel(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleAddSessionType()
                  }}
                  placeholder="e.g. Respite, Transport"
                  className="h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
                />
              </div>
              <button
                type="button"
                onClick={handleAddSessionType}
                disabled={!newSessionTypeLabel.trim()}
                className="outline-btn flex h-[36px] shrink-0 items-center gap-[6px] px-[12px] text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
                tabIndex={0}
              >
                <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
                Add tag
              </button>
            </div>
            <div>
              <p className="mb-[6px] text-[12px] font-medium text-folk-secondary">Colour</p>
              <ShiftTagColorPicker value={newSessionTypeTone} onChange={setNewSessionTypeTone} />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="border-b border-[#f5f5f5] px-[20px] py-[14px]">
            <h2 className="text-[13px] font-semibold text-folk-text">Scheduling</h2>
          </div>

          <SettingsRow
            label="Default shift length"
            description="Duration used when creating a new shift from a single hour selection."
          >
            <select
              value={settings.defaultShiftDurationHours}
              onChange={(event) => updateSettings({ defaultShiftDurationHours: Number(event.target.value) })}
              className="h-[36px] rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
              aria-label="Default shift duration"
            >
              {[1, 2, 3, 4].map((hours) => (
                <option key={hours} value={hours}>
                  {hours} {hours === 1 ? "hour" : "hours"}
                </option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow
            label="Show scheduling conflicts"
            description="Highlight overlapping shifts on the roster and in the shift editor."
          >
            <Switch
              checked={settings.showConflictWarnings}
              onChange={() => updateSettings({ showConflictWarnings: !settings.showConflictWarnings })}
              ariaLabel="Show scheduling conflicts"
            />
          </SettingsRow>
        </section>

        <RosterComplianceSettingsSection
          compliance={settings.compliance}
          onChange={(patch) => updateSettings({ compliance: { ...settings.compliance, ...patch } })}
        />
      </div>
    </SettingsGuard>
  )
}
