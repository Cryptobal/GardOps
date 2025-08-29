import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Middleware simplificado para evitar errores en producción
  try {
    // Solo en desarrollo y solo para rutas de API
    const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
    const isDev = process.env.NODE_ENV !== "production";
    
    if (isDev && devEmail && req.nextUrl.pathname.startsWith("/api/")) {
      // No suplantar cuando hay un usuario autenticado real
      const hasAuthHeader = !!req.headers.get("authorization");
      const cookieHeader = req.headers.get("cookie") || "";
      const hasAuthCookie = /(?:^|;\s*)auth_token=/.test(cookieHeader);
      
      if (hasAuthHeader || hasAuthCookie) {
        return NextResponse.next();
      }
      
      const headers = new Headers(req.headers);
      headers.set("x-user-email", devEmail);
      return NextResponse.next({ request: { headers } });
    }
    
    return NextResponse.next();
  } catch (error) {
    // En caso de error, simplemente continuar sin middleware
    console.error("Middleware error:", error);
    return NextResponse.next();
  }
}

// Aplica solo a rutas específicas para evitar conflictos
export const config = {
  matcher: [
    "/api/auth/:path*",
    "/api/clientes/:path*",
    "/api/instalaciones/:path*",
    "/api/guardias/:path*"
  ],
};


