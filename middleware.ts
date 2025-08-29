import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Solo en desarrollo y solo para rutas de API
  const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  const pathname = req.nextUrl.pathname;
  
  console.log('🔍 Middleware: Procesando ruta:', pathname);
  console.log('🔍 Middleware: NODE_ENV:', process.env.NODE_ENV);
  console.log('🔍 Middleware: DEV_EMAIL:', devEmail);
  
  if (process.env.NODE_ENV === "development" && devEmail && pathname.startsWith("/api/")) {
    console.log('✅ Middleware: Agregando header x-user-email:', devEmail);
    const headers = new Headers(req.headers);
    headers.set("x-user-email", devEmail);
    return NextResponse.next({ request: { headers } });
  }
  
  console.log('⚠️ Middleware: No se agregó header (no es API o no hay email)');
  return NextResponse.next();
}

// Aplica a todas las rutas de API
export const config = {
  matcher: ["/api/:path*"],
};


