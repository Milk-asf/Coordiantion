"use client"

import { useState } from "react"
import { ChevronDown, Plus, X } from "lucide-react"
import { Switch } from "@/components/switch"
import { FORM_PROCESSES, type Form, type FormProcessKey, type FormSettings } from "@/lib/form-definitions"
import { cn } from "@/lib/utils"

interface FormSettingsPanelProps {
  form: Form
  onChange: (updates: Partial<Form>) => void
  onSettingsChange: (updates: Partial<FormSettings>) => void
  connectedProcess: FormProcessKey | null
  onConnectProcess: (next: FormProcessKey | null) => void
}

export function FormSettingsPanel({
  form,
  onChange,
  onSettingsChange,
  connectedProcess,
  onConnectProcess,
}: FormSettingsPanelProps) {
  const { settings } = form
  const [tagDraft, setTagDraft] = useState("")

  const addTag = () => {
    const value = tagDraft.trim()
    if (!value || form.tags.includes(value)) {
      setTagDraft("")
      return
    }
    onChange({ tags: [...form.tags, value] })
    setTagDraft("")
  }

  const removeTag = (tag: string) => onChange({ tags: form.tags.filter((item) => item !== tag) })

  const hasSteps = form.schema.steps.length > 0

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Section title="Connections">
        <p className="px-[16px] pb-[6px] pt-[2px] text-[12px] leading-[1.5] text-folk-tertiary">
          Connect this form to a process to add its required fields. A form can be connected to one process.
        </p>
        {FORM_PROCESSES.map((process) => {
          const isConnected = connectedProcess === process.key
          const isOtherConnected = connectedProcess !== null && !isConnected
          return (
            <ToggleRow
              key={process.key}
              label={process.connectLabel}
              description={isOtherConnected ? "Disconnect the current process to use this one." : undefined}
              checked={isConnected}
              disabled={isOtherConnected}
              onChange={() => onConnectProcess(isConnected ? null : process.key)}
            />
          )
        })}
      </Section>

      <Section title="Form Style">
        <ToggleRow label="Show Cover" checked={settings.showCover} onChange={() => onSettingsChange({ showCover: !settings.showCover })} />
        <ToggleRow label="Show Icon" checked={settings.showIcon} onChange={() => onSettingsChange({ showIcon: !settings.showIcon })} />
        <ToggleRow label="Show form description" checked={settings.showFormDescription} onChange={() => onSettingsChange({ showFormDescription: !settings.showFormDescription })} />
        <ToggleRow
          label="Number questions"
          description="Show a running number beside each question."
          checked={settings.showQuestionNumbers}
          onChange={() => onSettingsChange({ showQuestionNumbers: !settings.showQuestionNumbers })}
        />
      </Section>

      <Section title="Form Settings">
        <ToggleRow
          label="Allow Step Navigation"
          description="Let people jump between steps in a multi-step form."
          checked={settings.allowStepNavigation}
          disabled={!hasSteps}
          onChange={() => onSettingsChange({ allowStepNavigation: !settings.allowStepNavigation })}
        />
        <div className="px-[16px] py-[10px]">
          <span className="text-[13px] text-folk-text">Submit button text</span>
          <input
            value={settings.submitButtonText}
            onChange={(event) => onSettingsChange({ submitButtonText: event.target.value })}
            placeholder="Submit"
            className="mt-[8px] h-[34px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
            tabIndex={0}
          />
        </div>
        <div className="px-[16px] py-[10px]">
          <span className="text-[13px] text-folk-text">Assign responses to</span>
          <input
            value={settings.assignResponsesTo}
            onChange={(event) => onSettingsChange({ assignResponsesTo: event.target.value })}
            placeholder="Select a person"
            className="mt-[8px] h-[34px] w-full rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
            tabIndex={0}
          />
        </div>
        <div className="px-[16px] py-[10px]">
          <span className="text-[13px] text-folk-text">Form Tags</span>
          <div className="mt-[8px] flex flex-wrap gap-[6px]">
            {form.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-[6px] rounded-full bg-[#e8eef7] py-[4px] pl-[10px] pr-[4px] text-[13px] font-normal text-[#3d5a8c]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[3px] border border-[#3d5a8c] text-[#3d5a8c] transition-colors hover:bg-[#3d5a8c]/10"
                  aria-label={`Remove ${tag}`}
                  tabIndex={0}
                >
                  <X className="h-[9px] w-[9px]" strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-[8px] flex items-center gap-[6px]">
            <input
              value={tagDraft}
              onChange={(event) => setTagDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  addTag()
                }
              }}
              placeholder="Add a tag"
              className="h-[32px] flex-1 rounded-[6px] border border-folk-border bg-white px-[10px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
              tabIndex={0}
            />
            <button
              type="button"
              onClick={addTag}
              className="flex h-[29px] w-[29px] items-center justify-center rounded-[6px] border border-folk-border text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
              aria-label="Add tag"
              tabIndex={0}
            >
              <Plus className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </Section>

      <Section title="Success Screen">
        <ToggleRow
          label="Submit another response"
          checked={settings.successScreen.allowSubmitAnother}
          onChange={() =>
            onSettingsChange({
              successScreen: { ...settings.successScreen, allowSubmitAnother: !settings.successScreen.allowSubmitAnother },
            })
          }
        />
        <ToggleRow
          label="Custom Success Message"
          checked={settings.successScreen.customMessage !== null}
          onChange={() =>
            onSettingsChange({
              successScreen: {
                ...settings.successScreen,
                customMessage: settings.successScreen.customMessage === null ? "" : null,
              },
            })
          }
        />
        {settings.successScreen.customMessage !== null && (
          <div className="px-[16px] pb-[10px]">
            <textarea
              value={settings.successScreen.customMessage}
              onChange={(event) =>
                onSettingsChange({ successScreen: { ...settings.successScreen, customMessage: event.target.value } })
              }
              placeholder="Thanks for your submission!"
              className="h-[72px] w-full resize-none rounded-[6px] border border-folk-border bg-white px-[10px] py-[8px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"
              tabIndex={0}
            />
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-folk-border-subtle">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex h-[40px] w-full items-center justify-between px-[16px] text-[13px] font-semibold text-folk-text"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        {title}
        <ChevronDown className={cn("h-[15px] w-[15px] text-folk-secondary transition-transform", !isOpen && "-rotate-90")} strokeWidth={1.75} />
      </button>
      {isOpen && <div className="pb-[6px]">{children}</div>}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-[12px] px-[16px] py-[10px]">
      <div className="min-w-0">
        <p className={cn("text-[13px]", disabled ? "text-folk-tertiary" : "text-folk-text")}>{label}</p>
        {description && <p className="mt-[2px] text-[12px] leading-[1.5] text-folk-tertiary">{description}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} ariaLabel={label} />
    </div>
  )
}
