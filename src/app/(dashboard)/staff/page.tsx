"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useStaff } from "@/lib/hooks/use-staff"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { StaffMember, StaffDetails } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow, SectionHeader } from "@/components/detail-row"
import {
  Users,
  ListFilter,
  Plus,
  SlidersHorizontal,
  ArrowUpRight,
  Table2,
  X,
  Expand,
  User,
  Mail,
  Phone,
  Smartphone,
  CalendarDays,
  Heart,
  ChevronDown,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ArrowRight,
  ArrowLeft,
  EyeOff,
  Briefcase,
  Building2,
  Clock,
  Award,
  Shield,
  MessageSquare,
} from "lucide-react"

const allPropertyColumns = [
  { key: "email", label: "Email", icon: Mail, minWidth: 220 },
  { key: "phone", label: "Phone", icon: Phone, minWidth: 160 },
  { key: "mobile", label: "Mobile", icon: Smartphone, minWidth: 160 },
  { key: "role", label: "Role", icon: Briefcase, minWidth: 160 },
  { key: "department", label: "Department", icon: Building2, minWidth: 160 },
  { key: "employmentType", label: "Employment Type", icon: Clock, minWidth: 160 },
  { key: "startDate", label: "Start Date", icon: CalendarDays, minWidth: 150 },
  { key: "endDate", label: "End Date", icon: CalendarDays, minWidth: 150 },
  { key: "status", label: "Status", icon: Shield, minWidth: 120 },
  { key: "qualifications", label: "Qualifications", icon: Award, minWidth: 200 },
  { key: "certifications", label: "Certifications", icon: Award, minWidth: 200 },
  { key: "dob", label: "Date of Birth", icon: CalendarDays, minWidth: 150 },
  { key: "gender", label: "Gender", icon: User, minWidth: 120 },
  { key: "pronouns", label: "Pronouns", icon: MessageSquare, minWidth: 120 },
  { key: "preferredName", label: "Preferred Name", icon: Heart, minWidth: 150 },
  { key: "emergencyContactName", label: "Emergency Contact", icon: Users, minWidth: 180 },
  { key: "emergencyContactPhone", label: "Emergency Phone", icon: Phone, minWidth: 160 },
]

const defaultVisibleKeys = ["email", "role", "department", "employmentType", "phone", "status"]

