import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;

  if (pathname.startsWith("/panel") && !req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname.startsWith("/panel/admin") && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/panel", req.url));
  }

  if (pathname.startsWith("/panel/dodaj") && role !== "EDITOR" && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/panel", req.url));
  }
});

export const config = {
  matcher: ["/panel/:path*"],
};
