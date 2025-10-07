import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Para desarrollo y producción, solo para rutas de API
  const devEmail = process.env.NEXT_PUBLIC_DEV_USER_EMAIL;
  const prodEmail = process.env.PROD_USER_EMAIL || "admin@gard.cl"; // Email por defecto para producción
  const isDev = process.env.NODE_ENV !== "production";
  const email = isDev ? devEmail : prodEmail;
  
  if (email && req.nextUrl.pathname.startsWith("/api/")) {
    // No suplantar cuando hay un usuario autenticado real (JWT en cookie o Authorization)
    const hasAuthHeader = !!req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie") || "";
    const hasAuthCookie = /(?:^|;\s*)auth_token=/.test(cookieHeader);
    const hasExplicitEmailHeader = !!req.headers.get("x-user-email");
    
    if (hasAuthHeader || hasAuthCookie || hasExplicitEmailHeader) {
      return NextResponse.next();
    }
    const headers = new Headers(req.headers);
    headers.set("x-user-email", email);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

// Aplica a todas las rutas de API
export const config = {
  matcher: ["/api/:path*"],
};


