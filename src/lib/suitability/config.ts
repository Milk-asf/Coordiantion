import type { SuitabilityStatus } from "@/lib/suitability/types"

export const SUITABILITY_STATUSES: SuitabilityStatus[] = ["suitable", "preferred", "disallowed"]

export const suitabilityStatusConfig: Record<
  SuitabilityStatus,
  { label: string; chipClassName: string; selectClassName: string }
> = {
  suitable: {
    label: "Suitable",
    chipClassName: "bg-[var(--folk-border-subtle)] text-[#555]",
    selectClassName: "text-folk-text",
  },
  preferred: {
    label: "Preferred",
    chipClassName: "bg-[#DCFCE7] text-[#166534]",
    selectClassName: "text-[#166534]",
  },
  disallowed: {
    label: "Disallowed",
    chipClassName: "bg-[#FEE2E2] text-[#991B1B]",
    selectClassName: "text-[#991B1B]",
  },
}

export const DEFAULT_SUITABILITY_STATUS: SuitabilityStatus = "suitable"

export function isDisallowedStatus(status: SuitabilityStatus): boolean {
  return status === "disallowed"
}
