import { describe, expect, it } from "vitest"
import { getFixedDropdownStyle } from "@/lib/dropdown-utils"

function mockRect(overrides: Partial<DOMRect> & Pick<DOMRect, "top" | "bottom" | "left" | "width">): DOMRect {
  return {
    top: overrides.top,
    bottom: overrides.bottom,
    left: overrides.left,
    width: overrides.width,
    right: overrides.left + overrides.width,
    height: overrides.bottom - overrides.top,
    x: overrides.left,
    y: overrides.top,
    toJSON: () => ({}),
  } as DOMRect
}

describe("getFixedDropdownStyle", () => {
  it("opens upward when there is not enough space below", () => {
    const rect = mockRect({ top: 620, bottom: 656, left: 100, width: 260 })
    const style = getFixedDropdownStyle(rect, 380, 260)

    expect(style.bottom).toBeDefined()
    expect(style.top).toBeUndefined()
  })

  it("opens downward when there is enough space below", () => {
    const rect = mockRect({ top: 120, bottom: 156, left: 100, width: 260 })
    const style = getFixedDropdownStyle(rect, 380, 260)

    expect(style.top).toBe(160)
    expect(style.bottom).toBeUndefined()
  })

  it("constrains height when neither direction fully fits", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 500 })

    const rect = mockRect({ top: 240, bottom: 276, left: 100, width: 260 })
    const style = getFixedDropdownStyle(rect, 380, 260)

    expect(typeof style.maxHeight).toBe("number")
    expect(style.maxHeight as number).toBeLessThan(380)
    expect(style.overflowY).toBe("auto")
  })

  it("does not exceed available vertical space when space is tight", () => {
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 200 })

    const rect = mockRect({ top: 130, bottom: 166, left: 100, width: 260 })
    const style = getFixedDropdownStyle(rect, 380, 260)

    expect(typeof style.maxHeight).toBe("number")
    expect(style.maxHeight as number).toBeLessThanOrEqual(118)
  })

  it("clamps horizontal position near the right edge", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 400 })

    const rect = mockRect({ top: 120, bottom: 156, left: 320, width: 60 })
    const style = getFixedDropdownStyle(rect, 220, 260)

    expect(style.left as number).toBeLessThanOrEqual(400 - 260 - 8)
  })
})
