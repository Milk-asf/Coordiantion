import type { Document } from "@/lib/types"

export interface DocumentUploadResult {
  document: Document | null
  error?: string
}

export interface SaveDocumentFormParams {
  editingDocument: Document | null
  docPendingFile: File | null
  docUploadFolder: string
  docName: string
  docValidFrom: string
  docValidTo: string
  uploadDocument: (
    file: File,
    folder?: string,
    options?: { name?: string; validFrom?: string | null; validTo?: string | null }
  ) => Promise<DocumentUploadResult>
  updateDocument: (
    id: string,
    updates: { name?: string; validFrom?: string | null; validTo?: string | null }
  ) => Promise<{ ok: boolean; error?: string }>
  replaceDocumentFile: (doc: Document, file: File, options?: { name?: string }) => Promise<boolean>
  createFile: (name: string, parentPath?: string) => void
}

export function ensureFolderPath(
  folderPath: string,
  createFile: (name: string, parentPath?: string) => void
) {
  if (!folderPath) return

  const segments = folderPath.split("/").filter(Boolean)
  let parentPath = ""

  for (const segment of segments) {
    createFile(segment, parentPath)
    parentPath = parentPath ? `${parentPath}/${segment}` : segment
  }
}

export function formatDocumentValidity(doc: { validFrom: string | null; validTo: string | null }) {
  if (!doc.validFrom && !doc.validTo) return null

  const format = (dateStr: string) =>
    new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-AU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })

  if (doc.validFrom && doc.validTo) return `${format(doc.validFrom)} – ${format(doc.validTo)}`
  if (doc.validFrom) return `From ${format(doc.validFrom)}`
  return `Until ${format(doc.validTo!)}`
}

export async function saveDocumentForm({
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
}: SaveDocumentFormParams): Promise<{ ok: true } | { ok: false; error: string }> {
  if (docValidFrom && docValidTo && docValidTo < docValidFrom) {
    return { ok: false, error: "Valid to must be on or after valid from" }
  }

  if (editingDocument) {
    const nextName = docName.trim() || editingDocument.name
    let ok = true

    if (docPendingFile) {
      ok = await replaceDocumentFile(editingDocument, docPendingFile, { name: nextName })
      if (!ok) return { ok: false, error: "Unable to replace the attachment" }
    }

    const result = await updateDocument(editingDocument.id, {
      ...(docPendingFile ? {} : { name: nextName }),
      validFrom: docValidFrom || null,
      validTo: docValidTo || null,
    })

    if (!result.ok) return { ok: false, error: result.error || "Unable to save document details" }
    return { ok: true }
  }

  if (!docPendingFile) {
    return { ok: false, error: "Add an attachment before saving" }
  }

  ensureFolderPath(docUploadFolder, createFile)

  const { document, error } = await uploadDocument(docPendingFile, docUploadFolder, {
    name: docName.trim() || docPendingFile.name,
    validFrom: docValidFrom || null,
    validTo: docValidTo || null,
  })

  if (!document) {
    return { ok: false, error: error || "Unable to upload document" }
  }

  return { ok: true }
}
