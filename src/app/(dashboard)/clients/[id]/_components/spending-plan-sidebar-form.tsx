"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import { FixedDatePickerDropdown } from "@/components/fixed-date-picker-dropdown"
import { FixedSelectDropdown } from "@/components/fixed-select-dropdown"
import type { Budget, BudgetPeriod } from "@/lib/types"
import type { NdisChargeItem } from "@/lib/ndis-charges"
import { BUDGET_PERIOD_LABELS, validateChargeItemForBudgetComponent } from "@/lib/budget-utils"
import { resolveBudgetFundingComponent, NDIS_FUNDING_COMPONENT_LABELS } from "@/lib/ndis-funding-pools"
import { formatNumberInput, parseFormattedNumber } from "@/lib/number-input"

interface SpendingPlanSidebarFormProps {
  isEditing: boolean
  budgets: Budget[]
  enabledCharges: NdisChargeItem[]
  planName: string
  budgetId: string
  chargeItemNumber: string
  serviceName: string
  quantity: string
  unit: "hour" | "each" | "km"
  cadence: BudgetPeriod
  startDate: string
  endDate: string
  description: string
  startPickerOpen: boolean
  endPickerOpen: boolean
  isBudgetDropdownOpen: boolean
  isChargeDropdownOpen: boolean
  isCadenceDropdownOpen: boolean
  onSetPlanName: (name: string) => void
  onSetBudgetId: (id: string) => void
  onSetChargeItemNumber: (val: string) => void
  onSetServiceName: (val: string) => void
  onSetQuantity: (val: string) => void
  onSetUnit: (val: "hour" | "each" | "km") => void
  onSetCadence: (val: BudgetPeriod) => void
  onSetStartDate: (date: string) => void
  onSetEndDate: (date: string) => void
  onSetDescription: (val: string) => void
  onSetStartPickerOpen: (open: boolean) => void
  onSetEndPickerOpen: (open: boolean) => void
  onSetIsBudgetDropdownOpen: (open: boolean) => void
  onSetIsChargeDropdownOpen: (open: boolean) => void
  onSetIsCadenceDropdownOpen: (open: boolean) => void
  onUseBudgetDates: () => void
  onUsePlanDates: () => void
  ndisPlanStartDate?: string
  ndisPlanEndDate?: string
  onSave: () => void
  onClose: () => void
  onDelete?: (id: string) => void
  editingSpendingPlanId: string | null
  validationWarnings?: string[]
}

type SpendingPlanDateSource = "custom" | "budget" | "ndis_plan"

