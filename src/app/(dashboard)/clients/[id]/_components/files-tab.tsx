"use client"

import { useMemo, useState } from "react"
import type { Document } from "@/lib/types"
import { getDocIcon, formatFileSize, formatDate } from "./client-profile-helpers"
import { formatDocumentValidity } from "@/lib/document-form"
import { EmptyState } from "@/components/empty-state"
import { ProfileViewToggle } from "@/components/profile-view-toggle"
import { useProfileViewMode } from "@/lib/hooks/use-profile-view-mode"
import {
  Eye,
  FolderOpen,
  Folder,
  FolderPlus,
  Plus,
  Upload,
  Download,
  X,
  ChevronRight,
} from "lucide-react"
import { DeleteActionsMenu } from "@/components/delete-actions-menu"
import {
  TABLE_FULL,
  TABLE_PANEL_CELL,
  TABLE_PANEL_CELL_LAST,
  TABLE_PANEL_HEADER_STICKY,
  TABLE_PANEL_HEADER_STICKY_LAST,
  TABLE_PANEL_TEXT,
} from "@/lib/table-styles"


interface FilesTabProps {
  rootFolder: string
  documents: Document[]
  files: string[]
  onCreateDocument: (destination: string) => void
  onCreateFile: (name: string, parentPath: string) => void
  onDeleteFile: (path: string) => void
  onDownloadDoc: (doc: Document) => void
  onDeleteDocument: (doc: Document) => void
  onOpenDoc: (doc: Document) => void
  onPreviewDoc?: (doc: Document) => void
}

