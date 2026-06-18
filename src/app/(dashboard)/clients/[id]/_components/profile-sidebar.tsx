"use client"

import { useRef, type RefObject } from "react"
import type { Client, ParticipantDetails, Budget, BudgetLineItem, BudgetPeriod, ClientGoal, Contact, ActivityEntry, Document } from "@/lib/types"
import type { FundingReleaseCadence, NdisFundingComponent } from "@/lib/ndis-funding-pools"
import type { BudgetReleasePeriod } from "@/lib/types"
import type { NdisChargeItem } from "@/lib/ndis-charges"
import { GoalSidebarForm, type GoalFormData, type ResolvedGoalTask } from "./goal-sidebar-form"
import { CarePlanSidebarForm } from "./care-plan-sidebar-form"
import { BudgetSidebarForm } from "./budget-sidebar-form"
import { SpendingPlanSidebarForm } from "./spending-plan-sidebar-form"
import { DocumentSidebarForm } from "@/components/document-sidebar-form"
import { ClientAccountDetails } from "@/components/profile-account-details/client-account-details"
import { formatNumberInput, parseFormattedNumber } from "@/lib/number-input"
import { FixedSelectDropdown } from "@/components/fixed-select-dropdown"
import type { AccountDetailsTab } from "@/components/profile-account-details/profile-account-details-panel"
import {
  FileText,
  CalendarDays,
  ChevronDown,
  Plus,
  PenLine,
  X,
} from "lucide-react"

interface ProfileSidebarProps {
  client: Client
  p: ParticipantDetails
  pf: (key: string) => boolean
  budgets: Budget[]
  sidebarWidth: number
  staffNames: string[]
  canAssignClients: boolean
  enabledCharges: NdisChargeItem[]

  isCarePlanFormOpen: boolean
  carePlanCreatedDate: string
  carePlanRenewalDate: string
  carePlanFile: File | null
  carePlanExistingDocumentName?: string
  carePlanCreatedPickerOpen: boolean
  carePlanRenewalPickerOpen: boolean
  isSavingCarePlan: boolean
  onSetCarePlanCreatedDate: (date: string) => void
  onSetCarePlanRenewalDate: (date: string) => void
  onSetCarePlanFile: (file: File | null) => void
  onSetCarePlanCreatedPickerOpen: (open: boolean) => void
  onSetCarePlanRenewalPickerOpen: (open: boolean) => void
  onResetCarePlanForm: () => void
  onSaveCarePlan: () => void

  isBudgetFormOpen: boolean
  editingBudgetId: string | null
  budgetName: string
  budgetFundingComponent: NdisFundingComponent | ""
  budgetAllocatedAmount: string
  budgetReleaseCadence: FundingReleaseCadence
  budgetReleasePeriods: BudgetReleasePeriod[]
  budgetStartDate: string
  budgetEndDate: string
  budgetStartPickerOpen: boolean
  budgetEndPickerOpen: boolean
  isComponentDropdownOpen: boolean
  isCadenceDropdownOpen: boolean
  onSetBudgetName: (name: string) => void
  onSetBudgetFundingComponent: (component: NdisFundingComponent) => void
  onSetBudgetAllocatedAmount: (amount: string) => void
  onSetBudgetReleaseCadence: (cadence: FundingReleaseCadence) => void
  onSetBudgetReleasePeriods: (periods: BudgetReleasePeriod[]) => void
  onSetBudgetStartDate: (date: string) => void
  onSetBudgetEndDate: (date: string) => void
  onSetBudgetStartPickerOpen: (open: boolean) => void
  onSetBudgetEndPickerOpen: (open: boolean) => void
  onSetIsComponentDropdownOpen: (open: boolean) => void
  onSetIsCadenceDropdownOpen: (open: boolean) => void
  onResetBudgetForm: () => void
  onSaveBudget: () => void
  onDeleteBudget?: (id: string) => void
  onUsePlanDates: () => void

