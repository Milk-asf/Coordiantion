import Link from "next/link"

interface LegalShellProps {
  title: string
  updatedAt: string
  children: React.ReactNode
}

export function LegalShell({ title, updatedAt, children }: LegalShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-folk-surface">
      <header className="flex items-center justify-between px-[24px] py-[20px] sm:px-[40px]">
        <Link href="/" className="flex items-center gap-[8px]" aria-label="Coordination home" tabIndex={0}>
          <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full bg-green-600 text-[12px] font-semibold text-white">
            C
          </div>
          <span className="text-[16px] font-semibold text-folk-text">Coordination</span>
        </Link>
        <Link
          href="/login"
          className="rounded-none border border-folk-border bg-folk-surface px-[14px] py-[7px] text-[13px] font-medium text-folk-text transition-colors hover:bg-[#f3f3f3]"
          tabIndex={0}
        >
          Sign in
        </Link>
      </header>

      <main className="flex flex-1 justify-center px-[24px] pb-[64px] sm:px-[40px]">
        <article className="w-full max-w-[760px]">
          <div className="mb-[28px] border-b border-folk-border pb-[20px]">
            <h1 className="text-[28px] font-semibold leading-tight text-folk-text">{title}</h1>
            <p className="mt-[8px] text-[13px] text-folk-secondary">Last updated {updatedAt}</p>
          </div>
          <div className="flex flex-col gap-[24px] text-[14px] leading-relaxed text-[#444]">{children}</div>
        </article>
      </main>

      <footer className="flex items-center justify-center gap-[20px] px-[24px] pb-[32px] text-[12px] font-medium text-folk-secondary">
        <span>&copy; {new Date().getFullYear()} Coordination</span>
        <Link href="/privacy" className="transition-colors hover:text-folk-text">
          Privacy
        </Link>
        <Link href="/support" className="transition-colors hover:text-folk-text">
          Support
        </Link>
      </footer>
    </div>
  )
}

interface LegalSectionProps {
  heading: string
  children: React.ReactNode
}

export function LegalSection({ heading, children }: LegalSectionProps) {
  return (
    <section className="flex flex-col gap-[8px]">
      <h2 className="text-[16px] font-semibold text-folk-text">{heading}</h2>
      {children}
    </section>
  )
}
