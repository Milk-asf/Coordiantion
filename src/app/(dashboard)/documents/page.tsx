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
  X,
  Search,
  File,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  Pencil,
  Plus,
  ListFilter,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ChevronDown,
} from "lucide-react"
import { useDocuments } from "@/lib/hooks/use-documents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import { DocumentPreview } from "@/components/document-preview"
import type { Document } from "@/lib/types"

const docColumnDefs = [
  { key: "name", label: "Name", width: "45%" },
  { key: "type", label: "Type", width: "15%" },
  { key: "size", label: "Size", width: "15%" },
  { key: "modified", label: "Modified", width: "20%" },
] as const

const defaultDocVisibleKeys = ["name", "type", "size", "modified"]

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
  return "text-[#888]"
}

export default function DocumentsPage() {
  const {
    documents, files, isLoading,
    createFile, deleteFile, renameFile,
    uploadDocument, deleteDocument, renameDocument, getDownloadUrl,
  } = useDocuments()
  const { canManageDocuments } = usePermissions()
  const [currentPath, setCurrentPath] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isUploading, setIsUploading] = useState(false)
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
  const [isUploadPickerOpen, setIsUploadPickerOpen] = useState(false)
  const [uploadDestination, setUploadDestination] = useState("")
  const [globalSearch, setGlobalSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isDisplayOpen, setIsDisplayOpen] = useState(false)
  const [visibleColumnKeys, setVisibleColumnKeys] = useState<string[]>([...defaultDocVisibleKeys])
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadPickerRef = useRef<HTMLDivElement>(null)
  const displayBtnRef = useRef<HTMLButtonElement>(null)
  const filterBtnRef = useRef<HTMLButtonElement>(null)
  const globalSearchRef = useRef<HTMLInputElement>(null)
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

  const handleFileSelect = async (selectedFiles: FileList | null, destination?: string) => {
    if (!selectedFiles || selectedFiles.length === 0) return
    const dest = destination ?? currentPath
    setIsUploading(true)
    try {
      const uploads = Array.from(selectedFiles).map((f) => uploadDocument(f, dest))
      await Promise.all(uploads)
    } finally {
      setIsUploading(false)
    }
  }

  const handleUploadClick = () => {
    if (isInsideFile) {
      fileInputRef.current?.click()
    } else {
      setUploadDestination("")
      setIsUploadPickerOpen(true)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!isInsideFile) return
    handleFileSelect(e.dataTransfer.files)
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
    setContextMenu(null)
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

  const handleDeleteFile = (filePath: string) => {
    deleteFile(filePath)
    setFileContextMenu(null)
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

  const sortedDocs = useMemo(() => {
    if (!sortKey) return displayDocs
    return [...displayDocs].sort((a, b) => {
      let valA = ""
      let valB = ""
      switch (sortKey) {
        case "name": valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); break
        case "type": valA = getDocTypeKey(a.mimeType); valB = getDocTypeKey(b.mimeType); break
        case "size": return sortDirection === "asc" ? a.size - b.size : b.size - a.size
        case "modified": valA = a.createdAt; valB = b.createdAt; break
      }
      const cmp = valA.localeCompare(valB)
      return sortDirection === "asc" ? cmp : -cmp
    })
  }, [displayDocs, sortKey, sortDirection])

  const allItems: { kind: "folder" | "document"; data: { path: string; name: string } | Document }[] = isGlobalSearchActive
    ? sortedDocs.map((d) => ({ kind: "document" as const, data: d }))
    : [
        ...childFiles.map((f) => ({ kind: "folder" as const, data: f })),
        ...sortedDocs.map((d) => ({ kind: "document" as const, data: d })),
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
    <div
      className="flex h-full flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Header */}
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-[16px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-medium text-[#262626]">Documents</span>
          <div className="h-[16px] w-px bg-[#e5e5e5]" />
          {/* Breadcrumb inline */}
          <button
            onClick={() => { setCurrentPath(""); setSearchQuery(""); setGlobalSearch("") }}
            className={`text-[13px] font-medium transition-colors ${!currentPath && !isGlobalSearchActive ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
            tabIndex={0}
          >
            All files
          </button>
          {isGlobalSearchActive && (
            <>
              <ChevronRight className="h-[12px] w-[12px] text-[#ccc]" strokeWidth={2} />
              <span className="text-[13px] font-medium text-[#262626]">Search results</span>
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
                  className={`text-[13px] font-medium transition-colors ${isLast ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
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
                onClick={() => { setIsAddNewOpen(!isAddNewOpen); setIsUploadPickerOpen(false) }}
                className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
                tabIndex={0}
                aria-label="Add new"
              >
                <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>Add new</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (isInsideFile) {
                    handleFileSelect(e.target.files)
                  } else {
                    handleFileSelect(e.target.files, uploadDestination)
                  }
                  e.target.value = ""
                  setIsUploadPickerOpen(false)
                  setIsAddNewOpen(false)
                }}
              />
              {isAddNewOpen && !isUploadPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[29]" onClick={() => setIsAddNewOpen(false)} />
                  <div className="absolute right-0 top-full z-[30] mt-[4px] w-[180px] rounded-[6px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    <button
                      onClick={() => { setIsAddNewOpen(false); handleUploadClick() }}
                      className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      <Upload className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                      Upload
                    </button>
                    <button
                      onClick={() => { setIsAddNewOpen(false); setIsNewFileOpen(true) }}
                      className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      <FilePlus className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                      New file
                    </button>
                  </div>
                </>
              )}
              {isUploadPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[29]" onClick={() => { setIsUploadPickerOpen(false); setIsAddNewOpen(false) }} />
                  <div className="absolute right-0 top-full z-[30] mt-[4px] w-[260px] overflow-hidden rounded-[6px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                    <p className="px-[12px] py-[6px] text-[11px] font-medium tracking-wide text-[#999]">DESTINATION</p>
                    <button
                      onClick={() => setUploadDestination("")}
                      className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${uploadDestination === "" ? "bg-[#f5f5f5] text-[#262626]" : "text-[#555]"}`}
                      tabIndex={0}
                    >
                      <FileText className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.5} />
                      Root (no file)
                    </button>
                    {files.map((filePath) => {
                      const name = filePath.includes("/") ? filePath.split("/").pop() : filePath
                      return (
                        <button
                          key={filePath}
                          onClick={() => setUploadDestination(filePath)}
                          className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${uploadDestination === filePath ? "bg-[#f5f5f5] text-[#262626]" : "text-[#555]"}`}
                          tabIndex={0}
                        >
                          <Folder className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.5} />
                          {name}
                        </button>
                      )
                    })}
                    <div className="mt-[4px] border-t border-[#f0f0f0] px-[12px] py-[8px]">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex w-full items-center justify-center gap-[5px] rounded bg-[#262626] px-[10px] py-[6px] text-[12px] font-medium text-white transition-colors hover:bg-[#3d3d3d]"
                        tabIndex={0}
                      >
                        <Upload className="h-[12px] w-[12px]" strokeWidth={1.5} />
                        Choose files
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
      <div className="flex h-[41px] shrink-0 items-center gap-[8px] border-b border-[#dcdcdc] px-[16px]">
        {/* Filter */}
        <div className="relative">
          <button
            ref={filterBtnRef}
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-[6px] rounded border px-[8px] py-[4px] text-[13px] font-medium transition-colors ${typeFilter !== "all" ? "border-blue-200 bg-blue-50 text-blue-600" : "border-[#dcdcdc] text-[#262626] hover:bg-[#f5f5f5]"}`}
            tabIndex={0}
          >
            <ListFilter className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Filter{typeFilter !== "all" ? `: ${activeFilterLabel}` : ""}</span>
          </button>
          {isFilterOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsFilterOpen(false)} />
              <div
                className="absolute left-0 top-full z-50 mt-[4px] w-[200px] overflow-hidden rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
              >
                <p className="px-[12px] py-[6px] text-[11px] font-medium tracking-wide text-[#999]">FILE TYPE</p>
                {typeFilterOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => { setTypeFilter(opt.key); setIsFilterOpen(false) }}
                    className={`flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium transition-colors hover:bg-[#f5f5f5] ${typeFilter === opt.key ? "bg-[#f5f5f5] text-[#262626]" : "text-[#555]"}`}
                    tabIndex={0}
                  >
                    {opt.label}
                  </button>
                ))}
                {typeFilter !== "all" && (
                  <>
                    <div className="my-[4px] border-t border-[#f0f0f0]" />
                    <button
                      onClick={() => { setTypeFilter("all"); setIsFilterOpen(false) }}
                      className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[13px] font-medium text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
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

        {/* Global search */}
        <div className="flex h-[32px] flex-1 items-center gap-[6px] rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px]">
          <Search className="h-[14px] w-[14px] shrink-0 text-[#bbb]" strokeWidth={1.75} />
          <input
            ref={globalSearchRef}
            type="text"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            placeholder="Search all documents..."
            className="min-w-0 flex-1 bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
          />
          {globalSearch && (
            <button onClick={() => setGlobalSearch("")} className="text-[#bbb] hover:text-[#888]" tabIndex={0} aria-label="Clear search">
              <X className="h-[12px] w-[12px]" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Display */}
        <div className="relative ml-auto">
          <button
            ref={displayBtnRef}
            onClick={() => setIsDisplayOpen(!isDisplayOpen)}
            className="flex items-center gap-[5px] rounded border border-[#dcdcdc] px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <SlidersHorizontal className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Display</span>
          </button>
          {isDisplayOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDisplayOpen(false)} />
              <div
                className="fixed z-50 w-[380px] rounded-lg border border-[#dcdcdc] bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
                style={(() => {
                  const rect = displayBtnRef.current?.getBoundingClientRect()
                  if (!rect) return {}
                  return { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                })()}
              >
                <div className="flex items-center justify-between border-b border-[#f0f0f0] px-[20px] py-[14px]">
                  <div className="flex items-center gap-[8px] text-[13px] font-semibold text-[#262626]">
                    <ArrowUpDown className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.75} />
                    <span>Sorting</span>
                  </div>
                  <div className="flex items-center gap-[6px]">
                    <button
                      onClick={() => {
                        const keys = ["name", "type", "size", "modified"]
                        const currentIdx = sortKey ? keys.indexOf(sortKey) : -1
                        const nextIdx = (currentIdx + 1) % keys.length
                        setSortKey(keys[nextIdx])
                      }}
                      className="flex items-center gap-[6px] rounded-[4px] border border-[#dcdcdc] px-[12px] py-[6px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      <span>{sortKey ? docColumnDefs.find((c) => c.key === sortKey)?.label || "Name" : "Name"}</span>
                      <ChevronDown className="h-[12px] w-[12px] text-[#888]" strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => setSortDirection((d) => d === "asc" ? "desc" : "asc")}
                      className="flex h-[32px] w-[32px] items-center justify-center rounded-[4px] border border-[#dcdcdc] text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                      aria-label={sortDirection === "asc" ? "Sort ascending" : "Sort descending"}
                    >
                      {sortDirection === "asc" ? (
                        <ArrowUp className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      ) : (
                        <ArrowDown className="h-[14px] w-[14px]" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                </div>

                <div className="px-[20px] pb-[16px] pt-[14px]">
                  <div className="pb-[12px] text-[13px] font-medium text-[#888]">Display properties</div>
                  <div className="flex flex-wrap gap-[8px]">
                    {docColumnDefs.map((col) => {
                      const isActive = visibleColumnKeys.includes(col.key)
                      const isName = col.key === "name"
                      return (
                        <button
                          key={col.key}
                          onClick={() => handleToggleColumn(col.key)}
                          disabled={isName}
                          className={`inline-flex items-center rounded-[4px] border px-[10px] py-[5px] text-[12px] font-medium transition-colors ${isActive ? "border-[#e0e0e0] bg-[#f0f0f0] text-[#262626]" : "border-[#dcdcdc] bg-transparent text-[#262626] hover:bg-[#f5f5f5]"} ${isName ? "cursor-default opacity-60" : ""}`}
                          tabIndex={0}
                        >
                          {col.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-[20px] border-t border-[#f0f0f0] px-[20px] py-[12px]">
                  <button
                    onClick={() => { setVisibleColumnKeys([...defaultDocVisibleKeys]); setSortKey(null); setSortDirection("asc") }}
                    className="text-[13px] font-medium text-[#bbb] transition-colors hover:text-[#262626]"
                    tabIndex={0}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inline new file creation */}
      {isNewFileOpen && (
        <div className="flex h-[44px] shrink-0 items-center gap-[8px] border-b border-[#f0f0f0] bg-[#fafafa] px-[20px]">
          <Folder className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.75} />
          <input
            ref={newFileInputRef}
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateFile(); if (e.key === "Escape") { setIsNewFileOpen(false); setNewFileName("") } }}
            placeholder="File name"
            className="h-[28px] w-[200px] rounded border border-[#dcdcdc] bg-[#fafafa] px-[8px] text-[12px] font-medium text-[#262626] placeholder-[#bbb] outline-none focus:border-[#a3c4f3]"
          />
          <button onClick={handleCreateFile} disabled={!newFileName.trim()} className="rounded bg-[#262626] px-[10px] py-[4px] text-[11px] font-medium text-white hover:bg-[#3d3d3d] disabled:opacity-40" tabIndex={0}>Create</button>
          <button onClick={() => { setIsNewFileOpen(false); setNewFileName("") }} className="text-[12px] font-medium text-[#888] hover:text-[#262626]" tabIndex={0}>Cancel</button>
        </div>
      )}

      {/* Content */}
      <div className={`relative flex-1 overflow-auto bg-[#fafafa] ${isDragOver ? "bg-blue-50/50" : ""}`}>
        {isDragOver && isInsideFile && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50/80">
            <p className="text-[14px] font-medium text-blue-600">Drop documents here to upload</p>
          </div>
        )}

        {isUploading && (
          <div className="mx-[20px] mt-[12px] flex items-center gap-[8px] rounded-lg border border-blue-200 bg-blue-50 px-[14px] py-[10px]">
            <div className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <span className="text-[13px] font-medium text-blue-700">Uploading...</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-[60px]">
            <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[#dcdcdc] border-t-[#888]" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-[80px]">
            <div className="mb-[16px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#f0f0f0]">
              <Folder className="h-[24px] w-[24px] text-[#bbb]" strokeWidth={1.5} />
            </div>
            <p className="text-[14px] font-medium text-[#262626]">{isInsideFile ? "This file is empty" : "No files yet"}</p>
            <p className="mt-[4px] text-[13px] text-[#888]">{isInsideFile ? "Upload documents or create a file inside" : "Create a file to organise your documents"}</p>
            {canManageDocuments && (
              <div className="mt-[16px]">
                <button
                  onClick={() => { setIsAddNewOpen(!isAddNewOpen); setIsUploadPickerOpen(false) }}
                  className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[10px] py-[6px] text-[13px] font-medium transition-colors"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  Add new
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full border-separate border-spacing-0 text-left" style={{ tableLayout: "fixed", minWidth: 700 }}>
            <thead>
              <tr>
                <th className="sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]" style={{ width: "45%" }}>
                  <div className="flex items-center gap-[6px]">
                    <FileText className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                    <span>Name</span>
                  </div>
                </th>
                {isGlobalSearchActive && (
                  <th className="sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]" style={{ width: "15%" }}>
                    <div className="flex items-center gap-[6px]">
                      <Folder className="h-[13px] w-[13px] shrink-0 text-[#999]" strokeWidth={1.5} />
                      <span>Location</span>
                    </div>
                  </th>
                )}
                {visibleColumnKeys.includes("type") && (
                  <th className="sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]" style={{ width: "15%" }}>
                    Type
                  </th>
                )}
                {visibleColumnKeys.includes("size") && (
                  <th className="sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]" style={{ width: "15%" }}>
                    Size
                  </th>
                )}
                {visibleColumnKeys.includes("modified") && (
                  <th className="sticky top-0 z-20 h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]" style={{ width: "20%" }}>
                    Modified
                  </th>
                )}
                <th className="sticky top-0 z-20 h-[44px] border-b border-[#dcdcdc] bg-[#fafafa]" style={{ width: "5%" }} />
              </tr>
            </thead>
            <tbody>
              {allItems.map((item) => {
                const cellBase = "h-[44px] overflow-hidden whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] group-hover:bg-[#f5f5f5]"

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
                          <Folder className="h-[16px] w-[16px] shrink-0 text-[#888]" strokeWidth={1.5} />
                          {isRenaming ? (
                            <input
                              ref={renameFileInputRef}
                              value={renameFileValue}
                              onChange={(e) => setRenameFileValue(e.target.value)}
                              onBlur={() => handleRenameFile(file.path)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRenameFile(file.path); if (e.key === "Escape") setRenamingFilePath(null) }}
                              className="min-w-0 flex-1 rounded border border-[#a3c4f3] bg-white px-[6px] py-[2px] text-[13px] font-medium text-[#262626] outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="truncate text-[13px] font-medium text-[#262626]">{file.name}</span>
                          )}
                        </div>
                      </td>
                      {visibleColumnKeys.includes("type") && (
                        <td className={`${cellBase} text-[13px] font-medium text-[#888]`}>File</td>
                      )}
                      {visibleColumnKeys.includes("size") && (
                        <td className={`${cellBase} text-[13px] font-medium text-[#888]`}>{docCount} {docCount === 1 ? "item" : "items"}</td>
                      )}
                      {visibleColumnKeys.includes("modified") && (
                        <td className={`${cellBase} text-[13px] font-medium text-[#888]`}><span className="text-[#bbb]">—</span></td>
                      )}
                      <td className="h-[44px] border-b border-[#dcdcdc] bg-[#fafafa] group-hover:bg-[#f5f5f5]">
                        <button
                          onClick={(e) => { e.stopPropagation(); setFileContextMenu({ path: file.path, name: file.name, x: e.clientX, y: e.clientY }) }}
                          className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#ccc] opacity-0 transition-all hover:bg-[#e8e8e8] hover:text-[#888] group-hover:opacity-100"
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
                      <div className="flex items-center gap-[10px]">
                        <Icon className={`h-[16px] w-[16px] shrink-0 ${color}`} strokeWidth={1.75} />
                        {renamingId === doc.id ? (
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRename(doc.id)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleRename(doc.id); if (e.key === "Escape") setRenamingId(null) }}
                            className="min-w-0 flex-1 rounded border border-[#a3c4f3] bg-white px-[6px] py-[2px] text-[13px] font-medium text-[#262626] outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                          />
                        ) : (
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="truncate text-[13px] font-medium text-[#262626] transition-colors hover:text-blue-600"
                            tabIndex={0}
                          >
                            {doc.name}
                          </button>
                        )}
                      </div>
                    </td>
                    {isGlobalSearchActive && (
                      <td className={`${cellBase} text-[13px] font-medium text-[#888]`}>
                        {doc.folder ? (
                          <button
                            onClick={() => { setCurrentPath(doc.folder); setGlobalSearch("") }}
                            className="truncate text-[13px] font-medium text-[#888] transition-colors hover:text-blue-600"
                            tabIndex={0}
                          >
                            {doc.folder}
                          </button>
                        ) : (
                          <span className="text-[#bbb]">Root</span>
                        )}
                      </td>
                    )}
                    {visibleColumnKeys.includes("type") && (
                      <td className={`${cellBase} text-[13px] font-medium text-[#888]`}>{ext}</td>
                    )}
                    {visibleColumnKeys.includes("size") && (
                      <td className={`${cellBase} text-[13px] font-medium text-[#888]`}>{formatFileSize(doc.size)}</td>
                    )}
                    {visibleColumnKeys.includes("modified") && (
                      <td className={`${cellBase} text-[13px] font-medium text-[#888]`}>{formatDate(doc.createdAt)}</td>
                    )}
                    <td className="h-[44px] border-b border-[#dcdcdc] bg-[#fafafa] group-hover:bg-[#f5f5f5]">
                      <button
                        onClick={(e) => { e.stopPropagation(); setContextMenu({ doc, x: e.clientX, y: e.clientY }) }}
                        className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#ccc] opacity-0 transition-all hover:bg-[#f0f0f0] hover:text-[#888] group-hover:opacity-100"
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
      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">
          {isGlobalSearchActive
            ? `${globalSearchResults.length} ${globalSearchResults.length === 1 ? "result" : "results"}`
            : `${childFiles.length} ${childFiles.length === 1 ? "file" : "files"} · ${sortedDocs.length} ${sortedDocs.length === 1 ? "document" : "documents"}`
          }
          {typeFilter !== "all" && ` · Filtered: ${activeFilterLabel}`}
        </span>
      </div>

      {/* Document context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 w-[160px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleDownload(contextMenu.doc)}
            className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <Download className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.75} />
            Download
          </button>
          <button
            onClick={() => { setRenamingId(contextMenu.doc.id); setRenameValue(contextMenu.doc.name); setContextMenu(null) }}
            className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <Pencil className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.75} />
            Rename
          </button>
          {canManageDocuments && (
            <>
              <div className="my-[4px] border-t border-[#f0f0f0]" />
              <button
                onClick={() => handleDelete(contextMenu.doc)}
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
          className="fixed z-50 w-[160px] rounded-lg border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
          style={{ top: fileContextMenu.y, left: fileContextMenu.x }}
        >
          <button
            onClick={() => { setRenamingFilePath(fileContextMenu.path); setRenameFileValue(fileContextMenu.name); setFileContextMenu(null) }}
            className="flex w-full items-center gap-[8px] px-[12px] py-[7px] text-[12px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
            tabIndex={0}
          >
            <Pencil className="h-[14px] w-[14px] text-[#888]" strokeWidth={1.75} />
            Rename
          </button>
          {canManageDocuments && (
            <>
              <div className="my-[4px] border-t border-[#f0f0f0]" />
              <button
                onClick={() => handleDeleteFile(fileContextMenu.path)}
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
    </div>
  )
}
