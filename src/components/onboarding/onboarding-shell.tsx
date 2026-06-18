"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { OnboardingProgress } from "./onboarding-progress"
import { OnboardingPreview } from "./onboarding-preview"
import { getPrevStep, type OnboardingStepId } from "@/lib/onboarding/onboarding-steps"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"

interface OnboardingShellProps {
  step: OnboardingStepId
  index: number
  title: string
  children: React.ReactNode
}

export function OnboardingShell({ step, index, title, children }: OnboardingShellProps) {
  const router = useRouter()
  const prev = getPrevStep(step)

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen flex-col bg-folk-surface">
      <header className="flex items-center justify-center px-[24px] py-[28px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-green-600 text-[12px] font-semibold text-white">
            C
          </div>
          <span className="text-[16px] font-semibold text-folk-text">Coordination</span>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-[24px] pb-[40px]">
        <div className="w-full max-w-[1040px] overflow-hidden rounded-[14px] border border-[#e2e2e2] bg-folk-surface shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
            <section className="flex flex-col gap-[24px] px-[40px] py-[40px]">
              <div className="flex items-center justify-between">
                {prev ? (
                  <Link
                    href={prev.route}
                    className="flex h-[28px] w-[28px] items-center justify-center rounded-full text-folk-secondary transition-colors hover:bg-[#f3f3f3] hover:text-folk-text"
                    aria-label={`Back to ${prev.title}`}
                    tabIndex={0}
                  >
                    <ArrowLeft className="h-[14px] w-[14px]" strokeWidth={1.75} />
                  </Link>
                ) : (
                  <span />
                )}
                <OnboardingProgress current={index} />
              </div>

              <div>
                <h1 className="text-[22px] font-semibold leading-tight text-folk-text">{title}</h1>
              </div>

              {children}
            </section>

            <aside className="hidden bg-folk-page lg:flex">
              <OnboardingPreview step={step} />
            </aside>
          </div>
        </div>
      </main>

      <footer className="flex items-center justify-center gap-[20px] px-[24px] pb-[32px] text-[12px] font-medium text-folk-secondary">
        <span>&copy; {new Date().getFullYear()} Coordination</span>
        <Link href="/privacy" className="transition-colors hover:text-folk-text">
          Privacy
        </Link>
        <Link href="/support" className="transition-colors hover:text-folk-text">
          Support
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          className="transition-colors hover:text-folk-text"
          tabIndex={0}
        >
          Sign out
        </button>
      </footer>
    </div>
  )
}
