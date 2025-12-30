import { Navbar } from "@/components/navbar"

export default function TradeCalculator() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">Trade Calculator</h1>
      </main>
    </div>
  )
}
