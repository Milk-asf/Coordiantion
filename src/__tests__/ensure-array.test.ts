import { describe, expect, it } from "vitest"
import { ensureStringArray } from "@/lib/ensure-array"

describe("ensureStringArray", () => {
  it("returns fallback for non-arrays", () => {
    expect(ensureStringArray(undefined, ["a"])).toEqual(["a"])
    expect(ensureStringArray(null, ["b"])).toEqual(["b"])
    expect(ensureStringArray({}, ["c"])).toEqual(["c"])
  })

  it("filters non-string entries", () => {
    expect(ensureStringArray(["a", 1, "b", null], [])).toEqual(["a", "b"])
  })
})
