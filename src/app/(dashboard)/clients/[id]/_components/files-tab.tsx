"use client"

import type { RefObject } from "react"
import type { Document } from "@/lib/types"
import { getDocIcon, formatFileSize, formatDate } from "./client-profile-helpers"
import {
  FolderOpen,
  FilePlus,
  Plus,
  Upload,
  Download,
  Trash2,
  X,
} from "lucide-react"

interface FilesTabProps {
  clientDocuments: Document[]
  clientFolder: string
  fileUploadRef: RefObject<HTMLInputElement | null>
  isFilesAddNewOpen: boolean
  isNewSubfileOpen: boolean
  newSubfileName: string
  onSetFilesAddNewOpen: (open: boolean) => void
  onSetNewSubfileOpen: (open: boolean) => void
  onSetNewSubfileName: (name: string) => void
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDownloadDoc: (doc: Document) => void
  onDeleteDocument: (doc: Document) => void
  onCreateFile: (name: string, folder: string) => void
  onPreviewDoc: (doc: Document) => void
}

export function FilesTab({
  clientDocuments,
  clientFolder,
  fileUploadRef,
  isFilesAddNewOpen,
  isNewSubfileOpen,
  newSubfileName,
  onSetFilesAddNewOpen,
  onSetNewSubfileOpen,
  onSetNewSubfileName,
  onFileUpload,
  onDownloadDoc,
  onDeleteDocument,
  onCreateFile,
  onPreviewDoc,
}: FilesTabProps) {
  return (
    <div className="relative flex h-full flex-col">
      <input ref={fileUploadRef} type="file" multiple className="hidden" onChange={onFileUpload} />
      <div className="flex h-[41px] shrink-0 items-center justify-between border-b border-[#dcdcdc] px-[16px]">
        <span className="text-[12px] font-medium text-[#888]">{clientDocuments.length} {clientDocuments.length === 1 ? "file" : "files"}</span>
        <div className="relative">
          <button
            onClick={() => onSetFilesAddNewOpen(!isFilesAddNewOpen)}
            className="primary-btn flex items-center gap-[5px] rounded-[4px] px-[8px] py-[4px] text-[13px] font-medium transition-colors"
            tabIndex={0}
            aria-label="Add new"
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            <span>Add new</span>
          </button>
          {isFilesAddNewOpen && (
            <>
              <div className="fixed inset-0 z-[29]" onClick={() => onSetFilesAddNewOpen(false)} />
              <div className="absolute right-0 top-full z-[30] mt-[4px] w-[180px] rounded-[6px] border border-[#e0e0e0] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
                <button
                  onClick={() => { onSetFilesAddNewOpen(false); fileUploadRef.current?.click() }}
                  className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <Upload className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                  Upload
                </button>
                <button
                  onClick={() => { onSetFilesAddNewOpen(false); onSetNewSubfileOpen(true) }}
                  className="flex w-full items-center gap-[8px] px-[12px] py-[8px] text-[13px] font-medium text-[#262626] transition-colors hover:bg-[#f5f5f5]"
                  tabIndex={0}
                >
                  <FilePlus className="h-[13px] w-[13px] text-[#888]" strokeWidth={1.5} />
                  New file
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isNewSubfileOpen && (
        <div className="flex items-center gap-[8px] border-b border-[#dcdcdc] px-[16px] py-[8px]">
          <FilePlus className="h-[14px] w-[14px] shrink-0 text-[#888]" strokeWidth={1.5} />
          <input
            autoFocus
            value={newSubfileName}
            onChange={(e) => onSetNewSubfileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSubfileName.trim()) {
                onCreateFile(newSubfileName.trim(), clientFolder)
                onSetNewSubfileName("")
                onSetNewSubfileOpen(false)
              }
              if (e.key === "Escape") { onSetNewSubfileName(""); onSetNewSubfileOpen(false) }
            }}
            placeholder="File name"
            className="min-w-0 flex-1 rounded border border-[#a3c4f3] bg-white px-[8px] py-[4px] text-[13px] font-medium text-[#262626] outline-none shadow-[0_0_0_3px_rgba(163,196,243,0.25)]"
          />
          <button
            onClick={() => {
              if (newSubfileName.trim()) {
                onCreateFile(newSubfileName.trim(), clientFolder)
                onSetNewSubfileName("")
                onSetNewSubfileOpen(false)
              }
            }}
            className="primary-btn rounded px-[10px] py-[4px] text-[12px] font-medium transition-colors"
            tabIndex={0}
          >
            Create
          </button>
          <button
            onClick={() => { onSetNewSubfileName(""); onSetNewSubfileOpen(false) }}
            className="rounded p-[4px] text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#262626]"
            tabIndex={0}
            aria-label="Cancel"
          >
            <X className="h-[14px] w-[14px]" strokeWidth={1.75} />
          </button>
        </div>
      )}

      {clientDocuments.length === 0 && !isNewSubfileOpen ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-[8px]">
          <FolderOpen className="h-[32px] w-[32px] text-[#ccc]" strokeWidth={1.5} />
          <p className="text-[13px] font-medium text-[#bbb]">No files yet</p>
          <button
            onClick={() => onSetFilesAddNewOpen(true)}
            className="primary-btn mt-[4px] flex items-center gap-[5px] rounded-[4px] px-[10px] py-[6px] text-[13px] font-medium transition-colors"
            tabIndex={0}
          >
            <Plus className="h-[13px] w-[13px]" strokeWidth={1.5} />
            Add new
          </button>
        </div>
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
              {clientDocuments.map((doc) => {
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
