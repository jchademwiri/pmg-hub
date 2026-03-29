import { NextResponse, type NextRequest } from 'next/server'

export function proxy(_request: NextRequest) {
  // Auth disabled — re-enable by restoring cookie check
  return NextResponse.next()
}

export const config = { matcher: ['/:path*'] }
