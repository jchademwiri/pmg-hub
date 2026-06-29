'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link href={href}>
        <ChevronLeft className="size-4 mr-1" />
        {label}
      </Link>
    </Button>
  )
}