  isSpendingPlanFormOpen: boolean
  editingSpendingPlanId: string | null
  spendingPlanName: string
  spendingPlanBudgetId: string
  spendingPlanChargeItemNumber: string
  spendingPlanServiceName: string
  spendingPlanQuantity: string
  spendingPlanUnit: "hour" | "each" | "km"
  spendingPlanCadence: BudgetPeriod
  spendingPlanStartDate: string
  spendingPlanEndDate: string
  spendingPlanDescription: string
  spendingPlanStartPickerOpen: boolean
  spendingPlanEndPickerOpen: boolean
  isSpendingPlanBudgetDropdownOpen: boolean
  isSpendingPlanChargeDropdownOpen: boolean
  isSpendingPlanCadenceDropdownOpen: boolean
  onSetSpendingPlanName: (name: string) => void
  onSetSpendingPlanBudgetId: (id: string) => void
  onSetSpendingPlanChargeItemNumber: (val: string) => void
  onSetSpendingPlanServiceName: (val: string) => void
  onSetSpendingPlanQuantity: (val: string) => void
  onSetSpendingPlanUnit: (val: "hour" | "each" | "km") => void
  onSetSpendingPlanCadence: (val: BudgetPeriod) => void
  onSetSpendingPlanStartDate: (date: string) => void
  onSetSpendingPlanEndDate: (date: string) => void
  onSetSpendingPlanDescription: (val: string) => void
  onSetSpendingPlanStartPickerOpen: (open: boolean) => void
  onSetSpendingPlanEndPickerOpen: (open: boolean) => void
  onSetIsSpendingPlanBudgetDropdownOpen: (open: boolean) => void
  onSetIsSpendingPlanChargeDropdownOpen: (open: boolean) => void
  onSetIsSpendingPlanCadenceDropdownOpen: (open: boolean) => void
  onResetSpendingPlanForm: () => void
  onSaveSpendingPlan: () => void
  onDeleteSpendingPlan?: (id: string) => void
  onUseSpendingPlanDates: () => void
  onUseSpendingPlanBudgetDates: () => void

  isGoalFormOpen: boolean
  editingGoal: ClientGoal | null
  onResetGoalForm: () => void
  onSaveGoal: (data: GoalFormData) => void
  onDeleteGoal: (id: string) => void
  onOpenGoalTask: (taskId: string) => void
  onResolveGoalTask: (taskId: string) => ResolvedGoalTask | null

  isItemFormOpen: boolean
  editingItemId: string | null
  addingItemToBudgetId: string | null
  editingItemBudgetId: string | null
  itemChargeItemNumber: string
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

  stakeholders: Contact[]
  activityLog: ActivityEntry[]
  currentUserName: string
  accountDetailsTab: AccountDetailsTab
  onAccountDetailsTabChange: (tab: AccountDetailsTab) => void
  hideAccountDetailsTabBar?: boolean
  embedded?: boolean
  onAddStakeholder: () => void

  isDocumentFormOpen: boolean
  editingDocument: Document | null
  docName: string
  docValidFrom: string
  docValidTo: string
  docPendingFile: File | null
  docValidFromPickerOpen: boolean
  docValidToPickerOpen: boolean
  isSavingDocument: boolean
  onSetDocName: (value: string) => void
  onSetDocValidFrom: (value: string) => void
  onSetDocValidTo: (value: string) => void
  onSetDocPendingFile: (file: File | null) => void
  onSetDocValidFromPickerOpen: (open: boolean) => void
  onSetDocValidToPickerOpen: (open: boolean) => void
  onResetDocumentForm: () => void
  onSaveDocument: () => void
  onPreviewDocument?: () => void

  onSetSidebarVisible: (visible: boolean) => void
  onMouseDown: () => void
  onUpdateField: (field: keyof ParticipantDetails, value: string) => void
  onUpdateFields: (fields: Partial<ParticipantDetails>) => void
  onUpdateClient: (id: string, data: Partial<Client>) => void

  periodLabels: Record<BudgetPeriod, string>
}

