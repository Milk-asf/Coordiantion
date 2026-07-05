"use client"

import { Switch } from "@/components/switch"
import type { ComplianceEnforcement, RosterComplianceSettings } from "@/lib/roster/compliance-settings"

const rowClass = "flex items-start justify-between gap-[16px] border-b border-[#f5f5f5] px-[20px] py-[16px] last:border-b-0"
const labelClass = "text-[14px] font-medium text-folk-text"
const descriptionClass = "mt-[2px] text-[13px] text-folk-secondary"
const sectionClass = "rounded-[6px] border border-folk-border-subtle bg-folk-surface"

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

function EnforcementSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: ComplianceEnforcement
  onChange: (value: ComplianceEnforcement) => void
  ariaLabel: string
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ComplianceEnforcement)}
      className="h-[36px] min-w-[120px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
      aria-label={ariaLabel}
    >
      <option value="off">Off</option>
      <option value="warn">Warn</option>
      <option value="block">Block</option>
    </select>
  )
}

interface RosterComplianceSettingsSectionProps {
  compliance: RosterComplianceSettings
  onChange: (patch: Partial<RosterComplianceSettings>) => void
}

export function RosterComplianceSettingsSection({
  compliance,
  onChange,
}: RosterComplianceSettingsSectionProps) {
  return (
    <>
      <section className={sectionClass}>
        <div className="border-b border-[#f5f5f5] px-[20px] py-[14px]">
          <h2 className="text-[13px] font-semibold text-folk-text">Documentation</h2>
          <p className="mt-[4px] text-[12px] font-medium text-folk-secondary">
            NDIS progress notes and incident documentation on completed shifts.
          </p>
        </div>

        <SettingsRow
          label="Progress note on complete"
          description="Require a shift note before marking a shift completed."
        >
          <EnforcementSelect
            value={compliance.progressNoteOnComplete}
            onChange={(value) => onChange({ progressNoteOnComplete: value })}
            ariaLabel="Progress note on complete"
          />
        </SettingsRow>

        <SettingsRow
          label="Note deadline (hours)"
          description="Hours after the shift before overdue notes are flagged in warnings."
        >
          <input
            type="number"
            min={1}
            max={168}
            value={compliance.progressNoteDeadlineHours}
            onChange={(event) => onChange({ progressNoteDeadlineHours: Number(event.target.value) })}
            className="h-[36px] w-[72px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
            aria-label="Progress note deadline hours"
          />
        </SettingsRow>

        <SettingsRow
          label="Incident link required"
          description="When a note flags an incident, warn or block until a formal incident is logged."
        >
          <EnforcementSelect
            value={compliance.incidentLinkRequired}
            onChange={(value) => onChange({ incidentLinkRequired: value })}
            ariaLabel="Incident link required"
          />
        </SettingsRow>

        <SettingsRow
          label="Support log export"
          description="Allow downloading a complete support log from a shift."
        >
          <Switch
            checked={compliance.enableSupportLogExport}
            onChange={() => onChange({ enableSupportLogExport: !compliance.enableSupportLogExport })}
            ariaLabel="Support log export"
          />
        </SettingsRow>
      </section>

      <section className={sectionClass}>
        <div className="border-b border-[#f5f5f5] px-[20px] py-[14px]">
          <h2 className="text-[13px] font-semibold text-folk-text">Billing</h2>
        </div>

        <SettingsRow
          label="Bill all shift charge types"
          description="Create a billable line for each charge type on a shift, not only the first."
        >
          <Switch
            checked={compliance.billAllChargeTypes}
            onChange={() => onChange({ billAllChargeTypes: !compliance.billAllChargeTypes })}
            ariaLabel="Bill all charge types"
          />
        </SettingsRow>

        <SettingsRow
          label="Sync billables on timesheet approval"
          description="Create billable entries when a timesheet is approved, not only at invoicing."
        >
          <Switch
            checked={compliance.syncBillablesOnTimesheetApproval}
            onChange={() => onChange({ syncBillablesOnTimesheetApproval: !compliance.syncBillablesOnTimesheetApproval })}
            ariaLabel="Sync billables on timesheet approval"
          />
        </SettingsRow>

        <SettingsRow
          label="Cancellation claim suggestions"
          description="Show NDIS cancellation billing guidance when cancelling a shift."
        >
          <Switch
            checked={compliance.cancellationClaimSuggestions}
            onChange={() => onChange({ cancellationClaimSuggestions: !compliance.cancellationClaimSuggestions })}
            ariaLabel="Cancellation claim suggestions"
          />
        </SettingsRow>
      </section>

      <section className={sectionClass}>
        <div className="border-b border-[#f5f5f5] px-[20px] py-[14px]">
          <h2 className="text-[13px] font-semibold text-folk-text">Workforce</h2>
        </div>

        <SettingsRow
          label="Staff suitability"
          description="Warn or block when rostering a disallowed staff–participant pair."
        >
          <EnforcementSelect
            value={compliance.suitabilityEnforcement}
            onChange={(value) => onChange({ suitabilityEnforcement: value })}
            ariaLabel="Staff suitability enforcement"
          />
        </SettingsRow>

        <SettingsRow
          label="NDIS worker screening"
          description="Check screening expiry on staff profiles before rostering."
        >
          <EnforcementSelect
            value={compliance.workerScreeningCheck}
            onChange={(value) => onChange({ workerScreeningCheck: value })}
            ariaLabel="Worker screening check"
          />
        </SettingsRow>

        <SettingsRow
          label="SCHADS roster warnings"
          description="Show rest-break, max shift length, and broken-shift warnings."
        >
          <Switch
            checked={compliance.schadsRosterWarnings}
            onChange={() => onChange({ schadsRosterWarnings: !compliance.schadsRosterWarnings })}
            ariaLabel="SCHADS roster warnings"
          />
        </SettingsRow>

        {compliance.schadsRosterWarnings && (
          <>
            <SettingsRow
              label="Minimum rest between shifts"
              description="Hours of rest required between shifts for the same worker."
            >
              <input
                type="number"
                min={0}
                max={24}
                value={compliance.minRestHoursBetweenShifts}
                onChange={(event) => onChange({ minRestHoursBetweenShifts: Number(event.target.value) })}
                className="h-[36px] w-[72px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
                aria-label="Minimum rest hours"
              />
            </SettingsRow>

            <SettingsRow
              label="Maximum shift length"
              description="Warn when a single shift exceeds this many hours."
            >
              <input
                type="number"
                min={1}
                max={24}
                value={compliance.maxShiftLengthHours}
                onChange={(event) => onChange({ maxShiftLengthHours: Number(event.target.value) })}
                className="h-[36px] w-[72px] border border-folk-border bg-white px-[10px] text-[13px] font-medium text-folk-text outline-none focus:border-[#a3c4f3]"
                aria-label="Maximum shift length hours"
              />
            </SettingsRow>

            <SettingsRow
              label="Broken shift warnings"
              description="Warn when two shifts on the same day have a gap between 1 and 12 hours."
            >
              <Switch
                checked={compliance.brokenShiftWarnings}
                onChange={() => onChange({ brokenShiftWarnings: !compliance.brokenShiftWarnings })}
                ariaLabel="Broken shift warnings"
              />
            </SettingsRow>
          </>
        )}
      </section>

      <section className={sectionClass}>
        <div className="border-b border-[#f5f5f5] px-[20px] py-[14px]">
          <h2 className="text-[13px] font-semibold text-folk-text">Participant plans</h2>
        </div>

        <SettingsRow
          label="Budget warnings"
          description="Warn or block when scheduled shifts may exceed a participant budget allocation."
        >
          <EnforcementSelect
            value={compliance.budgetWarnings}
            onChange={(value) => onChange({ budgetWarnings: value })}
            ariaLabel="Budget warnings"
          />
        </SettingsRow>
      </section>
    </>
  )
}
