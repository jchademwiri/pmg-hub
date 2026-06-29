import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  buildHref: (page: number) => string
  className?: string
}

export function Pagination({ currentPage, totalPages, buildHref, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages: (number | '...')[] = []
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <nav className={cn('flex items-center justify-between px-2 py-2', className)} aria-label="Pagination">
      <div className="flex items-center gap-1">
        {currentPage > 1 && (
          <Link
            href={buildHref(currentPage - 1)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-3.5" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        )}
      </div>

      <div className="hidden sm:flex items-center gap-1">
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 py-1 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={page}
              href={buildHref(page)}
              className={cn(
                'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm transition-colors',
                page === currentPage
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-muted'
              )}
              aria-current={page === currentPage ? 'page' : undefined}
            >
              {page}
            </Link>
          )
        )}
      </div>

      <div className="flex items-center gap-1">
        {currentPage < totalPages && (
          <Link
            href={buildHref(currentPage + 1)}
            className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="size-3.5" />
          </Link>
        )}
      </div>
    </nav>
  )
}