function StaffProfile({ member, onUpdateField, onClose }: { member: StaffMember; onUpdateField: (field: keyof StaffDetails, value: string) => void; onClose: () => void }) {
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false)
  const router = useRouter()
  const d = member.details

  return (
    <div className="h-full shrink-0 p-[10px]">
      <div className="flex h-full w-[625px] flex-col rounded-lg border border-[#dcdcdc] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
          <div className="flex min-w-0 items-center gap-[8px]">
            <EntityIcon text={member.iconText} size="sm" />
            <span className="truncate text-[13px] font-medium text-[#262626]">{member.name}</span>
            {member.status === "invited" && <span className="rounded border border-[#dcdcdc] bg-[#f5f5f5] px-[6px] py-[1px] text-[11px] font-medium text-[#888]">Invited</span>}
          </div>
          <div className="flex items-center gap-[4px]">
            <button onClick={() => router.push(`/staff/${member.id}`)} className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" aria-label="Expand" tabIndex={0}>
              <Expand className="h-[13px] w-[13px]" strokeWidth={1.75} />
            </button>
            <button onClick={onClose} className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" aria-label="Close" tabIndex={0}>
              <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="flex items-center gap-[12px] px-[20px] pb-[20px] pt-[24px]">
            <EntityIcon text={member.iconText} size="lg" />
            <div>
              <h2 className="text-[18px] font-semibold text-[#262626]">{d.preferredName || d.firstName} {d.lastName}</h2>
              {d.role && <p className="text-[13px] font-medium text-[#888]">{d.role}{d.department ? ` · ${d.department}` : ""}</p>}
            </div>
          </div>

          <div className="border-b border-[#f0f0f0] px-[20px] pb-[16px]">
            <SectionHeader title="Work Information" />
            <DetailRow icon={Briefcase} label="Role">
              <EditableField value={d.role} onChange={(v) => onUpdateField("role", v)} placeholder="Job title" />
            </DetailRow>
            <DetailRow icon={Building2} label="Department">
              <EditableField value={d.department} onChange={(v) => onUpdateField("department", v)} placeholder="Department" />
            </DetailRow>
            <DetailRow icon={Clock} label="Employment Type">
              <EditableField value={d.employmentType} onChange={(v) => onUpdateField("employmentType", v)} type="select" options={["Full-time", "Part-time", "Casual", "Contract"]} />
            </DetailRow>
            <DetailRow icon={CalendarDays} label="Start Date">
              <EditableField value={d.startDate} onChange={(v) => onUpdateField("startDate", v)} type="date" placeholder="Start date" />
            </DetailRow>
            <DetailRow icon={CalendarDays} label="End Date">
              <EditableField value={d.endDate} onChange={(v) => onUpdateField("endDate", v)} type="date" placeholder="End date" />
            </DetailRow>

            <SectionHeader title="Contact Information" />
            <DetailRow icon={Mail} label="Email">
              <ContactChip value={d.email} onChange={(v) => onUpdateField("email", v)} placeholder="Email address" />
            </DetailRow>
            <DetailRow icon={Smartphone} label="Mobile">
              <ContactChip value={d.mobile} onChange={(v) => onUpdateField("mobile", v)} placeholder="Mobile number" />
            </DetailRow>
            <DetailRow icon={Phone} label="Phone">
              <ContactChip value={d.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Phone number" />
            </DetailRow>

            {!isPersonalExpanded && (
              <button onClick={() => setIsPersonalExpanded(true)} className="mt-[8px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                <ChevronDown className="h-[12px] w-[12px]" strokeWidth={1.5} />
                <span>Show more</span>
              </button>
            )}

            {isPersonalExpanded && (
              <>
                <SectionHeader title="Personal Information" />
                <DetailRow icon={User} label="First Name">
                  <EditableField value={d.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" />
                </DetailRow>
                <DetailRow icon={User} label="Last Name">
                  <EditableField value={d.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" />
                </DetailRow>
                <DetailRow icon={Heart} label="Preferred Name">
                  <EditableField value={d.preferredName} onChange={(v) => onUpdateField("preferredName", v)} placeholder="Preferred name" />
                </DetailRow>
                <DetailRow icon={CalendarDays} label="Date of Birth">
                  <EditableField value={d.dateOfBirth} onChange={(v) => onUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" />
                </DetailRow>
                <DetailRow icon={User} label="Gender">
                  <EditableField value={d.gender} onChange={(v) => onUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} />
                </DetailRow>
                <DetailRow icon={MessageSquare} label="Pronouns">
                  <EditableField value={d.pronouns} onChange={(v) => onUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} />
                </DetailRow>

                <SectionHeader title="Qualifications" />
                <DetailRow icon={Award} label="Qualifications">
                  <EditableField value={d.qualifications} onChange={(v) => onUpdateField("qualifications", v)} placeholder="Qualifications" />
                </DetailRow>
                <DetailRow icon={Award} label="Certifications">
                  <EditableField value={d.certifications} onChange={(v) => onUpdateField("certifications", v)} placeholder="Certifications" />
                </DetailRow>

                <SectionHeader title="Emergency Contact" />
                <DetailRow icon={Users} label="Contact Name">
                  <EditableField value={d.emergencyContactName} onChange={(v) => onUpdateField("emergencyContactName", v)} placeholder="Emergency contact name" />
                </DetailRow>
                <DetailRow icon={Phone} label="Contact Phone">
                  <ContactChip value={d.emergencyContactPhone} onChange={(v) => onUpdateField("emergencyContactPhone", v)} placeholder="Emergency phone" />
                </DetailRow>

                <button onClick={() => setIsPersonalExpanded(false)} className="mt-[8px] flex items-center gap-[4px] text-[13px] font-medium text-[#888] transition-colors hover:text-[#262626]" tabIndex={0}>
                  <ChevronDown className="h-[12px] w-[12px] rotate-180" strokeWidth={1.5} />
                  <span>Show less</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface SavedView {
  id: string
  name: string
  columnKeys: string[]
  sortKey: string | null
  sortDirection: "asc" | "desc"
}

export default function StaffPage() {
  const router = useRouter()
  const { staff, updateStaff } = useStaff()
  const { staffDisabled } = useFieldConfig()
  const { canManageStaff } = usePermissions()

  const availablePropertyColumns = useMemo(
    () => allPropertyColumns.filter((col) => !staffDisabled.has(col.key)),
    [staffDisabled]
  )
  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [columnMenuKey, setColumnMenuKey] = useState<string | null>(null)
  const [columnMenuPos, setColumnMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [deleteViewConfirm, setDeleteViewConfirm] = useState<SavedView | null>(null)
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const viewNameInputRef = useRef<HTMLInputElement>(null)

  const applySavedView = useCallback((view: SavedView) => {
    setVisibleColumnKeys(view.columnKeys)
    setSortKey(view.sortKey)
    setSortDirection(view.sortDirection)
  }, [])

  const resetSavedViewState = useCallback(() => {
    setVisibleColumnKeys(defaultVisibleKeys)
    setSortKey(null)
    setSortDirection("asc")
  }, [])

  const {
    savedViews,
    activeViewId,
    createView,
    selectView,
    selectDefaultView,
    deleteView,
    syncActiveView,
  } = useSavedViews<SavedView>({
    viewsStorageKey: "staff-views",
    activeViewStorageKey: "staff-active-view",
    buildView: ({ id, name }) => ({
      id,
      name,
      columnKeys: [...visibleColumnKeys],
      sortKey,
      sortDirection,
    }),
    applyView: applySavedView,
    resetState: resetSavedViewState,
    syncView: (view) => ({
      ...view,
      columnKeys: [...visibleColumnKeys],
      sortKey,
      sortDirection,
    }),
  })

  useEffect(() => {
    syncActiveView()
  }, [sortDirection, sortKey, syncActiveView, visibleColumnKeys])

  const visibleColumns = visibleColumnKeys
    .filter((key) => !staffDisabled.has(key))
    .map((key) => allPropertyColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allPropertyColumns

  const handleToggleColumn = (key: string) => setVisibleColumnKeys((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key])

  const handleMoveColumn = (key: string, direction: "left" | "right") => {
    setVisibleColumnKeys((prev) => {
      const idx = prev.indexOf(key)
      if (idx < 0) return prev
      const newIdx = direction === "left" ? idx - 1 : idx + 1
      if (newIdx < 0 || newIdx >= prev.length) return prev
      const next = [...prev]; next[idx] = prev[newIdx]; next[newIdx] = prev[idx]
      return next
    })
    setColumnMenuKey(null); setColumnMenuPos(null)
  }

  const handleCreateView = () => {
    const createdView = createView(newViewName)
    if (!createdView) return
    setNewViewName("")
    setIsCreateViewOpen(false)
  }

  const handleSelectView = (view: SavedView) => { selectView(view) }
  const handleSelectAllView = () => { selectDefaultView() }

  const handleDeleteView = (viewId: string) => {
    deleteView(viewId)
    setDeleteViewConfirm(null)
  }

  const handleUpdateField = useCallback((memberId: string, field: keyof StaffDetails, value: string) => {
    const member = staff.find((s) => s.id === memberId)
    if (!member) return
    updateStaff(memberId, { details: { ...member.details, [field]: value } })
  }, [staff, updateStaff])

  const sortedStaff = (() => {
    if (!sortKey) return staff
    return [...staff].sort((a, b) => {
      let valA = "", valB = ""
      switch (sortKey) {
        case "name": valA = a.name; valB = b.name; break
        case "email": valA = a.details.email; valB = b.details.email; break
        case "phone": valA = a.details.phone; valB = b.details.phone; break
        case "mobile": valA = a.details.mobile; valB = b.details.mobile; break
        case "role": valA = a.details.role; valB = b.details.role; break
        case "department": valA = a.details.department; valB = b.details.department; break
        case "employmentType": valA = a.details.employmentType; valB = b.details.employmentType; break
        case "startDate": valA = a.details.startDate; valB = b.details.startDate; break
        case "endDate": valA = a.details.endDate; valB = b.details.endDate; break
        case "status": valA = a.status; valB = b.status; break
        case "qualifications": valA = a.details.qualifications; valB = b.details.qualifications; break
        case "certifications": valA = a.details.certifications; valB = b.details.certifications; break
        case "dob": valA = a.details.dateOfBirth; valB = b.details.dateOfBirth; break
        case "gender": valA = a.details.gender; valB = b.details.gender; break
        case "pronouns": valA = a.details.pronouns; valB = b.details.pronouns; break
        case "preferredName": valA = a.details.preferredName; valB = b.details.preferredName; break
        case "emergencyContactName": valA = a.details.emergencyContactName; valB = b.details.emergencyContactName; break
        case "emergencyContactPhone": valA = a.details.emergencyContactPhone; valB = b.details.emergencyContactPhone; break
      }
      const cmp = valA.localeCompare(valB)
      return sortDirection === "asc" ? cmp : -cmp
    })
  })()

  return (
    <div className="relative flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] px-[16px]">
          <div className="flex items-center gap-[8px]">
            <span className="text-[13px] font-medium text-[#262626]">Staff</span>
            <div className="h-[16px] w-px bg-[#e5e5e5]" />
            <button onClick={handleSelectAllView} className={`flex items-center gap-[6px] rounded-lg border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === null ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`} tabIndex={0}>
              <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
              <span>All</span>
            </button>
            {savedViews.length > 0 && <div className="h-[16px] w-px bg-[#dcdcdc]" />}
            {savedViews.map((view) => (
              <button
                key={view.id}
                onClick={() => handleSelectView(view)}
                onContextMenu={(e) => { e.preventDefault(); setViewContextMenu({ viewId: view.id, x: e.clientX, y: e.clientY }) }}
                className={`flex items-center gap-[6px] rounded-lg border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${activeViewId === view.id ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-transparent text-[#888] hover:bg-[#f5f5f5] hover:text-[#262626]"}`}
                tabIndex={0}
              >
                <Table2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
                <span>{view.name}</span>
              </button>
            ))}
            <button onClick={() => { setIsCreateViewOpen(true); setTimeout(() => viewNameInputRef.current?.focus(), 50) }} className="flex h-[24px] w-[24px] items-center justify-center rounded text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" aria-label="Add view" tabIndex={0}>
              <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
            </button>
          </div>
          {canManageStaff && (
            <button onClick={() => router.push("/settings/members")} className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span className="hidden sm:inline">Add staff</span>
            </button>
          )}
        </div>

        <div className="flex h-[41px] shrink-0 items-center border-b border-[#dcdcdc] px-[16px]">
          <button className="flex items-center gap-[6px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter</span>
          </button>
          <div className="ml-auto flex items-center">
            <button ref={displayBtnRef} onClick={() => setIsDisplayOpen(!isDisplayOpen)} className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}>
              <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Display</span>
            </button>
            {isDisplayOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDisplayOpen(false)} />
                <div className="fixed z-50 w-[420px] rounded-lg border border-[#dcdcdc] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={(() => { const rect = displayBtnRef.current?.getBoundingClientRect(); if (!rect) return {}; return { top: rect.bottom + 4, right: window.innerWidth - rect.right } })()}>
                  <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[20px] py-[14px]">
                    <div className="flex items-center gap-[8px] text-[13px] font-semibold text-[#262626]">
                      <ArrowUpDown className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.75} />
                      <span>Sorting</span>
                    </div>
                  </div>
                  <div className="px-[20px] pb-[16px] pt-[14px]">
                    <div className="pb-[12px] text-[13px] font-medium text-[#888]">Display properties</div>
                    <div className="flex flex-wrap gap-[8px]">
                      {availablePropertyColumns.map((col) => {
                        const isActive = visibleColumnKeys.includes(col.key)
                        return (
                          <button key={col.key} onClick={() => handleToggleColumn(col.key)} className={`inline-flex items-center rounded-lg border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"}`} tabIndex={0}>
                            {col.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                    <button onClick={() => setVisibleColumnKeys(defaultVisibleKeys)} className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]" tabIndex={0}>Reset</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#fafafa]">
          <table className="w-full border-separate border-spacing-0 text-left" style={{ tableLayout: "fixed", minWidth: (visibleColumns.length + 1) * 200 }}>
            <thead>
              <tr>
                <th className="sticky left-0 top-0 z-30 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">
                  <div className="flex items-center gap-[6px]">
                    <Users className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                    <span className="truncate">Staff member</span>
                  </div>
                </th>
                {visibleColumns.map((col, i) => {
                  const ColIcon = col.icon
                  const isLast = i === visibleColumns.length - 1
                  const isFirst = i === 0
                  const isMenuOpen = columnMenuKey === col.key
                  return (
                    <th key={col.key} className={`group/col sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888] ${isLast ? "" : "border-r"}`}>
                      <div className="flex items-center gap-[6px]">
                        <ColIcon className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                        <span className="truncate">{col.label}</span>
                        <button onClick={(e) => {
                          if (isMenuOpen) { setColumnMenuKey(null); setColumnMenuPos(null); return }
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          const dropdownWidth = 200
                          let left = rect.right - dropdownWidth
                          if (left < 8) left = 8
                          if (rect.right > window.innerWidth - 8) left = window.innerWidth - dropdownWidth - 8
                          setColumnMenuPos({ top: rect.bottom + 4, left })
                          setColumnMenuKey(col.key)
                        }} className={`ml-auto flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded transition-all ${isMenuOpen ? "bg-[#ebebeb] text-[#262626] opacity-100" : "text-[#999] opacity-0 hover:bg-[#ebebeb] hover:text-[#262626] group-hover/col:opacity-100"}`} tabIndex={0} aria-label={`Column options for ${col.label}`}>
                          <ChevronDown className="h-[12px] w-[12px]" strokeWidth={2} />
                        </button>
                      </div>
                      {isMenuOpen && columnMenuPos && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => { setColumnMenuKey(null); setColumnMenuPos(null) }} />
                          <div className="fixed z-50 w-[200px] overflow-hidden rounded-lg border border-[#dcdcdc] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]" style={{ top: columnMenuPos.top, left: columnMenuPos.left }}>
                            <button onClick={() => { setSortKey(col.key); setSortDirection("asc"); setColumnMenuKey(null); setColumnMenuPos(null) }} className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}><ArrowUp className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} /><span>Sort ascending</span></button>
                            <button onClick={() => { setSortKey(col.key); setSortDirection("desc"); setColumnMenuKey(null); setColumnMenuPos(null) }} className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}><ArrowDown className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} /><span>Sort descending</span></button>
                            <div className="my-[4px] border-t border-[#f0f0f0]" />
                            <button onClick={() => handleMoveColumn(col.key, "left")} disabled={isFirst} className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isFirst ? "text-[#bbb]" : "text-[#262626] hover:bg-[#f5f5f5]"}`} tabIndex={0}><ArrowLeft className={`h-[15px] w-[15px] ${isFirst ? "text-[#ccc]" : "text-[#888]"}`} strokeWidth={1.75} /><span>Move left</span></button>
                            <button onClick={() => handleMoveColumn(col.key, "right")} disabled={isLast} className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isLast ? "text-[#bbb]" : "text-[#262626] hover:bg-[#f5f5f5]"}`} tabIndex={0}><ArrowRight className={`h-[15px] w-[15px] ${isLast ? "text-[#ccc]" : "text-[#888]"}`} strokeWidth={1.75} /><span>Move right</span></button>
                            <div className="my-[4px] border-t border-[#f0f0f0]" />
                            <button onClick={() => { handleToggleColumn(col.key); setColumnMenuKey(null); setColumnMenuPos(null) }} className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]" tabIndex={0}><EyeOff className="h-[15px] w-[15px] text-[#888]" strokeWidth={1.75} /><span>Hide column</span></button>
                          </div>
                        </>
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((member) => {
                const isSelected = selectedMember?.id === member.id
                const rowBg = isSelected ? "bg-[#f5f5ff]" : "bg-[#fafafa]"
                const rowHover = isSelected ? "" : "group-hover:bg-[#f5f5f5]"
                const d = member.details
                const cellClass = `h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${rowBg} ${rowHover}`
                const dash = <span className="text-[#bbb]">—</span>
                const whiteChip = "inline-flex h-[28px] items-center whitespace-nowrap rounded border border-[#dcdcdc] bg-transparent px-[8px] text-[12px] font-medium text-[#262626]"

                const renderCell = (key: string, isLast: boolean) => {
                  const cls = isLast ? `h-[44px] overflow-hidden whitespace-nowrap border-b px-[20px] ${rowBg} ${rowHover}` : cellClass
                  const tCls = `${cls} text-[13px] font-medium text-[#262626]`
                  switch (key) {
                    case "email": return <td key={key} className={tCls}>{d.email || dash}</td>
                    case "phone": return <td key={key} className={tCls}>{d.phone || dash}</td>
                    case "mobile": return <td key={key} className={tCls}>{d.mobile || dash}</td>
                    case "role": return <td key={key} className={cls}>{d.role ? <span className={whiteChip}>{d.role}</span> : dash}</td>
                    case "department": return <td key={key} className={cls}>{d.department ? <span className={whiteChip}>{d.department}</span> : dash}</td>
                    case "employmentType": return <td key={key} className={cls}>{d.employmentType ? <span className={whiteChip}>{d.employmentType}</span> : dash}</td>
                    case "startDate": return <td key={key} className={tCls}>{d.startDate ? new Date(d.startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash}</td>
                    case "endDate": return <td key={key} className={tCls}>{d.endDate ? new Date(d.endDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash}</td>
                    case "status": {
                      const statusColors: Record<string, string> = { active: "text-green-600 bg-green-50 border-green-200", invited: "text-amber-600 bg-amber-50 border-amber-200", inactive: "text-[#888] bg-[#f5f5f5] border-[#dcdcdc]" }
                      return <td key={key} className={cls}><span className={`inline-flex h-[28px] items-center rounded border px-[8px] text-[12px] font-medium ${statusColors[member.status] || statusColors.active}`}>{member.status.charAt(0).toUpperCase() + member.status.slice(1)}</span></td>
                    }
                    case "qualifications": return <td key={key} className={tCls}>{d.qualifications || dash}</td>
                    case "certifications": return <td key={key} className={tCls}>{d.certifications || dash}</td>
                    case "dob": return <td key={key} className={tCls}>{d.dateOfBirth ? new Date(d.dateOfBirth + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash}</td>
                    case "gender": return <td key={key} className={tCls}>{d.gender || dash}</td>
                    case "pronouns": return <td key={key} className={tCls}>{d.pronouns || dash}</td>
                    case "preferredName": return <td key={key} className={tCls}>{d.preferredName || dash}</td>
                    case "emergencyContactName": return <td key={key} className={tCls}>{d.emergencyContactName || dash}</td>
                    case "emergencyContactPhone": return <td key={key} className={tCls}>{d.emergencyContactPhone || dash}</td>
                    default: return <td key={key} className={tCls}>{dash}</td>
                  }
                }

                return (
                  <tr key={member.id} className="group">
                    <td onClick={() => setSelectedMember(member)} className={`sticky left-0 z-10 h-[44px] cursor-pointer overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] px-[20px] ${rowBg} ${rowHover}`}>
                      <div className="flex items-center gap-[10px]">
                        <EntityIcon text={member.iconText} size="sm" />
                        <span className="truncate text-[13px] font-medium text-[#262626]">{member.name}</span>
                        {member.status === "invited" && <span className="rounded border border-amber-200 bg-amber-50 px-[5px] py-[1px] text-[10px] font-medium text-amber-600">Invited</span>}
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/staff/${member.id}`) }} className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 text-[#999] hover:bg-[#f0f0f0] hover:text-[#262626]" aria-label={`Open ${member.name} profile`} tabIndex={0}>
                          <ArrowUpRight className="h-[13px] w-[13px]" strokeWidth={1.75} />
                        </button>
                      </div>
                    </td>
                    {visibleColumns.map((col, i) => renderCell(col.key, i === visibleColumns.length - 1))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-[#999]">{staff.length} staff</span>
        </div>
      </div>

      {selectedMember && (
        <div className="absolute right-0 top-0 z-40 h-full overflow-hidden">
          <StaffProfile member={selectedMember} onUpdateField={(field, value) => handleUpdateField(selectedMember.id, field, value)} onClose={() => setSelectedMember(null)} />
        </div>
      )}

      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[#262626]">Save current view</h3>
              <button onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]" tabIndex={0} aria-label="Close"><X className="h-[16px] w-[16px]" strokeWidth={1.75} /></button>
            </div>
            <div className="mt-[20px]">
              <label className="text-[13px] font-medium text-[#888]">Name</label>
              <input ref={viewNameInputRef} value={newViewName} onChange={(e) => setNewViewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreateView() }} placeholder="Enter name here" className="mt-[8px] w-full rounded-lg border border-[#dcdcdc] bg-[#fafafa] px-[12px] py-[10px] text-[13px] font-medium text-[#262626] outline-none transition-colors placeholder:text-[#bbb] focus:border-[#a3c4f3]" />
            </div>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} className="px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:text-[#888]" tabIndex={0}>Cancel</button>
              <button onClick={handleCreateView} disabled={!newViewName.trim()} className={`rounded-lg border px-[16px] py-[6px] text-[13px] font-medium transition-colors ${newViewName.trim() ? "border-[#262626] bg-[#262626] text-white hover:bg-[#333]" : "border-[#dcdcdc] text-[#bbb]"}`} tabIndex={0}>Create</button>
            </div>
          </div>
        </>
      )}

      {viewContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setViewContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setViewContextMenu(null) }} />
          <div
            className="fixed z-50 w-[160px] overflow-hidden rounded-lg border border-[#dcdcdc] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
            style={{ top: viewContextMenu.y, left: viewContextMenu.x }}
          >
            <button
              onClick={() => {
                const view = savedViews.find((v) => v.id === viewContextMenu.viewId)
                if (view) setDeleteViewConfirm(view)
                setViewContextMenu(null)
              }}
              className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-red-500 transition-colors hover:bg-red-50"
              tabIndex={0}
            >
              <X className="h-[14px] w-[14px]" strokeWidth={1.5} />
              Delete view
            </button>
          </div>
        </>
      )}

      {deleteViewConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDeleteViewConfirm(null)} />
          <div className="relative z-10 w-[400px] rounded-lg bg-white p-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-[15px] font-semibold text-[#262626]">Delete view</h3>
            <p className="mt-[8px] text-[13px] font-medium text-[#888]">
              Are you sure you want to delete <span className="text-[#262626]">&ldquo;{deleteViewConfirm.name}&rdquo;</span>? This action cannot be undone.
            </p>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => setDeleteViewConfirm(null)}
                className="px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:text-[#888]"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteView(deleteViewConfirm.id)}
                className="rounded-lg bg-red-500 px-[16px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-red-600"
                tabIndex={0}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
