import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const role =
    request.cookies.get("sehatkosh_role")?.value ||
    request.headers.get("x-sehatkosh-role") ||
    request.headers.get("sehatkosh_role");

  const checkRole = (allowedRoles: string[]) => {
    if (!role || !allowedRoles.includes(role)) {
      const redirectUrl = new URL("/login", request.url);
      redirectUrl.searchParams.set("error", "unauthorized");
      redirectUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return NextResponse.next();
  };

  if (pathname.startsWith("/doctor")) {
    return checkRole(["doctor", "super-admin"]);
  }

  if (pathname.startsWith("/registrar")) {
    return checkRole(["registrar", "super-admin"]);
  }

  if (pathname.startsWith("/admin")) {
    return checkRole(["super-admin", "admin"]);
  }

  if (pathname.startsWith("/hospital-admin")) {
    return checkRole(["hospital-admin", "super-admin"]);
  }

  if (pathname.startsWith("/research")) {
    return checkRole(["researcher", "super-admin"]);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/doctor/:path*",
    "/registrar/:path*",
    "/admin/:path*",
    "/hospital-admin/:path*",
    "/research/:path*",
  ],
};