function formatPickerDate(dateStr: string) {
  if (!dateStr) return null
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function resolveDateSource(
  startDate: string,
  endDate: string,
  budgetStartDate?: string,
  budgetEndDate?: string,
  ndisPlanStartDate?: string,
  ndisPlanEndDate?: string
): SpendingPlanDateSource {
  if (
    budgetStartDate &&
    budgetEndDate &&
    startDate === budgetStartDate &&
    endDate === budgetEndDate
  ) {
    return "budget"
  }

  if (
    ndisPlanStartDate &&
    ndisPlanEndDate &&
    startDate === ndisPlanStartDate &&
    endDate === ndisPlanEndDate
  ) {
    return "ndis_plan"
  }

  return "custom"
}

export function SpendingPlanSidebarForm({
  isEditing,
  budgets,
  enabledCharges,
  planName,
  budgetId,
  chargeItemNumber,
  serviceName,
  quantity,
  unit,
  cadence,
  startDate,
  endDate,
  description,
  startPickerOpen,
  endPickerOpen,
  isBudgetDropdownOpen,
  isChargeDropdownOpen,
  isCadenceDropdownOpen,
  onSetPlanName,
  onSetBudgetId,
  onSetChargeItemNumber,
  onSetServiceName,
  onSetQuantity,
  onSetUnit,
  onSetCadence,
  onSetStartDate,
  onSetEndDate,
  onSetDescription,
  onSetStartPickerOpen,
  onSetEndPickerOpen,
  onSetIsBudgetDropdownOpen,
  onSetIsChargeDropdownOpen,
  onSetIsCadenceDropdownOpen,
  onUseBudgetDates,
  onUsePlanDates,
  ndisPlanStartDate = "",
  ndisPlanEndDate = "",
  onSave,
  onClose,
  onDelete,
  editingSpendingPlanId,
  validationWarnings = [],
}: SpendingPlanSidebarFormProps) {
  const budgetDropdownRef = useRef<HTMLButtonElement>(null)
  const chargeDropdownRef = useRef<HTMLButtonElement>(null)
  const cadenceDropdownRef = useRef<HTMLButtonElement>(null)
  const dateSourceDropdownRef = useRef<HTMLButtonElement>(null)
  const startDateRef = useRef<HTMLButtonElement>(null)
  const endDateRef = useRef<HTMLButtonElement>(null)
  const [dateSource, setDateSource] = useState<SpendingPlanDateSource>("custom")
  const [isDateSourceDropdownOpen, setIsDateSourceDropdownOpen] = useState(false)

  const linkedBudget = budgets.find((b) => b.id === budgetId)
  const hasBudgetDates = Boolean(linkedBudget?.startDate && linkedBudget?.endDate)
  const hasNdisPlanDates = Boolean(ndisPlanStartDate && ndisPlanEndDate)
  const budgetComponent = linkedBudget ? resolveBudgetFundingComponent(linkedBudget) : null
  const filteredCharges = budgetComponent
    ? enabledCharges.filter((ch) => {
        const validation = validateChargeItemForBudgetComponent(ch.itemNumber, enabledCharges, budgetComponent)
        return validation.valid
      })
    : enabledCharges
  const charge = enabledCharges.find((c) => c.itemNumber === chargeItemNumber)
  const rate = charge?.price ?? 0
  const qty = parseFormattedNumber(quantity)
  const perPeriodCost = qty * rate

  const chargeEmptyMessage = !budgetId
    ? "Select a parent budget first."
    : enabledCharges.length === 0
      ? "No charge items are enabled. Enable charges in Settings → NDIS price book."
      : filteredCharges.length === 0
        ? `No charge items match the ${budgetComponent ? NDIS_FUNDING_COMPONENT_LABELS[budgetComponent] : "selected"} funding component.`
        : undefined

  const canSave =
    Boolean(planName.trim()) &&
    Boolean(budgetId) &&
    Boolean(chargeItemNumber) &&
    Boolean(startDate) &&
    Boolean(endDate) &&
    qty > 0

  const dateSourceOptions: { value: SpendingPlanDateSource; label: string; description?: string }[] = [
    { value: "custom", label: "Custom dates" },
    ...(hasBudgetDates
      ? [{
          value: "budget" as const,
          label: "Same as parent budget",
          description: linkedBudget
            ? `${formatPickerDate(linkedBudget.startDate)} – ${formatPickerDate(linkedBudget.endDate)}`
            : undefined,
        }]
      : []),
    ...(hasNdisPlanDates
      ? [{
          value: "ndis_plan" as const,
          label: "Same as NDIS plan",
          description: `${formatPickerDate(ndisPlanStartDate)} – ${formatPickerDate(ndisPlanEndDate)}`,
        }]
      : []),
  ]

  const activeDateSourceLabel =
    dateSourceOptions.find((option) => option.value === dateSource)?.label ?? "Custom dates"

  useEffect(() => {
    setDateSource(
      resolveDateSource(
        startDate,
        endDate,
        linkedBudget?.startDate,
        linkedBudget?.endDate,
        ndisPlanStartDate,
        ndisPlanEndDate
      )
    )
  }, [startDate, endDate, linkedBudget?.startDate, linkedBudget?.endDate, ndisPlanStartDate, ndisPlanEndDate])

  useEffect(() => {
    if (dateSource !== "budget" || !hasBudgetDates) return
    onUseBudgetDates()
  }, [budgetId, dateSource, hasBudgetDates, onUseBudgetDates])

  const handleDateSourceChange = (source: SpendingPlanDateSource) => {
    setDateSource(source)
    setIsDateSourceDropdownOpen(false)

    if (source === "budget") onUseBudgetDates()
    else if (source === "ndis_plan") onUsePlanDates()
  }

  const handleManualStartDateChange = (value: string) => {
    setDateSource("custom")
    onSetStartDate(value)
    onSetStartPickerOpen(false)
  }

  const handleManualEndDateChange = (value: string) => {
    setDateSource("custom")
    onSetEndDate(value)
    onSetEndPickerOpen(false)
  }

  return (
    <>
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <h2 className="text-[13px] font-semibold text-folk-text">
          {isEditing ? "Edit spending plan" : "Add spending plan"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
          aria-label="Close spending plan form"
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[24px] py-[14px]">
        <div className="mb-[14px]">
          <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Plan name *</label>
          <input
            type="text"
            value={planName}
            onChange={(e) => onSetPlanName(e.target.value)}
            placeholder="e.g. Weekly support coordination"
            className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#ccc] focus:border-[#a3c4f3]"
          />
        </div>

        <div className="mb-[14px]">
          <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Parent budget *</label>
          <div className="relative">
            <button
              ref={budgetDropdownRef}
              type="button"
              onClick={() => {
                onSetIsBudgetDropdownOpen(!isBudgetDropdownOpen)
                onSetIsChargeDropdownOpen(false)
                onSetIsCadenceDropdownOpen(false)
              }}
              className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
              tabIndex={0}
            >
              <span className="min-w-0 flex-1 truncate text-left">
                {linkedBudget ? linkedBudget.name : budgets.length > 0 ? "Select parent budget" : "Create a budget first"}
              </span>
              <ChevronDown
                className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform ${isBudgetDropdownOpen ? "rotate-180" : ""}`}
                strokeWidth={1.5}
              />
            </button>
            <FixedSelectDropdown
              isOpen={isBudgetDropdownOpen}
              anchorRef={budgetDropdownRef}
              onClose={() => onSetIsBudgetDropdownOpen(false)}
              isEmpty={budgets.length === 0}
              emptyMessage="No budgets available. Create a budget first."
              estimatedHeight={budgets.length === 0 ? 56 : Math.min(200, budgets.length * 36 + 8)}
              minWidth={240}
            >
              {budgets.map((budget) => (
                <button
                  key={budget.id}
                  type="button"
                  onClick={() => {
                    onSetBudgetId(budget.id)
                    onSetIsBudgetDropdownOpen(false)
                  }}
                  className={`flex w-full px-[12px] py-[7px] text-left text-[12px] font-medium transition-colors hover:bg-folk-hover ${budgetId === budget.id ? "bg-[var(--folk-border-subtle)] text-folk-text" : "text-folk-text"}`}
                  tabIndex={0}
                >
                  {budget.name}
                </button>
              ))}
            </FixedSelectDropdown>
          </div>
        </div>

        <div className="mb-[14px]">
          <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Billable service *</label>
          <div className="relative">
            <button
              ref={chargeDropdownRef}
              type="button"
              onClick={() => {
                onSetIsChargeDropdownOpen(!isChargeDropdownOpen)
                onSetIsBudgetDropdownOpen(false)
                onSetIsCadenceDropdownOpen(false)
              }}
              className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
              tabIndex={0}
            >
              <span className="min-w-0 flex-1 truncate text-left">
                {charge
                  ? `${charge.shortName} – $${charge.price.toFixed(2)}/${charge.unit}`
                  : "Select charge item"}
              </span>
              <ChevronDown
                className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform ${isChargeDropdownOpen ? "rotate-180" : ""}`}
                strokeWidth={1.5}
              />
            </button>
            <FixedSelectDropdown
              isOpen={isChargeDropdownOpen}
              anchorRef={chargeDropdownRef}
              onClose={() => onSetIsChargeDropdownOpen(false)}
              isEmpty={filteredCharges.length === 0}
              emptyMessage={chargeEmptyMessage}
              estimatedHeight={filteredCharges.length === 0 ? 56 : Math.min(240, filteredCharges.length * 38 + 8)}
              minWidth={280}
            >
              {filteredCharges.map((ch) => {
                const isSelected = chargeItemNumber === ch.itemNumber
                return (
                  <button
                    key={ch.itemNumber}
                    type="button"
                    onClick={() => {
                      onSetChargeItemNumber(ch.itemNumber)
                      onSetServiceName(ch.shortName || ch.name)
                      onSetUnit((ch.unit as "hour" | "each" | "km") || "hour")
                      onSetIsChargeDropdownOpen(false)
                    }}
                    className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-folk-hover ${isSelected ? "bg-[var(--folk-border-subtle)]" : ""}`}
                    tabIndex={0}
                  >
                    <div
                      className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-folk-border bg-folk-surface"}`}
                    >
                      {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-folk-surface" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[12px] font-medium text-folk-text">{ch.shortName}</span>
                      <span className="ml-[6px] text-[11px] text-folk-secondary">
                        ${ch.price.toFixed(2)}/{ch.unit}
                      </span>
                    </div>
                  </button>
                )
              })}
            </FixedSelectDropdown>
          </div>
        </div>

        <div className="mb-[14px] flex gap-[10px]">
          <div className="flex-1">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Quantity *</label>
            <input
              type="text"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => onSetQuantity(formatNumberInput(e.target.value))}
              className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none hover:border-[#ccc] focus:border-[#a3c4f3]"
            />
          </div>
          <div className="flex-1">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Unit</label>
            <input
              type="text"
              value={unit}
              readOnly
              className="h-[36px] w-full rounded-none border border-folk-border bg-folk-hover px-[12px] text-[13px] font-medium text-folk-secondary outline-none"
            />
          </div>
        </div>

        <div className="mb-[14px]">
          <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Spending cadence *</label>
          <div className="relative">
            <button
              ref={cadenceDropdownRef}
              type="button"
              onClick={() => {
                onSetIsCadenceDropdownOpen(!isCadenceDropdownOpen)
                onSetIsBudgetDropdownOpen(false)
                onSetIsChargeDropdownOpen(false)
              }}
              className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
              tabIndex={0}
            >
              <span className="min-w-0 flex-1 truncate text-left">
                {BUDGET_PERIOD_LABELS[cadence]}
              </span>
              <ChevronDown
                className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform ${isCadenceDropdownOpen ? "rotate-180" : ""}`}
                strokeWidth={1.5}
              />
            </button>
            <FixedSelectDropdown
              isOpen={isCadenceDropdownOpen}
              anchorRef={cadenceDropdownRef}
              onClose={() => onSetIsCadenceDropdownOpen(false)}
              estimatedHeight={Object.keys(BUDGET_PERIOD_LABELS).length * 36 + 8}
              minWidth={240}
            >
              {Object.entries(BUDGET_PERIOD_LABELS).map(([key, label]) => {
                const isSelected = cadence === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onSetCadence(key as BudgetPeriod)
                      onSetIsCadenceDropdownOpen(false)
                    }}
                    className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-folk-hover ${isSelected ? "bg-[var(--folk-border-subtle)]" : ""}`}
                    tabIndex={0}
                  >
                    <div
                      className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-folk-border bg-folk-surface"}`}
                    >
                      {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-folk-surface" />}
                    </div>
                    <span className="text-[12px] font-medium text-folk-text">{label}</span>
                  </button>
                )
              })}
            </FixedSelectDropdown>
          </div>
          <p className="mt-[6px] text-[11px] text-folk-secondary">
            How often this quantity of service is planned to be delivered
          </p>
        </div>

        {dateSourceOptions.length > 1 && (
          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Date range</label>
            <div className="relative">
              <button
                ref={dateSourceDropdownRef}
                type="button"
                onClick={() => {
                  setIsDateSourceDropdownOpen(!isDateSourceDropdownOpen)
                  onSetIsBudgetDropdownOpen(false)
                  onSetIsChargeDropdownOpen(false)
                  onSetIsCadenceDropdownOpen(false)
                }}
                className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
                tabIndex={0}
              >
                <span className="min-w-0 flex-1 truncate text-left">{activeDateSourceLabel}</span>
                <ChevronDown
                  className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform ${isDateSourceDropdownOpen ? "rotate-180" : ""}`}
                  strokeWidth={1.5}
                />
              </button>
              <FixedSelectDropdown
                isOpen={isDateSourceDropdownOpen}
                anchorRef={dateSourceDropdownRef}
                onClose={() => setIsDateSourceDropdownOpen(false)}
                estimatedHeight={dateSourceOptions.length * 52 + 8}
                minWidth={280}
              >
                {dateSourceOptions.map((option) => {
                  const isSelected = dateSource === option.value
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleDateSourceChange(option.value)}
                      className={`flex w-full flex-col items-start px-[12px] py-[8px] text-left transition-colors hover:bg-folk-hover ${isSelected ? "bg-[var(--folk-border-subtle)]" : ""}`}
                      tabIndex={0}
                    >
                      <span className="text-[12px] font-medium text-folk-text">{option.label}</span>
                      {option.description && (
                        <span className="mt-[2px] text-[11px] text-folk-secondary">{option.description}</span>
                      )}
                    </button>
                  )
                })}
              </FixedSelectDropdown>
            </div>
          </div>
        )}

        <div className="mb-[14px]">
          <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Start date *</label>
          <div className="relative">
            <button
              ref={startDateRef}
              type="button"
              onClick={() => {
                onSetStartPickerOpen(!startPickerOpen)
                onSetEndPickerOpen(false)
              }}
              className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
              tabIndex={0}
            >
              {startDate ? (
                <span>{formatPickerDate(startDate)}</span>
              ) : (
                <span className="text-folk-placeholder">Select date</span>
              )}
            </button>
            <FixedDatePickerDropdown
              isOpen={startPickerOpen}
              anchorRef={startDateRef}
              value={startDate}
              onChange={handleManualStartDateChange}
              onClose={() => onSetStartPickerOpen(false)}
            />
          </div>
        </div>

        <div className="mb-[14px]">
          <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">End date *</label>
          <div className="relative">
            <button
              ref={endDateRef}
              type="button"
              onClick={() => {
                onSetEndPickerOpen(!endPickerOpen)
                onSetStartPickerOpen(false)
              }}
              className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
              tabIndex={0}
            >
              {endDate ? (
                <span>{formatPickerDate(endDate)}</span>
              ) : (
                <span className="text-folk-placeholder">Select date</span>
              )}
            </button>
            <FixedDatePickerDropdown
              isOpen={endPickerOpen}
              anchorRef={endDateRef}
              value={endDate}
              onChange={handleManualEndDateChange}
              onClose={() => onSetEndPickerOpen(false)}
            />
          </div>
        </div>

        <div className="mb-[14px]">
          <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => onSetDescription(e.target.value)}
            placeholder="Optional notes"
            className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#ccc] focus:border-[#a3c4f3]"
          />
        </div>

        {chargeItemNumber && qty > 0 && (
          <div className="flex items-center justify-between rounded-none bg-folk-page px-[12px] py-[10px]">
            <div>
              <p className="text-[12px] font-medium text-folk-text">{serviceName}</p>
              <p className="mt-[2px] text-[11px] text-folk-secondary">
                {qty} {unit} · {BUDGET_PERIOD_LABELS[cadence].toLowerCase()}
              </p>
            </div>
            <span className="text-[13px] font-semibold text-[#7c3aed]">
              ${perPeriodCost.toLocaleString("en-AU", { minimumFractionDigits: 2 })}/period
            </span>
          </div>
        )}
        {validationWarnings.length > 0 && (
          <div className="mt-[12px] space-y-[6px]">
            {validationWarnings.map((warning) => (
              <p key={warning} className="rounded-none bg-amber-50 px-[10px] py-[6px] text-[11px] font-medium text-amber-700">
                {warning}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
        {isEditing && onDelete && editingSpendingPlanId ? (
          <DeleteActionsMenu
            onDelete={() => onDelete(editingSpendingPlanId)}
            itemName={planName.trim() || "Untitled spending plan"}
            confirmTitle="Delete spending plan"
            menuPlacement="top"
          />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-[8px]">
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
          disabled={!canSave}
          className="primary-btn px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
          tabIndex={0}
        >
          {isEditing ? "Save changes" : "Save plan"}
        </button>
        </div>
      </div>
    </>
  )
}
