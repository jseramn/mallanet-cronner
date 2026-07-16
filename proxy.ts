import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/** Forwards pathname/search so RSC layouts can gate onboarding without a full auth proxy. */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', request.nextUrl.pathname)
  requestHeaders.set('x-search', request.nextUrl.search)
  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|.*\\..*).*)'],
}
