"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { signIn } from "@/lib/auth-client"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn.magicLink({ email, callbackURL: "/dashboard" })

    setLoading(false)

    if (result?.error) {
      setError("Unable to sign in. Please check your email and try again.")
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>          <div className="flex flex-col items-center gap-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/pmg-logo.svg" alt="PMG" width={40} height={40} />
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="text-sm text-muted-foreground text-balance">
            We sent a sign-in link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            <br />
            Click it to access PMG Control Center.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSent(false)
              setEmail("")
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-2 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/pmg-logo.svg" alt="PMG" width={40} height={40} />
            <h1 className="text-xl font-bold">PMG Control Center</h1>
          <FieldDescription>
            Sign in to manage billing, finance, and projects
          </FieldDescription>
          </div>
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="you@playhousemedia.co.za"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="email"
              autoFocus
            />
          </Field>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Field>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending..." : "Send sign-in link"}
            </Button>
          </Field>
        </FieldGroup>
      </form>

    </div>
  )
}
