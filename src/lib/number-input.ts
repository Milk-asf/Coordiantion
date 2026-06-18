export interface FormatNumberInputOptions {
  maxDecimals?: number
}

export function parseFormattedNumber(value: string): number {
  const normalized = value.replace(/,/g, "").trim()
  if (!normalized || normalized === ".") return 0
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatNumberInput(value: string, options: FormatNumberInputOptions = {}): string {
  const { maxDecimals = 2 } = options
  if (!value) return ""

  let sanitized = value.replace(/,/g, "").replace(/[^\d.]/g, "")
  const firstDot = sanitized.indexOf(".")
  if (firstDot !== -1) {
    sanitized = sanitized.slice(0, firstDot + 1) + sanitized.slice(firstDot + 1).replace(/\./g, "")
  }

  const endsWithDot = sanitized.endsWith(".")
  const [intRaw = "", decRaw = ""] = sanitized.split(".")
  const limitedDec = maxDecimals >= 0 ? decRaw.slice(0, maxDecimals) : decRaw

  if (!intRaw && !decRaw && sanitized !== ".") return ""

  const formattedInt = intRaw === ""
    ? ""
    : Number(intRaw).toLocaleString("en-AU", { maximumFractionDigits: 0 })

  if (firstDot !== -1) {
    if (endsWithDot && limitedDec === "") return `${formattedInt || "0"}.`
    return `${formattedInt || "0"}.${limitedDec}`
  }

  return formattedInt
}

export function formatNumberDisplay(value: number, options: FormatNumberInputOptions = {}): string {
  if (!Number.isFinite(value) || value === 0) return ""
  const { maxDecimals = 2 } = options
  return value.toLocaleString("en-AU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  })
}
