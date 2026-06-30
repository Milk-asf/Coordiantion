"use client"

import { createPortal } from "react-dom"
import { EntityIcon } from "@/components/entity-icon"
import { getFolkStatusClass } from "@/lib/folk-ui"
import type { CustomFieldTypeDef } from "@/lib/lists/custom-field-types"
import { cn } from "@/lib/utils"

interface FieldTypePreviewProps {
  fieldType: CustomFieldTypeDef
  anchorRect: DOMRect
}

function getMemberInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function FieldTypePreview({ fieldType, anchorRect }: FieldTypePreviewProps) {
  const top = anchorRect.top
  const left = anchorRect.left - 248

  const content = (
    <div
      className="fixed z-[10001] w-[236px] rounded-[8px] border border-folk-border bg-white p-[12px] shadow-folk-md"
      style={{ top, left: Math.max(8, left) }}
      role="tooltip"
    >
      <div className="rounded-[6px] border border-folk-border-subtle bg-folk-surface px-[10px] py-[8px]">
        {fieldType.kind === "member" ? (
          <span className="folk-chip inline-flex max-w-full items-center gap-[6px] border border-folk-border bg-folk-hover py-[3px] pl-[4px] pr-[10px] text-[13px] font-medium text-folk-text">
            <EntityIcon text={getMemberInitials(fieldType.previewValue)} size="sm" />
            <span className="truncate">{fieldType.previewValue}</span>
          </span>
        ) : fieldType.kind === "attachment" ? (
          <span className="inline-flex items-center gap-[6px] text-[13px] text-folk-text">
            <span className="text-folk-secondary">📎</span>
            {fieldType.previewValue}
          </span>
        ) : fieldType.previewChip ? (
          <span
            className={cn(
              "folk-chip inline-flex h-[20px] max-w-full items-center truncate px-[8px] text-[11px] font-medium capitalize",
              getFolkStatusClass(fieldType.previewValue.split(" · ")[0]),
            )}
          >
            {fieldType.previewValue}
          </span>
        ) : (
          <span className="text-[13px] text-folk-text">{fieldType.previewValue}</span>
        )}
      </div>
      <p className="mt-[10px] text-[12px] leading-[1.45] text-folk-secondary">{fieldType.description}</p>
    </div>
  )

  if (typeof document === "undefined") return null
  return createPortal(content, document.body)
}
