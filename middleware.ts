import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Middleware vacío - solo continuar con la request
  return NextResponse.next()
}

// No aplicar a ninguna ruta específica
export const config = {
  matcher: []
}