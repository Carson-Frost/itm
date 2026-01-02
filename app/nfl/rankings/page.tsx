import { Navbar } from "@/components/navbar"

export default function NFLRankings() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-4">NFL Rankings</h1>
        </div>
      </main>
    </div>
  )
}
