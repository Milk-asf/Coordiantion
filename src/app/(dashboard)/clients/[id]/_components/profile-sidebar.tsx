"use client"

import type { RefObject } from "react"
import type { Client, ParticipantDetails, NdisPlan, PlanService, FundingReleasePeriod, Budget, BudgetLineItem, BudgetPeriod, Note } from "@/lib/types"
import type { NdisChargeItem } from "@/lib/ndis-charges"
import { ndisCharges, chargeCategories } from "@/lib/ndis-charges"
import { DatePicker } from "@/components/date-picker"
import {
  SidebarDetailRow,
  SidebarEditableField,
  SidebarContactChip,
  SidebarDiagnosisChip,
} from "./client-profile-helpers"
import {
  FileText,
  CalendarDays,
  ChevronDown,
  Plus,
  PenLine,
  PanelRightClose,
  X,
  Upload,
} from "lucide-react"

interface ProfileSidebarProps {
  client: Client
  p: ParticipantDetails
  pf: (key: string) => boolean
  plans: NdisPlan[]
  budgets: Budget[]
  sidebarWidth: number
  staffNames: string[]
  canAssignClients: boolean
  enabledCharges: NdisChargeItem[]
  allServiceCharges: NdisChargeItem[]

  isPlanModalOpen: boolean
  editingPlanId: string | null
  planStartDate: string
  planEndDate: string
  planIsPace: boolean
  planFile: File | null
  planStartPickerOpen: boolean
  planEndPickerOpen: boolean
  isSavingPlan: boolean
  planFileInputRef: RefObject<HTMLInputElement | null>
  onSetPlanStartPickerOpen: (open: boolean) => void
  onSetPlanEndPickerOpen: (open: boolean) => void
  onSetPlanStartDate: (date: string) => void
  onSetPlanEndDate: (date: string) => void
  onSetPlanIsPace: (isPace: boolean) => void
  onSetPlanFile: (file: File | null) => void
  onResetPlanForm: () => void
  onSavePlan: () => void

  inlineSvcOpen: boolean
  inlineSvcEditingId: string | null
  isServiceFormOpen: boolean
  svcName: string
  svcBudget: string
  svcChargeItems: string[]
  svcReleasePeriodCount: string
  svcReleasePeriods: FundingReleasePeriod[]
  isChargeDropdownOpen: boolean
  editingServiceId: string | null
  onSetSvcName: (name: string) => void
  onSetSvcBudget: (budget: string) => void
  onSetSvcChargeItems: (items: string[]) => void
  onSetIsChargeDropdownOpen: (open: boolean) => void
  onInitServiceForm: (planId: string) => void
  onInitEditServiceForm: (planId: string, service: PlanService) => void
  onResetServiceForm: () => void
  onSaveService: () => void
  onFormatBudgetDisplay: (raw: string) => string
  onParseBudget: (val: string) => number
  onReleasePeriodCountChange: (val: string) => void
  onReleasePeriodAmountChange: (idx: number, amount: number) => void

  isBudgetFormOpen: boolean
  editingBudgetId: string | null
  budgetName: string
  budgetStartDate: string
  budgetEndDate: string
  budgetStartPickerOpen: boolean
  budgetEndPickerOpen: boolean
  onSetBudgetName: (name: string) => void
  onSetBudgetStartDate: (date: string) => void
  onSetBudgetEndDate: (date: string) => void
  onSetBudgetStartPickerOpen: (open: boolean) => void
  onSetBudgetEndPickerOpen: (open: boolean) => void
  onResetBudgetForm: () => void
  onSaveBudget: () => void
  onUsePlanDates: () => void

  isItemFormOpen: boolean
  editingItemId: string | null
  addingItemToBudgetId: string | null
  editingItemBudgetId: string | null
  itemChargeItemNumber: string
  itemBillingCode: string
  itemServiceName: string
  itemQuantity: string
  itemUnit: "hour" | "each" | "km"
  itemPeriod: BudgetPeriod
  itemDescription: string
  isItemChargeDropdownOpen: boolean
  isItemPeriodDropdownOpen: boolean
  onSetItemChargeItemNumber: (val: string) => void
  onSetItemBillingCode: (val: string) => void
  onSetItemServiceName: (val: string) => void
  onSetItemQuantity: (val: string) => void
  onSetItemUnit: (val: "hour" | "each" | "km") => void
  onSetItemPeriod: (val: BudgetPeriod) => void
  onSetItemDescription: (val: string) => void
  onSetIsItemChargeDropdownOpen: (open: boolean) => void
  onSetIsItemPeriodDropdownOpen: (open: boolean) => void
  onInitItemForm: (budgetId: string) => void
  onInitEditItemForm: (budgetId: string, li: BudgetLineItem) => void
  onResetItemForm: () => void
  onSaveItem: () => void

  isCoordinatorOpen: boolean
  coordinatorSearch: string
  coordinatorInputRef: RefObject<HTMLInputElement | null>
  onSetIsCoordinatorOpen: (open: boolean) => void
  onSetCoordinatorSearch: (search: string) => void

  onSetSidebarVisible: (visible: boolean) => void
  onMouseDown: () => void
  onUpdateField: (field: keyof ParticipantDetails, value: string) => void
  onUpdateClient: (id: string, data: Partial<Client>) => void

  notes: Note[]
  onOpenNote: (noteId: string) => void
  onSeeAllNotes: () => void

  periodLabels: Record<BudgetPeriod, string>
}

function formatSidebarNoteDate(dateStr: string) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

