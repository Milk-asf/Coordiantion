// Smoke-mounts real dashboard pages inside the real provider tree (local
// demo mode — Supabase unconfigured in tests). Catches render-time crashes
// that only surface when a page runs with the full context stack.
import { describe, expect, it, vi, beforeAll } from "vitest"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"

const push = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), prefetch: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
}))

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}))

beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  }
  if (!("ResizeObserver" in globalThis)) {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    ;(globalThis as Record<string, unknown>).ResizeObserver = RO
  }
  if (!("IntersectionObserver" in globalThis)) {
    class IO {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    ;(globalThis as Record<string, unknown>).IntersectionObserver = IO
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {}
  }
  window.scrollTo = (() => {}) as typeof window.scrollTo
})

async function mountPage(importPage: () => Promise<{ default: React.ComponentType }>) {
  const { default: DashboardLayout } = await import("@/app/(dashboard)/layout")
  const { default: Page } = await importPage()
  return render(
    <DashboardLayout>
      <Page />
    </DashboardLayout>,
  )
}

describe("dashboard pages mount inside the real provider tree", () => {
  it("tasks page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/tasks/page"))
    expect(view.container.textContent).toBeTruthy()
  }, 15000)

  it("invoices page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/invoices/page"))
    expect(view.container.textContent).toBeTruthy()
  }, 15000)

  it("invoices page survives corrupt saved views in localStorage", async () => {
    localStorage.setItem(
      "sent-invoices-views",
      JSON.stringify([{ id: "legacy-view", name: "Legacy view" }]),
    )
    localStorage.setItem("sent-invoices-active-view", "legacy-view")

    const view = await mountPage(() => import("@/app/(dashboard)/invoices/page"))
    expect(view.container.textContent).toMatch(/Invoicing/i)

    localStorage.removeItem("sent-invoices-views")
    localStorage.removeItem("sent-invoices-active-view")
  }, 15000)

  it("tasks page survives corrupt saved views in localStorage", async () => {
    localStorage.setItem(
      "task-views",
      JSON.stringify([{ id: "legacy-view", name: "Legacy view" }]),
    )
    localStorage.setItem("task-active-view", "legacy-view")

    const view = await mountPage(() => import("@/app/(dashboard)/tasks/page"))
    expect(view.container.textContent).toMatch(/Tasks/i)

    localStorage.removeItem("task-views")
    localStorage.removeItem("task-active-view")
  }, 15000)

  it("clients page survives corrupt saved views in localStorage", async () => {
    localStorage.setItem(
      "client-views",
      JSON.stringify([{ id: "legacy-view", name: "Legacy view" }]),
    )
    localStorage.setItem("client-active-view", "legacy-view")

    const view = await mountPage(() => import("@/app/(dashboard)/clients/page"))
    expect(view.container.textContent).toMatch(/Clients/i)

    localStorage.removeItem("client-views")
    localStorage.removeItem("client-active-view")
  }, 15000)

  it("contacts page survives corrupt saved views in localStorage", async () => {
    localStorage.setItem(
      "contact-views",
      JSON.stringify([{ id: "legacy-view", name: "Legacy view" }]),
    )
    localStorage.setItem("contact-active-view", "legacy-view")

    const view = await mountPage(() => import("@/app/(dashboard)/contacts/page"))
    expect(view.container.textContent).toMatch(/Contacts/i)

    localStorage.removeItem("contact-views")
    localStorage.removeItem("contact-active-view")
  }, 15000)

  it("staff page survives corrupt saved views in localStorage", async () => {
    localStorage.setItem(
      "staff-views",
      JSON.stringify([{ id: "legacy-view", name: "Legacy view" }]),
    )
    localStorage.setItem("staff-active-view", "legacy-view")

    const view = await mountPage(() => import("@/app/(dashboard)/staff/page"))
    expect(view.container.textContent).toMatch(/Staff/i)

    localStorage.removeItem("staff-views")
    localStorage.removeItem("staff-active-view")
  }, 15000)

  it("notes page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/notes/page"))
    expect(view.container.textContent).toBeTruthy()
  }, 15000)

  it("incidents page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/incidents/page"))
    expect(view.container.textContent).toMatch(/Incidents/i)
  }, 15000)

  it("clients page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/clients/page"))
    expect(view.container.textContent).toBeTruthy()
  }, 15000)

  it("business approvals page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/business/approvals/page"))
    expect(view.container.textContent).toBeTruthy()
  }, 15000)

  it("roster page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/roster/page"))
    expect(view.container.textContent).toBeTruthy()
  }, 15000)

  it("my day page renders", async () => {
    const view = await mountPage(() => import("@/app/(dashboard)/my-day/page"))
    expect(view.container.textContent).toBeTruthy()
  }, 15000)
})
