
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(_req: NextRequest) {
  // Temporary bypass for build
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}