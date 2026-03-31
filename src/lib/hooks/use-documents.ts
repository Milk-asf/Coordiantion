"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace-context"
import type { Document } from "@/lib/types"

/* eslint-disable @typescript-eslint/no-explicit-any */
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

export function useDocuments() {
  const { activeWorkspace } = useWorkspace()
  const [documents, setDocuments] = useState<Document[]>([])
  const [createdFiles, setCreatedFiles] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!activeWorkspace) return
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

  const uploadDocument = useCallback(async (file: File, folder: string = "") => {
    if (!activeWorkspace || !isSupabaseConfigured()) return null
    const supabase = createClient()
    if (!supabase) return null

    const { data: { user } } = await supabase.auth.getUser()
    const fileExt = file.name.split(".").pop() || ""
    const storagePath = `${activeWorkspace.id}/${folder ? folder + "/" : ""}${crypto.randomUUID()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file)

    if (uploadError) return null

    const { data, error } = await supabase
      .from("documents")
      .insert({
        workspace_id: activeWorkspace.id,
        name: file.name,
        size: file.size,
        mime_type: file.type || "application/octet-stream",
        storage_path: storagePath,
        folder,
        uploaded_by: user?.id || null,
      })
      .select()
      .single()

    if (error || !data) return null
    const newDoc = dbToDocument(data)
    setDocuments((prev) => [newDoc, ...prev])
    return newDoc
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

  return {
    documents,
    files: allFiles,
    isLoading,
    createFile,
    deleteFile,
    renameFile,
    uploadDocument,
    deleteDocument,
    renameDocument,
    getDownloadUrl,
    refetch: fetchDocuments,
  }
}
