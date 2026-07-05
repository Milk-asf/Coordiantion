"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { useStaff } from "@/lib/staff-context"
import { useClients } from "@/lib/hooks/use-clients"
import { useTasks } from "@/lib/hooks/use-tasks"
import { useDocuments } from "@/lib/hooks/use-documents"
import { useNotes } from "@/lib/hooks/use-notes"
import { useCharges } from "@/lib/hooks/use-charges"
import { useInvoices } from "@/lib/hooks/use-invoices"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { StaffMember, StaffDetails, Task, Document, Attachment, Note } from "@/lib/types"
import { useWorkspace } from "@/lib/workspace-context"
import { useFieldConfig } from "@/lib/hooks/use-field-config"
import { EntityIcon } from "@/components/entity-icon"
import { StaffAccountDetails } from "@/components/profile-account-details/staff-account-details"
import { StaffActivityOverviewSummary } from "@/components/profile-account-details/staff-activity-overview-summary"
import { AccountDetailsTabBar, AccountDetailsSidebarToggle, type AccountDetailsTab } from "@/components/profile-account-details/profile-account-details-panel"
import { ProfileRecordHeader, ProfileNavTextAction } from "@/components/profile-record-header"
import { IconButton } from "@/components/icon-button"
import { ProfileTabButton } from "@/components/profile-tab-button"
import { profileMainTabScrollClass, profilePageTabBarClass, profilePageTabRowClass, folkNavIconButtonClass } from "@/components/tab-active-indicator"
import { cn } from "@/lib/utils"
import { DocumentPreview } from "@/components/document-preview"
import { DocumentSidebarForm } from "@/components/document-sidebar-form"
import { ProfileNotesTab } from "@/components/profile-notes-tab"
import { NoteEditorModal } from "@/app/(dashboard)/notes/_components/note-editor-modal"
import { useToast } from "@/components/toast"
import { saveDocumentForm, ensureFolderPath } from "@/lib/document-form"
import { FilesTab } from "@/app/(dashboard)/clients/[id]/_components/files-tab"
import { ProfileTimesheetsTab } from "@/components/profile-timesheets-tab"
import { ProfileShiftNotesTab } from "@/components/profile-shift-notes-tab"
import { useTimesheets } from "@/lib/timesheets-context"
import { useRoster } from "@/lib/hooks/use-roster"
import { formatRelativeTime } from "@/lib/hooks/use-recently-visited"
import { useListReturnBack } from "@/lib/lists/list-return"
import { mergeDiagnoses } from "@/app/(dashboard)/clients/[id]/_components/client-profile-helpers"
import { EmptyState } from "@/components/empty-state"
import { SectionToolbar } from "@/components/section-toolbar"
import { ProfileTaskListHeader } from "@/components/profile-task-list-header"
import { profileTaskGridClassName, profileTaskGridTemplate } from "@/app/(dashboard)/tasks/_components/task-helpers"
import { SuitabilityTab } from "@/components/suitability-tab"
import { getBudgetLineTotal, getBudgetUsedAmount } from "@/lib/budget-utils"
import { UsageBar } from "@/components/usage-bar"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"
import {
  FileText,
  Clock,
  Plus,
  SquarePen,
  CheckSquare,
  FolderOpen,
  Users,
  Tag,
  Building2,
  ListFilter,
  ShieldCheck,
  ClipboardList,
  LogIn,
  LogOut,
} from "lucide-react"

const tabs = [
  { key: "overview", label: "Overview", icon: FileText },
  { key: "clients", label: "Clients", icon: Users },
  { key: "suitability", label: "Suitability", icon: ShieldCheck },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "timesheets", label: "Timesheets", icon: Clock },
  { key: "shift-notes", label: "Shift notes", icon: ClipboardList },
  { key: "notes", label: "Notes", icon: SquarePen },
  { key: "files", label: "Files", icon: FolderOpen },
]

function parseTimeInput(val: string): number {
  if (!val.trim()) return 0
  const hMatch = val.match(/(\d+)\s*h/)
  const mMatch = val.match(/(\d+)\s*m/)
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0
  if (hours === 0 && mins === 0) {
    const num = parseInt(val, 10)
    return isNaN(num) ? 0 : num
  }
  return hours * 60 + mins
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0]
}

function formatTaskDate(dateStr: string | null): string {
  if (!dateStr) return ""
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + "T00:00:00")
  d.setHours(0, 0, 0, 0)
  const diff = d.getTime() - today.getTime()
  const dayMs = 86400000
  if (diff === 0) return "Today"
  if (diff === dayMs) return "Tomorrow"
  if (diff === -dayMs) return "Yesterday"
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" })
}

