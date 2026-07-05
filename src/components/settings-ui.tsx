"use client"

import { useRef, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { FixedSelectDropdown, FixedSelectOption } from "@/components/fixed-select-dropdown"
import { cn } from "@/lib/utils"

/**
 * Shared control language for the settings pages, matching the app-wide forms
 * style (38px controls, 6px radius, white fill, blue focus border) and the
 * folk pill buttons used everywhere else in the product.
 */
export const SETTINGS_INPUT_CLASS =
  "h-[38px] w-full rounded-[6px] border border-folk-border bg-white px-[12px] text-[13px] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"

export const SETTINGS_TEXTAREA_CLASS =
  "w-full resize-none rounded-[6px] border border-folk-border bg-white px-[12px] py-[10px] text-[13px] leading-[1.5] text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]"

export const SETTINGS_LABEL_CLASS = "mb-[6px] block text-[13px] font-medium text-folk-text"

export const SETTINGS_PRIMARY_BTN_CLASS =
  "primary-btn folk-pill-btn h-[32px] px-[14px] text-[13px] font-medium transition-colors disabled:opacity-50"

export const SETTINGS_OUTLINE_BTN_CLASS =
  "outline-btn folk-pill-btn h-[32px] px-[12px] text-[13px] font-medium transition-colors disabled:opacity-50"

export const SETTINGS_SECTION_CLASS = "rounded-[6px] border border-folk-border-subtle bg-folk-surface"

interface SettingsSectionProps {
  title: string
  description?: string
  headerActions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

/** Bordered section card with a header row — matches the Rostering settings page. */
export function SettingsSection({
  title,
  description,
  headerActions,
  children,
  className,
  contentClassName,
}: SettingsSectionProps) {
  return (
    <section className={cn(SETTINGS_SECTION_CLASS, className)}>
      <div className="flex items-start justify-between gap-[12px] border-b border-[#f5f5f5] px-[20px] py-[14px]">
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-folk-text">{title}</h2>
          {description && <p className="mt-[2px] text-[12px] text-folk-secondary">{description}</p>}
        </div>
        {headerActions && <div className="shrink-0">{headerActions}</div>}
      </div>
      <div className={cn("px-[20px] py-[16px]", contentClassName)}>{children}</div>
    </section>
  )
}

interface SettingsSelectProps {
  label?: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
  icon?: ReactNode
  placeholder?: string
  ariaLabel?: string
}

/** 38px select built on the viewport-safe fixed dropdown system. */
export function SettingsSelect({
  label,
  value,
  options,
  onChange,
  icon,
  placeholder = "Select…",
  ariaLabel,
}: SettingsSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  return (
    <div>
      {label && <label className={SETTINGS_LABEL_CLASS}>{label}</label>}
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={cn(SETTINGS_INPUT_CLASS, "flex items-center justify-between gap-[8px] text-left")}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel ?? label}
        tabIndex={0}
      >
        <span className="flex min-w-0 items-center gap-[8px]">
          {icon}
          <span className={cn("truncate", !value && "text-folk-placeholder")}>{value || placeholder}</span>
        </span>
        <ChevronDown className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
      </button>
      <FixedSelectDropdown
        isOpen={isOpen}
        anchorRef={anchorRef}
        onClose={() => setIsOpen(false)}
        estimatedHeight={220}
        align="match"
      >
        {options.map((option) => (
          <FixedSelectOption
            key={option}
            isActive={option === value}
            onClick={() => {
              onChange(option)
              setIsOpen(false)
            }}
          >
            <span className="truncate">{option}</span>
          </FixedSelectOption>
        ))}
      </FixedSelectDropdown>
    </div>
  )
}

interface SettingsSearchSelectProps {
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  maxMatches?: number
  ariaLabel?: string
}

/** Free-text input with viewport-safe suggestions (e.g. bank picker). */
export function SettingsSearchSelect({
  value,
  onChange,
  options,
  placeholder,
  maxMatches = 8,
  ariaLabel,
}: SettingsSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const anchorRef = useRef<HTMLInputElement>(null)

  const query = value.trim().toLowerCase()
  const matches = (query
    ? options.filter((option) => option.toLowerCase().includes(query))
    : options
  ).slice(0, maxMatches)
  const showDropdown =
    isOpen && matches.length > 0 && !(matches.length === 1 && matches[0].toLowerCase() === query)

  return (
    <>
      <input
        ref={anchorRef}
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setIsOpen(true)
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={SETTINGS_INPUT_CLASS}
        autoComplete="off"
        aria-label={ariaLabel}
      />
      <FixedSelectDropdown
        isOpen={showDropdown}
        anchorRef={anchorRef}
        onClose={() => setIsOpen(false)}
        estimatedHeight={Math.min(matches.length, maxMatches) * 32 + 8}
        align="match"
      >
        {matches.map((option) => (
          <FixedSelectOption
            key={option}
            isActive={option === value}
            onClick={() => {
              onChange(option)
              setIsOpen(false)
            }}
          >
            <span className="truncate">{option}</span>
          </FixedSelectOption>
        ))}
      </FixedSelectDropdown>
    </>
  )
}
