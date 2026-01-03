import { Navbar } from "@/components/navbar"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 relative z-0">
        <div className="w-full max-w-[1400px] mx-auto pt-4 pb-4 sm:pb-8 px-3 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 underline">Home</h1>
        </div>
      </main>
    </div>
  )
}