import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import type { Attachment } from "@/lib/types"

export class UploadCancelledError extends Error {
  constructor() {
    super("Upload cancelled")
    this.name = "UploadCancelledError"
  }
}

export interface UploadProgress {
  current: number
  total: number
  fileName: string
}

interface UploadAttachmentsOptions {
  files: File[]
  getStoragePath: (id: string, file: File) => string
  signal?: AbortSignal
  onProgress?: (progress: UploadProgress) => void
}

export async function removeAttachmentsFromStorage(attachments: Attachment[]) {
  if (!isSupabaseConfigured()) return

  const supabase = createClient()
  if (!supabase) return

  const paths = attachments
    .map((attachment) => attachment.storagePath)
    .filter((path): path is string => Boolean(path))

  if (paths.length === 0) return

  await supabase.storage.from("documents").remove(paths)
}

export async function uploadAttachments({
  files,
  getStoragePath,
  signal,
  onProgress,
}: UploadAttachmentsOptions): Promise<Attachment[]> {
  if (files.length === 0) return []
  if (signal?.aborted) throw new UploadCancelledError()

  const supabase = isSupabaseConfigured() ? createClient() : null
  const uploaded: Attachment[] = []

  try {
    for (let index = 0; index < files.length; index++) {
      if (signal?.aborted) throw new UploadCancelledError()

      const file = files[index]
      onProgress?.({ current: index + 1, total: files.length, fileName: file.name })

      const id = crypto.randomUUID()

      if (supabase) {
        const storagePath = getStoragePath(id, file)
        const { error } = await supabase.storage.from("documents").upload(storagePath, file)

        if (signal?.aborted) throw new UploadCancelledError()

        if (!error) {
          const { data: urlData } = supabase.storage.from("documents").getPublicUrl(storagePath)
          uploaded.push({ id, name: file.name, size: file.size, storagePath, url: urlData.publicUrl })
        } else {
          uploaded.push({ id, name: file.name, size: file.size })
        }
      } else {
        uploaded.push({ id, name: file.name, size: file.size })
      }
    }

    return uploaded
  } catch (error) {
    if (error instanceof UploadCancelledError || signal?.aborted) {
      await removeAttachmentsFromStorage(uploaded)
      throw new UploadCancelledError()
    }
    throw error
  }
}
