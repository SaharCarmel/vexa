import Navbar from "@/components/Navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="ml-56 flex-1 p-8">{children}</main>
    </div>
  )
}