function StaffProfileTasksTab({
  tasks,
  chargeCode,
  onToggleComplete,
  onCreateTask,
}: {
  tasks: Task[]
  chargeCode: (itemNumber: string) => string
  onToggleComplete: (task: Task) => void
  onCreateTask?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-white">
      <SectionToolbar onAddNew={onCreateTask} />
      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Tasks assigned to this staff member will appear here."
          className="flex-1"
        />
      ) : (
      <div className="flex-1 overflow-y-auto bg-white">
        <ProfileTaskListHeader trailingIcon={Building2} trailingLabel="Client" />
        {tasks.map((task) => {
          const dateStr = formatTaskDate(task.dueDate)
          const isDone = task.status === "done"
          const clientInitials = task.client ? task.client.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2) : ""

          return (
            <div
              key={task.id}
              className={`${profileTaskGridClassName} transition-colors hover:bg-folk-hover`}
              style={{ gridTemplateColumns: profileTaskGridTemplate }}
            >
              <div className="py-[8px] text-[13px] text-folk-secondary">
                {dateStr || <span className="text-[#ccc]">—</span>}
              </div>
              <div className="min-w-0 truncate py-[8px] pl-[8px]">
                <span className={`text-[13px] ${isDone ? "text-folk-placeholder line-through" : "text-folk-text"}`}>
                  {task.title || <span className="text-[#ccc]">Untitled task</span>}
                </span>
              </div>
              <div className="flex items-center justify-center px-[4px] py-[8px] text-[12px] font-medium text-folk-secondary">
                <span className="truncate text-center">
                  {task.chargeType ? chargeCode(task.chargeType) : <span className="text-[#ccc]">—</span>}
                </span>
              </div>
              <div className="flex items-center justify-center px-[4px] py-[8px] text-[13px] text-folk-secondary">
                {task.timeSpent > 0 ? task.timeSpent : <span className="text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center py-[8px]">
                {clientInitials ? (
                  <EntityIcon text={clientInitials} size="sm" />
                ) : <span className="text-[12px] text-[#ccc]">—</span>}
              </div>
              <div className="flex items-center justify-center">
                <button
                  onClick={() => onToggleComplete(task)}
                  className="flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border border-folk-text bg-white text-folk-text transition-colors"
                  tabIndex={0}
                  aria-label={isDone ? "Mark as incomplete" : "Mark as complete"}
                >
                  {isDone && <span className="text-[9px] leading-none">✓</span>}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

function StaffIcon({ member, size = "md" }: { member: StaffMember; size?: "sm" | "md" | "lg" | "xl" }) {
  const normalizedSize = size === "md" ? "md" : size === "xl" ? "xl" : size === "lg" ? "lg" : "sm"

  return <EntityIcon text={member.iconText} size={normalizedSize} />
}

interface ActivityItem {
  id: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  content: React.ReactNode
  time: string
}

interface SortableActivityItem extends ActivityItem {
  ts: number
}

export default function StaffProfilePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { onBack: handleProfileBack, backLabel: profileBackLabel } = useListReturnBack({
    path: "/staff",
    label: "Back to staff",
  })
  const initialTab = searchParams.get("tab") || "overview"
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true)
  const [accountDetailsTab, setAccountDetailsTab] = useState<AccountDetailsTab>("details")
  const [sidebarWidth, setSidebarWidth] = useState(404)
  const { staff, isLoading, updateStaff } = useStaff()
  const { clients, clientNames, updateClient } = useClients()
  const { tasks: allTasks, updateTask, addTask } = useTasks()
  const { documents, files, uploadDocument, deleteDocument, updateDocument, replaceDocumentFile, getDownloadUrl, createFile, deleteFile } = useDocuments()
  const { allCharges, enabledCharges } = useCharges()
  const { invoices } = useInvoices()
  const { timesheets } = useTimesheets()
  const { shifts } = useRoster()
  const { canAssignClients } = usePermissions()
  const { isFieldEnabled } = useFieldConfig()
  const sf = isFieldEnabled
  const headerRef = useRef<HTMLDivElement>(null)
  const isResizing = useRef(false)

  const [isQuickAdding, setIsQuickAdding] = useState(false)
  const [quickTitle, setQuickTitle] = useState("")
  const [quickDueDate, setQuickDueDate] = useState(getTodayStr)
  const [quickTime, setQuickTime] = useState("")
  const [quickCharge, setQuickCharge] = useState("")
  const [quickClient, setQuickClient] = useState("")
  const [quickActiveField, setQuickActiveField] = useState<"title" | "client" | "charge" | "time" | null>("title")
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false)
  const [quickClientSearch, setQuickClientSearch] = useState("")
  const [quickClientIdx, setQuickClientIdx] = useState(-1)
  const [isQuickChargeOpen, setIsQuickChargeOpen] = useState(false)
  const [quickChargeSearch, setQuickChargeSearch] = useState("")
  const [quickChargeIdx, setQuickChargeIdx] = useState(-1)
  const quickInputRef = useRef<HTMLInputElement>(null)
  const quickClientInputRef = useRef<HTMLInputElement>(null)
  const quickClientListRef = useRef<HTMLDivElement>(null)
  const quickTimeRef = useRef<HTMLInputElement>(null)
  const quickChargeInputRef = useRef<HTMLInputElement>(null)
  const quickChargeListRef = useRef<HTMLDivElement>(null)
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const [isDocumentFormOpen, setIsDocumentFormOpen] = useState(false)
  const [editingDocument, setEditingDocument] = useState<Document | null>(null)
  const [docUploadFolder, setDocUploadFolder] = useState("")
  const [docName, setDocName] = useState("")
  const [docValidFrom, setDocValidFrom] = useState("")
  const [docValidTo, setDocValidTo] = useState("")
  const [docPendingFile, setDocPendingFile] = useState<File | null>(null)
  const [docValidFromPickerOpen, setDocValidFromPickerOpen] = useState(false)
  const [docValidToPickerOpen, setDocValidToPickerOpen] = useState(false)
  const [isSavingDocument, setIsSavingDocument] = useState(false)

  const [isAssignClientOpen, setIsAssignClientOpen] = useState(false)
  const [isSidebarAssignOpen, setIsSidebarAssignOpen] = useState(false)
  const [assignClientSearch, setAssignClientSearch] = useState("")
  const assignClientInputRef = useRef<HTMLInputElement>(null)
  const assignBtnRef = useRef<HTMLButtonElement>(null)
  const sidebarAssignBtnRef = useRef<HTMLButtonElement>(null)
  const sidebarAssignInputRef = useRef<HTMLInputElement>(null)

  const chargeTypes = useMemo(() => [
    { value: "", label: "No charge" },
    ...enabledCharges.map((c) => ({ value: c.itemNumber, label: c.shortName })),
  ], [enabledCharges])

  const chargeLabel = useCallback((val: string) => {
    if (!val) return ""
    const match = allCharges.find((c) => c.itemNumber === val)
    return match ? match.shortName : val
  }, [allCharges])

  useEffect(() => {
    if (quickClientIdx >= 0 && quickClientListRef.current) {
      const items = quickClientListRef.current.children
      if (items[quickClientIdx]) (items[quickClientIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [quickClientIdx])

  useEffect(() => {
    if (quickChargeIdx >= 0 && quickChargeListRef.current) {
      const items = quickChargeListRef.current.children
      if (items[quickChargeIdx]) (items[quickChargeIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [quickChargeIdx])

  const resetQuickAdd = useCallback(() => {
    setIsQuickAdding(false)
    setQuickTitle("")
    setQuickDueDate(getTodayStr())
    setQuickTime("")
    setQuickCharge("")
    setQuickClient("")
    setIsQuickClientOpen(false)
    setQuickClientSearch("")
    setQuickClientIdx(-1)
    setIsQuickChargeOpen(false)
    setQuickChargeSearch("")
    setQuickChargeIdx(-1)
    setQuickActiveField("title")
  }, [])

  const handleMouseDown = useCallback(() => {
    isResizing.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      const newWidth = window.innerWidth - e.clientX
      setSidebarWidth(Math.max(280, Math.min(600, newWidth)))
    }

    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [])

  useEffect(() => {
    if (window.innerWidth < 900 && isSidebarVisible) setIsSidebarVisible(false)
  }, [isSidebarVisible])

  const id = params.id as string
  const member = staff.find((s) => s.id === id) || null

  const memberName = member?.name ?? ""

  const { notes, addNote, updateNote, deleteNote } = useNotes()
  const { currentUserName } = useWorkspace()
  const { toast } = useToast()
  const [isCreatingNote, setIsCreatingNote] = useState(false)
  const [editorNote, setEditorNote] = useState<Note | null>(null)
  const [noteEditTitle, setNoteEditTitle] = useState("")
  const [noteEditContent, setNoteEditContent] = useState("")
  const [noteEditAttachments, setNoteEditAttachments] = useState<Attachment[]>([])
  const [noteFavorites, setNoteFavorites] = useState<string[]>(() => {
    if (typeof window === "undefined") return []
    try { return JSON.parse(localStorage.getItem("note-favorites") || "[]") } catch { return [] }
  })
  const staffNotes = useMemo(
    () => notes.filter((n) =>
      n.staffId === id || (!n.staffId && !!memberName && n.createdBy === memberName)
    ),
    [notes, id, memberName]
  )

  const staffTaskCount = useMemo(() => {
    if (!member) return 0
    return allTasks.filter((t) => t.assignee === member.name).length
  }, [allTasks, member])

  const staffTimesheets = useMemo(() => {
    if (!member) return []
    const name = member.name.trim().toLowerCase()
    return timesheets
      .filter(
        (t) =>
          !t.clockActive &&
          (t.staffId === member.id || t.submittedByName.trim().toLowerCase() === name),
      )
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [timesheets, member])

  const staffShiftNotes = useMemo(() => {
    if (!member) return []
    return shifts
      .filter((s) => s.staffId === member.id && s.progressNote)
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [shifts, member])

  const staffActivities = useMemo<ActivityItem[]>(() => {
    if (!member) return []
    const name = member.name.trim().toLowerCase()
    const items: SortableActivityItem[] = []

    for (const t of timesheets) {
      const mine = t.staffId === member.id || t.submittedByName.trim().toLowerCase() === name
      if (!mine || !t.clockedInAt) continue

      const onTs = Date.parse(t.clockedInAt)
      if (!Number.isNaN(onTs)) {
        items.push({
          id: `clock-on-${t.id}`,
          icon: LogIn,
          content: <><strong>{member.name}</strong> clocked on</>,
          time: formatRelativeTime(onTs),
          ts: onTs,
        })
      }

      if (!t.clockActive) {
        const parsedOff = Date.parse(`${t.endDate}T${t.endTime}:00`)
        const offTs = Number.isNaN(parsedOff) ? Date.parse(t.updatedAt) : parsedOff
        if (!Number.isNaN(offTs)) {
          items.push({
            id: `clock-off-${t.id}`,
            icon: LogOut,
            content: <><strong>{member.name}</strong> clocked off</>,
            time: formatRelativeTime(offTs),
            ts: offTs,
          })
        }
      }
    }

    for (const s of staffShiftNotes) {
      const note = s.progressNote
      if (!note) continue
      const parsedNote = Date.parse(note.recordedAt || "")
      const noteTs = Number.isNaN(parsedNote) ? Date.parse(`${s.date}T00:00:00`) : parsedNote
      if (Number.isNaN(noteTs)) continue
      items.push({
        id: `shift-note-${s.id}`,
        icon: ClipboardList,
        content: (
          <>
            <strong>{member.name}</strong> submitted a shift note
            {s.clientName ? <> for <strong>{s.clientName}</strong></> : null}
          </>
        ),
        time: formatRelativeTime(noteTs),
        ts: noteTs,
      })
    }

    return items
      .sort((a, b) => b.ts - a.ts)
      .map((item) => ({ id: item.id, icon: item.icon, content: item.content, time: item.time }))
  }, [member, timesheets, staffShiftNotes])

  const assignedClientCount = useMemo(() => {
    if (!member) return 0
    return clients.filter((c) => c.owner === member.name).length
  }, [clients, member])

  const getTabBadge = useCallback((tabKey: string) => {
    if (tabKey === "tasks") return staffTaskCount
    if (tabKey === "notes") return staffNotes.length
    if (tabKey === "clients") return assignedClientCount
    if (tabKey === "timesheets") return staffTimesheets.length
    if (tabKey === "shift-notes") return staffShiftNotes.length
    return undefined
  }, [staffTaskCount, staffNotes.length, assignedClientCount, staffTimesheets.length, staffShiftNotes.length])

  const openNote = useCallback((noteId: string) => {
    const note = notes.find((n) => n.id === noteId)
    if (!note) return
    setEditorNote(note)
    setNoteEditTitle(note.title)
    setNoteEditContent(note.content)
    setNoteEditAttachments(note.attachments ?? [])
  }, [notes])

  const closeNoteEditor = useCallback(() => {
    setEditorNote(null)
    setNoteEditTitle("")
    setNoteEditContent("")
    setNoteEditAttachments([])
  }, [])

  const toggleNoteFavorite = useCallback((noteId: string) => {
    setNoteFavorites((prev) => {
      const next = prev.includes(noteId) ? prev.filter((f) => f !== noteId) : [...prev, noteId]
      if (typeof window !== "undefined") localStorage.setItem("note-favorites", JSON.stringify(next))
      return next
    })
  }, [])

  const handleDeleteNote = useCallback(async (noteId: string) => {
    await deleteNote(noteId)
    if (editorNote?.id === noteId) closeNoteEditor()
  }, [deleteNote, editorNote?.id, closeNoteEditor])

  const saveAndCloseNote = useCallback(async () => {
    if (editorNote) await updateNote(editorNote.id, { title: noteEditTitle, content: noteEditContent, attachments: noteEditAttachments })
    closeNoteEditor()
  }, [editorNote, noteEditTitle, noteEditContent, noteEditAttachments, updateNote, closeNoteEditor])

  useEffect(() => {
    if (!editorNote) return
    const timeout = setTimeout(() => { updateNote(editorNote.id, { title: noteEditTitle, content: noteEditContent, attachments: noteEditAttachments }) }, 800)
    return () => clearTimeout(timeout)
  }, [noteEditTitle, noteEditContent, noteEditAttachments, editorNote, updateNote])

  const handleCreateNote = useCallback(async () => {
    if (!member || isCreatingNote) return
    setIsCreatingNote(true)
    const created = await addNote({
      title: "Untitled",
      content: "",
      clientId: null,
      clientName: "",
      staffId: member.id,
      createdBy: currentUserName,
    })
    setIsCreatingNote(false)
    if (created) {
      setEditorNote(created)
      setNoteEditTitle(created.title)
      setNoteEditContent(created.content)
      setNoteEditAttachments(created.attachments ?? [])
      return
    }
    toast("Unable to create note", "error")
  }, [member, isCreatingNote, addNote, currentUserName, toast])

  const staffFolder = memberName

  const unassignedClients = useMemo(() =>
    clients.filter((c) => c.owner !== memberName),
    [clients, memberName]
  )

  const filteredUnassignedClients = useMemo(() => {
    if (!assignClientSearch) return unassignedClients
    const q = assignClientSearch.toLowerCase()
    return unassignedClients.filter((c) => c.displayName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
  }, [unassignedClients, assignClientSearch])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-[13px] font-medium text-folk-secondary">Loading...</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-[13px] font-medium text-folk-secondary">Staff member not found</p>
          <button onClick={() => router.push("/staff")} className="mt-[8px] text-[13px] font-medium text-[#555] underline transition-colors hover:text-folk-text" tabIndex={0}>
            Back to staff
          </button>
        </div>
      </div>
    )
  }

  const d = member.details
  const activities = staffActivities
  const assignedClients = clients.filter((c) => c.owner === member.name)

  const getClientBudgetUsage = (client: (typeof clients)[number]) => {
    const budgets = client.participant.budgets || []
    const clientInvoices = invoices.filter(
      (inv) => inv.clientId === client.id || inv.clientName === client.name || inv.clientName === client.displayName
    )
    let totalBudget = 0
    let totalUsed = 0
    for (const budget of budgets) {
      totalBudget += getBudgetLineTotal(budget, enabledCharges)
      totalUsed += getBudgetUsedAmount(budget, clientInvoices)
    }
    const usagePct = totalBudget > 0 ? (totalUsed / totalBudget) * 100 : 0
    return { totalBudget, totalUsed, usagePct, hasBudget: budgets.length > 0 }
  }

  const handleUpdateField = (field: keyof StaffDetails, value: string) => {
    updateStaff(member.id, { details: { ...member.details, [field]: value } })
  }

  const staffTasks = allTasks.filter((t) => t.assignee === member.name).sort((a, b) => {
    if (a.status === "done" && b.status !== "done") return 1
    if (a.status !== "done" && b.status === "done") return -1
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate.localeCompare(b.dueDate)
  })

  const chargeCode = (itemNumber: string) => {
    const charge = allCharges.find((c) => c.itemNumber === itemNumber)
    return charge?.shortName || itemNumber
  }

  const resetDocumentForm = () => {
    setIsDocumentFormOpen(false)
    setEditingDocument(null)
    setDocUploadFolder("")
    setDocName("")
    setDocValidFrom("")
    setDocValidTo("")
    setDocPendingFile(null)
    setDocValidFromPickerOpen(false)
    setDocValidToPickerOpen(false)
    setIsSavingDocument(false)
  }

  const openCreateDocumentForm = (folder: string) => {
    ensureFolderPath(folder, createFile)
    setEditingDocument(null)
    setDocUploadFolder(folder)
    setDocName("")
    setDocValidFrom("")
    setDocValidTo("")
    setDocPendingFile(null)
    setDocValidFromPickerOpen(false)
    setDocValidToPickerOpen(false)
    setIsDocumentFormOpen(true)
    setIsSidebarVisible(true)
    setAccountDetailsTab("details")
  }

  const openDocumentForm = (doc: Document) => {
    setEditingDocument(doc)
    setDocUploadFolder("")
    setDocName(doc.name)
    setDocValidFrom(doc.validFrom || "")
    setDocValidTo(doc.validTo || "")
    setDocPendingFile(null)
    setDocValidFromPickerOpen(false)
    setDocValidToPickerOpen(false)
    setIsDocumentFormOpen(true)
    setIsSidebarVisible(true)
    setAccountDetailsTab("details")
  }

  const handleSaveDocument = async () => {
    setIsSavingDocument(true)
    try {
      const result = await saveDocumentForm({
        editingDocument,
        docPendingFile,
        docUploadFolder,
        docName,
        docValidFrom,
        docValidTo,
        uploadDocument,
        updateDocument,
        replaceDocumentFile,
        createFile,
      })

      if (!result.ok) {
        toast(result.error, "error")
        return
      }

      toast("Document saved", "success")
      resetDocumentForm()
    } finally {
      setIsSavingDocument(false)
    }
  }

  const handlePreviewDocument = () => {
    if (editingDocument) setPreviewDoc(editingDocument)
  }

  const handleDownloadDoc = async (doc: Document) => {
    const url = await getDownloadUrl(doc.storagePath)
    if (url) window.open(url, "_blank")
  }

  const openQuickAddTask = () => {
    setIsQuickAdding(true)
    setQuickActiveField("title")
    setTimeout(() => quickInputRef.current?.focus(), 50)
  }

  const handleQuickFinish = async () => {
    const title = quickTitle.trim()
    if (!title) return
    await addTask({
      title,
      description: "",
      status: "todo",
      assignee: member.name,
      client: quickClient,
      dueDate: quickDueDate || null,
      attachments: [],
      chargeType: quickCharge,
      timeSpent: quickTime ? parseTimeInput(quickTime) : 0,
    })
    resetQuickAdd()
    if (activeTab !== "tasks") setActiveTab("tasks")
  }

  const handleAssignClient = (clientId: string) => {
    updateClient(clientId, { owner: member.name })
    setIsAssignClientOpen(false)
    setIsSidebarAssignOpen(false)
    setAssignClientSearch("")
  }

  return (
    <div className="flex h-full flex-col bg-white">
      <div ref={headerRef} className="flex shrink-0 flex-col bg-white">
        <ProfileRecordHeader
          name={member.name}
          onBack={handleProfileBack}
          backLabel={profileBackLabel}
          actions={
            <ProfileNavTextAction onClick={openQuickAddTask}>
              Add task
            </ProfileNavTextAction>
          }
        />

      </div>

      <div className={profilePageTabRowClass()}>
        <div className={profilePageTabBarClass()}>
          <div className={profileMainTabScrollClass()}>
            {tabs.map((tab) => {
              const TabIcon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <ProfileTabButton
                  key={tab.key}
                  isActive={isActive}
                  onClick={() => setActiveTab(tab.key)}
                  icon={TabIcon}
                  label={tab.label}
                  badge={getTabBadge(tab.key)}
                />
              )
            })}
          </div>
          {!isSidebarVisible && (
            <AccountDetailsSidebarToggle
              isOpen={false}
              onToggle={() => setIsSidebarVisible(true)}
              openTooltip="Show staff details"
            />
          )}
        </div>
        {isSidebarVisible && (
          <div className="flex shrink-0 self-stretch border-l border-folk-border">
            <div
              onMouseDown={handleMouseDown}
              className="w-[4px] shrink-0 cursor-col-resize self-stretch transition-colors hover:bg-[var(--folk-border-subtle)]"
              aria-hidden="true"
            />
            <div className="flex h-full min-w-0 shrink-0 flex-col" style={{ width: sidebarWidth }}>
              <AccountDetailsTabBar
                activeTab={accountDetailsTab}
                onTabChange={setAccountDetailsTab}
                onHideSidebar={() => setIsSidebarVisible(false)}
                hideSidebarTooltip="Hide staff details"
                className="h-full border-b-0 px-[12px]"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Quick-add task popup */}
        {isQuickAdding && (
          <>
            <div className="fixed inset-0 z-[48]" onClick={resetQuickAdd} />
            <div className="relative z-[50] mx-[16px] mt-[4px] rounded-[6px] border border-folk-border bg-folk-surface shadow-[0_4px_24px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-[8px] px-[12px] pt-[10px]">
                <span className="flex h-[22px] items-center rounded-[6px] bg-[var(--folk-border-subtle)] px-[6px] text-[11px] font-medium text-[#555]">{member.name}</span>
              </div>
              <div className="px-[12px] pt-[6px] pb-[6px]">
                <input
                  ref={quickInputRef}
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  onFocus={() => setQuickActiveField("title")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && quickTitle.trim()) { e.preventDefault(); setQuickActiveField("client"); setTimeout(() => quickClientInputRef.current?.focus(), 50) }
                    if (e.key === "Escape") resetQuickAdd()
                    if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("client"); quickClientInputRef.current?.focus() }
                  }}
                  placeholder="Task name"
                  className="w-full text-[14px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                  autoFocus
                />
              </div>
              <div className="flex items-center gap-[6px] overflow-x-auto px-[12px] pb-[8px]">
                {/* Client picker */}
                <div className="relative">
                  {(() => {
                    const filteredClients = quickClientSearch
                      ? clientNames.filter((n) => n.toLowerCase().includes(quickClientSearch.toLowerCase()))
                      : clientNames
                    const selectClientFn = (name: string) => {
                      setQuickClient(name)
                      setIsQuickClientOpen(false)
                      setQuickClientIdx(-1)
                      setQuickClientSearch("")
                      setQuickActiveField("charge")
                      setTimeout(() => quickChargeInputRef.current?.focus(), 50)
                    }
                    return (
                      <>
                        <div className={`flex items-center gap-[5px] rounded-[6px] border px-[8px] py-[3px] transition-colors ${quickActiveField === "client" ? "border-blue-400" : "border-folk-border"}`}>
                          <Building2 className={`h-[12px] w-[12px] shrink-0 ${quickClient ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                          <input
                            ref={quickClientInputRef}
                            value={isQuickClientOpen ? quickClientSearch : quickClient}
                            onChange={(e) => { setQuickClientSearch(e.target.value); if (!isQuickClientOpen) setIsQuickClientOpen(true); setQuickClientIdx(0) }}
                            onFocus={() => { setQuickActiveField("client"); setIsQuickClientOpen(true); setQuickClientSearch(""); setQuickClientIdx(0) }}
                            onKeyDown={(e) => {
                              const totalItems = filteredClients.length
                              if (isQuickClientOpen) {
                                if (e.key === "ArrowDown") { e.preventDefault(); setQuickClientIdx((p) => (p + 1) % Math.max(totalItems, 1)) }
                                else if (e.key === "ArrowUp") { e.preventDefault(); setQuickClientIdx((p) => (p - 1 + Math.max(totalItems, 1)) % Math.max(totalItems, 1)) }
                                else if (e.key === "Enter") {
                                  e.preventDefault()
                                  if (filteredClients.length > 0) {
                                    const idx = quickClientIdx >= 0 && quickClientIdx < filteredClients.length ? quickClientIdx : 0
                                    selectClientFn(filteredClients[idx])
                                  } else selectClientFn("")
                                } else if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault()
                                  if (filteredClients.length > 0) {
                                    const idx = quickClientIdx >= 0 && quickClientIdx < filteredClients.length ? quickClientIdx : 0
                                    selectClientFn(filteredClients[idx])
                                  } else {
                                    setIsQuickClientOpen(false); setQuickClientSearch("")
                                    setQuickActiveField("charge"); setTimeout(() => quickChargeInputRef.current?.focus(), 50)
                                  }
                                }
                              } else {
                                if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("charge"); quickChargeInputRef.current?.focus() }
                              }
                              if (e.key === "Escape") {
                                if (isQuickClientOpen) { e.stopPropagation(); setIsQuickClientOpen(false); setQuickClientSearch(""); setQuickClientIdx(-1) }
                                else resetQuickAdd()
                              }
                            }}
                            placeholder="Client"
                            className="w-[80px] bg-transparent text-[12px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                          />
                        </div>
                        {isQuickClientOpen && (
                          <>
                            <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickClientOpen(false); setQuickClientIdx(-1); setQuickClientSearch("") }} />
                            <div ref={quickClientListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[180px] min-w-[200px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-lg">
                              {filteredClients.map((name, i) => (
                                <div
                                  key={name}
                                  onClick={() => selectClientFn(name)}
                                  className={`flex w-full cursor-pointer items-center gap-[8px] px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${quickClientIdx === i ? "bg-blue-50" : ""}`}
                                  role="option"
                                  aria-selected={quickClientIdx === i}
                                >
                                  <EntityIcon text={name.split(" ").filter(Boolean).map((n) => n[0]).join("").toUpperCase().slice(0, 2)} size="xsm" />
                                  {name}
                                </div>
                              ))}
                              {filteredClients.length === 0 && <div className="px-[12px] py-[6px] text-[12px] text-folk-secondary">No clients found</div>}
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Charge picker */}
                <div className="relative">
                  {(() => {
                    const filteredCharges = quickChargeSearch
                      ? chargeTypes.filter((c) => c.label.toLowerCase().includes(quickChargeSearch.toLowerCase()) || c.value.toLowerCase().includes(quickChargeSearch.toLowerCase()))
                      : chargeTypes
                    const selectChargeFn = (val: string) => {
                      setQuickCharge(val)
                      setIsQuickChargeOpen(false)
                      setQuickChargeIdx(-1)
                      setQuickChargeSearch("")
                      setQuickActiveField("time")
                      setTimeout(() => quickTimeRef.current?.focus(), 50)
                    }
                    return (
                      <>
                        <div className={`flex items-center gap-[5px] rounded-[6px] border px-[8px] py-[3px] transition-colors ${quickActiveField === "charge" ? "border-blue-400" : "border-folk-border"}`}>
                          <Tag className={`h-[12px] w-[12px] shrink-0 ${quickCharge ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                          <input
                            ref={quickChargeInputRef}
                            value={isQuickChargeOpen ? quickChargeSearch : chargeLabel(quickCharge)}
                            onChange={(e) => { setQuickChargeSearch(e.target.value); if (!isQuickChargeOpen) setIsQuickChargeOpen(true); setQuickChargeIdx(0) }}
                            onFocus={() => { setQuickActiveField("charge"); setIsQuickChargeOpen(true); setQuickChargeSearch(""); setQuickChargeIdx(0) }}
                            onKeyDown={(e) => {
                              if (isQuickChargeOpen) {
                                if (e.key === "ArrowDown") { e.preventDefault(); setQuickChargeIdx((p) => (p + 1) % Math.max(filteredCharges.length, 1)) }
                                else if (e.key === "ArrowUp") { e.preventDefault(); setQuickChargeIdx((p) => (p - 1 + Math.max(filteredCharges.length, 1)) % Math.max(filteredCharges.length, 1)) }
                                else if (e.key === "Enter") {
                                  e.preventDefault()
                                  if (filteredCharges.length > 0) {
                                    const idx = quickChargeIdx >= 0 && quickChargeIdx < filteredCharges.length ? quickChargeIdx : 0
                                    selectChargeFn(filteredCharges[idx].value)
                                  } else selectChargeFn("")
                                } else if (e.key === "Tab" && !e.shiftKey) {
                                  e.preventDefault()
                                  if (filteredCharges.length > 0 && quickChargeIdx >= 0) selectChargeFn(filteredCharges[quickChargeIdx].value)
                                  else { setIsQuickChargeOpen(false); setQuickActiveField("time"); quickTimeRef.current?.focus() }
                                }
                              } else {
                                if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); setQuickActiveField("time"); quickTimeRef.current?.focus() }
                              }
                              if (e.key === "Escape") {
                                if (isQuickChargeOpen) { e.stopPropagation(); setIsQuickChargeOpen(false); setQuickChargeSearch(""); setQuickChargeIdx(-1) }
                                else resetQuickAdd()
                              }
                            }}
                            placeholder="Charge"
                            className="w-[60px] bg-transparent text-[12px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                          />
                        </div>
                        {isQuickChargeOpen && (
                          <>
                            <div className="fixed inset-0 z-[59]" onClick={() => { setIsQuickChargeOpen(false); setQuickChargeIdx(-1); setQuickChargeSearch("") }} />
                            <div ref={quickChargeListRef} className="absolute left-0 top-full z-[60] mt-[4px] max-h-[180px] min-w-[200px] overflow-y-auto rounded-[6px] border border-folk-border bg-folk-surface py-[4px] shadow-lg">
                              {filteredCharges.map((c, i) => (
                                <div
                                  key={c.value || "__none"}
                                  onClick={() => selectChargeFn(c.value)}
                                  className={`flex w-full cursor-pointer items-center px-[12px] py-[6px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover ${quickChargeIdx === i ? "bg-blue-50" : ""}`}
                                  role="option"
                                  aria-selected={quickChargeIdx === i}
                                >
                                  {c.label}
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Time input */}
                <div className={`flex items-center gap-[5px] rounded-[6px] border px-[8px] py-[3px] transition-colors ${quickActiveField === "time" ? "border-blue-400" : "border-folk-border"}`}>
                  <Clock className={`h-[12px] w-[12px] shrink-0 ${quickTime ? "text-folk-secondary" : "text-[#ccc]"}`} strokeWidth={1.5} />
                  <input
                    ref={quickTimeRef}
                    value={quickTime}
                    onChange={(e) => setQuickTime(e.target.value)}
                    onFocus={() => setQuickActiveField("time")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) { e.preventDefault(); handleQuickFinish() }
                      if (e.key === "Escape") resetQuickAdd()
                    }}
                    placeholder="Time"
                    className="w-[50px] bg-transparent text-[12px] font-medium text-folk-text placeholder-[#ccc] outline-none"
                  />
                </div>

                <div className="ml-auto flex items-center gap-[6px]">
                  <button type="button" onClick={resetQuickAdd} className="rounded-[6px] px-[8px] py-[4px] text-[12px] font-medium text-folk-secondary transition-colors hover:bg-[var(--folk-border-subtle)]" tabIndex={0}>Cancel</button>
                  <button type="button" onClick={handleQuickFinish} disabled={!quickTitle.trim()} className="primary-btn px-[12px] py-[4px] text-[12px] font-medium transition-colors disabled:opacity-40" tabIndex={0}>Create</button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white">
          {activeTab === "clients" ? (
            <div className="relative flex h-full flex-col">
              {/* Toolbar */}
              <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
                <button
                  className="flex items-center gap-[6px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                  tabIndex={0}
                >
                  <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  <span>Filter</span>
                </button>
                {canAssignClients && (
                  <div className="relative">
                    <button
                      ref={assignBtnRef}
                      onClick={() => { setIsAssignClientOpen(!isAssignClientOpen); setTimeout(() => assignClientInputRef.current?.focus(), 50) }}
                      className="flex items-center gap-[5px] folk-pill-btn border border-folk-border px-[8px] py-[4px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                    >
                      <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                      <span>Assign client</span>
                    </button>
                    {isAssignClientOpen && (
                      <>
                        <div className="fixed inset-0 z-[49]" onClick={() => { setIsAssignClientOpen(false); setAssignClientSearch("") }} />
                        <div
                          className="absolute right-0 top-full z-[50] mt-[4px] w-[280px] overflow-hidden rounded-[6px] border border-folk-border bg-folk-surface shadow-folk"
                        >
                          <div className="border-b border-folk-border-subtle px-[12px] py-[8px]">
                            <input
                              ref={assignClientInputRef}
                              value={assignClientSearch}
                              onChange={(e) => setAssignClientSearch(e.target.value)}
                              placeholder="Search participants..."
                              className="w-full text-[13px] text-folk-text placeholder-[#ccc] outline-none"
                              autoFocus
                            />
                          </div>
                          <div className="max-h-[240px] overflow-y-auto py-[4px]">
                            {filteredUnassignedClients.length === 0 ? (
                              <p className="px-[12px] py-[8px] text-[13px] text-folk-secondary">
                                {unassignedClients.length === 0 ? "All participants are assigned" : "No matches"}
                              </p>
                            ) : filteredUnassignedClients.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => handleAssignClient(c.id)}
                                className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                                tabIndex={0}
                              >
                                <EntityIcon text={c.iconText} size="sm" />
                                <span className="truncate">{c.displayName}</span>
                                {c.owner && <span className="ml-auto shrink-0 text-[11px] text-folk-placeholder">{c.owner}</span>}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className={TABLE_FULL}>
                  <thead>
                    <tr>
                      <th className={TABLE_PANEL_HEADER_STICKY}>Client name</th>
                      <th className={TABLE_PANEL_HEADER_STICKY}>NDIS Number</th>
                      <th className={TABLE_PANEL_HEADER_STICKY}>Diagnosis</th>
                      <th className={TABLE_PANEL_HEADER_STICKY}>Email</th>
                      <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Budget usage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedClients.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="bg-folk-surface px-[20px] py-[32px] text-center text-[13px] font-medium text-folk-placeholder">
                          No clients assigned
                        </td>
                      </tr>
                    ) : assignedClients.map((client) => {
                      const initials = client.iconText
                      const budgetUsage = getClientBudgetUsage(client)
                      return (
                        <tr
                          key={client.id}
                          className="group cursor-pointer transition-colors hover:bg-folk-hover"
                          onClick={() => router.push(`/clients/${client.id}`)}
                        >
                          <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                            <div className="flex items-center gap-[8px]">
                              <EntityIcon text={initials} size="sm" />
                              {client.displayName}
                            </div>
                          </td>
                          <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                            {client.participant.ndisNumber || <span className="text-folk-placeholder">—</span>}
                          </td>
                          <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                            {mergeDiagnoses(client.participant.primaryDiagnosis, client.participant.secondaryDiagnosis) || <span className="text-folk-placeholder">—</span>}
                          </td>
                          <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                            {client.participant.email || <span className="text-folk-placeholder">—</span>}
                          </td>
                          <td className={TABLE_PANEL_CELL_LAST} onClick={(e) => e.stopPropagation()}>
                            {budgetUsage.hasBudget ? (
                              <UsageBar percent={budgetUsage.usagePct} tooltip={`$${budgetUsage.totalUsed.toLocaleString()} of $${budgetUsage.totalBudget.toLocaleString()} used`} />
                            ) : (
                              <span className="text-[13px] font-medium text-folk-placeholder">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
                <span className="text-[12px] font-medium text-folk-secondary">{assignedClients.length} {assignedClients.length === 1 ? "client" : "clients"}</span>
              </div>
            </div>
          ) : activeTab === "suitability" ? (
            <SuitabilityTab view="staff" entityId={member.id} />
          ) : activeTab === "tasks" ? (
            <StaffProfileTasksTab
              tasks={staffTasks}
              chargeCode={chargeCode}
              onToggleComplete={(task) => updateTask(task.id, { status: task.status === "done" ? "todo" : "done" })}
              onCreateTask={openQuickAddTask}
            />
          ) : activeTab === "files" ? (
            <FilesTab
              rootFolder={staffFolder}
              documents={documents}
              files={files}
              onCreateDocument={openCreateDocumentForm}
              onCreateFile={createFile}
              onDeleteFile={deleteFile}
              onDownloadDoc={handleDownloadDoc}
              onDeleteDocument={deleteDocument}
              onOpenDoc={openDocumentForm}
              onPreviewDoc={setPreviewDoc}
            />
          ) : activeTab === "timesheets" ? (
            <ProfileTimesheetsTab
              timesheets={staffTimesheets}
              emptyDescription={`Timesheets submitted by ${member.name} will appear here.`}
            />
          ) : activeTab === "shift-notes" ? (
            <ProfileShiftNotesTab
              shifts={staffShiftNotes}
              variant="staff"
              emptyDescription={`Progress notes recorded by ${member.name} will appear here.`}
            />
          ) : activeTab === "notes" ? (
            <ProfileNotesTab
              notes={staffNotes}
              onOpenNote={openNote}
              onCreateNote={handleCreateNote}
              isCreating={isCreatingNote}
              emptyDescription="Notes created by this staff member will appear here."
            />
          ) : activeTab !== "overview" ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] font-medium text-folk-placeholder">No content yet</p>
            </div>
          ) : (
          <div className="w-full px-[16px] py-[24px]">
            <StaffActivityOverviewSummary
              activities={activities}
              onViewAll={() => {
                setAccountDetailsTab("activity")
                setIsSidebarVisible(true)
              }}
            />
          </div>
          )}
        </div>
        </div>
        </div>

        {isSidebarVisible && (
          <div className="flex min-h-0 shrink-0 border-l border-folk-border">
            <div
              onMouseDown={handleMouseDown}
              className="w-[4px] shrink-0 cursor-col-resize self-stretch transition-colors hover:bg-[var(--folk-border-subtle)]"
              aria-hidden="true"
            />
            <div className="min-h-0 flex-1 overflow-y-auto bg-folk-surface" style={{ width: sidebarWidth }}>
          {isDocumentFormOpen ? (
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
              onSetName={setDocName}
              onSetValidFrom={setDocValidFrom}
              onSetValidTo={setDocValidTo}
              onSetFile={setDocPendingFile}
              onSetValidFromPickerOpen={setDocValidFromPickerOpen}
              onSetValidToPickerOpen={setDocValidToPickerOpen}
              onSave={handleSaveDocument}
              onClose={resetDocumentForm}
              onPreview={editingDocument ? handlePreviewDocument : undefined}
            />
          ) : (
          <div>
            <StaffAccountDetails
              member={member}
              d={d}
              sf={sf}
              canAssignClients={canAssignClients}
              assignedClients={assignedClients}
              unassignedClients={unassignedClients}
              filteredUnassignedClients={filteredUnassignedClients}
              activities={activities}
              isSidebarAssignOpen={isSidebarAssignOpen}
              assignClientSearch={assignClientSearch}
              sidebarAssignBtnRef={sidebarAssignBtnRef}
              sidebarAssignInputRef={sidebarAssignInputRef}
              onSetIsSidebarAssignOpen={setIsSidebarAssignOpen}
              onSetAssignClientSearch={setAssignClientSearch}
              onAssignClient={handleAssignClient}
              onUpdateField={handleUpdateField}
              activeTab={accountDetailsTab}
              onTabChange={setAccountDetailsTab}
              onHideSidebar={() => setIsSidebarVisible(false)}
              hideTabBar={isSidebarVisible}
            />
          </div>
          )}
            </div>
          </div>
        )}
      </div>

      {previewDoc && (
        <DocumentPreview
          doc={previewDoc}
          getDownloadUrl={getDownloadUrl}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      {editorNote && (
        <NoteEditorModal
          note={editorNote}
          editTitle={noteEditTitle}
          editContent={noteEditContent}
          editAttachments={noteEditAttachments}
          onEditTitle={setNoteEditTitle}
          onEditContent={setNoteEditContent}
          onEditAttachments={setNoteEditAttachments}
          onClose={closeNoteEditor}
          onSaveAndClose={saveAndCloseNote}
          onDelete={handleDeleteNote}
          onToggleFavorite={toggleNoteFavorite}
          isFavorite={noteFavorites.includes(editorNote.id)}
          currentUserName={currentUserName}
          recordIcon={{ iconText: member?.iconText || "?", name: member?.name || "Unknown" }}
        />
      )}
    </div>
  )
}