export function ProfileSidebar(props: ProfileSidebarProps) {
  const {
    client, p, pf, budgets, sidebarWidth,
    staffNames, canAssignClients, enabledCharges,
    isCarePlanFormOpen, carePlanCreatedDate, carePlanRenewalDate, carePlanFile, carePlanExistingDocumentName,
    carePlanCreatedPickerOpen, carePlanRenewalPickerOpen, isSavingCarePlan,
    onSetCarePlanCreatedDate, onSetCarePlanRenewalDate, onSetCarePlanFile,
    onSetCarePlanCreatedPickerOpen, onSetCarePlanRenewalPickerOpen, onResetCarePlanForm, onSaveCarePlan,
    isBudgetFormOpen, editingBudgetId, budgetName, budgetFundingComponent, budgetAllocatedAmount, budgetReleaseCadence,
    budgetReleasePeriods, budgetStartDate, budgetEndDate, budgetStartPickerOpen, budgetEndPickerOpen, isComponentDropdownOpen, isCadenceDropdownOpen,
    onSetBudgetName, onSetBudgetFundingComponent, onSetBudgetAllocatedAmount, onSetBudgetReleaseCadence, onSetBudgetReleasePeriods,
    onSetBudgetStartDate, onSetBudgetEndDate, onSetBudgetStartPickerOpen, onSetBudgetEndPickerOpen,
    onSetIsComponentDropdownOpen, onSetIsCadenceDropdownOpen, onResetBudgetForm, onSaveBudget, onDeleteBudget, onUsePlanDates,
    isSpendingPlanFormOpen, editingSpendingPlanId, spendingPlanName, spendingPlanBudgetId,
    spendingPlanChargeItemNumber, spendingPlanServiceName, spendingPlanQuantity, spendingPlanUnit,
    spendingPlanCadence, spendingPlanStartDate, spendingPlanEndDate, spendingPlanDescription,
    spendingPlanStartPickerOpen, spendingPlanEndPickerOpen,
    isSpendingPlanBudgetDropdownOpen, isSpendingPlanChargeDropdownOpen, isSpendingPlanCadenceDropdownOpen,
    onSetSpendingPlanName, onSetSpendingPlanBudgetId, onSetSpendingPlanChargeItemNumber, onSetSpendingPlanServiceName,
    onSetSpendingPlanQuantity, onSetSpendingPlanUnit, onSetSpendingPlanCadence, onSetSpendingPlanStartDate,
    onSetSpendingPlanEndDate, onSetSpendingPlanDescription, onSetSpendingPlanStartPickerOpen, onSetSpendingPlanEndPickerOpen,
    onSetIsSpendingPlanBudgetDropdownOpen, onSetIsSpendingPlanChargeDropdownOpen, onSetIsSpendingPlanCadenceDropdownOpen,
    onResetSpendingPlanForm, onSaveSpendingPlan, onDeleteSpendingPlan, onUseSpendingPlanDates, onUseSpendingPlanBudgetDates,
    isGoalFormOpen, editingGoal, onResetGoalForm, onSaveGoal, onDeleteGoal, onOpenGoalTask, onResolveGoalTask,
    isItemFormOpen, editingItemId, addingItemToBudgetId, editingItemBudgetId,
    itemChargeItemNumber, itemServiceName, itemQuantity, itemUnit, itemPeriod, itemDescription,
    isItemChargeDropdownOpen, isItemPeriodDropdownOpen,
    onSetItemChargeItemNumber, onSetItemBillingCode, onSetItemServiceName,
    onSetItemQuantity, onSetItemUnit, onSetItemPeriod, onSetItemDescription,
    onSetIsItemChargeDropdownOpen, onSetIsItemPeriodDropdownOpen,
    onInitItemForm, onInitEditItemForm, onResetItemForm, onSaveItem,
    isCoordinatorOpen, coordinatorSearch, coordinatorInputRef,
    onSetIsCoordinatorOpen, onSetCoordinatorSearch,
    stakeholders, activityLog, currentUserName, accountDetailsTab, onAccountDetailsTabChange, hideAccountDetailsTabBar, embedded, onAddStakeholder,
    isDocumentFormOpen, editingDocument, docName, docValidFrom, docValidTo, docPendingFile, docValidFromPickerOpen, docValidToPickerOpen, isSavingDocument,
    onSetDocName, onSetDocValidFrom, onSetDocValidTo, onSetDocPendingFile, onSetDocValidFromPickerOpen, onSetDocValidToPickerOpen, onResetDocumentForm, onSaveDocument, onPreviewDocument,
    onSetSidebarVisible, onMouseDown, onUpdateField, onUpdateFields, onUpdateClient,
    periodLabels,
  } = props

  const itemChargeDropdownRef = useRef<HTMLButtonElement>(null)
  const itemPeriodDropdownRef = useRef<HTMLButtonElement>(null)

  return (
    <>
      {!embedded && (
      <div
        onMouseDown={onMouseDown}
          className="w-[4px] shrink-0 cursor-col-resize border-l border-folk-border transition-colors hover:border-[#aaa] hover:bg-[var(--folk-border-subtle)]"
        />
      )}
      <div
        className={embedded ? "flex h-full min-h-0 w-full flex-col overflow-y-auto bg-folk-surface" : "flex h-full min-h-0 shrink-0 flex-col overflow-y-auto bg-folk-surface"}
        style={embedded ? undefined : { width: sidebarWidth }}
      >
      {isGoalFormOpen ? (
        <GoalSidebarForm
          key={editingGoal?.id ?? "new"}
          goal={editingGoal}
          onSave={onSaveGoal}
          onDelete={editingGoal ? onDeleteGoal : undefined}
          onClose={onResetGoalForm}
          onOpenTask={onOpenGoalTask}
          resolveTask={onResolveGoalTask}
        />
      ) : isCarePlanFormOpen ? (
        <CarePlanSidebarForm
          isEditing={Boolean(carePlanExistingDocumentName)}
          existingDocumentName={carePlanExistingDocumentName}
          createdDate={carePlanCreatedDate}
          renewalDate={carePlanRenewalDate}
          file={carePlanFile}
          isSaving={isSavingCarePlan}
          createdPickerOpen={carePlanCreatedPickerOpen}
          renewalPickerOpen={carePlanRenewalPickerOpen}
          onSetCreatedDate={onSetCarePlanCreatedDate}
          onSetRenewalDate={onSetCarePlanRenewalDate}
          onSetFile={onSetCarePlanFile}
          onSetCreatedPickerOpen={onSetCarePlanCreatedPickerOpen}
          onSetRenewalPickerOpen={onSetCarePlanRenewalPickerOpen}
          onSave={onSaveCarePlan}
          onClose={onResetCarePlanForm}
        />
      ) : isBudgetFormOpen ? (
        <BudgetSidebarForm
          isEditing={Boolean(editingBudgetId)}
          p={p}
          budgetName={budgetName}
          fundingComponent={budgetFundingComponent}
          allocatedAmount={budgetAllocatedAmount}
          releaseCadence={budgetReleaseCadence}
          releasePeriods={budgetReleasePeriods}
          budgetStartDate={budgetStartDate}
          budgetEndDate={budgetEndDate}
          budgetStartPickerOpen={budgetStartPickerOpen}
          budgetEndPickerOpen={budgetEndPickerOpen}
          isComponentDropdownOpen={isComponentDropdownOpen}
          isCadenceDropdownOpen={isCadenceDropdownOpen}
          onSetBudgetName={onSetBudgetName}
          onSetFundingComponent={onSetBudgetFundingComponent}
          onSetAllocatedAmount={onSetBudgetAllocatedAmount}
          onSetReleaseCadence={onSetBudgetReleaseCadence}
          onSetReleasePeriods={onSetBudgetReleasePeriods}
          onSetBudgetStartDate={onSetBudgetStartDate}
          onSetBudgetEndDate={onSetBudgetEndDate}
          onSetBudgetStartPickerOpen={onSetBudgetStartPickerOpen}
          onSetBudgetEndPickerOpen={onSetBudgetEndPickerOpen}
          onSetIsComponentDropdownOpen={onSetIsComponentDropdownOpen}
          onSetIsCadenceDropdownOpen={onSetIsCadenceDropdownOpen}
          onUsePlanDates={onUsePlanDates}
          onSave={onSaveBudget}
          onClose={onResetBudgetForm}
          onDelete={editingBudgetId ? onDeleteBudget : undefined}
          editingBudgetId={editingBudgetId}
        />
      ) : isSpendingPlanFormOpen ? (
        <SpendingPlanSidebarForm
          isEditing={Boolean(editingSpendingPlanId)}
          budgets={budgets}
          enabledCharges={enabledCharges}
          planName={spendingPlanName}
          budgetId={spendingPlanBudgetId}
          chargeItemNumber={spendingPlanChargeItemNumber}
          serviceName={spendingPlanServiceName}
          quantity={spendingPlanQuantity}
          unit={spendingPlanUnit}
          cadence={spendingPlanCadence}
          startDate={spendingPlanStartDate}
          endDate={spendingPlanEndDate}
          description={spendingPlanDescription}
          startPickerOpen={spendingPlanStartPickerOpen}
          endPickerOpen={spendingPlanEndPickerOpen}
          isBudgetDropdownOpen={isSpendingPlanBudgetDropdownOpen}
          isChargeDropdownOpen={isSpendingPlanChargeDropdownOpen}
          isCadenceDropdownOpen={isSpendingPlanCadenceDropdownOpen}
          onSetPlanName={onSetSpendingPlanName}
          onSetBudgetId={onSetSpendingPlanBudgetId}
          onSetChargeItemNumber={onSetSpendingPlanChargeItemNumber}
          onSetServiceName={onSetSpendingPlanServiceName}
          onSetQuantity={onSetSpendingPlanQuantity}
          onSetUnit={onSetSpendingPlanUnit}
          onSetCadence={onSetSpendingPlanCadence}
          onSetStartDate={onSetSpendingPlanStartDate}
          onSetEndDate={onSetSpendingPlanEndDate}
          onSetDescription={onSetSpendingPlanDescription}
          onSetStartPickerOpen={onSetSpendingPlanStartPickerOpen}
          onSetEndPickerOpen={onSetSpendingPlanEndPickerOpen}
          onSetIsBudgetDropdownOpen={onSetIsSpendingPlanBudgetDropdownOpen}
          onSetIsChargeDropdownOpen={onSetIsSpendingPlanChargeDropdownOpen}
          onSetIsCadenceDropdownOpen={onSetIsSpendingPlanCadenceDropdownOpen}
          onUseBudgetDates={onUseSpendingPlanBudgetDates}
          onUsePlanDates={onUseSpendingPlanDates}
          ndisPlanStartDate={p.planStartDate}
          ndisPlanEndDate={p.planEndDate}
          onSave={onSaveSpendingPlan}
          onClose={onResetSpendingPlanForm}
          onDelete={editingSpendingPlanId ? onDeleteSpendingPlan : undefined}
          editingSpendingPlanId={editingSpendingPlanId}
        />
      ) : isDocumentFormOpen ? (
        <DocumentSidebarForm
          isEditing={Boolean(editingDocument)}
          name={docName}
          validFrom={docValidFrom}
          validTo={docValidTo}
          file={docPendingFile}
          existingDocumentName={editingDocument?.name}
          isSaving={isSavingDocument}
          validFromPickerOpen={docValidFromPickerOpen}
          validToPickerOpen={docValidToPickerOpen}
          onSetName={onSetDocName}
          onSetValidFrom={onSetDocValidFrom}
          onSetValidTo={onSetDocValidTo}
          onSetFile={onSetDocPendingFile}
          onSetValidFromPickerOpen={onSetDocValidFromPickerOpen}
          onSetValidToPickerOpen={onSetDocValidToPickerOpen}
          onSave={onSaveDocument}
          onClose={onResetDocumentForm}
          onPreview={editingDocument ? onPreviewDocument : undefined}
        />
      ) : isItemFormOpen ? (
        <>
        <div className="flex items-center justify-between px-[24px] pb-[4px] pt-[20px]">
          <h2 className="text-[13px] font-semibold text-folk-text">{editingItemId ? "Edit item" : "Add item"}</h2>
          <button
            onClick={() => onResetItemForm()}
            className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            tabIndex={0}
            aria-label="Close item form"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="space-y-[14px] px-[24px] py-[14px]">
          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Charge item *</label>
            <div className="relative">
              <button
                ref={itemChargeDropdownRef}
                type="button"
                onClick={() => onSetIsItemChargeDropdownOpen(!isItemChargeDropdownOpen)}
                className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
              >
                <span className="min-w-0 flex-1 truncate text-left">
                  {(() => { const c = enabledCharges.find((ch) => ch.itemNumber === itemChargeItemNumber); return c ? `${c.shortName} – $${c.price.toFixed(2)}/${c.unit}` : "Select charge item" })()}
                </span>
                <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform ${isItemChargeDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              </button>
              <FixedSelectDropdown
                isOpen={isItemChargeDropdownOpen}
                anchorRef={itemChargeDropdownRef}
                onClose={() => onSetIsItemChargeDropdownOpen(false)}
                isEmpty={enabledCharges.length === 0}
                emptyMessage="No charge items are enabled. Enable charges in Settings → NDIS price book."
                estimatedHeight={enabledCharges.length === 0 ? 56 : Math.min(240, enabledCharges.length * 38 + 8)}
                minWidth={280}
              >
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
                      className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-folk-hover ${isSelected ? "bg-[var(--folk-border-subtle)]" : ""}`}
                          tabIndex={0}
                        >
                      <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-folk-border bg-folk-surface"}`}>
                        {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-folk-surface" />}
                          </div>
                          <div className="min-w-0 flex-1">
                        <span className="text-[12px] font-medium text-folk-text">{ch.shortName}</span>
                        <span className="ml-[6px] text-[11px] text-folk-secondary">${ch.price.toFixed(2)}/{ch.unit}</span>
                          </div>
                        </button>
                      )
                    })}
              </FixedSelectDropdown>
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Service name</label>
            <input type="text" value={itemServiceName} readOnly className="h-[36px] w-full rounded-none border border-folk-border bg-folk-hover px-[12px] text-[13px] font-medium text-folk-secondary outline-none" />
          </div>

          <div className="flex gap-[10px]">
            <div className="flex-1">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Quantity *</label>
              <input type="text" inputMode="decimal" value={itemQuantity} onChange={(e) => onSetItemQuantity(formatNumberInput(e.target.value))} className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none hover:border-[#ccc] focus:border-[#a3c4f3]" />
            </div>
            <div className="flex-1">
              <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Unit</label>
              <input type="text" value={itemUnit} readOnly className="h-[36px] w-full rounded-none border border-folk-border bg-folk-hover px-[12px] text-[13px] font-medium text-folk-secondary outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Period *</label>
            <div className="relative">
              <button
                ref={itemPeriodDropdownRef}
                type="button"
                onClick={() => onSetIsItemPeriodDropdownOpen(!isItemPeriodDropdownOpen)}
                className="flex h-[36px] w-full items-center rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text transition-colors hover:border-[#ccc]"
              >
                <span className="min-w-0 flex-1 text-left">{periodLabels[itemPeriod]}</span>
                <ChevronDown className={`ml-[8px] h-[14px] w-[14px] shrink-0 text-folk-secondary transition-transform ${isItemPeriodDropdownOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              </button>
              <FixedSelectDropdown
                isOpen={isItemPeriodDropdownOpen}
                anchorRef={itemPeriodDropdownRef}
                onClose={() => onSetIsItemPeriodDropdownOpen(false)}
                estimatedHeight={Object.keys(periodLabels).length * 36 + 8}
                minWidth={240}
              >
                    {(Object.entries(periodLabels) as [BudgetPeriod, string][]).map(([key, label]) => {
                      const isSelected = itemPeriod === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => { onSetItemPeriod(key); onSetIsItemPeriodDropdownOpen(false) }}
                      className={`flex w-full items-center gap-[10px] px-[12px] py-[7px] text-left transition-colors hover:bg-folk-hover ${isSelected ? "bg-[var(--folk-border-subtle)]" : ""}`}
                          tabIndex={0}
                        >
                      <div className={`flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected ? "border-[#2563EB] bg-[#2563EB]" : "border-folk-border bg-folk-surface"}`}>
                        {isSelected && <div className="h-[6px] w-[6px] rounded-full bg-folk-surface" />}
                          </div>
                      <span className="text-[12px] font-medium text-folk-text">{label}</span>
                        </button>
                      )
                    })}
              </FixedSelectDropdown>
            </div>
          </div>

          <div>
            <label className="mb-[4px] block text-[12px] font-medium text-folk-secondary">Description</label>
            <input type="text" value={itemDescription} onChange={(e) => onSetItemDescription(e.target.value)} placeholder="Optional description" className="h-[36px] w-full rounded-none border border-folk-border bg-folk-page px-[12px] text-[13px] font-medium text-folk-text outline-none placeholder:text-folk-placeholder hover:border-[#ccc] focus:border-[#a3c4f3]" />
          </div>

          {(() => {
            const charge = enabledCharges.find((c) => c.itemNumber === itemChargeItemNumber)
            const rate = charge?.price || 0
            const qty = parseFormattedNumber(itemQuantity)
            return (
              <div className="flex items-center justify-between rounded-none bg-folk-page px-[12px] py-[8px]">
                <span className="text-[12px] text-folk-secondary">Rate: ${rate.toFixed(2)}/{itemUnit}</span>
                <span className="text-[13px] font-semibold text-folk-text">${(qty * rate).toLocaleString("en-AU", { minimumFractionDigits: 2 })}</span>
              </div>
            )
          })()}
        </div>

        <div className="flex items-center justify-end gap-[8px] border-t border-folk-border-subtle px-[24px] py-[12px]">
          <button
            onClick={() => onResetItemForm()}
            className="rounded-none border border-folk-border bg-folk-surface px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            Cancel
          </button>
          <button
            onClick={onSaveItem}
            disabled={!itemChargeItemNumber || !(parseFormattedNumber(itemQuantity) > 0)}
            className="primary-btn px-[12px] py-[6px] text-[12px] font-medium transition-colors disabled:opacity-50"
            tabIndex={0}
          >
            {editingItemId ? "Save changes" : "Add item"}
          </button>
        </div>
        </>
      ) : (
      <>
      <div>
        <ClientAccountDetails
          client={client}
          p={p}
          pf={pf}
          staffNames={staffNames}
          canAssignClients={canAssignClients}
          activityLog={activityLog}
          currentUserName={currentUserName}
          stakeholders={stakeholders}
          isCoordinatorOpen={isCoordinatorOpen}
          coordinatorSearch={coordinatorSearch}
          coordinatorInputRef={coordinatorInputRef}
          onSetIsCoordinatorOpen={onSetIsCoordinatorOpen}
          onSetCoordinatorSearch={onSetCoordinatorSearch}
          onAddStakeholder={onAddStakeholder}
          onUpdateField={onUpdateField}
          onUpdateFields={onUpdateFields}
          onUpdateClient={onUpdateClient}
          activeTab={accountDetailsTab}
          onTabChange={onAccountDetailsTabChange}
          onHideSidebar={() => onSetSidebarVisible(false)}
          hideTabBar={hideAccountDetailsTabBar}
        />
                  </div>
      </>
      )}
      </div>
    </>
  )
}
