"use client"

import { useState, useRef, useCallback, useEffect, useMemo } from "react"
import {
  FileText,
  Upload,
  Trash2,
  Download,
  FilePlus,
  Folder,
  ChevronRight,
  MoreHorizontal,
  File,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  Pencil,
  Plus,
  ListFilter,
  SlidersHorizontal,
} from "lucide-react"
import { useDocuments } from "@/lib/hooks/use-documents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { DocumentPreview } from "@/components/document-preview"
import { PageTitleBar } from "@/components/page-title-bar"
import { listViewBodyClass, listViewFilterBarClass } from "@/components/tab-active-indicator"
import { DocumentSidebarForm } from "@/components/document-sidebar-form"
import { FormModal } from "@/components/form-modal"
import { useToast } from "@/components/toast"
import { saveDocumentForm, ensureFolderPath, formatDocumentValidity } from "@/lib/document-form"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/empty-state"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ExpandableTableSearch } from "@/components/expandable-table-search"
import type { Document } from "@/lib/types"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"
import { TableDisplayPopover } from "@/components/display-popover"


const docColumnDefs = [
  { key: "name", label: "Name", width: "45%" },
  { key: "type", label: "Type", width: "15%" },
  { key: "size", label: "Size", width: "15%" },
  { key: "modified", label: "Modified", width: "20%" },
] as const

const defaultDocVisibleKeys = ["name", "type", "size", "modified"]

const displayDocFields = docColumnDefs.map((col) => ({
  key: col.key,
  label: col.label,
  locked: col.key === "name",
}))

const typeFilterOptions = [
  { key: "all", label: "All types" },
  { key: "pdf", label: "PDF" },
  { key: "image", label: "Image" },
  { key: "spreadsheet", label: "Spreadsheet" },
  { key: "video", label: "Video" },
  { key: "word", label: "Word" },
  { key: "other", label: "Other" },
] as const

function getDocTypeKey(mimeType?: string): string {
  const m = mimeType ?? ""
  if (m.includes("pdf")) return "pdf"
  if (m.startsWith("image/")) return "image"
  if (m.includes("spreadsheet") || m.includes("csv") || m.includes("excel")) return "spreadsheet"
  if (m.startsWith("video/")) return "video"
  if (m.includes("word") || m.includes("document")) return "word"
  return "other"
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ""
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
}

function getFileIcon(mimeType?: string) {
  const m = mimeType ?? ""
  if (m.startsWith("image/")) return FileImage
  if (m.includes("spreadsheet") || m.includes("csv") || m.includes("excel")) return FileSpreadsheet
  if (m.startsWith("video/")) return FileVideo
  if (m.includes("pdf")) return FileText
  return File
}

function getFileColor(mimeType?: string): string {
  const m = mimeType ?? ""
  if (m.startsWith("image/")) return "text-purple-500"
  if (m.includes("spreadsheet") || m.includes("csv") || m.includes("excel")) return "text-green-600"
  if (m.startsWith("video/")) return "text-red-500"
  if (m.includes("pdf")) return "text-red-600"
  if (m.includes("word") || m.includes("document")) return "text-blue-600"
  return "text-folk-secondary"
}

