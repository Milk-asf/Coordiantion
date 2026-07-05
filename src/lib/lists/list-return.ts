"use client"

import { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export const LIST_RETURN_PARAM = "fromList"

type SearchParamsLike = { get(name: string): string | null }

/** Append `fromList=<listId>` so detail pages can navigate back to a custom list. */
export function appendListReturnParam(href: string, listId: string): string {
  const [path, query = ""] = href.split("?")
  const params = new URLSearchParams(query)
  params.set(LIST_RETURN_PARAM, listId)
  const nextQuery = params.toString()
  return nextQuery ? `${path}?${nextQuery}` : path
}

export function getListReturnPath(searchParams: SearchParamsLike): string | null {
  const listId = searchParams.get(LIST_RETURN_PARAM)?.trim()
  if (!listId) return null
  return `/lists/${listId}`
}

interface ListReturnFallback {
  path: string
  label: string
}

/** Back navigation that returns to a custom list when `fromList` is present. */
export function useListReturnBack(fallback: ListReturnFallback) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listReturnPath = getListReturnPath(searchParams)

  const onBack = useCallback(() => {
    router.push(listReturnPath ?? fallback.path)
  }, [router, listReturnPath, fallback.path])

  const backLabel = listReturnPath ? "Back to list" : fallback.label

  useEffect(() => {
    if (!listReturnPath) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return
      }
      event.preventDefault()
      onBack()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [listReturnPath, onBack])

  return { onBack, backLabel, listReturnPath }
}
