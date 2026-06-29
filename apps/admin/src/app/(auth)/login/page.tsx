import Image from 'next/image'
import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh">
      {/* Decorative left panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="flex flex-col gap-4 text-primary-foreground max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/pmg-logo.svg" alt="PMG" width={48} height={48} className="invert" />
          <h2 className="text-2xl font-bold">Playhouse Media Group</h2>
          <p className="text-primary-foreground/70 text-sm">Internal management platform for billing, finance, and project tracking.</p>
        </div>
      </div>
      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