export default function DocumentsPage() {
  const { toast } = useToast()
  const {
    documents, files, isLoading,
    createFile, deleteFile, renameFile,
    uploadDocument, deleteDocument, renameDocument, updateDocument, replaceDocumentFile, getDownloadUrl,
  } = useDocuments()
  const { canManageDocuments } = usePermissions()
  const [currentPath, setCurrentPath] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ doc: Document; x: number; y: number } | null>(null)
  const [fileContextMenu, setFileContextMenu] = useState<{ path: string; name: string; x: number; y: number } | null>(null)
  const [isNewFileOpen, setIsNewFileOpen] = useState(false)
  const [newFileName, setNewFileName] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const [renamingFilePath, setRenamingFilePath] = useState<string | null>(null)
  const [renameFileValue, setRenameFileValue] = useState("")
  const [isAddNewOpen, setIsAddNewOpen] = useState(false)
  const [addNewAnchor, setAddNewAnchor] = useState<{ top: number; right: number } | null>(null)
  const [isUploadPickerOpen, setIsUploadPickerOpen] = useState(false)
  const [uploadDestination, setUploadDestination] = useState("")
  const [globalSearch, setGlobalSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([...defaultDocVisibleKeys])
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
  const [deleteDocConfirm, setDeleteDocConfirm] = useState<Document | null>(null)
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<{ path: string; name: string } | null>(null)
  const uploadPickerRef = useRef<HTMLDivElement>(null)
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const fileContextMenuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const renameFileInputRef = useRef<HTMLInputElement>(null)
  const newFileInputRef = useRef<HTMLInputElement>(null)

  const isInsideFile = currentPath !== ""

  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node))
        setContextMenu(null)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [contextMenu])

  useEffect(() => {
    if (!fileContextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (fileContextMenuRef.current && !fileContextMenuRef.current.contains(e.target as Node))
        setFileContextMenu(null)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [fileContextMenu])

  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus()
  }, [renamingId])

  useEffect(() => {
    if (renamingFilePath) renameFileInputRef.current?.focus()
  }, [renamingFilePath])

  useEffect(() => {
    if (isNewFileOpen) setTimeout(() => newFileInputRef.current?.focus(), 0)
  }, [isNewFileOpen])

  const openCreateDocumentForm = (folder: string, initialFile?: File) => {
    ensureFolderPath(folder, createFile)
    setEditingDocument(null)
    setDocUploadFolder(folder)
    setDocName(initialFile?.name || "")
    setDocValidFrom("")
    setDocValidTo("")
    setDocPendingFile(initialFile ?? null)
    setDocValidFromPickerOpen(false)
    setDocValidToPickerOpen(false)
    setIsDocumentFormOpen(true)
    setIsUploadPickerOpen(false)
    setIsAddNewOpen(false)
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

  const openAddNew = (el: HTMLElement | null) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    setAddNewAnchor({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setIsUploadPickerOpen(false)
    setIsAddNewOpen(true)
  }

  const handleUploadClick = () => {
    if (isInsideFile) {
      openCreateDocumentForm(currentPath)
    } else {
      setUploadDestination("")
      setIsUploadPickerOpen(true)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!isInsideFile) return
    const initialFile = e.dataTransfer.files?.[0]
    openCreateDocumentForm(currentPath, initialFile)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath, isInsideFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isInsideFile) return
    setIsDragOver(true)
  }, [isInsideFile])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDownload = async (doc: Document) => {
    const url = await getDownloadUrl(doc.storagePath)
    if (!url) return
    const a = document.createElement("a")
    a.href = url
    a.download = doc.name
    a.click()
  }

  const handleDelete = async (doc: Document) => {
    await deleteDocument(doc)
    setDeleteDocConfirm(null)
  }

  const handleDeleteFile = (filePath: string) => {
    deleteFile(filePath)
    setDeleteFileConfirm(null)
  }

  const handleRename = async (id: string) => {
    if (!renameValue.trim()) { setRenamingId(null); return }
    await renameDocument(id, renameValue.trim())
    setRenamingId(null)
    setContextMenu(null)
  }

  const handleCreateFile = () => {
    if (!newFileName.trim()) return
    createFile(newFileName.trim(), currentPath)
    setNewFileName("")
    setIsNewFileOpen(false)
  }

  const handleRenameFile = (oldPath: string) => {
    if (!renameFileValue.trim()) { setRenamingFilePath(null); return }
    renameFile(oldPath, renameFileValue.trim())
    setRenamingFilePath(null)
    setFileContextMenu(null)
  }

  const isGlobalSearchActive = globalSearch.trim().length > 0

  const globalSearchResults = useMemo(() => {
    if (!isGlobalSearchActive) return []
    const q = globalSearch.toLowerCase()
    let results = documents.filter((d) => d.name.toLowerCase().includes(q))
    if (typeFilter !== "all") results = results.filter((d) => getDocTypeKey(d.mimeType) === typeFilter)
    return results
  }, [documents, globalSearch, isGlobalSearchActive, typeFilter])

  const visibleDocs = useMemo(() => {
    let docs = documents.filter((d) => {
      if (d.folder !== currentPath) return false
      if (searchQuery) return d.name.toLowerCase().includes(searchQuery.toLowerCase())
      return true
    })
    if (typeFilter !== "all") docs = docs.filter((d) => getDocTypeKey(d.mimeType) === typeFilter)
    return docs
  }, [documents, currentPath, searchQuery, typeFilter])

  const childFiles = useMemo(() => {
    return files
      .filter((f) => {
        if (!currentPath) return !f.includes("/")
        return f.startsWith(currentPath + "/") && !f.slice(currentPath.length + 1).includes("/")
      })
      .map((f) => {
        const name = currentPath ? f.slice(currentPath.length + 1) : f
        return { path: f, name }
      })
  }, [files, currentPath])

  const displayDocs = isGlobalSearchActive ? globalSearchResults : visibleDocs

  const allItems: { kind: "folder" | "document"; data: { path: string; name: string } | Document }[] = isGlobalSearchActive
    ? displayDocs.map((d) => ({ kind: "document" as const, data: d }))
    : [
        ...childFiles.map((f) => ({ kind: "folder" as const, data: f })),
        ...displayDocs.map((d) => ({ kind: "document" as const, data: d })),
      ]

  const handleToggleColumn = (key: string) => {
    if (key === "name") return
    setVisibleColumnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const activeFilterLabel = typeFilterOptions.find((o) => o.key === typeFilter)?.label || "All types"

  const breadcrumbs = currentPath ? currentPath.split("/") : []

  const getFileDocCount = (filePath: string): number => {
    return documents.filter((d) => d.folder === filePath || d.folder.startsWith(filePath + "/")).length
  }

  return (
    <div className="flex h-full bg-white">
    <div
      className="flex min-w-0 flex-1 flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <PageTitleBar title="Documents" />
      {/* Header */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-folk-border-subtle bg-white px-[16px]">
        <div className="flex items-center gap-[8px]">
          {/* Breadcrumb inline */}
          <button
            onClick={() => { setCurrentPath(""); setSearchQuery(""); setGlobalSearch("") }}
            className={`text-[13px] font-medium transition-colors ${!currentPath && !isGlobalSearchActive ? "text-folk-text" : "text-folk-secondary hover:text-folk-text"}`}
            tabIndex={0}
          >
            All files
          </button>
          {isGlobalSearchActive && (
            <>
              <ChevronRight className="h-[12px] w-[12px] text-[#ccc]" strokeWidth={2} />
              <span className="text-[13px] font-medium text-folk-text">Search results</span>
            </>
          )}
          {!isGlobalSearchActive && breadcrumbs.map((crumb, i) => {
            const path = breadcrumbs.slice(0, i + 1).join("/")
            const isLast = i === breadcrumbs.length - 1
            return (
              <span key={path} className="flex items-center gap-[4px]">
                <ChevronRight className="h-[12px] w-[12px] text-[#ccc]" strokeWidth={2} />
                <button
                  onClick={() => { setCurrentPath(path); setSearchQuery("") }}
                  className={`text-[13px] font-medium transition-colors ${isLast ? "text-folk-text" : "text-folk-secondary hover:text-folk-text"}`}
                  tabIndex={0}
                >
                  {crumb}
                </button>
              </span>
            )
          })}
        </div>
        <div className="flex items-center gap-[8px]">
          {canManageDocuments && (
            <div className="relative" ref={uploadPickerRef}>
              <button
                onClick={(e) => { if (isAddNewOpen) { setIsAddNewOpen(false) } else { openAddNew(e.currentTarget) } }}
                className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                tabIndex={0}
                aria-label="Add new"
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>Add new</span>
              </button>
              {isAddNewOpen && !isUploadPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[29]" onClick={() => setIsAddNewOpen(false)} />
                  <div
                    className="fixed z-[30] w-[180px] rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk"
                    style={addNewAnchor ?? undefined}
                  >
                    <button
                      onClick={() => { setIsAddNewOpen(false); handleUploadClick() }}
                      className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                    >
                      <Upload className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                      Upload
                    </button>
                    <button
                      onClick={() => { setIsAddNewOpen(false); setIsNewFileOpen(true) }}
                      className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                      tabIndex={0}
                    >
                      <FilePlus className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                      New folder
                    </button>
                  </div>
                </>
              )}
              {isUploadPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[29]" onClick={() => { setIsUploadPickerOpen(false); setIsAddNewOpen(false) }} />
                  <div
                    className="fixed z-[30] w-[260px] overflow-hidden rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk"
                    style={addNewAnchor ?? undefined}
                  >
                    <p className="px-[12px] py-[6px] text-[11px] font-medium tracking-wide text-folk-secondary">DESTINATION</p>
                    <button
                      onClick={() => setUploadDestination("")}
                      className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${uploadDestination === "" ? "bg-folk-hover text-folk-text" : "text-[#555]"}`}
                      tabIndex={0}
                    >
                      <FileText className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.5} />
                      Root (no file)
                    </button>
                    {files.map((filePath) => {
                      const name = filePath.includes("/") ? filePath.split("/").pop() : filePath
                      return (
                        <button
                          key={filePath}
                          onClick={() => setUploadDestination(filePath)}
                          className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${uploadDestination === filePath ? "bg-folk-hover text-folk-text" : "text-[#555]"}`}
                          tabIndex={0}
                        >
                          <Folder className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.5} />
                          {name}
                        </button>
                      )
                    })}
                    <div className="mt-[4px] border-t border-folk-border-subtle px-[12px] py-[8px]">
                      <button
                        onClick={() => openCreateDocumentForm(uploadDestination)}
                        className="primary-btn flex w-full items-center justify-center gap-[5px] px-[10px] py-[6px] text-[12px] font-medium transition-colors"
                        tabIndex={0}
                      >
                        <Upload className="h-[12px] w-[12px]" strokeWidth={1.5} />
                        Continue
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar: Filter, Search, Display */}
      <div className={listViewFilterBarClass("flex-nowrap")}>
        {/* Filter */}
        <div className="relative">
          <button
            ref={filterBtnRef}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-[6px] folk-pill-btn border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${typeFilter !== "all" ? "border-blue-200 bg-blue-50 text-blue-600" : "border-folk-border text-folk-text hover:bg-folk-hover"}`}
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter{typeFilter !== "all" ? `: ${activeFilterLabel}` : ""}</span>
          </button>
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
              <div
                className="absolute left-0 top-full z-50 mt-[4px] w-[200px] overflow-hidden rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk"
              >
                <p className="px-[12px] py-[6px] text-[11px] font-medium tracking-wide text-folk-secondary">FILE TYPE</p>
                {typeFilterOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setTypeFilter(opt.key); setIsFilterOpen(false) }}
                    className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-folk-hover ${typeFilter === opt.key ? "bg-folk-hover text-folk-text" : "text-[#555]"}`}
                    tabIndex={0}
                  >
                    {opt.label}
                  </button>
                ))}
                {typeFilter !== "all" && (
                  <>
                    <div className="my-[4px] border-t border-folk-border-subtle" />
                    <button
                      onClick={() => { setTypeFilter("all"); setIsFilterOpen(false) }}
                      className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
                      tabIndex={0}
                    >
                      Clear filter
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-[8px]">
          <ExpandableTableSearch
            value={globalSearch}
            onChange={setGlobalSearch}
            placeholder="Search documents…"
            ariaLabel="Search documents"
          />
          <TableDisplayPopover
            fields={displayDocFields}
            visibleKeys={visibleColumnKeys}
            onToggle={handleToggleColumn}
            onReset={() => setVisibleColumnKeys([...defaultDocVisibleKeys])}
            isOpen={isDisplayOpen}
            onOpenChange={setIsDisplayOpen}
            buttonRef={displayBtnRef}
          />
        </div>
      </div>

      {/* Inline new file creation */}
      {isNewFileOpen && (
        <div className="flex h-[44px] shrink-0 items-center gap-[8px] border-b border-folk-border-subtle bg-white px-[20px]">
          <Folder className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
          <input
            ref={newFileInputRef}
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFile(); if (e.key === "Escape") { setIsNewFileOpen(false); setNewFileName("") } }}
            placeholder="Folder name"
            className="h-[28px] w-[200px] rounded-none border border-folk-border bg-folk-surface px-[8px] text-[12px] font-medium text-folk-text placeholder:text-folk-placeholder outline-none focus:border-[#a3c4f3]"
          />
          <button onClick={handleCreateFile} disabled={!newFileName.trim()} className="primary-btn px-[10px] py-[4px] text-[11px] font-medium disabled:opacity-40" tabIndex={0}>Create</button>
          <button onClick={() => { setIsNewFileOpen(false); setNewFileName("") }} className="text-[12px] font-medium text-folk-secondary hover:text-folk-text" tabIndex={0}>Cancel</button>
        </div>
      )}

      {/* Content */}
      <div className={listViewBodyClass(cn("relative", isDragOver && "bg-blue-50/50"))}>
        {isDragOver && isInsideFile && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-none border-2 border-dashed border-blue-400 bg-blue-50/80">
            <p className="text-[14px] font-medium text-blue-600">Drop a document here to add</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-[60px]">
            <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-folk-border border-t-[#888]" />
          </div>
        ) : allItems.length === 0 ? (
          <EmptyState
            icon={Folder}
            title={isInsideFile ? "This file is empty" : "No files yet"}
            description={isInsideFile ? "Upload documents or create a file inside" : "Create a file to organise your documents"}
            action={canManageDocuments ? { label: "Add new", onClick: (e) => openAddNew(e.currentTarget) } : undefined}
          />
        ) : (
          <table className={TABLE_FULL} style={{ tableLayout: "fixed", minWidth: 700 }}>
            <thead>
              <tr>
                <th className={`${TABLE_PANEL_HEADER_STICKY} overflow-hidden`} style={{ width: "45%" }}>
                  <div className="flex items-center gap-[6px]">
                    <FileText className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                    <span>Name</span>
                  </div>
                </th>
                {isGlobalSearchActive && (
                  <th className={`${TABLE_PANEL_HEADER_STICKY} overflow-hidden`} style={{ width: "15%" }}>
                    <div className="flex items-center gap-[6px]">
                      <Folder className="h-[13px] w-[13px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <span>Location</span>
                    </div>
                  </th>
                )}
                {visibleColumnKeys.includes("type") && (
                  <th className={`${TABLE_PANEL_HEADER_STICKY} overflow-hidden`} style={{ width: "15%" }}>
                    Type
                  </th>
                )}
                {visibleColumnKeys.includes("size") && (
                  <th className={`${TABLE_PANEL_HEADER_STICKY} overflow-hidden`} style={{ width: "15%" }}>
                    Size
                  </th>
                )}
                {visibleColumnKeys.includes("modified") && (
                  <th className={`${TABLE_PANEL_HEADER_STICKY} overflow-hidden`} style={{ width: "20%" }}>
                    Modified
                  </th>
                )}
                <th className={`${TABLE_PANEL_HEADER_STICKY_LAST} overflow-hidden`} style={{ width: "5%" }} />
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => {
                const cellBase = `${TABLE_PANEL_CELL} overflow-hidden group-hover:bg-[#fafafa]`
                const cellLast = `${TABLE_PANEL_CELL_LAST} overflow-hidden group-hover:bg-[#fafafa]`

                if (item.kind === "folder") {
                  const file = item.data as { path: string; name: string }
                  const docCount = getFileDocCount(file.path)
                  const isRenaming = renamingFilePath === file.path

                  return (
                    <tr key={`folder-${file.path}`} className="group">
                      <td
                        onClick={() => { if (!isRenaming) { setCurrentPath(file.path); setSearchQuery(""); setGlobalSearch("") } }}
                        className={`${cellBase} cursor-pointer`}
                      >
                        <div className="flex items-center gap-[10px]">
                          <Folder className="h-[16px] w-[16px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                          {isRenaming ? (
                            <input
                              ref={renameFileInputRef}
                              value={renameFileValue}
                              onChange={(e) => setRenameFileValue(e.target.value)}
                              onBlur={() => handleRenameFile(file.path)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRenameFile(file.path); if (e.key === "Escape") setRenamingFilePath(null) }}
                              className="min-w-0 flex-1 rounded-none border border-[#a3c4f3] bg-folk-surface px-[6px] py-[2px] text-[13px] font-medium text-folk-text outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="truncate text-[13px] font-medium text-folk-text">{file.name}</span>
                          )}
                        </div>
                      </td>
                      {visibleColumnKeys.includes("type") && (
                        <td className={`${cellBase} text-[13px] font-medium text-folk-secondary`}>File</td>
                      )}
                      {visibleColumnKeys.includes("size") && (
                        <td className={`${cellBase} text-[13px] font-medium text-folk-secondary`}>{docCount} {docCount === 1 ? "item" : "items"}</td>
                      )}
                      {visibleColumnKeys.includes("modified") && (
                        <td className={`${cellBase} text-[13px] font-medium text-folk-secondary`}><span className="text-folk-placeholder">—</span></td>
                      )}
                      <td className={cellLast}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFileContextMenu({ path: file.path, name: file.name, x: e.clientX, y: e.clientY }) }}
                          className="flex h-[28px] w-[28px] items-center justify-center rounded-none text-[#ccc] transition-all hover:bg-[#e8e8e8] hover:text-folk-secondary"
                          tabIndex={0}
                          aria-label="File options"
                        >
                          <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.75} />
                        </button>
                      </td>
                    </tr>
                  )
                }

                const doc = item.data as Document
                const Icon = getFileIcon(doc.mimeType)
                const color = getFileColor(doc.mimeType)
                const ext = doc.name.includes(".") ? doc.name.split(".").pop()?.toUpperCase() : "FILE"

                return (
                  <tr key={`doc-${doc.id}`} className="group">
                    <td className={cellBase}>
                      <div className="flex items-start gap-[10px]">
                        <Icon className={`mt-[2px] h-[16px] w-[16px] shrink-0 ${color}`} strokeWidth={1.75} />
                        {renamingId === doc.id ? (
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRename(doc.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleRename(doc.id); if (e.key === "Escape") setRenamingId(null) }}
                            className="min-w-0 flex-1 rounded-none border border-[#a3c4f3] bg-folk-surface px-[6px] py-[2px] text-[13px] font-medium text-folk-text outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                          />
                        ) : (
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => openDocumentForm(doc)}
                              className="block max-w-full truncate text-left text-[13px] font-medium text-folk-text transition-colors hover:text-blue-600"
                              tabIndex={0}
                            >
                              {doc.name}
                            </button>
                            {formatDocumentValidity(doc) && (
                              <p className="mt-[2px] truncate text-[11px] font-medium text-folk-secondary">{formatDocumentValidity(doc)}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    {isGlobalSearchActive && (
                      <td className={`${cellBase} text-[13px] font-medium text-folk-secondary`}>
                        {doc.folder ? (
                          <button
                            onClick={() => { setCurrentPath(doc.folder); setGlobalSearch("") }}
                            className="truncate text-[13px] font-medium text-folk-secondary transition-colors hover:text-blue-600"
                            tabIndex={0}
                          >
                            {doc.folder}
                          </button>
                        ) : (
                          <span className="text-folk-placeholder">Root</span>
                        )}
                      </td>
                    )}
                    {visibleColumnKeys.includes("type") && (
                      <td className={`${cellBase} text-[13px] font-medium text-folk-secondary`}>{ext}</td>
                    )}
                    {visibleColumnKeys.includes("size") && (
                      <td className={`${cellBase} text-[13px] font-medium text-folk-secondary`}>{formatFileSize(doc.size)}</td>
                    )}
                    {visibleColumnKeys.includes("modified") && (
                      <td className={`${cellBase} text-[13px] font-medium text-folk-secondary`}>{formatDate(doc.createdAt)}</td>
                    )}
                    <td className={`${cellLast} group-hover:bg-[#fafafa]`}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setContextMenu({ doc, x: e.clientX, y: e.clientY }) }}
                        className="flex h-[28px] w-[28px] items-center justify-center rounded-none text-[#ccc] transition-all hover:bg-[var(--folk-border-subtle)] hover:text-folk-secondary"
                        tabIndex={0}
                        aria-label="Document options"
                      >
                        <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-folk-secondary">
          {isGlobalSearchActive
            ? `${globalSearchResults.length} ${globalSearchResults.length === 1 ? "result" : "results"}`
            : `${childFiles.length} ${childFiles.length === 1 ? "file" : "files"} · ${displayDocs.length} ${displayDocs.length === 1 ? "document" : "documents"}`
          }
          {typeFilter !== "all" && ` · Filtered: ${activeFilterLabel}`}
        </span>
      </div>

      {/* Document context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-[160px] rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleDownload(contextMenu.doc)}
            className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <Download className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
            Download
          </button>
          <button
            onClick={() => { setRenamingId(contextMenu.doc.id); setRenameValue(contextMenu.doc.name); setContextMenu(null) }}
            className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <Pencil className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
            Rename
          </button>
          {canManageDocuments && (
            <>
              <div className="my-[4px] border-t border-folk-border-subtle" />
              <button
                onClick={() => {
                  setDeleteDocConfirm(contextMenu.doc)
                  setContextMenu(null)
                }}
                className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
                tabIndex={0}
              >
                <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {/* File context menu */}
      {fileContextMenu && (
        <div
          ref={fileContextMenuRef}
          className="fixed z-50 w-[160px] rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk"
          style={{ top: fileContextMenu.y, left: fileContextMenu.x }}
        >
          <button
            onClick={() => { setRenamingFilePath(fileContextMenu.path); setRenameFileValue(fileContextMenu.name); setFileContextMenu(null) }}
            className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
            tabIndex={0}
          >
            <Pencil className="h-[14px] w-[14px] text-folk-secondary" strokeWidth={1.75} />
            Rename
          </button>
          {canManageDocuments && (
            <>
              <div className="my-[4px] border-t border-folk-border-subtle" />
              <button
                onClick={() => {
                  setDeleteFileConfirm({ path: fileContextMenu.path, name: fileContextMenu.name })
                  setFileContextMenu(null)
                }}
                className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50"
                tabIndex={0}
              >
                <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.75} />
                Delete
              </button>
            </>
          )}
        </div>
      )}

      {previewDoc && (
        <DocumentPreview
          doc={previewDoc}
          getDownloadUrl={getDownloadUrl}
          onClose={() => setPreviewDoc(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteDocConfirm}
        title="Are you sure?"
        description={deleteDocConfirm ? `This will permanently delete "${deleteDocConfirm.name}". This action cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => deleteDocConfirm && handleDelete(deleteDocConfirm)}
        onCancel={() => setDeleteDocConfirm(null)}
      />

      <ConfirmDialog
        isOpen={!!deleteFileConfirm}
        title="Are you sure?"
        description={deleteFileConfirm ? `This will permanently delete the folder "${deleteFileConfirm.name}" and its contents. This action cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => deleteFileConfirm && handleDeleteFile(deleteFileConfirm.path)}
        onCancel={() => setDeleteFileConfirm(null)}
      />
    </div>

    {isDocumentFormOpen && (
      <FormModal onClose={resetDocumentForm} width={460}>
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
      </FormModal>
    )}
    </div>
  )
}
