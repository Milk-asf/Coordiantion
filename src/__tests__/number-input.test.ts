import { describe, expect, it } from "vitest"
import { formatNumberDisplay, formatNumberInput, parseFormattedNumber } from "@/lib/number-input"

describe("number-input", () => {
  it("formats whole numbers with commas while typing", () => {
    expect(formatNumberInput("1000")).toBe("1,000")
    expect(formatNumberInput("1000000")).toBe("1,000,000")
  })

  it("preserves decimals while formatting", () => {
    expect(formatNumberInput("1000.5")).toBe("1,000.5")
    expect(formatNumberInput("1000.")).toBe("1,000.")
  })

  it("parses formatted numbers", () => {
    expect(parseFormattedNumber("1,000,000")).toBe(1000000)
    expect(parseFormattedNumber("1,234.56")).toBe(1234.56)
  })

  it("formats numbers for display", () => {
    expect(formatNumberDisplay(12000)).toBe("12,000")
    expect(formatNumberDisplay(1234.5)).toBe("1,234.5")
  })
})
