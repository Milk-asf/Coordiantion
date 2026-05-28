import { ToastProvider } from "@/components/toast"

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ToastProvider>{children}</ToastProvider>
}
