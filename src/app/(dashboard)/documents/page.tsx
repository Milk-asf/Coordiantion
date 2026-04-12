"use client"

import { useState, useRef, useCallback, useEffect } from "react"
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
} from "lucide-react"
import { useDocuments } from "@/lib/hooks/use-documents"
import { usePermissions } from "@/lib/hooks/use-permissions"
import type { Document } from "@/lib/types"

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
  const fileInputRef = useRef<HTMLInputElement>(null)
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

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return
    setIsUploading(true)
    try {
      const uploads = Array.from(selectedFiles).map((f) => uploadDocument(f, currentPath))
      await Promise.all(uploads)
    } finally {
      setIsUploading(false)
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

  const visibleDocs = documents.filter((d) => {
    if (d.folder !== currentPath) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return d.name.toLowerCase().includes(q)
    }
    return true
  })

  const childFiles = files
    .filter((f) => {
      if (!currentPath) return !f.includes("/")
      return f.startsWith(currentPath + "/") && !f.slice(currentPath.length + 1).includes("/")
    })
    .map((f) => {
      const name = currentPath ? f.slice(currentPath.length + 1) : f
      return { path: f, name }
    })

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
      <div className="flex h-[44px] shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-[20px]">
        <div className="flex items-center gap-[10px]">
          <FileText className="h-[16px] w-[16px] text-[#888]" strokeWidth={1.75} />
          <h1 className="text-[14px] font-semibold text-[#262626]">Documents</h1>
        </div>
        <div className="flex items-center gap-[8px]">
          {isInsideFile && (
            <div className="flex h-[32px] items-center gap-[6px] rounded-md border border-[#e0e0e0] bg-[#fafafa] px-[10px]">
              <Search className="h-[14px] w-[14px] text-[#bbb]" strokeWidth={1.75} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-[180px] bg-transparent text-[12px] font-medium text-[#262626] placeholder-[#bbb] outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-[#bbb] hover:text-[#888]" tabIndex={0} aria-label="Clear search">
                  <X className="h-[12px] w-[12px]" strokeWidth={2} />
                </button>
              )}
            </div>
          )}
          {canManageDocuments && (
            <>
              <button
                onClick={() => setIsNewFileOpen(true)}
                className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                tabIndex={0}
                aria-label="New file"
              >
                <FilePlus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                <span>New file</span>
              </button>
              {isInsideFile && (
                <>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                    aria-label="Upload documents"
                  >
                    <Upload className="h-[13px] w-[13px]" strokeWidth={1.5} />
                    <span>Upload</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => { handleFileSelect(e.target.files); e.target.value = "" }}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex h-[36px] shrink-0 items-center gap-[4px] border-b border-[#f0f0f0] bg-white px-[20px]">
        <button
          onClick={() => { setCurrentPath(""); setSearchQuery("") }}
          className={`text-[12px] font-medium transition-colors ${currentPath ? "text-[#888] hover:text-[#262626]" : "text-[#262626]"}`}
          tabIndex={0}
        >
          All files
        </button>
        {breadcrumbs.map((crumb, i) => {
          const path = breadcrumbs.slice(0, i + 1).join("/")
          const isLast = i === breadcrumbs.length - 1
          return (
            <span key={path} className="flex items-center gap-[4px]">
              <ChevronRight className="h-[12px] w-[12px] text-[#ccc]" strokeWidth={2} />
              <button
                onClick={() => { setCurrentPath(path); setSearchQuery("") }}
                className={`text-[12px] font-medium transition-colors ${isLast ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
                tabIndex={0}
              >
                {crumb}
              </button>
            </span>
          )
        })}
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
      <div className={`flex-1 overflow-y-auto px-[20px] py-[16px] ${isDragOver ? "bg-blue-50/50" : ""}`}>
        {isDragOver && isInsideFile && (
          <div className="pointer-events-none mb-[16px] flex items-center justify-center rounded-xl border-2 border-dashed border-blue-400 bg-blue-50 py-[40px]">
            <p className="text-[14px] font-medium text-blue-600">Drop documents here to upload</p>
          </div>
        )}

        {isUploading && (
          <div className="mb-[12px] flex items-center gap-[8px] rounded-lg border border-blue-200 bg-blue-50 px-[14px] py-[10px]">
            <div className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <span className="text-[13px] font-medium text-blue-700">Uploading...</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-[60px]">
            <div className="h-[20px] w-[20px] animate-spin rounded-full border-2 border-[#dcdcdc] border-t-[#888]" />
          </div>
        ) : !isInsideFile ? (
          /* Root level: only show files */
          childFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[80px]">
              <div className="mb-[16px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#f0f0f0]">
                <Folder className="h-[24px] w-[24px] text-[#bbb]" strokeWidth={1.5} />
              </div>
              <p className="text-[14px] font-medium text-[#262626]">No files yet</p>
              <p className="mt-[4px] text-[13px] text-[#888]">Create a file to organise your documents</p>
              {canManageDocuments && (
                <button
                  onClick={() => setIsNewFileOpen(true)}
                  className="mt-[16px] flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  New file
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[8px]">
              {childFiles.map((file) => {
                const docCount = getFileDocCount(file.path)
                if (renamingFilePath === file.path) {
                  return (
                    <div key={file.path} className="flex items-center gap-[10px] rounded-lg border border-[#a3c4f3] bg-white px-[14px] py-[12px] shadow-[0_0_0_3px_rgba(163,196,243,0.25)]">
                      <Folder className="h-[18px] w-[18px] shrink-0 text-[#888]" strokeWidth={1.5} />
                      <input
                        ref={renameFileInputRef}
                        value={renameFileValue}
                        onChange={(e) => setRenameFileValue(e.target.value)}
                        onBlur={() => handleRenameFile(file.path)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleRenameFile(file.path); if (e.key === "Escape") setRenamingFilePath(null) }}
                        className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[#262626] outline-none"
                      />
                    </div>
                  )
                }
                return (
                  <div
                    key={file.path}
                    onClick={() => { setCurrentPath(file.path); setSearchQuery("") }}
                    onContextMenu={(e) => { e.preventDefault(); setFileContextMenu({ path: file.path, name: file.name, x: e.clientX, y: e.clientY }) }}
                    className="group flex cursor-pointer items-center gap-[10px] rounded-lg border border-[#e8e8e8] bg-white px-[14px] py-[12px] text-left transition-colors hover:bg-[#f5f5f5]"
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCurrentPath(file.path); setSearchQuery("") } }}
                  >
                    <Folder className="h-[18px] w-[18px] shrink-0 text-[#888]" strokeWidth={1.5} />
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-[#262626]">{file.name}</span>
                      <span className="text-[11px] font-medium text-[#bbb]">{docCount} {docCount === 1 ? "document" : "documents"}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFileContextMenu({ path: file.path, name: file.name, x: e.clientX, y: e.clientY }) }}
                      className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded text-[#ccc] opacity-0 transition-all hover:bg-[#e8e8e8] hover:text-[#888] group-hover:opacity-100"
                      tabIndex={0}
                      aria-label="File options"
                    >
                      <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.75} />
                    </button>
                  </div>
                )
              })}
            </div>
          )
        ) : (
          /* Inside a file: show sub-files + documents */
          <>
            {/* Sub-files */}
            {childFiles.length > 0 && (
              <div className="mb-[16px]">
                <p className="mb-[8px] text-[11px] font-medium tracking-wide text-[#999]">FILES</p>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[8px]">
                  {childFiles.map((file) => {
                    const docCount = getFileDocCount(file.path)
                    if (renamingFilePath === file.path) {
                      return (
                        <div key={file.path} className="flex items-center gap-[10px] rounded-lg border border-[#a3c4f3] bg-white px-[14px] py-[12px] shadow-[0_0_0_3px_rgba(163,196,243,0.25)]">
                          <Folder className="h-[18px] w-[18px] shrink-0 text-[#888]" strokeWidth={1.5} />
                          <input
                            ref={renameFileInputRef}
                            value={renameFileValue}
                            onChange={(e) => setRenameFileValue(e.target.value)}
                            onBlur={() => handleRenameFile(file.path)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleRenameFile(file.path); if (e.key === "Escape") setRenamingFilePath(null) }}
                            className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-[#262626] outline-none"
                          />
                        </div>
                      )
                    }
                    return (
                      <button
                        key={file.path}
                        onClick={() => { setCurrentPath(file.path); setSearchQuery("") }}
                        onContextMenu={(e) => { e.preventDefault(); setFileContextMenu({ path: file.path, name: file.name, x: e.clientX, y: e.clientY }) }}
                        className="group flex items-center gap-[10px] rounded-lg border border-[#e8e8e8] bg-white px-[14px] py-[12px] text-left transition-colors hover:bg-[#f5f5f5]"
                        tabIndex={0}
                      >
                        <Folder className="h-[18px] w-[18px] shrink-0 text-[#888]" strokeWidth={1.5} />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-[#262626]">{file.name}</span>
                          <span className="text-[11px] font-medium text-[#bbb]">{docCount} {docCount === 1 ? "document" : "documents"}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFileContextMenu({ path: file.path, name: file.name, x: e.clientX, y: e.clientY }) }}
                          className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded text-[#ccc] opacity-0 transition-all hover:bg-[#e8e8e8] hover:text-[#888] group-hover:opacity-100"
                          tabIndex={0}
                          aria-label="File options"
                        >
                          <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.75} />
                        </button>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Documents */}
            {visibleDocs.length === 0 && childFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[60px]">
                <div className="mb-[16px] flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#f0f0f0]">
                  <FileText className="h-[24px] w-[24px] text-[#bbb]" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] font-medium text-[#262626]">This file is empty</p>
                <p className="mt-[4px] text-[13px] text-[#888]">Upload documents or create a file inside</p>
                {canManageDocuments && (
                  <div className="mt-[16px] flex items-center gap-[8px]">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      <Upload className="h-[13px] w-[13px]" strokeWidth={1.5} />
                      Upload
                    </button>
                    <button
                      onClick={() => setIsNewFileOpen(true)}
                      className="flex items-center gap-[5px] rounded border border-[#dcdcdc] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                      tabIndex={0}
                    >
                      <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
                      New file
                    </button>
                  </div>
                )}
              </div>
            ) : visibleDocs.length > 0 ? (
              <>
                {childFiles.length > 0 && (
                  <p className="mb-[8px] text-[11px] font-medium tracking-wide text-[#999]">DOCUMENTS</p>
                )}

                <div className="rounded-lg border border-[#e8e8e8] bg-[#fafafa]">
                  <div className="grid grid-cols-[1fr_100px_120px_40px] items-center border-b border-[#f0f0f0] px-[16px] py-[8px]">
                    <span className="text-[11px] font-medium text-[#999]">Name</span>
                    <span className="text-[11px] font-medium text-[#999]">Size</span>
                    <span className="text-[11px] font-medium text-[#999]">Uploaded</span>
                    <span />
                  </div>
                  {visibleDocs.map((doc) => {
                    const Icon = getFileIcon(doc.mimeType)
                    const color = getFileColor(doc.mimeType)
                    return (
                      <div
                        key={doc.id}
                        className="group grid grid-cols-[1fr_100px_120px_40px] items-center border-b border-[#f0f0f0] px-[16px] py-[10px] transition-colors last:border-b-0 hover:bg-[#fafafa]"
                      >
                        <div className="flex items-center gap-[10px] overflow-hidden">
                          <Icon className={`h-[16px] w-[16px] shrink-0 ${color}`} strokeWidth={1.75} />
                          {renamingId === doc.id ? (
                            <input
                              ref={renameInputRef}
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => handleRename(doc.id)}
                              onKeyDown={(e) => { if (e.key === "Enter") handleRename(doc.id); if (e.key === "Escape") setRenamingId(null) }}
                              className="min-w-0 flex-1 rounded border border-[#a3c4f3] bg-[#fafafa] px-[6px] py-[2px] text-[13px] font-medium text-[#262626] outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
                            />
                          ) : (
                            <button
                              onClick={() => handleDownload(doc)}
                              className="truncate text-[13px] font-medium text-[#262626] transition-colors hover:text-blue-600"
                              tabIndex={0}
                            >
                              {doc.name}
                            </button>
                          )}
                        </div>
                        <span className="text-[12px] font-medium text-[#888]">{formatFileSize(doc.size)}</span>
                        <span className="text-[12px] font-medium text-[#888]">{formatDate(doc.createdAt)}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setContextMenu({ doc, x: e.clientX, y: e.clientY }) }}
                          className="flex h-[28px] w-[28px] items-center justify-center rounded text-[#ccc] opacity-0 transition-all hover:bg-[#f0f0f0] hover:text-[#888] group-hover:opacity-100"
                          tabIndex={0}
                          aria-label="Document options"
                        >
                          <MoreHorizontal className="h-[14px] w-[14px]" strokeWidth={1.75} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[#dcdcdc] px-[20px] py-[10px]">
        <span className="text-[12px] font-medium text-[#999]">
          {isInsideFile
            ? `${visibleDocs.length} ${visibleDocs.length === 1 ? "document" : "documents"}${childFiles.length > 0 ? ` · ${childFiles.length} ${childFiles.length === 1 ? "file" : "files"}` : ""}`
            : `${childFiles.length} ${childFiles.length === 1 ? "file" : "files"}`
          }
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
    </div>
  )
}
