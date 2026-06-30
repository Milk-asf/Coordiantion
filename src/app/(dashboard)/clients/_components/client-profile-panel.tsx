"use client"

import { useState } from "react"
import {
  ChevronDown,
  User,
  X,
} from "lucide-react"
import type { Client, ParticipantDetails } from "@/lib/types"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { EntityIcon } from "@/components/entity-icon"
import { IconButton } from "@/components/icon-button"
import { FormModal } from "@/components/form-modal"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { MultiChip } from "@/components/multi-chip"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { profileTabBarClass, pageTitleTextClass } from "@/components/tab-active-indicator"
import { ProfileMetadataPill } from "@/components/profile-record-header"
import { mergeDiagnoses, SidebarDetailRow } from "@/app/(dashboard)/clients/[id]/_components/client-profile-helpers"
import { getCategoryChipClasses } from "@/lib/chip-colors"
import { folkInlineAddButtonClass } from "@/lib/folk-ui"

interface ClientProfilePanelProps {
  client: Client
  participantData: ParticipantDetails
  onUpdateField: (field: keyof ParticipantDetails, value: string) => void
  onUpdateFields: (fields: Partial<ParticipantDetails>) => void
  onClose: () => void
  staffNames: string[]
  canAssignClients: boolean
  onAssign: (coordinatorName: string) => void
}

export function ClientProfilePanel({
  client,
  participantData,
  onUpdateField,
  onUpdateFields,
  onClose,
  staffNames,
  canAssignClients,
  onAssign,
}: ClientProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<"details" | "notes">("details")
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const { isFieldEnabled } = useFieldConfig()
  const pf = isFieldEnabled

  function getCoordinatorInitials(name: string) {
    return name.split(" ").filter(Boolean).map((part) => part[0]).join("").toUpperCase().slice(0, 2)
  }

  function renderCoordinatorChip(name: string) {
    return (
      <span className={`${getCategoryChipClasses(name, { size: "sm" })} max-w-full gap-[4px] transition-colors hover:brightness-[0.97]`}>
        <EntityIcon text={getCoordinatorInitials(name)} size="xs" />
        <span className="truncate">{name}</span>
      </span>
    )
  }

  return (
    <FormModal onClose={onClose} width={440} position="right">
      {/* Folk top utility bar */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[12px]">
        <ProfileMetadataPill icon={User} label="Clients" />
        <IconButton
          onClick={onClose}
          tooltip="Close preview"
          className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full border-0 text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
          tabIndex={0}
        >
          <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
        </IconButton>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Profile header */}
          <div className="px-[20px] pb-[16px] pt-[24px]">
            <div className="flex items-center gap-[14px]">
              <EntityIcon text={client.iconText} size="xl" />
              <div className="min-w-0">
                <h2 className={pageTitleTextClass("truncate")}>
                  {client.displayName}
                </h2>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className={profileTabBarClass("border-b border-[var(--folk-nav-bar-border)] px-[20px]")}>
            <ProfileTabButton isActive={activeTab === "details"} onClick={() => setActiveTab("details")} label="Details" />
            <ProfileTabButton isActive={activeTab === "notes"} onClick={() => setActiveTab("notes")} label="Notes" />
          </div>

          {activeTab === "details" && (
            <div className="px-[20px] pb-[24px] pt-[4px]">
              {pf("p-first-name") && (
                <SidebarDetailRow label="First name">
                  <EditableField value={participantData.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" size="compact" />
                </SidebarDetailRow>
              )}
              {pf("p-last-name") && (
                <SidebarDetailRow label="Last name">
                  <EditableField value={participantData.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" size="compact" />
                </SidebarDetailRow>
              )}
              {pf("p-preferred-name") && (
                <SidebarDetailRow label="Preferred name">
                  <EditableField value={participantData.preferredName} onChange={(v) => onUpdateField("preferredName", v)} placeholder="Preferred name" size="compact" />
                </SidebarDetailRow>
              )}
              {pf("p-email") && (
                <SidebarDetailRow label="Emails">
                  <ContactChip value={participantData.email} onChange={(v) => onUpdateField("email", v)} placeholder="Email address" size="compact" emptyPrefix="+" />
                </SidebarDetailRow>
              )}
              {pf("p-phone") && (
                <SidebarDetailRow label="Phone numbers">
                  <ContactChip value={participantData.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Phone number" size="compact" emptyPrefix="+" />
                </SidebarDetailRow>
              )}
              <SidebarDetailRow label="Coordinator">
                {canAssignClients ? (
                  <div className="relative min-w-0 flex-1">
                    <button
                      onClick={() => setIsAssignOpen(!isAssignOpen)}
                      className="flex min-w-0 items-center gap-[6px] text-left transition-colors"
                      tabIndex={0}
                      aria-label="Assign coordinator"
                    >
                      {client.owner ? (
                        renderCoordinatorChip(client.owner)
                      ) : (
                        <span className={folkInlineAddButtonClass("compact")}>Assign coordinator</span>
                      )}
                      <ChevronDown className="h-[10px] w-[10px] shrink-0 text-folk-placeholder" strokeWidth={1.5} />
                    </button>
                    {isAssignOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAssignOpen(false)} />
                        <div className="absolute left-0 top-full z-50 mt-[4px] max-h-[200px] min-w-[220px] overflow-y-auto rounded-none border border-folk-border bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                          <button
                            type="button"
                            onClick={() => { onAssign(""); setIsAssignOpen(false) }}
                            className="flex w-full px-[12px] py-[8px] text-left text-[13px] text-[#737373] hover:bg-[#f5f5f5]"
                            tabIndex={0}
                          >
                            None
                          </button>
                          {staffNames.map((name) => {
                            const isSelected = client.owner === name
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => { onAssign(name); setIsAssignOpen(false) }}
                                className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] hover:bg-[#f5f5f5] ${isSelected ? "bg-[#fafafa] font-medium" : ""}`}
                                tabIndex={0}
                              >
                                <EntityIcon text={getCoordinatorInitials(name)} size="xsm" />
                                {name}
                              </button>
                            )
                          })}
                        </div>
                      </>
                    )}
                  </div>
                ) : client.owner ? (
                  renderCoordinatorChip(client.owner)
                ) : (
                  <span className="text-[13px] font-medium text-folk-placeholder">No coordinator</span>
                )}
              </SidebarDetailRow>
              {pf("p-primary-diagnosis") && (
                <SidebarDetailRow label="Diagnosis">
                  <MultiChip
                    value={mergeDiagnoses(participantData.primaryDiagnosis, participantData.secondaryDiagnosis)}
                    onChange={(v) => onUpdateFields(participantData.secondaryDiagnosis ? { primaryDiagnosis: v, secondaryDiagnosis: "" } : { primaryDiagnosis: v })}
                    placeholder="Add diagnosis"
                    size="compact"
                  />
                </SidebarDetailRow>
              )}
              {pf("p-ndis-number") && (
                <SidebarDetailRow label="NDIS number">
                  <ContactChip value={participantData.ndisNumber} onChange={(v) => onUpdateField("ndisNumber", v)} placeholder="NDIS number" variant="white" size="compact" emptyPrefix="+" />
                </SidebarDetailRow>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="px-[20px] py-[24px]">
              <p className="text-[13px] text-[#999999]">No notes yet.</p>
            </div>
          )}
        </div>
      </div>
    </FormModal>
  )
}
