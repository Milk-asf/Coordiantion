/** Folk CRM chip palette — soft fills with saturated text (see folk status pills). */
export const FOLK_CHIP_PALETTE = {
  green: "bg-[#e8f5e9] text-[#2e7d32]",
  yellow: "bg-[#fff8e1] text-[#f57f17]",
  rose: "bg-[#fce4ec] text-[#c62828]",
  orange: "bg-[#fff3e0] text-[#e65100]",
  purple: "bg-[#f3e5f5] text-[#7b1fa2]",
  blue: "bg-[#e3f2fd] text-[#1565c0]",
  slate: "bg-[#eef2f6] text-[#334155]",
} as const

export type FolkChipTone = keyof typeof FOLK_CHIP_PALETTE

const FOLK_CHIP_TONE_SET = new Set<string>(Object.keys(FOLK_CHIP_PALETTE))

export function isFolkChipTone(value: unknown): value is FolkChipTone {
  return typeof value === "string" && FOLK_CHIP_TONE_SET.has(value)
}

/** Soft card fills for roster shifts (matches chip palette). */
export const FOLK_CHIP_SURFACE_PALETTE: Record<FolkChipTone, string> = {
  green: "bg-[#e8f5e9]",
  yellow: "bg-[#fff8e1]",
  rose: "bg-[#fce4ec]",
  orange: "bg-[#fff3e0]",
  purple: "bg-[#f3e5f5]",
  blue: "bg-[#e3f2fd]",
  slate: "bg-[#eef2f6]",
}

/** Matching borders for tinted shift cards. */
export const FOLK_CHIP_BORDER_PALETTE: Record<FolkChipTone, string> = {
  green: "border-[#c8e6c9]",
  yellow: "border-[#ffe082]",
  rose: "border-[#f8bbd0]",
  orange: "border-[#ffcc80]",
  purple: "border-[#e1bee7]",
  blue: "border-[#bbdefb]",
  slate: "border-[#cfd8dc]",
}

export const FOLK_CHIP_TONE_OPTIONS: { tone: FolkChipTone; label: string }[] = [
  { tone: "blue", label: "Blue" },
  { tone: "green", label: "Green" },
  { tone: "purple", label: "Purple" },
  { tone: "orange", label: "Orange" },
  { tone: "rose", label: "Rose" },
  { tone: "yellow", label: "Yellow" },
  { tone: "slate", label: "Slate" },
]

/** Roster week column header colors (Sun–Sat). */
export const ROSTER_WEEKDAY_TONES: Record<number, FolkChipTone> = {
  0: "slate",
  1: "purple",
  2: "blue",
  3: "yellow",
  4: "orange",
  5: "rose",
  6: "green",
}

const TONE_CYCLE: FolkChipTone[] = ["purple", "green", "orange", "rose", "yellow"]

export const FOLK_CHIP_BASE = "folk-chip inline-flex shrink-0 items-center whitespace-nowrap font-medium"

export const FOLK_CHIP_SIZES = {
  sm: "h-[20px] px-[8px] text-[11px] font-medium",
  md: "h-[20px] px-[8px] text-[11px] font-medium",
  lg: "h-[24px] px-[12px] text-[12px] font-medium",
} as const

export function hashToChipTone(key: string): FolkChipTone {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash + key.charCodeAt(i) * (i + 1)) % TONE_CYCLE.length
  return TONE_CYCLE[hash]
}

export function getChipToneForKey(key: string, toneMap?: Record<string, FolkChipTone>): FolkChipTone {
  const normalized = key.trim().toLowerCase()
  return toneMap?.[key] ?? toneMap?.[normalized] ?? hashToChipTone(normalized || key)
}

export function getCategoryChipClasses(
  key: string,
  options?: { toneMap?: Record<string, FolkChipTone>; size?: keyof typeof FOLK_CHIP_SIZES }
): string {
  const tone = getChipToneForKey(key, options?.toneMap)
  const size = FOLK_CHIP_SIZES[options?.size ?? "md"]
  return `${FOLK_CHIP_BASE} ${size} ${FOLK_CHIP_PALETTE[tone]}`
}

export function getToneChipClasses(tone: FolkChipTone, size: keyof typeof FOLK_CHIP_SIZES = "md"): string {
  return `${FOLK_CHIP_BASE} ${FOLK_CHIP_SIZES[size]} ${FOLK_CHIP_PALETTE[tone]}`
}

export function getToneSurfaceClasses(tone: FolkChipTone): string {
  return FOLK_CHIP_SURFACE_PALETTE[tone]
}

export function getToneBorderClasses(tone: FolkChipTone): string {
  return FOLK_CHIP_BORDER_PALETTE[tone]
}

export const FUNDING_TYPE_TONES: Record<string, FolkChipTone> = {
  "plan-managed": "purple",
  "ndia-managed": "orange",
  "self-managed": "green",
}

export const GOAL_TYPE_TONES: Record<string, FolkChipTone> = {
  "long-term": "purple",
  "short-term": "orange",
}

export const RELATIONSHIP_TONES: Record<string, FolkChipTone> = {
  "plan-manager": "purple",
  "support-coordinator": "green",
  "general-practitioner": "rose",
  pharmacy: "yellow",
  "mental-health": "orange",
  physiotherapist: "green",
  "decision-maker-opg": "rose",
  "public-trustee": "yellow",
  "next-of-kin": "purple",
  consumables: "orange",
  "cas-provider": "green",
  "sil-provider": "purple",
}

export function getFundingTypeChipClasses(fundingType: string, size: keyof typeof FOLK_CHIP_SIZES = "md") {
  return getCategoryChipClasses(fundingType || "unknown", { toneMap: FUNDING_TYPE_TONES, size })
}

export function getGoalTypeChipClasses(goalType: string) {
  return getCategoryChipClasses(goalType, { toneMap: GOAL_TYPE_TONES })
}

export function getRelationshipChipClasses(relationship: string, size: keyof typeof FOLK_CHIP_SIZES = "md") {
  return getCategoryChipClasses(relationship, { toneMap: RELATIONSHIP_TONES, size })
}

export const GENDER_TONES: Record<string, FolkChipTone> = {
  male: "green",
  female: "purple",
  "non-binary": "orange",
  other: "yellow",
  "prefer not to say": "slate",
}

export const PRONOUNS_TONES: Record<string, FolkChipTone> = {
  "he/him": "green",
  "she/her": "purple",
  "they/them": "orange",
  other: "yellow",
}

export const EMPLOYMENT_TYPE_TONES: Record<string, FolkChipTone> = {
  "full-time": "green",
  "part-time": "purple",
  casual: "orange",
  contract: "yellow",
}

function normalizeChipKey(value: string) {
  return value.trim().toLowerCase()
}

export function getProfileFieldChipClasses(
  fieldKey: string,
  value: string,
  size: keyof typeof FOLK_CHIP_SIZES = "sm"
) {
  const normalized = normalizeChipKey(value)
  const toneMaps: Record<string, Record<string, FolkChipTone>> = {
    fundingType: FUNDING_TYPE_TONES,
    gender: GENDER_TONES,
    language: {},
    ethnicity: {},
    pronouns: PRONOUNS_TONES,
    preferredContactMethod: {},
    preferredSignMethod: {},
    role: {},
    department: {},
    employmentType: EMPLOYMENT_TYPE_TONES,
  }
  return getCategoryChipClasses(normalized || value, { toneMap: toneMaps[fieldKey], size })
}
