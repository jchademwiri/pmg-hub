'use client'

import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  async function handleSignOut() {
    await signOut()
    window.location.href = '/login'
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
      onClick={handleSignOut}
    >
      <LogOut className="size-4" />
      Sign out
    </Button>
  )
}
