"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') || '/'

  const handleBack = () => {
    router.push(returnTo)
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2 relative">
      <button
        onClick={handleBack}
        className="absolute left-4 top-4 md:left-6 md:top-6 z-10 hover:opacity-60 transition-opacity"
        aria-label="Go back"
      >
        <ChevronLeft className="h-9 w-9" />
      </button>
      <div className="flex flex-col gap-4 pt-4 pb-6 pl-4 pr-6 md:pt-6 md:pb-10 md:pl-6 md:pr-10">
        <div className="flex justify-center gap-2 md:justify-end">
          <Link href="/" className="font-medium text-xl">
            ITM
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm returnTo={returnTo} />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/placeholder.svg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  )
}
