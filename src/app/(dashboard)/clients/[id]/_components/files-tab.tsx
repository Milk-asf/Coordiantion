"use client"

import { useMemo, useRef, useState } from "react"
import type { Document } from "@/lib/types"
import { getDocIcon, formatFileSize, formatDate } from "./client-profile-helpers"
import { EmptyState } from "@/components/empty-state"
import {
  FolderOpen,
  Folder,
  FolderPlus,
  Plus,
  Upload,
  Download,
  Trash2,
  X,
  ChevronRight,
} from "lucide-react"

interface FilesTabProps {
  rootFolder: string
  documents: Document[]
  files: string[]
  onUploadFiles: (files: FileList, destination: string) => void | Promise<void>
  onCreateFile: (name: string, parentPath: string) => void
  onDeleteFile: (path: string) => void
  onDownloadDoc: (doc: Document) => void
  onDeleteDocument: (doc: Document) => void
  onPreviewDoc: (doc: Document) => void
}

export function FilesTab({
  rootFolder,
  documents,
  files,
  onUploadFiles,
  onCreateFile,
  onDeleteFile,
  onDownloadDoc,
  onDeleteDocument,
  onPreviewDoc,
}: FilesTabProps) {
  const fileUploadRef = useRef<HTMLInputElement>(null)
  const [currentPath, setCurrentPath] = useState(rootFolder)
  const [isAddNewOpen, setIsAddNewOpen] = useState(false)
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const safePath = currentPath.startsWith(rootFolder) ? currentPath : rootFolder

  const currentDocs = useMemo(
    () =>
      documents
        .filter((d) => d.folder === safePath)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [documents, safePath]
  )

  const childFolders = useMemo(
    () =>
      files
        .filter((f) => f.startsWith(safePath + "/") && !f.slice(safePath.length + 1).includes("/"))
        .map((f) => ({ path: f, name: f.slice(safePath.length + 1) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [files, safePath]
  )

  const relativeSegments = safePath === rootFolder ? [] : safePath.slice(rootFolder.length + 1).split("/")

  const getFolderDocCount = (folderPath: string) =>
    documents.filter((d) => d.folder === folderPath || d.folder.startsWith(folderPath + "/")).length

  const handleCreateFolder = () => {
    const name = newFolderName.trim()
    if (!name) return
    onCreateFile(name, safePath)
    setNewFolderName("")
    setIsNewFolderOpen(false)
  }

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) onUploadFiles(e.target.files, safePath)
    e.target.value = ""
  }

  const isEmpty = childFolders.length === 0 && currentDocs.length === 0

  return (
    <div className="relative flex h-full flex-col">
      <input ref={fileUploadRef} type="file" multiple className="hidden" onChange={handleSelectFiles} />

      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
        <div className="flex min-w-0 items-center gap-[6px]">
          <button
            onClick={() => setCurrentPath(rootFolder)}
            className={`text-[12px] font-medium transition-colors ${relativeSegments.length === 0 ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
            tabIndex={0}
          >
            Documents
          </button>
          {relativeSegments.map((segment, i) => {
            const path = rootFolder + "/" + relativeSegments.slice(0, i + 1).join("/")
            const isLast = i === relativeSegments.length - 1
            return (
              <span key={path} className="flex min-w-0 items-center gap-[6px]">
                <ChevronRight className="h-[12px] w-[12px] shrink-0 text-[#ccc]" strokeWidth={2} />
                <button
                  onClick={() => setCurrentPath(path)}
                  className={`truncate text-[12px] font-medium transition-colors ${isLast ? "text-[#262626]" : "text-[#888] hover:text-[#262626]"}`}
                  tabIndex={0}
                >
                  {segment}
                </button>
              </span>
            )
          })}
        </div>
        <div className="relative shrink-0">
          <button
            onClick={() => setIsAddNewOpen(!isAddNewOpen)}
            className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
            aria-label="Add new"
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Add new</span>
          </button>
          {isAddNewOpen && (
            <>
              <div className="fixed inset-0 z-[29]" onClick={() => setIsAddNewOpen(false)} />
              <div className="absolute right-0 top-full z-[30] mt-[4px] w-[180px] rounded-[6px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <button
                  onClick={() => { setIsAddNewOpen(false); fileUploadRef.current?.click() }}
                  className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Upload className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                  Upload
                </button>
                <button
                  onClick={() => { setIsAddNewOpen(false); setIsNewFolderOpen(true) }}
                  className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <FolderPlus className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                  New folder
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isNewFolderOpen && (
        <div className="flex items-center gap-[8px] border-b border-[#dcdcdc] px-[16px] py-[8px]">
          <FolderPlus className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder()
              if (e.key === "Escape") { setNewFolderName(""); setIsNewFolderOpen(false) }
            }}
            placeholder="Folder name"
            className="min-w-0 flex-1 rounded border border-[#a3c4f3] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
          />
          <button
            onClick={handleCreateFolder}
            className="primary-btn rounded px-[10px] py-[4px] text-[12px] font-medium transition-colors"
            tabIndex={0}
          >
            Create
          </button>
          <button
            onClick={() => { setNewFolderName(""); setIsNewFolderOpen(false) }}
            className="rounded p-[4px] text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Cancel"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {isEmpty && !isNewFolderOpen ? (
        <EmptyState
          icon={FolderOpen}
          title="No documents yet"
          description="Upload documents or create a folder to organise them."
          action={{ label: "Add new", onClick: () => setIsAddNewOpen(true) }}
          className="flex-1"
        />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Name</th>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Size</th>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Uploaded</th>
                <th className="sticky top-0 z-20 h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[12px] font-medium text-[#888]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {childFolders.map((folder) => {
                const docCount = getFolderDocCount(folder.path)
                return (
                  <tr key={folder.path} className="group transition-colors hover:bg-[#f5f5f5]">
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                      <button
                        onClick={() => setCurrentPath(folder.path)}
                        className="flex items-center gap-[8px] transition-colors hover:text-blue-600"
                        tabIndex={0}
                      >
                        <Folder className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                        <span className="truncate">{folder.name}</span>
                      </button>
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] text-[#666]">{docCount} {docCount === 1 ? "item" : "items"}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] text-[#bbb]">—</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px]">
                      <div className="flex items-center gap-[4px] opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onDeleteFile(folder.path)}
                          className="rounded p-[4px] text-[#888] transition-colors hover:bg-[#fee] hover:text-red-500"
                          tabIndex={0}
                          aria-label={`Delete ${folder.name}`}
                        >
                          <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {currentDocs.map((doc) => {
                const DocIcon = getDocIcon(doc.mimeType)
                return (
                  <tr key={doc.id} className="group transition-colors hover:bg-[#f5f5f5]">
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] font-medium text-[#262626]">
                      <button
                        onClick={() => onPreviewDoc(doc)}
                        className="flex items-center gap-[8px] transition-colors hover:text-blue-600"
                        tabIndex={0}
                      >
                        <DocIcon className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
                        <span className="truncate">{doc.name}</span>
                      </button>
                    </td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] text-[#666]">{formatFileSize(doc.size)}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-r border-[#dcdcdc] bg-[#fafafa] px-[20px] text-[13px] text-[#666]">{formatDate(doc.createdAt)}</td>
                    <td className="h-[44px] whitespace-nowrap border-b border-[#dcdcdc] bg-[#fafafa] px-[20px]">
                      <div className="flex items-center gap-[4px] opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => onDownloadDoc(doc)}
                          className="rounded p-[4px] text-[#888] transition-colors hover:bg-[#eee] hover:text-[#262626]"
                          tabIndex={0}
                          aria-label={`Download ${doc.name}`}
                        >
                          <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                        </button>
                        <button
                          onClick={() => onDeleteDocument(doc)}
                          className="rounded p-[4px] text-[#888] transition-colors hover:bg-[#fee] hover:text-red-500"
                          tabIndex={0}
                          aria-label={`Delete ${doc.name}`}
                        >
                          <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