export function ProfileSidebar(props: ProfileSidebarProps) {
  const {
    client, p, pf, plans, budgets, sidebarWidth,
    staffNames, canAssignClients, enabledCharges, allServiceCharges,
    isPlanModalOpen, editingPlanId, planStartDate, planEndDate, planIsPace, planFile,
    planStartPickerOpen, planEndPickerOpen, isSavingPlan, planFileInputRef,
    onSetPlanStartPickerOpen, onSetPlanEndPickerOpen, onSetPlanStartDate, onSetPlanEndDate,
    onSetPlanIsPace, onSetPlanFile, onResetPlanForm, onSavePlan,
    inlineSvcOpen, inlineSvcEditingId, isServiceFormOpen,
    svcName, svcBudget, svcChargeItems, svcReleasePeriodCount, svcReleasePeriods,
    isChargeDropdownOpen, editingServiceId,
    onSetSvcName, onSetSvcBudget, onSetSvcChargeItems, onSetIsChargeDropdownOpen,
    onInitServiceForm, onInitEditServiceForm, onResetServiceForm, onSaveService,
    onFormatBudgetDisplay, onParseBudget, onReleasePeriodCountChange, onReleasePeriodAmountChange,
    isBudgetFormOpen, editingBudgetId, budgetName, budgetStartDate, budgetEndDate,
    budgetStartPickerOpen, budgetEndPickerOpen,
    onSetBudgetName, onSetBudgetStartDate, onSetBudgetEndDate,
    onSetBudgetStartPickerOpen, onSetBudgetEndPickerOpen, onResetBudgetForm, onSaveBudget, onUsePlanDates,
    isItemFormOpen, editingItemId, addingItemToBudgetId, editingItemBudgetId,
    itemChargeItemNumber, itemBillingCode, itemServiceName, itemQuantity, itemUnit, itemPeriod, itemDescription,
    isItemChargeDropdownOpen, isItemPeriodDropdownOpen,
    onSetItemChargeItemNumber, onSetItemBillingCode, onSetItemServiceName,
    onSetItemQuantity, onSetItemUnit, onSetItemPeriod, onSetItemDescription,
    onSetIsItemChargeDropdownOpen, onSetIsItemPeriodDropdownOpen,
    onInitItemForm, onInitEditItemForm, onResetItemForm, onSaveItem,
    isCoordinatorOpen, coordinatorSearch, coordinatorInputRef,
    onSetIsCoordinatorOpen, onSetCoordinatorSearch,
    onSetSidebarVisible, onMouseDown, onUpdateField, onUpdateClient,
    notes, onOpenNote, onSeeAllNotes,
    periodLabels,
  } = props

  return (
    <>
      <div
        onMouseDown={onMouseDown}
        className="w-[4px] shrink-0 cursor-col-resize border-l border-[#f0f0f0] transition-colors hover:border-[#aaa] hover:bg-[#f0f0f0]"
      />
      <div className="flex min-h-0 shrink-0 flex-col overflow-y-auto bg-white" style={{ width: sidebarWidth }}>
      {isPlanModalOpen ? (
        <>
        <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
          <h2 className="text-[13px] font-semibold text-[#262626]">{editingPlanId ? "Edit NDIS plan" : "Add NDIS plan"}</h2>
          <button
            onClick={() => onResetPlanForm()}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Close plan form"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-[24px] py-[14px]">
          <input ref={planFileInputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) onSetPlanFile(e.target.files[0]); e.target.value = "" }} />

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Start date *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { onSetPlanStartPickerOpen(!planStartPickerOpen); onSetPlanEndPickerOpen(false) }}
                className="flex h-[36px] w-full items-center gap-[8px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                tabIndex={0}
              >
                <CalendarDays className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
                {planStartDate ? (
                  <span className="text-[#262626]">{new Date(planStartDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                ) : (
                  <span className="text-[#bbb]">Select date</span>
                )}
              </button>
              {planStartPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => onSetPlanStartPickerOpen(false)} />
                  <div className="absolute left-0 top-full z-[60] mt-[4px]">
                    <DatePicker value={planStartDate} onChange={(v) => { onSetPlanStartDate(v); onSetPlanStartPickerOpen(false) }} onClose={() => onSetPlanStartPickerOpen(false)} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mb-[14px]">
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">End date *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { onSetPlanEndPickerOpen(!planEndPickerOpen); onSetPlanStartPickerOpen(false) }}
                className="flex h-[36px] w-full items-center gap-[8px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium transition-colors hover:border-[#ccc] focus:border-[#a3c4f3]"
                tabIndex={0}
              >
                <CalendarDays className="h-[14px] w-[14px] shrink-0 text-[#999]" strokeWidth={1.5} />
                {planEndDate ? (
                  <span className="text-[#262626]">{new Date(planEndDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                ) : (
                  <span className="text-[#bbb]">Select date</span>
                )}
              </button>
              {planEndPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => onSetPlanEndPickerOpen(false)} />
                  <div className="absolute left-0 top-full z-[60] mt-[4px]">
                    <DatePicker
                      value={planEndDate}
                      onChange={(v) => { onSetPlanEndDate(v); onSetPlanEndPickerOpen(false) }}
                      onClose={() => onSetPlanEndPickerOpen(false)}
                      quickPresets={planStartDate ? [
                        { label: "6 mo", months: 6 },
                        { label: "12 mo", months: 12 },
                        { label: "2 yr", months: 24 },
                        { label: "3 yr", months: 36 },
                        { label: "5 yr", months: 60 },
                      ].map((preset) => {
                        const s = new Date(planStartDate + "T00:00:00")
                        s.setMonth(s.getMonth() + preset.months)
                        return { label: preset.label, value: `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}` }
                      }) : undefined}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mb-[14px]">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[12px] font-medium text-[#262626]">PACE plan</span>
                <p className="mt-[1px] text-[11px] text-[#888]">Is this participant on a PACE plan?</p>
              </div>
              <button
                type="button"
                onClick={() => onSetPlanIsPace(!planIsPace)}
                className="relative h-[22px] w-[40px] rounded-full transition-colors"
                style={{ backgroundColor: planIsPace ? "var(--primary-color)" : "#d4d4d4" }}
                tabIndex={0}
                role="switch"
                aria-checked={planIsPace}
                aria-label="PACE plan toggle"
              >
                <span className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${planIsPace ? "left-[20px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Plan document (PDF)</label>
            {planFile ? (
              <div className="flex items-center gap-[8px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] py-[8px]">
                <FileText className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#262626]">{planFile.name}</span>
                <button
                  type="button"
                  onClick={() => onSetPlanFile(null)}
                  className="shrink-0 rounded-[4px] p-[2px] text-[#999] transition-colors hover:bg-[#eee] hover:text-[#262626]"
                  tabIndex={0}
                  aria-label="Remove file"
                >
                  <X className="h-[12px] w-[12px]" strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => planFileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-[6px] rounded-[8px] border border-dashed border-[#d4d4d4] bg-[#fafafa] px-[12px] py-[10px] text-[12px] font-medium text-[#888] transition-colors hover:border-[#bbb] hover:bg-[#f0f0f0]"
                tabIndex={0}
              >
                <Upload className="h-[14px] w-[14px]" strokeWidth={1.5} />
                Upload PDF
              </button>
            )}
          </div>
        </div>

        {editingPlanId && (() => {
          const editingPlan = plans.find((pl) => pl.id === editingPlanId)
          const planServices = editingPlan?.services || []
          return (
            <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#262626]">Services</h3>
                {!inlineSvcOpen && (
                  <button
                    onClick={() => onInitServiceForm(editingPlanId)}
                    className="flex h-[18px] w-[18px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                    tabIndex={0}
                    aria-label="Add service"
                  >
                    <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                  </button>
                )}
              </div>
              {planServices.length === 0 && !inlineSvcOpen && (
                <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No services added</p>
              )}
              {planServices.length > 0 && (
                <div className="mt-[8px] overflow-hidden rounded-[8px] border border-[#e8e8e8]">
                  {planServices.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => onInitEditServiceForm(editingPlanId, svc)}
                      className={`group flex w-full items-center justify-between border-b border-[#f0f0f0] px-[12px] py-[10px] text-left transition-colors last:border-b-0 hover:bg-[#fafafa] ${inlineSvcEditingId === svc.id ? "bg-[#f0f5ff]" : ""}`}
                      tabIndex={0}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-[#262626]">{svc.name}</p>
                        <p className="mt-[2px] text-[12px] text-[#888]">${svc.budget.toLocaleString()}</p>
                      </div>
                      <PenLine className="h-[13px] w-[13px] shrink-0 text-[#ccc] opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                    </button>
                  ))}
                </div>
              )}

              {inlineSvcOpen ? (
                <div className="mt-[14px] border-t border-[#f0f0f0] pt-[14px]">
                  <h3 className="mb-[14px] text-[13px] font-semibold text-[#262626]">{inlineSvcEditingId ? "Edit service" : "Add service"}</h3>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name *</label>
                    <input
                      type="text"
                      value={svcName}
                      onChange={(e) => onSetSvcName(e.target.value)}
                      placeholder="e.g. Support Coordination"
                      className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                    />
                  </div>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Budget *</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#999]">$</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={svcBudget}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9.]/g, "")
                          const formatted = onFormatBudgetDisplay(raw)
                          onSetSvcBudget(formatted)
                          if (svcReleasePeriods.length > 0) {
                            const count = svcReleasePeriods.length
                            const budget = onParseBudget(formatted)
                            const perPeriod = budget > 0 ? Math.round((budget / count) * 100) / 100 : 0
                            // Parent handles release period recalculation via onSetSvcBudget
                          }
                        }}
                        placeholder="0.00"
                        className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] pl-[26px] pr-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
                      />
                    </div>
                  </div>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge items</label>
                    <div className="relative">
                      <div
                        onClick={() => onSetIsChargeDropdownOpen(!isChargeDropdownOpen)}
                        className="flex min-h-[36px] w-full cursor-pointer flex-wrap items-center gap-[4px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[10px] py-[6px] transition-colors hover:border-[#ccc]"
                      >
                        {svcChargeItems.length === 0 ? (
                          <span className="px-[2px] text-[13px] font-medium text-[#bbb]">Select charge items…</span>
                        ) : (
                          svcChargeItems.map((itemNum) => {
                            const charge = ndisCharges.find((c) => c.itemNumber === itemNum)
                            if (!charge) return null
                            return (
                              <span key={itemNum} className="inline-flex items-center gap-[4px] rounded-[5px] border border-[#dcdcdc] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">
                                {charge.shortName}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); onSetSvcChargeItems(svcChargeItems.filter((n) => n !== itemNum)) }}
                                  className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-[#999] transition-colors hover:text-[#262626]"
                                  tabIndex={0}
                                  aria-label={`Remove ${charge.shortName}`}
                                >
                                  <X className="h-[10px] w-[10px]" strokeWidth={2} />
                                </button>
                              </span>
                            )
                          })
                        )}
                        <ChevronDown className={`ml-auto h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                      </div>
                      {isChargeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[59]" onClick={() => onSetIsChargeDropdownOpen(false)} />
                          <div className="absolute bottom-full left-0 z-[60] mb-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                            {(["support-coordination", "travel"] as const).map((cat) => {
                              const catCharges = allServiceCharges.filter((c) => c.category === cat)
                              if (catCharges.length === 0) return null
                              return (
                                <div key={cat}>
                                  <p className="px-[12px] pb-[4px] pt-[8px] text-[11px] font-semibold uppercase tracking-wide text-[#999]">{chargeCategories[cat]}</p>
                                  {catCharges.map((charge) => {
                                    const isChecked = svcChargeItems.includes(charge.itemNumber)
                                    return (
                                      <button
                                        key={charge.itemNumber}
                                        type="button"
                                        onClick={() => onSetSvcChargeItems(isChecked ? svcChargeItems.filter((n) => n !== charge.itemNumber) : [...svcChargeItems, charge.itemNumber])}
                                        className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isChecked ? "bg-[#f0f0f0]" : ""}`}
                                        tabIndex={0}
                                      >
                                        <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${isChecked ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                          {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <span className="text-[12px] font-medium text-[#262626]">{charge.shortName}</span>
                                          <span className="ml-[6px] text-[11px] text-[#999]">${charge.price.toFixed(2)}/{charge.unit}</span>
                                        </div>
                                      </button>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] pt-[12px]">
                    <button
                      onClick={() => onResetServiceForm()}
                      className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => onSaveService()}
                      disabled={!svcName.trim() || !svcBudget || onParseBudget(svcBudget) <= 0}
                      className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                      tabIndex={0}
                    >
                      {inlineSvcEditingId ? "Save changes" : "Add service"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onInitServiceForm(editingPlanId)}
                  className="mt-[8px] flex w-full items-center justify-center gap-[4px] rounded-[6px] border border-dashed border-[#d4d4d4] py-[8px] text-[12px] font-medium text-[#888] transition-colors hover:border-[#bbb] hover:bg-[#fafafa] hover:text-[#262626]"
                  tabIndex={0}
                >
                  <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                  Add service
                </button>
              )}
            </div>
          )
        })()}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
          <button
            onClick={() => onResetPlanForm()}
            className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            onClick={onSavePlan}
            disabled={!planStartDate || !planEndDate || isSavingPlan}
            className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {isSavingPlan ? "Saving…" : editingPlanId ? "Save plan" : "Add plan"}
          </button>
        </div>
        </>
      ) : isServiceFormOpen ? (
        <>
        <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
          <h2 className="text-[13px] font-semibold text-[#262626]">{editingServiceId ? "Edit service" : "New service"}</h2>
          <button
            onClick={() => onResetServiceForm()}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Close service form"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-[14px] px-[24px] py-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name *</label>
            <input
              type="text"
              value={svcName}
              onChange={(e) => onSetSvcName(e.target.value)}
              placeholder="e.g. Support Coordination"
              className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
            />
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Budget *</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-[12px] top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#999]">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={svcBudget}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, "")
                  const formatted = onFormatBudgetDisplay(raw)
                  onSetSvcBudget(formatted)
                }}
                placeholder="0.00"
                className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] pl-[26px] pr-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
              />
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge items</label>
            <div className="relative">
              <div
                onClick={() => onSetIsChargeDropdownOpen(!isChargeDropdownOpen)}
                className="flex min-h-[36px] w-full cursor-pointer flex-wrap items-center gap-[4px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[10px] py-[6px] transition-colors hover:border-[#ccc]"
              >
                {svcChargeItems.length === 0 ? (
                  <span className="px-[2px] text-[13px] font-medium text-[#bbb]">Select charge items…</span>
                ) : (
                  svcChargeItems.map((itemNum) => {
                    const charge = ndisCharges.find((c) => c.itemNumber === itemNum)
                    if (!charge) return null
                    return (
                      <span key={itemNum} className="inline-flex items-center gap-[4px] rounded-[5px] border border-[#dcdcdc] bg-white px-[8px] py-[2px] text-[12px] font-medium text-[#262626]">
                        {charge.shortName}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onSetSvcChargeItems(svcChargeItems.filter((n) => n !== itemNum)) }}
                          className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-[#999] transition-colors hover:text-[#262626]"
                          tabIndex={0}
                          aria-label={`Remove ${charge.shortName}`}
                        >
                          <X className="h-[10px] w-[10px]" strokeWidth={2} />
                        </button>
                      </span>
                    )
                  })
                )}
                <ChevronDown className={`ml-auto h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              </div>
              {isChargeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => onSetIsChargeDropdownOpen(false)} />
                  <div className="absolute left-0 top-full z-[60] mt-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    {(["support-coordination", "travel"] as const).map((cat) => {
                      const catCharges = allServiceCharges.filter((c) => c.category === cat)
                      if (catCharges.length === 0) return null
                      return (
                        <div key={cat}>
                          <p className="px-[12px] pb-[4px] pt-[8px] text-[11px] font-semibold uppercase tracking-wide text-[#999]">{chargeCategories[cat]}</p>
                          {catCharges.map((charge) => {
                            const isChecked = svcChargeItems.includes(charge.itemNumber)
                            return (
                              <button
                                key={charge.itemNumber}
                                type="button"
                                onClick={() => onSetSvcChargeItems(isChecked ? svcChargeItems.filter((n) => n !== charge.itemNumber) : [...svcChargeItems, charge.itemNumber])}
                                className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isChecked ? "bg-[#f0f0f0]" : ""}`}
                                tabIndex={0}
                              >
                                <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-[4px] border transition-colors ${isChecked ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                  {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[12px] font-medium text-[#262626]">{charge.shortName}</span>
                                  <span className="ml-[6px] text-[11px] text-[#999]">${charge.price.toFixed(2)}/{charge.unit}</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Funding release schedule</label>
            <p className="mb-[6px] text-[11px] text-[#999]">Number of periods the funding will be released over</p>
            <input
              type="number"
              min="0"
              step="1"
              value={svcReleasePeriodCount}
              onChange={(e) => onReleasePeriodCountChange(e.target.value)}
              placeholder="e.g. 4"
              className="h-[36px] w-[120px] rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
            />
            {svcReleasePeriods.length > 0 && (
              <div className="mt-[8px] space-y-[4px]">
                {svcReleasePeriods.map((rp, i) => (
                  <div key={rp.period} className="flex items-center gap-[8px]">
                    <span className="w-[70px] shrink-0 text-[12px] font-medium text-[#888]">Period {rp.period}</span>
                    <div className="relative flex-1">
                      <span className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-[12px] font-medium text-[#999]">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={rp.amount}
                        onChange={(e) => onReleasePeriodAmountChange(i, parseFloat(e.target.value) || 0)}
                        className="h-[32px] w-full rounded-[6px] border border-[#e0e0e0] bg-white pl-[24px] pr-[8px] text-[12px] font-medium text-[#262626] outline-none hover:border-[#ccc] focus:border-[#a3c4f3]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
          <button
            onClick={() => onResetServiceForm()}
            className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            onClick={() => onSaveService()}
            disabled={!svcName.trim() || !svcBudget || onParseBudget(svcBudget) <= 0}
            className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {editingServiceId ? "Save changes" : "Add service"}
          </button>
        </div>
        </>
      ) : isBudgetFormOpen ? (
        <>
        <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
          <h2 className="text-[13px] font-semibold text-[#262626]">{editingBudgetId ? "Edit budget" : "New budget"}</h2>
          <button
            onClick={() => onResetBudgetForm()}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Close budget form"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-[14px] px-[24px] py-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Budget name *</label>
            <input
              type="text"
              value={budgetName}
              onChange={(e) => onSetBudgetName(e.target.value)}
              placeholder="e.g. Support Coordination Budget"
              className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]"
            />
          </div>

          <div>
            <div className="mb-[4px] flex items-center justify-between">
              <label className="text-[12px] font-medium text-[#888]">Start date *</label>
              {plans.length > 0 && (
                <button onClick={onUsePlanDates} className="text-[11px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>Use plan dates</button>
              )}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => { onSetBudgetStartPickerOpen(!budgetStartPickerOpen); onSetBudgetEndPickerOpen(false) }}
                className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                tabIndex={0}
              >
                {budgetStartDate ? new Date(budgetStartDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : <span className="text-[#bbb]">Select date</span>}
              </button>
              {budgetStartPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[49]" onClick={() => onSetBudgetStartPickerOpen(false)} />
                  <div className="absolute left-0 top-full z-50 mt-[4px]">
                    <DatePicker value={budgetStartDate} onChange={(v) => { onSetBudgetStartDate(v); onSetBudgetStartPickerOpen(false) }} onClose={() => onSetBudgetStartPickerOpen(false)} />
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">End date *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => { onSetBudgetEndPickerOpen(!budgetEndPickerOpen); onSetBudgetStartPickerOpen(false) }}
                className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                tabIndex={0}
              >
                {budgetEndDate ? new Date(budgetEndDate + "T00:00:00").toLocaleDateString("en-AU", { day: "2-digit", month: "2-digit", year: "numeric" }) : <span className="text-[#bbb]">Select date</span>}
              </button>
              {budgetEndPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[49]" onClick={() => onSetBudgetEndPickerOpen(false)} />
                  <div className="absolute left-0 top-full z-50 mt-[4px]">
                    <DatePicker value={budgetEndDate} onChange={(v) => { onSetBudgetEndDate(v); onSetBudgetEndPickerOpen(false) }} onClose={() => onSetBudgetEndPickerOpen(false)} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {editingBudgetId && (() => {
          const editingBudget = budgets.find((b) => b.id === editingBudgetId)
          const budgetItems = editingBudget?.lineItems || []
          const isInlineItemOpen = !!(addingItemToBudgetId === editingBudgetId || (editingItemId && editingItemBudgetId === editingBudgetId))

          return (
            <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-[#262626]">Items</h3>
                {!isInlineItemOpen && (
                  <button
                    onClick={() => onInitItemForm(editingBudgetId)}
                    className="flex h-[18px] w-[18px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f0f0f0] hover:text-[#262626]"
                    tabIndex={0}
                    aria-label="Add item"
                  >
                    <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                  </button>
                )}
              </div>

              {budgetItems.length === 0 && !isInlineItemOpen && (
                <p className="mt-[8px] text-[13px] font-medium text-[#bbb]">No items added</p>
              )}

              {budgetItems.length > 0 && (
                <div className="mt-[8px] overflow-hidden rounded-[8px] border border-[#e8e8e8]">
                  {budgetItems.map((li) => {
                    const charge = enabledCharges.find((c) => c.itemNumber === li.chargeItemNumber)
                    const rate = charge?.price ?? 0
                    const total = li.quantity * rate
                    return (
                      <button
                        key={li.id}
                        onClick={() => onInitEditItemForm(editingBudgetId, li)}
                        className={`group flex w-full items-center justify-between border-b border-[#f0f0f0] px-[12px] py-[10px] text-left transition-colors last:border-b-0 hover:bg-[#fafafa] ${editingItemId === li.id ? "bg-[#f0f5ff]" : ""}`}
                        tabIndex={0}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#262626]">{li.serviceName}</p>
                          <p className="mt-[2px] text-[12px] text-[#888]">{li.quantity} {li.unit}{li.quantity !== 1 ? "s" : ""} · ${total.toLocaleString("en-AU", { minimumFractionDigits: 2 })}</p>
                        </div>
                        <PenLine className="h-[13px] w-[13px] shrink-0 text-[#ccc] opacity-0 transition-opacity group-hover:opacity-100" strokeWidth={1.5} />
                      </button>
                    )
                  })}
                </div>
              )}

              {isInlineItemOpen ? (
                <div className="mt-[14px] border-t border-[#f0f0f0] pt-[14px]">
                  <h3 className="mb-[14px] text-[13px] font-semibold text-[#262626]">{editingItemId ? "Edit item" : "Add item"}</h3>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge item *</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => onSetIsItemChargeDropdownOpen(!isItemChargeDropdownOpen)}
                        className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {(() => { const c = enabledCharges.find((ch) => ch.itemNumber === itemChargeItemNumber); return c ? `${c.shortName} – $${c.price.toFixed(2)}/${c.unit}` : "Select charge item" })()}
                        </span>
                        <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                      </button>
                      {isItemChargeDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[59]" onClick={() => onSetIsItemChargeDropdownOpen(false)} />
                          <div className="absolute bottom-full left-0 z-[60] mb-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                            {enabledCharges.map((ch) => {
                              const isSelected = itemChargeItemNumber === ch.itemNumber
                              return (
                                <button
                                  key={ch.itemNumber}
                                  type="button"
                                  onClick={() => {
                                    onSetItemChargeItemNumber(ch.itemNumber)
                                    onSetItemBillingCode(ch.itemNumber)
                                    onSetItemServiceName(ch.shortName || ch.name)
                                    onSetItemUnit((ch.unit as "hour" | "each" | "km") || "hour")
                                    onSetIsItemChargeDropdownOpen(false)
                                  }}
                                  className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                                  tabIndex={0}
                                >
                                  <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                    {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-[12px] font-medium text-[#262626]">{ch.shortName}</span>
                                    <span className="ml-[6px] text-[11px] text-[#999]">${ch.price.toFixed(2)}/{ch.unit}</span>
                                  </div>
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Billing code</label>
                    <input type="text" value={itemBillingCode} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" title={itemBillingCode} />
                  </div>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name</label>
                    <input type="text" value={itemServiceName} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
                  </div>

                  <div className="mb-[14px] flex gap-[10px]">
                    <div className="flex-1">
                      <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Quantity *</label>
                      <input type="text" inputMode="decimal" value={itemQuantity} onChange={(e) => onSetItemQuantity(e.target.value)} className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none hover:border-[#ccc] focus:border-[#a3c4f3]" />
                    </div>
                    <div className="flex-1">
                      <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Unit</label>
                      <input type="text" value={itemUnit} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
                    </div>
                  </div>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Period *</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => onSetIsItemPeriodDropdownOpen(!isItemPeriodDropdownOpen)}
                        className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
                      >
                        <span className="min-w-0 flex-1 text-left">{periodLabels[itemPeriod]}</span>
                        <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemPeriodDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
                      </button>
                      {isItemPeriodDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-[59]" onClick={() => onSetIsItemPeriodDropdownOpen(false)} />
                          <div className="absolute bottom-full left-0 z-[60] mb-[4px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                            {(Object.entries(periodLabels) as [BudgetPeriod, string][]).map(([key, label]) => {
                              const isSelected = itemPeriod === key
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => { onSetItemPeriod(key); onSetIsItemPeriodDropdownOpen(false) }}
                                  className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                                  tabIndex={0}
                                >
                                  <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                                    {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                                  </div>
                                  <span className="text-[12px] font-medium text-[#262626]">{label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mb-[14px]">
                    <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Description</label>
                    <input type="text" value={itemDescription} onChange={(e) => onSetItemDescription(e.target.value)} placeholder="Optional description" className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]" />
                  </div>

                  {(() => {
                    const charge = enabledCharges.find((c) => c.itemNumber === itemChargeItemNumber)
                    const rate = charge?.price || 0
                    const qty = parseFloat(itemQuantity) || 0
                    return (
                      <div className="mb-[14px] flex items-center justify-between rounded-[8px] bg-[#fafafa] px-[12px] py-[8px]">
                        <span className="text-[12px] text-[#888]">Rate: ${rate.toFixed(2)}/{itemUnit}</span>
                        <span className="text-[13px] font-semibold text-[#262626]">${(qty * rate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )
                  })()}

                  <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] pt-[12px]">
                    <button
                      onClick={() => onResetItemForm()}
                      className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onSaveItem}
                      disabled={!itemChargeItemNumber || !(parseFloat(itemQuantity) > 0)}
                      className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
                      tabIndex={0}
                    >
                      {editingItemId ? "Save changes" : "Add item"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => onInitItemForm(editingBudgetId)}
                  className="mt-[8px] flex w-full items-center justify-center gap-[4px] rounded-[6px] border border-dashed border-[#d4d4d4] py-[8px] text-[12px] font-medium text-[#888] transition-colors hover:border-[#bbb] hover:bg-[#fafafa] hover:text-[#262626]"
                  tabIndex={0}
                >
                  <Plus className="h-[12px] w-[12px]" strokeWidth={1.75} />
                  Add item
                </button>
              )}
            </div>
          )
        })()}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
          <button
            onClick={() => onResetBudgetForm()}
            className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            onClick={onSaveBudget}
            disabled={!budgetName.trim() || !budgetStartDate || !budgetEndDate}
            className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {editingBudgetId ? "Save changes" : "Create budget"}
          </button>
        </div>
        </>
      ) : isItemFormOpen ? (
        <>
        <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
          <h2 className="text-[13px] font-semibold text-[#262626]">{editingItemId ? "Edit item" : "Add item"}</h2>
          <button
            onClick={() => onResetItemForm()}
            className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Close item form"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-[14px] px-[24px] py-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Charge item *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => onSetIsItemChargeDropdownOpen(!isItemChargeDropdownOpen)}
                className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {(() => { const c = enabledCharges.find((ch) => ch.itemNumber === itemChargeItemNumber); return c ? `${c.shortName} – $${c.price.toFixed(2)}/${c.unit}` : "Select charge item" })()}
                </span>
                <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              </button>
              {isItemChargeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => onSetIsItemChargeDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 z-[60] mb-[4px] max-h-[240px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    {enabledCharges.map((ch) => {
                      const isSelected = itemChargeItemNumber === ch.itemNumber
                      return (
                        <button
                          key={ch.itemNumber}
                          type="button"
                          onClick={() => {
                            onSetItemChargeItemNumber(ch.itemNumber)
                            onSetItemBillingCode(ch.itemNumber)
                            onSetItemServiceName(ch.shortName || ch.name)
                            onSetItemUnit((ch.unit as "hour" | "each" | "km") || "hour")
                            onSetIsItemChargeDropdownOpen(false)
                          }}
                          className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                          tabIndex={0}
                        >
                          <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                            {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-[12px] font-medium text-[#262626]">{ch.shortName}</span>
                            <span className="ml-[6px] text-[11px] text-[#999]">${ch.price.toFixed(2)}/{ch.unit}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Billing code</label>
            <input type="text" value={itemBillingCode} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" title={itemBillingCode} />
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Service name</label>
            <input type="text" value={itemServiceName} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
          </div>

          <div className="flex gap-[10px]">
            <div className="flex-1">
              <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Quantity *</label>
              <input type="text" inputMode="decimal" value={itemQuantity} onChange={(e) => onSetItemQuantity(e.target.value)} className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none hover:border-[#ccc] focus:border-[#a3c4f3]" />
            </div>
            <div className="flex-1">
              <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Unit</label>
              <input type="text" value={itemUnit} readOnly className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#f5f5f5] px-[12px] text-[13px] font-medium text-[#888] outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Period *</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => onSetIsItemPeriodDropdownOpen(!isItemPeriodDropdownOpen)}
                className="flex h-[36px] w-full items-center rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] transition-colors hover:border-[#ccc]"
              >
                <span className="min-w-0 flex-1 text-left">{periodLabels[itemPeriod]}</span>
                <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-[#888] transition-transform ${isItemPeriodDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              </button>
              {isItemPeriodDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-[59]" onClick={() => onSetIsItemPeriodDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 z-[60] mb-[4px] w-full overflow-y-auto rounded-[8px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    {(Object.entries(periodLabels) as [BudgetPeriod, string][]).map(([key, label]) => {
                      const isSelected = itemPeriod === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { onSetItemPeriod(key); onSetIsItemPeriodDropdownOpen(false) }}
                          className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-[#f0f0f0]" : ""}`}
                          tabIndex={0}
                        >
                          <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#262626] bg-[#262626]" : "border-[#d4d4d4] bg-white"}`}>
                            {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-white" />}
                          </div>
                          <span className="text-[12px] font-medium text-[#262626]">{label}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-[#888]">Description</label>
            <input type="text" value={itemDescription} onChange={(e) => onSetItemDescription(e.target.value)} placeholder="Optional description" className="h-[36px] w-full rounded-[8px] border border-[#e0e0e0] bg-[#fafafa] px-[12px] text-[13px] font-medium text-[#262626] outline-none placeholder:text-[#bbb] hover:border-[#ccc] focus:border-[#a3c4f3]" />
          </div>

          {(() => {
            const charge = enabledCharges.find((c) => c.itemNumber === itemChargeItemNumber)
            const rate = charge?.price || 0
            const qty = parseFloat(itemQuantity) || 0
            return (
              <div className="flex items-center justify-between rounded-[8px] bg-[#fafafa] px-[12px] py-[8px]">
                <span className="text-[12px] text-[#888]">Rate: ${rate.toFixed(2)}/{itemUnit}</span>
                <span className="text-[13px] font-semibold text-[#262626]">${(qty * rate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
              </div>
            )
          })()}
        </div>

        <div className="flex items-center justify-end gap-[8px] border-t border-[#f0f0f0] px-[24px] py-[12px]">
          <button
            onClick={() => onResetItemForm()}
            className="rounded-[6px] border border-[#e0e0e0] bg-white px-[12px] py-[6px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            onClick={onSaveItem}
            disabled={!itemChargeItemNumber || !(parseFloat(itemQuantity) > 0)}
            className="primary-btn rounded-[6px] px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {editingItemId ? "Save changes" : "Add item"}
          </button>
        </div>
        </>
      ) : (
      <>
      <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
        <h2 className="text-[13px] font-semibold text-[#262626]">Account details</h2>
        <button
          onClick={() => onSetSidebarVisible(false)}
          className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
          tabIndex={0}
          aria-label="Hide sidebar"
        >
          <PanelRightClose className="h-[14px] w-[14px]" strokeWidth={1.5} />
        </button>
      </div>

      <div className="border-b border-[#f0f0f0] px-[24px] pb-[12px]">
        {pf("p-first-name") && <SidebarDetailRow label="First Name">
          <SidebarEditableField value={p.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" />
        </SidebarDetailRow>}
        {pf("p-middle-name") && <SidebarDetailRow label="Middle Name">
          <SidebarEditableField value={p.middleName} onChange={(v) => onUpdateField("middleName", v)} placeholder="Middle name" />
        </SidebarDetailRow>}
        {pf("p-last-name") && <SidebarDetailRow label="Last Name">
          <SidebarEditableField value={p.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" />
        </SidebarDetailRow>}
        <SidebarDetailRow label="Coordinator">
          {canAssignClients ? (
            <div className="relative">
              <button
                onClick={() => { onSetIsCoordinatorOpen(!isCoordinatorOpen); setTimeout(() => coordinatorInputRef.current?.focus(), 50) }}
                className="flex min-w-0 items-center gap-[6px] rounded px-[6px] py-[3px] text-[13px] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                {client.owner ? (
                  <>
                    <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-600">
                      {client.owner.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                    </div>
                    <span className="truncate font-medium text-[#262626]">{client.owner}</span>
                  </>
                ) : (
                  <span className="font-medium text-[#ccc]">Assign coordinator</span>
                )}
                <ChevronDown className="ml-[2px] h-[10px] w-[10px] shrink-0 text-[#bbb]" strokeWidth={1.5} />
              </button>
              {isCoordinatorOpen && (
                <>
                  <div className="fixed inset-0 z-[49]" onClick={() => { onSetIsCoordinatorOpen(false); onSetCoordinatorSearch("") }} />
                  <div className="absolute left-0 top-full z-[50] mt-[4px] w-[240px] overflow-hidden rounded-lg border border-[#e0e0e0] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    <div className="border-b border-[#f0f0f0] px-[12px] py-[8px]">
                      <input
                        ref={coordinatorInputRef}
                        value={coordinatorSearch}
                        onChange={(e) => onSetCoordinatorSearch(e.target.value)}
                        placeholder="Search staff..."
                        className="w-full text-[13px] text-[#262626] placeholder-[#ccc] outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto py-[4px]">
                      <button
                        onClick={() => { onUpdateClient(client.id, { owner: "" }); onSetIsCoordinatorOpen(false); onSetCoordinatorSearch("") }}
                        className="flex w-full items-center px-[12px] py-[8px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5]"
                        tabIndex={0}
                      >
                        None
                      </button>
                      {staffNames
                        .filter((n) => !coordinatorSearch || n.toLowerCase().includes(coordinatorSearch.toLowerCase()))
                        .map((name) => {
                          const initials = name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                          const isSelected = client.owner === name
                          return (
                            <button
                              key={name}
                              onClick={() => { onUpdateClient(client.id, { owner: name }); onSetIsCoordinatorOpen(false); onSetCoordinatorSearch("") }}
                              className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${isSelected ? "bg-blue-50 text-blue-600" : "text-[#262626]"}`}
                              tabIndex={0}
                            >
                              <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] bg-[#DBEAFE] text-[9px] font-semibold text-[#2563EB]">
                                {initials}
                              </div>
                              {name}
                              {isSelected && <span className="ml-auto text-[11px] text-blue-500">✓</span>}
                            </button>
                          )
                        })
                      }
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-[6px] px-[6px] py-[3px]">
              {client.owner ? (
                <>
                  <div className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-blue-100 text-[9px] font-semibold text-blue-600">
                    {client.owner.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <span className="text-[13px] font-medium text-[#262626]">{client.owner}</span>
                </>
              ) : (
                <span className="text-[13px] font-medium text-[#ccc]">No coordinator</span>
              )}
            </div>
          )}
        </SidebarDetailRow>
        {pf("p-date-of-birth") && <SidebarDetailRow label="Date of Birth">
          <SidebarEditableField value={p.dateOfBirth} onChange={(v) => onUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
        </SidebarDetailRow>}
        {pf("p-primary-diagnosis") && <SidebarDetailRow label="Primary Dx">
          <SidebarDiagnosisChip value={p.primaryDiagnosis} onChange={(v) => onUpdateField("primaryDiagnosis", v)} placeholder="Add diagnosis" />
        </SidebarDetailRow>}
        {pf("p-secondary-diagnosis") && <SidebarDetailRow label="Secondary Dx">
          <SidebarDiagnosisChip value={p.secondaryDiagnosis} onChange={(v) => onUpdateField("secondaryDiagnosis", v)} placeholder="Add diagnosis" />
        </SidebarDetailRow>}
        {pf("p-gender") && <SidebarDetailRow label="Gender">
          <SidebarEditableField value={p.gender} onChange={(v) => onUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
        </SidebarDetailRow>}
        {pf("p-pronouns") && <SidebarDetailRow label="Pronouns">
          <SidebarEditableField value={p.pronouns} onChange={(v) => onUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
        </SidebarDetailRow>}
        {pf("p-ethnicity") && <SidebarDetailRow label="Ethnicity">
          <SidebarEditableField value={p.ethnicity} onChange={(v) => onUpdateField("ethnicity", v)} placeholder="Ethnicity" />
        </SidebarDetailRow>}
        {pf("p-language") && <SidebarDetailRow label="Language">
          <SidebarEditableField value={p.language} onChange={(v) => onUpdateField("language", v)} placeholder="Language" />
        </SidebarDetailRow>}

        <div className="my-[12px] h-px bg-[#e8e8e8]" />
        <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Contact Information</h3>
        {pf("p-email") && <SidebarDetailRow label="Email">
          <SidebarContactChip value={p.email} onChange={(v) => onUpdateField("email", v)} placeholder="Email address" />
        </SidebarDetailRow>}
        {pf("p-phone") && <SidebarDetailRow label="Phone">
          <SidebarContactChip value={p.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Phone number" />
        </SidebarDetailRow>}
        {pf("p-contact-method") && <SidebarDetailRow label="Contact">
          <SidebarEditableField value={p.preferredContactMethod} onChange={(v) => onUpdateField("preferredContactMethod", v)} type="select" options={["SMS", "Email", "Call (Mobile)", "Call (Phone)"]} />
        </SidebarDetailRow>}
        {pf("p-sign-method") && <SidebarDetailRow label="Sign Method">
          <SidebarEditableField value={p.preferredSignMethod} onChange={(v) => onUpdateField("preferredSignMethod", v)} type="select" options={["In Person", "Electronically"]} />
        </SidebarDetailRow>}

        <div className="my-[12px] h-px bg-[#e8e8e8]" />
        <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Reference Numbers</h3>
        {pf("p-ndis-number") && <SidebarDetailRow label="NDIS">
          <SidebarContactChip value={p.ndisNumber} onChange={(v) => onUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" />
        </SidebarDetailRow>}
        {pf("p-medicare-number") && <SidebarDetailRow label="Medicare">
          <SidebarContactChip value={p.medicareNumber} onChange={(v) => onUpdateField("medicareNumber", v)} placeholder="Medicare number" variant="white" />
        </SidebarDetailRow>}
        {pf("p-centrelink-number") && <SidebarDetailRow label="Centrelink">
          <SidebarContactChip value={p.centrelinkNumber} onChange={(v) => onUpdateField("centrelinkNumber", v)} placeholder="Centrelink number" variant="white" />
        </SidebarDetailRow>}
        {pf("p-external-id") && <SidebarDetailRow label="External ID">
          <SidebarContactChip value={p.externalId} onChange={(v) => onUpdateField("externalId", v)} placeholder="External ID" variant="white" />
        </SidebarDetailRow>}

        <div className="my-[12px] h-px bg-[#e8e8e8]" />
        <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Funding &amp; Plan Manager</h3>
        <SidebarDetailRow label="Funding Type">
          <SidebarEditableField value={p.fundingType} onChange={(v) => onUpdateField("fundingType", v)} type="select" options={["plan-managed", "ndia-managed", "self-managed"]} />
        </SidebarDetailRow>
        {(p.fundingType === "plan-managed" || !p.fundingType) && (
          <>
            <SidebarDetailRow label="PM Organisation">
              <SidebarEditableField value={p.planManagerOrg} onChange={(v) => onUpdateField("planManagerOrg", v)} placeholder="Plan manager org" />
            </SidebarDetailRow>
            <SidebarDetailRow label="PM Name">
              <SidebarEditableField value={p.planManagerName} onChange={(v) => onUpdateField("planManagerName", v)} placeholder="Plan manager name" />
            </SidebarDetailRow>
            <SidebarDetailRow label="PM Email">
              <SidebarContactChip value={p.planManagerEmail} onChange={(v) => onUpdateField("planManagerEmail", v)} placeholder="Plan manager email" variant="white" />
            </SidebarDetailRow>
          </>
        )}
        <SidebarDetailRow label="Plan Start">
          <SidebarEditableField value={p.planStartDate} onChange={(v) => onUpdateField("planStartDate", v)} type="date" placeholder="Plan start date" />
        </SidebarDetailRow>
        <SidebarDetailRow label="Plan End">
          <SidebarEditableField value={p.planEndDate} onChange={(v) => onUpdateField("planEndDate", v)} type="date" placeholder="Plan end date" />
        </SidebarDetailRow>

        <div className="my-[12px] h-px bg-[#e8e8e8]" />
        <h3 className="mb-[6px] text-[12px] font-semibold text-[#262626]">Other Details</h3>
        {pf("p-service-start") && <SidebarDetailRow label="Service Start">
          <SidebarEditableField value={p.serviceCommencementDate} onChange={(v) => onUpdateField("serviceCommencementDate", v)} type="date" placeholder="Start date" />
        </SidebarDetailRow>}
        {pf("p-service-exit") && <SidebarDetailRow label="Service Exit">
          <SidebarEditableField value={p.serviceExitDate} onChange={(v) => onUpdateField("serviceExitDate", v)} type="date" placeholder="Exit date" />
        </SidebarDetailRow>}
        <SidebarDetailRow label="Check-in">
          <SidebarEditableField value={p.checkInPeriod} onChange={(v) => onUpdateField("checkInPeriod", v)} type="select" options={["Weekly", "Fortnightly", "Monthly", "Quarterly", "As needed"]} />
        </SidebarDetailRow>
      </div>

      <div className="border-t border-[#f0f0f0] px-[24px] py-[16px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#262626]">Notes</h3>
          <button onClick={onSeeAllNotes} className="text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>See all</button>
        </div>
        {notes.length === 0 ? (
          <p className="mt-[6px] text-[13px] font-medium text-[#bbb]">No notes</p>
        ) : (
          <div className="mt-[6px] flex flex-col gap-[2px]">
            {notes.slice(0, 5).map((note) => (
              <button
                key={note.id}
                onClick={() => onOpenNote(note.id)}
                className="flex items-center gap-[8px] rounded-md px-[4px] py-[4px] text-left transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
              >
                <span className="truncate text-[13px] text-[#262626]">{note.title || "Untitled"}</span>
                <span className="ml-auto shrink-0 text-[11px] text-[#999]">{formatSidebarNoteDate(note.updatedAt || note.createdAt)}</span>
              </button>
            ))}
            {notes.length > 5 && (
              <button onClick={onSeeAllNotes} className="mt-[2px] text-left text-[12px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                +{notes.length - 5} more
              </button>
            )}
          </div>
        )}
      </div>

      </>
      )}
      </div>
    </>
  )
}