export function FilesTab({
  rootFolder,
  documents,
  files,
  onCreateDocument,
  onCreateFile,
  onDeleteFile,
  onDownloadDoc,
  onDeleteDocument,
  onOpenDoc,
  onPreviewDoc,
}: FilesTabProps) {
  const [currentPath, setCurrentPath] = useState(rootFolder)
  const [isAddNewOpen, setIsAddNewOpen] = useState(false)
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const { viewMode, setViewMode } = useProfileViewMode()

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

  const handleCreateDocument = () => {
    onCreateDocument(safePath)
    setIsAddNewOpen(false)
  }

  const isEmpty = childFolders.length === 0 && currentDocs.length === 0
  const itemCount = childFolders.length + currentDocs.length

  return (
    <div className="relative flex h-full flex-col">
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-folk-border bg-white px-[16px]">
        <div className="flex min-w-0 items-center gap-[6px]">
          <button
            onClick={() => setCurrentPath(rootFolder)}
            className={`text-[12px] font-medium transition-colors ${relativeSegments.length === 0 ? "text-folk-text" : "text-folk-secondary hover:text-folk-text"}`}
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
                  className={`truncate text-[12px] font-medium transition-colors ${isLast ? "text-folk-text" : "text-folk-secondary hover:text-folk-text"}`}
                  tabIndex={0}
                >
                  {segment}
                </button>
              </span>
            )
          })}
        </div>
        <div className="flex shrink-0 items-center gap-[8px]">
          {!isEmpty && (
            <ProfileViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
          )}
          <div className="relative shrink-0">
            <button
              onClick={() => setIsAddNewOpen(!isAddNewOpen)}
              className="primary-btn folk-pill-btn flex items-center gap-[5px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
              tabIndex={0}
              aria-label="Add new"
            >
              <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
              <span>Add new</span>
            </button>
            {isAddNewOpen && (
              <>
                <div className="fixed inset-0 z-[29]" onClick={() => setIsAddNewOpen(false)} />
                <div className="absolute right-0 top-full z-[30] mt-[4px] w-[180px] rounded-none border border-folk-border bg-folk-surface py-[4px] shadow-folk">
                  <button
                    onClick={handleCreateDocument}
                    className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                    tabIndex={0}
                  >
                    <Upload className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                    Upload
                  </button>
                  <button
                    onClick={() => { setIsAddNewOpen(false); setIsNewFolderOpen(true) }}
                    className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-folk-text transition-colors hover:bg-folk-hover"
                    tabIndex={0}
                  >
                    <FolderPlus className="h-[13px] w-[13px] text-folk-secondary" strokeWidth={1.5} />
                    New folder
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isNewFolderOpen && (
        <div className="flex items-center gap-[8px] border-b border-folk-border bg-white px-[16px] py-[8px]">
          <FolderPlus className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
          <input
            autoFocus
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder()
              if (e.key === "Escape") { setNewFolderName(""); setIsNewFolderOpen(false) }
            }}
            placeholder="Folder name"
            className="min-w-0 flex-1 rounded-none border border-[#a3c4f3] bg-folk-surface px-[8px] py-[4px] text-[13px] font-medium text-folk-text outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
          />
          <button
            onClick={handleCreateFolder}
            className="primary-btn px-[10px] py-[4px] text-[12px] font-medium transition-colors"
            tabIndex={0}
          >
            Create
          </button>
          <button
            onClick={() => { setNewFolderName(""); setIsNewFolderOpen(false) }}
            className="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-folk-hover hover:text-folk-text"
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
      ) : viewMode === "card" ? (
        <>
          <div className="flex-1 overflow-auto p-[16px]">
            <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {childFolders.map((folder) => {
                const docCount = getFolderDocCount(folder.path)
                return (
                  <div
                    key={folder.path}
                    role="button"
                    onClick={() => setCurrentPath(folder.path)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setCurrentPath(folder.path)
                      }
                    }}
                    className="group flex cursor-pointer flex-col rounded-none border border-[#d9d9d9] bg-folk-surface p-[16px] text-left transition-all hover:border-folk-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    tabIndex={0}
                  >
                    <div className="flex items-start justify-between">
                      <Folder className="h-[20px] w-[20px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <DeleteActionsMenu
                        onDelete={() => onDeleteFile(folder.path)}
                        itemName={folder.name}
                        confirmTitle="Delete folder"
                        stopPropagation
                        buttonClassName="rounded-none p-[4px] text-folk-secondary opacity-0 transition-all hover:bg-[#ebebeb] hover:text-folk-secondary group-hover:opacity-100"
                        ariaLabel={`Actions for ${folder.name}`}
                      />
                    </div>
                    <p className="mt-[12px] truncate text-[13px] font-semibold text-folk-text">{folder.name}</p>
                    <p className="mt-[4px] text-[12px] text-folk-secondary">{docCount} {docCount === 1 ? "item" : "items"}</p>
                  </div>
                )
              })}
              {currentDocs.map((doc) => {
                const DocIcon = getDocIcon(doc.mimeType)
                return (
                  <div
                    key={doc.id}
                    className="group flex flex-col rounded-none border border-[#d9d9d9] bg-folk-surface p-[16px] transition-all hover:border-folk-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex items-start justify-between">
                      <DocIcon className="h-[20px] w-[20px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                      <div className="flex items-center gap-[2px] opacity-0 transition-opacity group-hover:opacity-100">
                        {onPreviewDoc && (
                          <button
                            type="button"
                            onClick={() => onPreviewDoc(doc)}
                            className="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-[#eee] hover:text-folk-text"
                            tabIndex={0}
                            aria-label={`Preview ${doc.name}`}
                          >
                            <Eye className="h-[14px] w-[14px]" strokeWidth={1.5} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDownloadDoc(doc)}
                          className="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-[#eee] hover:text-folk-text"
                          tabIndex={0}
                          aria-label={`Download ${doc.name}`}
                        >
                          <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                        </button>
                        <DeleteActionsMenu
                          onDelete={() => onDeleteDocument(doc)}
                          itemName={doc.name}
                          confirmTitle="Delete document"
                          buttonClassName="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-[#ebebeb] hover:text-folk-secondary"
                          ariaLabel={`Actions for ${doc.name}`}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenDoc(doc)}
                      className="mt-[12px] truncate text-left text-[13px] font-semibold text-folk-text transition-colors hover:text-blue-600"
                      tabIndex={0}
                    >
                      {doc.name}
                    </button>
                    <p className="mt-[4px] text-[12px] text-folk-secondary">{formatFileSize(doc.size)}</p>
                    {formatDocumentValidity(doc) && (
                      <p className="mt-[2px] text-[12px] text-folk-secondary">{formatDocumentValidity(doc)}</p>
                    )}
                    <p className="mt-[2px] text-[12px] text-folk-placeholder">{formatDate(doc.createdAt)}</p>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-auto">
            <table className={TABLE_FULL}>
              <thead>
                <tr>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Name</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Size</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Uploaded</th>
                  <th className={TABLE_PANEL_HEADER_STICKY}>Valid</th>
                  <th className={TABLE_PANEL_HEADER_STICKY_LAST}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {childFolders.map((folder) => {
                  const docCount = getFolderDocCount(folder.path)
                  return (
                    <tr key={folder.path} className="group transition-colors hover:bg-folk-hover">
                      <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                        <button
                          onClick={() => setCurrentPath(folder.path)}
                          className="flex items-center gap-[8px] transition-colors hover:text-blue-600"
                          tabIndex={0}
                        >
                          <Folder className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                          <span className="truncate">{folder.name}</span>
                        </button>
                      </td>
                      <td className={`${TABLE_PANEL_CELL} text-[13px] text-folk-secondary`}>{docCount} {docCount === 1 ? "item" : "items"}</td>
                      <td className={`${TABLE_PANEL_CELL} text-[13px] text-folk-placeholder`}>—</td>
                      <td className={`${TABLE_PANEL_CELL} text-[13px] text-folk-placeholder`}>—</td>
                      <td className={TABLE_PANEL_CELL_LAST}>
                        <div className="flex items-center gap-[4px] opacity-0 transition-opacity group-hover:opacity-100">
                          <DeleteActionsMenu
                            onDelete={() => onDeleteFile(folder.path)}
                            itemName={folder.name}
                            confirmTitle="Delete folder"
                            buttonClassName="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-[#ebebeb] hover:text-folk-secondary"
                            ariaLabel={`Actions for ${folder.name}`}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {currentDocs.map((doc) => {
                  const DocIcon = getDocIcon(doc.mimeType)
                  return (
                    <tr key={doc.id} className="group transition-colors hover:bg-folk-hover">
                      <td className={`${TABLE_PANEL_CELL} ${TABLE_PANEL_TEXT}`}>
                        <button
                          onClick={() => onOpenDoc(doc)}
                          className="flex items-center gap-[8px] transition-colors hover:text-blue-600"
                          tabIndex={0}
                        >
                          <DocIcon className="h-[14px] w-[14px] shrink-0 text-folk-secondary" strokeWidth={1.5} />
                          <span className="truncate">{doc.name}</span>
                        </button>
                      </td>
                      <td className={`${TABLE_PANEL_CELL} text-[13px] text-folk-secondary`}>{formatFileSize(doc.size)}</td>
                      <td className={`${TABLE_PANEL_CELL} text-[13px] text-folk-secondary`}>{formatDate(doc.createdAt)}</td>
                      <td className={`${TABLE_PANEL_CELL} text-[13px] text-folk-secondary`}>
                        {formatDocumentValidity(doc) || <span className="text-folk-placeholder">—</span>}
                      </td>
                      <td className={TABLE_PANEL_CELL_LAST}>
                        <div className="flex items-center gap-[4px] opacity-0 transition-opacity group-hover:opacity-100">
                          {onPreviewDoc && (
                            <button
                              onClick={() => onPreviewDoc(doc)}
                              className="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-[#eee] hover:text-folk-text"
                              tabIndex={0}
                              aria-label={`Preview ${doc.name}`}
                            >
                              <Eye className="h-[14px] w-[14px]" strokeWidth={1.5} />
                            </button>
                          )}
                          <button
                            onClick={() => onDownloadDoc(doc)}
                            className="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-[#eee] hover:text-folk-text"
                            tabIndex={0}
                            aria-label={`Download ${doc.name}`}
                          >
                            <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                          </button>
                          <DeleteActionsMenu
                            onDelete={() => onDeleteDocument(doc)}
                            itemName={doc.name}
                            confirmTitle="Delete document"
                            buttonClassName="rounded-none p-[4px] text-folk-secondary transition-colors hover:bg-[#ebebeb] hover:text-folk-secondary"
                            ariaLabel={`Actions for ${doc.name}`}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="shrink-0 border-t border-folk-border px-[20px] py-[10px]">
            <span className="text-[12px] font-medium text-folk-secondary">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
