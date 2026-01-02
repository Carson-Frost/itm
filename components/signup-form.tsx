"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { signUpWithEmail, signInWithGoogle, checkUsernameAvailable, validatePassword } from "@/lib/auth-actions"
import { toast } from "sonner"

type ValidationState = "idle" | "checking" | "available" | "taken" | "too-short" | "invalid"

export function SignupForm({
  className,
  returnTo = "/",
  ...props
}: React.ComponentProps<"form"> & { returnTo?: string }) {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [usernameValidation, setUsernameValidation] = useState<ValidationState>("idle")
  const [emailValid, setEmailValid] = useState(true)
  const [passwordValidation, setPasswordValidation] = useState<{ valid: boolean; error?: string }>({ valid: true })
  const [passwordsMatch, setPasswordsMatch] = useState(true)

  useEffect(() => {
    if (!username) {
      setUsernameValidation("idle")
      return
    }

    const usernameRegex = /^[a-zA-Z0-9_-]+$/
    if (!usernameRegex.test(username)) {
      setUsernameValidation("invalid")
      return
    }

    if (username.length < 3) {
      setUsernameValidation("too-short")
      return
    }

    if (username.length > 20) {
      setUsernameValidation("invalid")
      return
    }

    const timer = setTimeout(async () => {
      setUsernameValidation("checking")
      const available = await checkUsernameAvailable(username.trim())
      setUsernameValidation(available ? "available" : "taken")
    }, 500)

    return () => clearTimeout(timer)
  }, [username])

  useEffect(() => {
    if (!email) {
      setEmailValid(true)
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    setEmailValid(emailRegex.test(email))
  }, [email])

  useEffect(() => {
    if (!password) {
      setPasswordValidation({ valid: true })
      return
    }
    setPasswordValidation(validatePassword(password))
  }, [password])

  useEffect(() => {
    if (!confirmPassword) {
      setPasswordsMatch(true)
      return
    }
    setPasswordsMatch(password === confirmPassword)
  }, [password, confirmPassword])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()

    if (usernameValidation !== "available") {
      toast.error("Please enter a valid available username")
      return
    }

    if (!emailValid) {
      toast.error("Please enter a valid email")
      return
    }

    if (!passwordValidation.valid) {
      toast.error(passwordValidation.error)
      return
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match")
      return
    }

    setLoading(true)
    try {
      await signUpWithEmail(email, password, username.trim())
      toast.success("Account created successfully")
      router.push(returnTo)
    } catch (error: any) {
      toast.error(error.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
      toast.success("Signed up successfully")
      router.push(returnTo)
    } catch (error: any) {
      toast.error(error.message || "Failed to sign up with Google")
    } finally {
      setLoading(false)
    }
  }

  const getUsernameValidationMessage = () => {
    switch (usernameValidation) {
      case "checking":
        return { text: "Checking...", className: "text-muted-foreground" }
      case "available":
        return { text: "Available", className: "text-green-600 dark:text-green-500" }
      case "taken":
        return { text: "Taken", className: "text-destructive" }
      case "too-short":
        return { text: "Too Short", className: "text-destructive" }
      case "invalid":
        return { text: "Invalid Characters", className: "text-destructive" }
      default:
        return null
    }
  }

  const usernameMessage = getUsernameValidationMessage()
  const emailMessage = email && !emailValid ? { text: "Invalid", className: "text-destructive" } : null

  const getPasswordMessage = () => {
    if (!password || passwordValidation.valid) return null
    const error = passwordValidation.error || ""
    if (error.includes("at least")) return { text: "Too Short", className: "text-destructive" }
    return { text: "Too Weak", className: "text-destructive" }
  }
  const passwordMessage = getPasswordMessage()

  const confirmPasswordMessage = confirmPassword && !passwordsMatch ? { text: "Does Not Match", className: "text-destructive" } : null

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSignup}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Fill in the form below to create your account
          </p>
        </div>
        <Field className="gap-1.5 -mt-2">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="email">Email</FieldLabel>
            {emailMessage && (
              <span className={`text-xs ${emailMessage.className}`}>
                {emailMessage.text}
              </span>
            )}
          </div>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field className="gap-1.5">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="username">Username</FieldLabel>
            {usernameMessage && (
              <span className={`text-xs ${usernameMessage.className}`}>
                {usernameMessage.text}
              </span>
            )}
          </div>
          <Input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <FieldDescription>
            3-20 characters, letters, numbers, underscores and hyphens only.
          </FieldDescription>
        </Field>
        <Field className="gap-1.5">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            {passwordMessage && (
              <span className={`text-xs ${passwordMessage.className}`}>
                {passwordMessage.text}
              </span>
            )}
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <FieldDescription>
            Must be at least 8 characters long.
          </FieldDescription>
        </Field>
        <Field className="gap-1.5">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
            {confirmPasswordMessage && (
              <span className={`text-xs ${confirmPasswordMessage.className}`}>
                {confirmPasswordMessage.text}
              </span>
            )}
          </div>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Field>
        <Field className="mt-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </Field>
        <FieldSeparator>Or continue with</FieldSeparator>
        <Field>
          <Button variant="outline" type="button" onClick={handleGoogleSignup} disabled={loading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign up with Google
          </Button>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="underline underline-offset-4">
              Sign in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
