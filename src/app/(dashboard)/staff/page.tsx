"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useStaff } from "@/lib/hooks/use-staff"
import { useClients } from "@/lib/hooks/use-clients"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { useSavedViews } from "@/lib/hooks/use-saved-views"
import { useColumnResize } from "@/lib/hooks/use-column-resize"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { StaffMember, StaffDetails } from "@/lib/types"
import { EntityIcon } from "@/components/entity-icon"
import { FloatingSidePanel, FloatingSidePanelHost } from "@/components/floating-side-panel"
import { EditableField } from "@/components/editable-field"
import { ContactChip } from "@/components/contact-chip"
import { DetailRow } from "@/components/detail-row"
import { listViewTabBarClass } from "@/components/tab-active-indicator"
import { ProfileTabButton } from "@/components/profile-tab-button"
import {
  Users,
  Plus,
  SlidersHorizontal,
  ArrowUpRight,
  Table2,
  X,
  Expand,
  User,
  Mail,
  Phone,
  CalendarDays,
  Heart,
  ChevronDown,
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
import { CategoryChip } from "@/components/category-chip"
import { CsvDropdown } from "@/components/csv-dropdown"
import { PageLoader, PageError } from "@/components/page-state"
import { TableColumnMenuPortal } from "@/components/table-column-menu-portal"
import { TableMultiFilter, uniqueNonEmpty, type TableFilterDefinition } from "@/components/table-multi-filter"
import { TableDisplayPopover } from "@/components/display-popover"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import { matchesTableSearch } from "@/lib/table-search"
import {
  emptyStaffListFilters,
  filterStaff,
  type StaffListFilterState,
} from "@/lib/staff-list-filters"
import {
  TABLE_CELL_BASE,
  TABLE_CELL_INNER,
  TABLE_CELL_LAST,
  TABLE_CHIP,
  TABLE_HEADER_CELL,
  TABLE_HEADER_CELL_LAST,
  TABLE_TEXT_CELL,
  TABLE_GRID,
  TABLE_HEADER_STICKY_EDGE,
  TABLE_CELL_STICKY_EDGE,
  TABLE_NAME_COLUMN_KEY,
  tableCellSelectionClass,
  TABLE_ROW_HOVER,
  type TableCellSelection,
} from "@/lib/table-styles"

const allPropertyColumns = [
  { key: "clients", label: "Clients", icon: Users, minWidth: 220 },
  { key: "email", label: "Email", icon: Mail, minWidth: 220 },
  { key: "phone", label: "Phone", icon: Phone, minWidth: 160 },
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

const defaultVisibleKeys = allPropertyColumns.map((col) => col.key)

function StaffProfile({ member, onUpdateField, onClose }: { member: StaffMember; onUpdateField: (field: keyof StaffDetails, value: string) => void; onClose: () => void }) {
  const { isFieldEnabled } = useFieldConfig()
  const sf = isFieldEnabled
  const [isPersonalExpanded, setIsPersonalExpanded] = useState(false)
  const router = useRouter()
  const d = member.details

  return (
    <FloatingSidePanel>
        <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-folk-nav px-[16px]">
          <div className="flex min-w-0 items-center gap-[8px]">
            <EntityIcon text={member.iconText} size="sm" />
            <span className="truncate text-[13px] font-medium text-folk-text">{member.name}</span>
            {member.status === "invited" && <span className="rounded-none border border-folk-border bg-folk-hover px-[6px] py-[1px] text-[11px] font-medium text-folk-secondary">Invited</span>}
          </div>
          <div className="flex items-center gap-[4px]">
            <button onClick={() => router.push(`/staff/${member.id}`)} className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text" aria-label="Expand" tabIndex={0}>
              <Expand className="h-[13px] w-[13px]" strokeWidth={1.75} />
            </button>
            <button onClick={onClose} className="flex h-[24px] w-[24px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text" aria-label="Close" tabIndex={0}>
              <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="flex items-center gap-[12px] px-[20px] pb-[20px] pt-[24px]">
            <EntityIcon text={member.iconText} size="lg" />
            <div>
              <h2 className="text-[18px] font-semibold text-folk-text">{d.preferredName || d.firstName} {d.lastName}</h2>
              {d.role && <p className="text-[13px] font-medium text-folk-secondary">{d.role}{d.department ? ` · ${d.department}` : ""}</p>}
            </div>
          </div>

          <div className="border-b border-folk-border-subtle px-[20px] pb-[16px]">
            <h3 className="mb-[6px] text-[12px] font-semibold text-folk-text">Work Information</h3>
            {sf("s-role") && <DetailRow label="Role" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
              <EditableField value={d.role} onChange={(v) => onUpdateField("role", v)} placeholder="Job title" size="compact" />
            </DetailRow>}
            {sf("s-department") && <DetailRow label="Department" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
              <EditableField value={d.department} onChange={(v) => onUpdateField("department", v)} placeholder="Department" size="compact" />
            </DetailRow>}
            {sf("s-employment-type") && <DetailRow label="Employment Type" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
              <EditableField value={d.employmentType} onChange={(v) => onUpdateField("employmentType", v)} type="select" options={["Full-time", "Part-time", "Casual", "Contract"]} size="compact" />
            </DetailRow>}
            {sf("s-start-date") && <DetailRow label="Start Date" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
              <EditableField value={d.startDate} onChange={(v) => onUpdateField("startDate", v)} type="date" placeholder="Start date" size="compact" />
            </DetailRow>}
            {sf("s-end-date") && <DetailRow label="End Date" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
              <EditableField value={d.endDate} onChange={(v) => onUpdateField("endDate", v)} type="date" placeholder="End date" size="compact" />
            </DetailRow>}

            <div className="my-[12px] h-px bg-[#e8e8e8]" />
            <h3 className="mb-[6px] text-[12px] font-semibold text-folk-text">Contact Information</h3>
            {sf("s-email") && <DetailRow label="Email" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
              <ContactChip value={d.email} onChange={(v) => onUpdateField("email", v)} placeholder="Email address" size="compact" emptyPrefix="+" />
            </DetailRow>}
            {sf("s-phone") && <DetailRow label="Phone" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
              <ContactChip value={d.phone} onChange={(v) => onUpdateField("phone", v)} placeholder="Phone number" size="compact" emptyPrefix="+" />
            </DetailRow>}

            {!isPersonalExpanded && (
              <button onClick={() => setIsPersonalExpanded(true)} className="mt-[8px] flex items-center gap-[4px] text-[13px] font-medium text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0}>
                <ChevronDown className="h-[12px] w-[12px]" strokeWidth={1.5} />
                <span>Show more</span>
              </button>
            )}

            {isPersonalExpanded && (
              <>
                <div className="my-[12px] h-px bg-[#e8e8e8]" />
                <h3 className="mb-[6px] text-[12px] font-semibold text-folk-text">Personal Information</h3>
                {sf("s-first-name") && <DetailRow label="First Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.firstName} onChange={(v) => onUpdateField("firstName", v)} placeholder="First name" size="compact" />
                </DetailRow>}
                {sf("s-last-name") && <DetailRow label="Last Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.lastName} onChange={(v) => onUpdateField("lastName", v)} placeholder="Last name" size="compact" />
                </DetailRow>}
                {sf("s-preferred-name") && <DetailRow label="Preferred Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.preferredName} onChange={(v) => onUpdateField("preferredName", v)} placeholder="Preferred name" size="compact" />
                </DetailRow>}
                {sf("s-date-of-birth") && <DetailRow label="Date of Birth" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.dateOfBirth} onChange={(v) => onUpdateField("dateOfBirth", v)} type="date" placeholder="Date of birth" size="compact" />
                </DetailRow>}
                {sf("s-gender") && <DetailRow label="Gender" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.gender} onChange={(v) => onUpdateField("gender", v)} type="select" options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]} size="compact" />
                </DetailRow>}
                {sf("s-pronouns") && <DetailRow label="Pronouns" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.pronouns} onChange={(v) => onUpdateField("pronouns", v)} type="select" options={["He/Him", "She/Her", "They/Them", "Other"]} size="compact" />
                </DetailRow>}

                <div className="my-[12px] h-px bg-[#e8e8e8]" />
                <h3 className="mb-[6px] text-[12px] font-semibold text-folk-text">Qualifications</h3>
                {sf("s-qualifications") && <DetailRow label="Qualifications" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.qualifications} onChange={(v) => onUpdateField("qualifications", v)} placeholder="Qualifications" size="compact" />
                </DetailRow>}
                {sf("s-certifications") && <DetailRow label="Certifications" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.certifications} onChange={(v) => onUpdateField("certifications", v)} placeholder="Certifications" size="compact" />
                </DetailRow>}

                <div className="my-[12px] h-px bg-[#e8e8e8]" />
                <h3 className="mb-[6px] text-[12px] font-semibold text-folk-text">Emergency Contact</h3>
                {sf("s-emergency-contact") && <DetailRow label="Contact Name" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <EditableField value={d.emergencyContactName} onChange={(v) => onUpdateField("emergencyContactName", v)} placeholder="Emergency contact name" size="compact" />
                </DetailRow>}
                {sf("s-emergency-phone") && <DetailRow label="Contact Phone" labelWidthClassName="w-[130px]" rowClassName="flex items-center py-[6px]">
                  <ContactChip value={d.emergencyContactPhone} onChange={(v) => onUpdateField("emergencyContactPhone", v)} placeholder="Emergency phone" size="compact" emptyPrefix="+" />
                </DetailRow>}

                <button onClick={() => setIsPersonalExpanded(false)} className="mt-[8px] flex items-center gap-[4px] text-[13px] font-medium text-folk-secondary transition-colors hover:text-folk-text" tabIndex={0}>
                  <ChevronDown className="h-[12px] w-[12px] rotate-180" strokeWidth={1.5} />
                  <span>Show less</span>
                </button>
              </>
            )}
          </div>
        </div>
    </FloatingSidePanel>
  )
}

