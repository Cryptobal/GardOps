import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Solo en desarrollo y solo para rutas de API
  const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  const isDev = process.env.NODE_ENV !== "production";
  
  if (isDev && req.nextUrl.pathname.startsWith("/api/")) {
    // En desarrollo, permitir acceso sin autenticación estricta
    const hasAuthHeader = !!req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie") || "";
    const hasAuthCookie = /(?:^|;\s*)auth_token=/.test(cookieHeader);
    
    if (hasAuthHeader || hasAuthCookie) {
      return NextResponse.next();
    }
    
    // Si no hay autenticación, agregar headers de desarrollo
    const headers = new Headers(req.headers);
    if (devEmail) {
      headers.set("x-user-email", devEmail);
    }
    
    // Agregar un token de desarrollo temporal
    headers.set("authorization", "Bearer dev-token");
    
    return NextResponse.next({ request: { headers } });
  }
  
  return NextResponse.next();
}

// Aplica a todas las rutas de API
export const config = {
  matcher: ["/api/:path*"],
};


