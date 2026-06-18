"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { DocumentUploadResult } from "@/lib/document-form"
import type { Document } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
function formatDocumentDbError(message: string) {
  if (message.includes("valid_from") || message.includes("valid_to")) {
    return "Document expiry dates are not set up in the database yet. Apply migration 017_document_validity_dates.sql in Supabase."
  }
  return message
}

function dbToDocument(row: any): Document {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    size: row.size || 0,
    mimeType: row.mime_type || "",
    storagePath: row.storage_path || "",
    folder: row.folder || "",
    uploadedBy: row.uploaded_by || null,
    validFrom: row.valid_from || null,
    validTo: row.valid_to || null,
    createdAt: row.created_at || "",
  }
}

function getStorageKey(workspaceId: string) {
  return `doc-files-${workspaceId}`
}

function loadFiles(workspaceId: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(getStorageKey(workspaceId))
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveFiles(workspaceId: string, files: string[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(getStorageKey(workspaceId), JSON.stringify(files))
}

interface DocumentsContextValue {
  documents: Document[]
  files: string[]
  isLoading: boolean
  createFile: (name: string, parentPath?: string) => void
  deleteFile: (filePath: string) => void
  renameFile: (oldPath: string, newName: string) => void
  uploadDocument: (
    file: File,
    folder?: string,
    options?: { name?: string; validFrom?: string | null; validTo?: string | null }
  ) => Promise<DocumentUploadResult>
  deleteDocument: (doc: Document) => Promise<void>
  renameDocument: (id: string, newName: string) => Promise<void>
  updateDocument: (
    id: string,
    updates: { name?: string; validFrom?: string | null; validTo?: string | null }
  ) => Promise<{ ok: boolean; error?: string }>
  replaceDocumentFile: (doc: Document, file: File, options?: { name?: string }) => Promise<boolean>
  getDownloadUrl: (storagePath: string) => Promise<string | null>
  refetch: () => Promise<void>
}

const DocumentsContext = createContext<DocumentsContextValue | null>(null)

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useWorkspace()
  const [documents, setDocuments] = useState<Document[]>([])
  const [createdFiles, setCreatedFiles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) { setCreatedFiles([]); return }
    setCreatedFiles(loadFiles(activeWorkspace.id))
  }, [activeWorkspace])

  const fetchDocuments = useCallback(async () => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      setDocuments([])
      setIsLoading(false)
      return
    }
    const supabase = createClient()
    if (!supabase) { setDocuments([]); setIsLoading(false); return }

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("workspace_id", activeWorkspace.id)
        .order("created_at", { ascending: false })

      if (error || !data) {
        setDocuments([])
      } else {
        setDocuments(data.map(dbToDocument))
      }
    } catch {
      setDocuments([])
    }
    setIsLoading(false)
  }, [activeWorkspace])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])

  const createFile = useCallback((name: string, parentPath: string = "") => {
    if (!activeWorkspace) return
    const fullPath = parentPath ? `${parentPath}/${name}` : name
    setCreatedFiles((prev) => {
      if (prev.includes(fullPath)) return prev
      const next = [...prev, fullPath]
      saveFiles(activeWorkspace.id, next)
      return next
    })
  }, [activeWorkspace])

  const deleteFile = useCallback((filePath: string) => {
    if (!activeWorkspace) return
    setCreatedFiles((prev) => {
      const next = prev.filter((f) => f !== filePath && !f.startsWith(filePath + "/"))
      saveFiles(activeWorkspace.id, next)
      return next
    })
  }, [activeWorkspace])

  const renameFile = useCallback((oldPath: string, newName: string) => {
    if (!activeWorkspace) return
    const parts = oldPath.split("/")
    parts[parts.length - 1] = newName
    const newPath = parts.join("/")
    setCreatedFiles((prev) => {
      const next = prev.map((f) => {
        if (f === oldPath) return newPath
        if (f.startsWith(oldPath + "/")) return newPath + f.slice(oldPath.length)
        return f
      })
      saveFiles(activeWorkspace.id, next)
      return next
    })
  }, [activeWorkspace])

  const uploadDocument = useCallback(async (
    file: File,
    folder: string = "",
    options?: { name?: string; validFrom?: string | null; validTo?: string | null }
  ): Promise<DocumentUploadResult> => {
    if (!activeWorkspace || !isSupabaseConfigured()) {
      return { document: null, error: "Workspace is not available" }
    }
    const supabase = createClient()
    if (!supabase) return { document: null, error: "Unable to connect to storage" }

    const { data: { user } } = await supabase.auth.getUser()
    const fileExt = file.name.split(".").pop() || ""
    const storagePath = `${activeWorkspace.id}/${folder ? folder + "/" : ""}${crypto.randomUUID()}.${fileExt}`
    const displayName = options?.name?.trim() || file.name

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file)

    if (uploadError) {
      return { document: null, error: uploadError.message || "Unable to upload file" }
    }

    const { data, error } = await supabase
      .from("documents")
      .insert({
        workspace_id: activeWorkspace.id,
        name: displayName,
        size: file.size,
        mime_type: file.type || "application/octet-stream",
        storage_path: storagePath,
        folder,
        uploaded_by: user?.id || null,
        valid_from: options?.validFrom || null,
        valid_to: options?.validTo || null,
      })
      .select()
      .single()

    if (error || !data) {
      await supabase.storage.from("documents").remove([storagePath])
      return {
        document: null,
        error: formatDocumentDbError(error?.message || "Unable to save document record"),
      }
    }

    const newDoc = dbToDocument(data)
    setDocuments((prev) => [newDoc, ...prev])
    return { document: newDoc }
  }, [activeWorkspace])

  const deleteDocument = useCallback(async (doc: Document) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    await supabase.storage.from("documents").remove([doc.storagePath])
    await supabase.from("documents").delete().eq("id", doc.id)
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
  }, [])

  const renameDocument = useCallback(async (id: string, newName: string) => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return

    setDocuments((prev) => prev.map((d) => d.id === id ? { ...d, name: newName } : d))
    await supabase.from("documents").update({ name: newName, updated_at: new Date().toISOString() }).eq("id", id)
  }, [])

  const updateDocument = useCallback(async (
    id: string,
    updates: { name?: string; validFrom?: string | null; validTo?: string | null }
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!isSupabaseConfigured()) return { ok: false, error: "Unable to connect to storage" }
    const supabase = createClient()
    if (!supabase) return { ok: false, error: "Unable to connect to storage" }

    const payload: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    }
    if ("name" in updates && updates.name !== undefined) payload.name = updates.name
    if ("validFrom" in updates) payload.valid_from = updates.validFrom || null
    if ("validTo" in updates) payload.valid_to = updates.validTo || null

    const { error } = await supabase.from("documents").update(payload).eq("id", id)
    if (error) {
      return { ok: false, error: formatDocumentDbError(error.message) }
    }

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              ...( "name" in updates && updates.name !== undefined ? { name: updates.name } : {}),
              ...( "validFrom" in updates ? { validFrom: updates.validFrom ?? null } : {}),
              ...( "validTo" in updates ? { validTo: updates.validTo ?? null } : {}),
            }
          : d
      )
    )

    return { ok: true }
  }, [])

  const replaceDocumentFile = useCallback(async (
    doc: Document,
    file: File,
    options?: { name?: string }
  ): Promise<boolean> => {
    if (!activeWorkspace || !isSupabaseConfigured()) return false
    const supabase = createClient()
    if (!supabase) return false

    const fileExt = file.name.split(".").pop() || ""
    const storagePath = `${activeWorkspace.id}/${doc.folder ? doc.folder + "/" : ""}${crypto.randomUUID()}.${fileExt}`
    const displayName = options?.name?.trim() || doc.name

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file)

    if (uploadError) return false

    await supabase.storage.from("documents").remove([doc.storagePath])

    const payload = {
      name: displayName,
      size: file.size,
      mime_type: file.type || "application/octet-stream",
      storage_path: storagePath,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from("documents").update(payload).eq("id", doc.id)
    if (error) return false

    setDocuments((prev) =>
      prev.map((d) =>
        d.id === doc.id
          ? {
              ...d,
              name: displayName,
              size: file.size,
              mimeType: file.type || "application/octet-stream",
              storagePath,
            }
          : d
      )
    )
    return true
  }, [activeWorkspace])

  const getDownloadUrl = useCallback(async (storagePath: string): Promise<string | null> => {
    if (!isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data, error } = await supabase.storage
      .from("documents")
      .createSignedUrl(storagePath, 60)

    if (error || !data?.signedUrl) return null
    return data.signedUrl
  }, [])

  const implicitFolders = Array.from(new Set(documents.map((d) => d.folder).filter(Boolean)))
  const allFiles = Array.from(new Set([...createdFiles, ...implicitFolders]))

  return (
    <DocumentsContext.Provider value={{
      documents,
      files: allFiles,
      isLoading,
      createFile,
      deleteFile,
      renameFile,
      uploadDocument,
      deleteDocument,
      renameDocument,
      updateDocument,
      replaceDocumentFile,
      getDownloadUrl,
      refetch: fetchDocuments,
    }}>
      {children}
    </DocumentsContext.Provider>
  )
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext)
  if (!ctx) throw new Error("useDocuments must be used within DocumentsProvider")
  return ctx
}