interface SavedView {
  id: string
  name: string
  columnKeys: string[]
}

export default function StaffPage() {
  const router = useRouter()
  const { staff, isLoading, fetchError, addStaff, updateStaff, refetch } = useStaff()
  const { clients } = useClients()
  const { staffDisabled } = useFieldConfig()
  const { canManageStaff } = usePermissions()

  const availablePropertyColumns = useMemo(
    () => allPropertyColumns.filter((col) => !staffDisabled.has(col.key)),
    [staffDisabled]
  )

  const [selectedMember, setSelectedMember] = useState<StaffMember | null>(null)
  const [selectedCell, setSelectedCell] = useState<TableCellSelection | null>(null)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>(defaultVisibleKeys)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [columnMenuKey, setColumnMenuKey] = useState<string | null>(null)
  const [columnMenuPos, setColumnMenuPos] = useState<{ top: number; left: number } | null>(null)
  const [isCreateViewOpen, setIsCreateViewOpen] = useState(false)
  const [newViewName, setNewViewName] = useState("")
  const [viewContextMenu, setViewContextMenu] = useState<{ viewId: string; x: number; y: number } | null>(null)
  const [deleteViewConfirm, setDeleteViewConfirm] = useState<SavedView | null>(null)
  const [listFilters, setListFilters] = useState<StaffListFilterState>(emptyStaffListFilters)
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const viewNameInputRef = useRef<HTMLInputElement>(null)

  const applySavedView = useCallback((view: SavedView) => {
    setVisibleColumnKeys(view.columnKeys)
  }, [])

  const resetSavedViewState = useCallback(() => {
    setVisibleColumnKeys(defaultVisibleKeys)
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
    }),
    applyView: applySavedView,
    resetState: resetSavedViewState,
    syncView: (view) => ({
      ...view,
      columnKeys: [...visibleColumnKeys],
    }),
  })

  useEffect(() => {
    syncActiveView()
  }, [syncActiveView, visibleColumnKeys])

  const visibleColumns = visibleColumnKeys
    .filter((key) => !staffDisabled.has(key))
    .map((key) => allPropertyColumns.find((col) => col.key === key))
    .filter(Boolean) as typeof allPropertyColumns

  const displayFields = useMemo(
    () => availablePropertyColumns.map((col) => ({ key: col.key, label: col.label })),
    [availablePropertyColumns]
  )

  const { getWidth, handleMouseDown: handleColResize } = useColumnResize(
    visibleColumns.map((c) => c.key),
    { minWidth: 80, maxWidth: 500, defaultWidth: 200 }
  )

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

  const csvColumns = useMemo(() => [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "preferredName", label: "Preferred Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "role", label: "Role" },
    { key: "department", label: "Department" },
    { key: "employmentType", label: "Employment Type" },
    { key: "startDate", label: "Start Date" },
    { key: "qualifications", label: "Qualifications" },
    { key: "certifications", label: "Certifications" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "gender", label: "Gender" },
    { key: "pronouns", label: "Pronouns" },
    { key: "emergencyContactName", label: "Emergency Contact" },
    { key: "emergencyContactPhone", label: "Emergency Phone" },
  ], [])

  const staffTableKeyMap: Record<string, string> = useMemo(() => ({
    dob: "dateOfBirth", status: "_status",
  }), [])

  const exportCsvColumns = useMemo(() => {
    const cols: { key: string; label: string }[] = [{ key: "name", label: "Name" }]
    for (const vk of visibleColumnKeys) {
      const tableDef = allPropertyColumns.find((c) => c.key === vk)
      if (!tableDef) continue
      const csvKey = staffTableKeyMap[vk] || vk
      cols.push({ key: csvKey, label: tableDef.label })
    }
    return cols
  }, [visibleColumnKeys, staffTableKeyMap])

  const uniqueStatuses = useMemo(() => {
    const set = new Set(staff.filter((s) => s.status !== "inactive").map((s) => s.status))
    return Array.from(set).sort()
  }, [staff])

  const staffFilterDefinitions = useMemo<TableFilterDefinition[]>(() => [
    { key: "status", label: "Status", icon: Shield },
    { key: "role", label: "Role", icon: Briefcase },
    { key: "department", label: "Department", icon: Building2 },
    { key: "employmentType", label: "Employment type", icon: Clock },
    { key: "client", label: "Client", icon: Users },
  ], [])

  const staffFilterOptions = useMemo(() => ({
    status: uniqueStatuses,
    role: uniqueNonEmpty(staff.map((s) => s.details.role)),
    department: uniqueNonEmpty(staff.map((s) => s.details.department)),
    employmentType: uniqueNonEmpty(staff.map((s) => s.details.employmentType)),
    client: clients
      .filter((c) => c.status !== "archived")
      .map((c) => c.id)
      .sort((a, b) => {
        const nameA = clients.find((c) => c.id === a)?.displayName ?? ""
        const nameB = clients.find((c) => c.id === b)?.displayName ?? ""
        return nameA.localeCompare(nameB)
      }),
  }), [clients, staff, uniqueStatuses])

  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.displayName])),
    [clients]
  )

  const formatStaffFilterOption = useCallback((key: string, value: string) => {
    if (key === "client") return clientNameById.get(value) ?? value
    if (key === "status") return value.charAt(0).toUpperCase() + value.slice(1)
    return value
  }, [clientNameById])

  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setListFilters((prev) => ({ ...prev, [key]: values }))
  }, [])

  const filteredStaff = useMemo(() => {
    const filtered = filterStaff(staff, clients, listFilters)
    if (!searchQuery.trim()) return filtered
    return filtered.filter((member) =>
      matchesTableSearch(
        searchQuery,
        member.name,
        member.details.email,
        member.details.phone,
        member.details.role,
        member.details.department,
        member.details.preferredName,
        member.status
      )
    )
  }, [staff, clients, listFilters, searchQuery])

  const exportCsvData = useMemo(() =>
    filteredStaff.map((s) => {
      const row: Record<string, string> = { name: s.name }
      for (const vk of visibleColumnKeys) {
        const csvKey = staffTableKeyMap[vk] || vk
        if (csvKey === "_status") { row[csvKey] = s.status; continue }
        row[csvKey] = (s.details as unknown as Record<string, string>)[csvKey] || ""
      }
      return row
    }),
    [filteredStaff, visibleColumnKeys, staffTableKeyMap]
  )

  const handleCsvImport = useCallback(async (rows: Record<string, string>[]) => {
    for (const row of rows) {
      const firstName = row.firstName || ""
      const lastName = row.lastName || ""
      const name = [firstName, lastName].filter(Boolean).join(" ") || "Unnamed"
      await addStaff({
        name,
        iconText: name[0]?.toUpperCase() || "?",
        details: {
          firstName, lastName,
          preferredName: row.preferredName || "",
          email: row.email || "",
          phone: row.phone || "",
          role: row.role || "",
          department: row.department || "",
          employmentType: row.employmentType || "",
          startDate: row.startDate || "",
          qualifications: row.qualifications || "",
          certifications: row.certifications || "",
          dateOfBirth: row.dateOfBirth || "",
          gender: row.gender || "",
          pronouns: row.pronouns || "",
          emergencyContactName: row.emergencyContactName || "",
          emergencyContactPhone: row.emergencyContactPhone || "",
        },
      })
    }
  }, [addStaff])

  if (isLoading) return <PageLoader label="Loading staff…" />
  if (fetchError) return <PageError message="Failed to load staff" onRetry={refetch} />

  return (
    <div className="relative flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Title + primary actions */}
        <div className="flex shrink-0 items-center justify-between border-b border-folk-border bg-folk-nav px-[16px] py-[14px]">
          <h1 className="text-[16px] font-semibold leading-[1.2] tracking-[-0.02em] text-folk-text">
            Staff
          </h1>
          {canManageStaff && (
            <div className="flex items-center gap-[8px]">
              <CsvDropdown
                entityType="staff"
                columns={csvColumns}
                exportColumns={exportCsvColumns}
                data={exportCsvData}
                onImport={handleCsvImport}
              />
              <button onClick={() => router.push("/settings/members")} className="outline-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors" tabIndex={0}>
                <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span className="hidden sm:inline">Add new</span>
              </button>
            </div>
          )}
        </div>

        {/* Saved views */}
        <div className={listViewTabBarClass()}>
          <ProfileTabButton
            variant="toolbar"
            isActive={activeViewId === null}
            onClick={handleSelectAllView}
            icon={Table2}
            label="All"
          />
          {savedViews.map((view) => (
            <ProfileTabButton
              key={view.id}
              variant="toolbar"
              isActive={activeViewId === view.id}
              onClick={() => handleSelectView(view)}
              onContextMenu={(e) => { e.preventDefault(); setViewContextMenu({ viewId: view.id, x: e.clientX, y: e.clientY }) }}
              icon={Table2}
              label={view.name}
            />
          ))}
          <button
            onClick={() => { setIsCreateViewOpen(true); setTimeout(() => viewNameInputRef.current?.focus(), 50) }}
            className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
            aria-label="Add view"
            tabIndex={0}
          >
            <Plus className="h-[14px] w-[14px]" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex min-h-[41px] shrink-0 flex-wrap items-center gap-[8px] border-b border-folk-border bg-folk-nav px-[16px] py-[6px]">
          <TableMultiFilter
            filters={staffFilterDefinitions}
            values={listFilters}
            options={staffFilterOptions}
            onChange={handleFilterChange}
            formatOption={formatStaffFilterOption}
          />
          <div className="ml-auto flex shrink-0 items-center gap-[8px]">
            <ExpandableTableSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search staff…"
              ariaLabel="Search staff"
            />
            <TableDisplayPopover
              fields={displayFields}
              visibleKeys={visibleColumnKeys}
              onToggle={handleToggleColumn}
              onReset={() => setVisibleColumnKeys(defaultVisibleKeys)}
              isOpen={isDisplayOpen}
              onOpenChange={setIsDisplayOpen}
              buttonRef={displayBtnRef}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-folk-surface">
          <table className={`w-full ${TABLE_GRID}`} style={{ tableLayout: "fixed", minWidth: visibleColumns.reduce((sum, col) => sum + getWidth(col.key, col.minWidth), 240) }}>
            <thead>
              <tr>
                <th className={`sticky left-0 top-0 z-30 ${TABLE_HEADER_STICKY_EDGE}`} style={{ width: 240, minWidth: 240, maxWidth: 240 }}>
                  <div className="flex items-center gap-[6px]">
                    <Users className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <span className="truncate">Staff member</span>
                  </div>
                </th>
                {visibleColumns.map((col, i) => {
                  const ColIcon = col.icon
                  const isLast = i === visibleColumns.length - 1
                  const isFirst = i === 0
                  const isMenuOpen = columnMenuKey === col.key
                  return (
                    <th key={col.key} className={`group/col relative sticky top-0 z-20 ${isLast ? TABLE_HEADER_CELL_LAST : TABLE_HEADER_CELL}`} style={{ width: getWidth(col.key, col.minWidth) }}>
                      <div className="flex items-center gap-[6px]">
                        <ColIcon className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
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
                        }} className={`ml-auto flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-none transition-all ${isMenuOpen ? "bg-[#ebebeb] text-folk-text opacity-100" : "text-folk-secondary opacity-0 hover:bg-[#ebebeb] hover:text-folk-text group-hover/col:opacity-100"}`} tabIndex={0} aria-label={`Column options for ${col.label}`}>
                          <ChevronDown className="h-[12px] w-[12px]" strokeWidth={2} />
                        </button>
                      </div>
                      {isMenuOpen && columnMenuPos && (
                        <TableColumnMenuPortal
                          isOpen={isMenuOpen}
                          position={columnMenuPos}
                          onClose={() => { setColumnMenuKey(null); setColumnMenuPos(null) }}
                        >
                          <button onClick={() => handleMoveColumn(col.key, "left")} disabled={isFirst} className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isFirst ? "text-folk-placeholder" : "text-folk-text hover:bg-folk-hover"}`} tabIndex={0}><ArrowLeft className={`h-[15px] w-[15px] ${isFirst ? "text-[#ccc]" : "text-folk-secondary"}`} strokeWidth={1.75} /><span>Move left</span></button>
                          <button onClick={() => handleMoveColumn(col.key, "right")} disabled={isLast} className={`flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium transition-colors ${isLast ? "text-folk-placeholder" : "text-folk-text hover:bg-folk-hover"}`} tabIndex={0}><ArrowRight className={`h-[15px] w-[15px] ${isLast ? "text-[#ccc]" : "text-folk-secondary"}`} strokeWidth={1.75} /><span>Move right</span></button>
                          <div className="my-[4px] border-t border-folk-border-subtle" />
                          <button onClick={() => { handleToggleColumn(col.key); setColumnMenuKey(null); setColumnMenuPos(null) }} className="flex w-full items-center gap-[12px] px-[16px] py-[10px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover" tabIndex={0}><EyeOff className="h-[15px] w-[15px] text-folk-secondary" strokeWidth={1.75} /><span>Hide column</span></button>
                        </TableColumnMenuPortal>
                      )}
                      <div
                        onMouseDown={(e) => handleColResize(col.key, e)}
                        className="absolute right-0 top-0 z-10 h-full w-[4px] cursor-col-resize opacity-0 transition-opacity hover:bg-[#2563EB]/30 hover:opacity-100 group-hover/col:opacity-100"
                      />
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {filteredStaff.map((member) => {
                const d = member.details
                const dash = <span className="text-folk-placeholder">—</span>
                const memberClients = clients.filter((c) => c.owner === member.name)

                const getCellClass = (columnKey: string, isLast: boolean, extra = "") =>
                  [
                    isLast ? TABLE_CELL_LAST : TABLE_CELL_BASE,
                    "bg-folk-surface cursor-pointer",
                    TABLE_ROW_HOVER,
                    tableCellSelectionClass(selectedCell, member.id, columnKey),
                    extra,
                  ].filter(Boolean).join(" ")

                const handleCellClick = (columnKey: string) => {
                  setSelectedMember(member)
                  setSelectedCell({ rowId: member.id, columnKey })
                }

                const renderCell = (key: string, isLast: boolean) => {
                  const cls = getCellClass(key, isLast)
                  const onCellClick = () => handleCellClick(key)
                  const tCls = `${cls} ${TABLE_TEXT_CELL}`
                  const wrapCell = (content: React.ReactNode) => (
                    <div className={TABLE_CELL_INNER}>{content}</div>
                  )
                  switch (key) {
                    case "clients": {
                      const chipCls = getCellClass(key, isLast, "pl-[20px]")
                      if (memberClients.length === 0) return <td key={key} className={`${chipCls} pr-[20px] ${TABLE_TEXT_CELL}`} onClick={onCellClick}>{wrapCell(dash)}</td>
                      return (
                        <td key={key} className={chipCls} onClick={onCellClick}>
                          {wrapCell(memberClients.map((c) => (
                            <CategoryChip key={c.id} label={c.displayName} categoryKey={c.id} size="sm" />
                          )))}
                        </td>
                      )
                    }
                    case "email": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.email || dash)}</td>
                    case "phone": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.phone || dash)}</td>
                    case "role": return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(d.role ? <CategoryChip label={d.role} categoryKey={d.role} size="sm" /> : dash)}</td>
                    case "department": return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(d.department ? <CategoryChip label={d.department} categoryKey={d.department} size="sm" /> : dash)}</td>
                    case "employmentType": return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(d.employmentType ? <CategoryChip label={d.employmentType} categoryKey={d.employmentType} size="sm" /> : dash)}</td>
                    case "startDate": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.startDate ? new Date(d.startDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash)}</td>
                    case "endDate": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.endDate ? new Date(d.endDate + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash)}</td>
                    case "status": {
                      const statusColors: Record<string, string> = { active: "text-green-600 bg-green-50 border-green-200", invited: "text-amber-600 bg-amber-50 border-amber-200", inactive: "text-folk-secondary bg-folk-hover border-folk-border" }
                      return <td key={key} className={cls} onClick={onCellClick}>{wrapCell(<span className={`inline-flex h-[24px] shrink-0 items-center rounded-none border px-[8px] text-[12px] font-medium ${statusColors[member.status] || statusColors.active}`}>{member.status.charAt(0).toUpperCase() + member.status.slice(1)}</span>)}</td>
                    }
                    case "qualifications": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.qualifications || dash)}</td>
                    case "certifications": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.certifications || dash)}</td>
                    case "dob": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.dateOfBirth ? new Date(d.dateOfBirth + "T00:00:00").toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : dash)}</td>
                    case "gender": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.gender || dash)}</td>
                    case "pronouns": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.pronouns || dash)}</td>
                    case "preferredName": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.preferredName || dash)}</td>
                    case "emergencyContactName": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.emergencyContactName || dash)}</td>
                    case "emergencyContactPhone": return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(d.emergencyContactPhone || dash)}</td>
                    default: return <td key={key} className={tCls} onClick={onCellClick}>{wrapCell(dash)}</td>
                  }
                }

                return (
                  <tr key={member.id} className="group">
                    <td
                      onClick={() => handleCellClick(TABLE_NAME_COLUMN_KEY)}
                      className={`sticky left-0 z-20 ${TABLE_CELL_STICKY_EDGE} cursor-pointer ${TABLE_ROW_HOVER} ${tableCellSelectionClass(selectedCell, member.id, TABLE_NAME_COLUMN_KEY)}`}
                      style={{ width: 240, minWidth: 240, maxWidth: 240 }}
                    >
                      <div className={`${TABLE_CELL_INNER} gap-[10px]`}>
                        <EntityIcon text={member.iconText} size="sm" />
                        <span className="truncate text-[13px] font-medium text-folk-text">{member.name}</span>
                        {member.status === "invited" && <span className="rounded-none border border-amber-200 bg-amber-50 px-[5px] py-[1px] text-[10px] font-medium text-amber-600">Invited</span>}
                        <button onClick={(e) => { e.stopPropagation(); router.push(`/staff/${member.id}`) }} className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded-none opacity-0 transition-opacity group-hover:opacity-100 text-folk-secondary hover:bg-[var(--folk-border-subtle)] hover:text-folk-text" aria-label={`Open ${member.name} profile`} tabIndex={0}>
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

        <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
          <span className="text-[12px] font-medium text-folk-secondary">{filteredStaff.length} staff</span>
        </div>
      </div>

      {selectedMember && (
        <FloatingSidePanelHost>
          <StaffProfile member={selectedMember} onUpdateField={(field, value) => handleUpdateField(selectedMember.id, field, value)} onClose={() => { setSelectedMember(null); setSelectedCell(null) }} />
        </FloatingSidePanelHost>
      )}

      {isCreateViewOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/20" onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-none bg-folk-surface p-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-folk-text">Save current view</h3>
              <button onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} className="flex h-[28px] w-[28px] items-center justify-center rounded-none text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text" tabIndex={0} aria-label="Close"><X className="h-[16px] w-[16px]" strokeWidth={1.75} /></button>
            </div>
            <div className="mt-[20px]">
              <label className="text-[13px] font-medium text-folk-secondary">Name</label>
              <input ref={viewNameInputRef} value={newViewName} onChange={(e) => setNewViewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") handleCreateView() }} placeholder="Enter name here" className="mt-[8px] w-full rounded-none border border-folk-border bg-folk-surface px-[12px] py-[10px] text-[13px] font-medium text-folk-text outline-none transition-colors placeholder:text-folk-placeholder focus:border-[#a3c4f3]" />
            </div>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button onClick={() => { setIsCreateViewOpen(false); setNewViewName("") }} className="px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:text-folk-secondary" tabIndex={0}>Cancel</button>
              <button onClick={handleCreateView} disabled={!newViewName.trim()} className={`rounded-full px-[16px] py-[6px] text-[13px] font-medium transition-colors ${newViewName.trim() ? "primary-btn" : "border border-folk-border text-folk-placeholder"}`} tabIndex={0}>Create</button>
            </div>
          </div>
        </>
      )}

      {viewContextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setViewContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setViewContextMenu(null) }} />
          <div
            className="fixed z-50 w-[160px] overflow-hidden rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk"
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
          <div className="relative z-10 w-[400px] rounded-none bg-folk-surface p-[24px] shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h3 className="text-[15px] font-semibold text-folk-text">Delete view</h3>
            <p className="mt-[8px] text-[13px] font-medium text-folk-secondary">
              Are you sure you want to delete <span className="text-folk-text">&ldquo;{deleteViewConfirm.name}&rdquo;</span>? This action cannot be undone.
            </p>
            <div className="mt-[20px] flex items-center justify-end gap-[12px]">
              <button
                onClick={() => setDeleteViewConfirm(null)}
                className="px-[12px] py-[6px] text-[13px] font-medium text-folk-text transition-colors hover:text-folk-secondary"
                tabIndex={0}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteView(deleteViewConfirm.id)}
                className="rounded-none bg-red-500 px-[16px] py-[6px] text-[13px] font-medium text-white transition-colors hover:bg-red-600"
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
