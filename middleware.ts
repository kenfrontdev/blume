import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextRequest,
} from "next/server";

const MARKETING_HOSTS = new Set(["getblume.ai", "www.getblume.ai"]);
const APP_HOSTS = new Set(["app.getblume.ai", "app.localhost"]);

const DEV_HOST_COOKIE = "blume-host";

type Surface = "marketing" | "portal";

const hasClerkKeys = () => {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const sk = process.env.CLERK_SECRET_KEY;
  if (!pk || !sk) return false;
  if (pk.includes("placeholder") || sk.includes("placeholder")) return false;
  return pk.startsWith("pk_") && sk.startsWith("sk_");
};

const isAssetPath = (pathname: string) =>
  pathname.startsWith("/_next") ||
  pathname.startsWith("/api") ||
  pathname.startsWith("/__clerk") ||
  /\.[a-zA-Z0-9]+$/.test(pathname);

const isInternalPrefixed = (pathname: string) =>
  pathname === "/web" ||
  pathname.startsWith("/web/") ||
  pathname === "/app" ||
  pathname.startsWith("/app/");

const isPortalPath = (pathname: string) =>
  pathname === "/app" || pathname.startsWith("/app/");

const resolveSurface = (request: NextRequest): Surface => {
  if (process.env.NODE_ENV === "development") {
    const queryHost = request.nextUrl.searchParams.get("__host");
    const cookieHost = request.cookies.get(DEV_HOST_COOKIE)?.value;
    const override = queryHost ?? cookieHost;

    if (override === "app" || override === "portal") return "portal";
    if (override === "web" || override === "marketing") return "marketing";
  }

  const host = (request.headers.get("host") ?? "").split(":")[0]?.toLowerCase();

  if (host && APP_HOSTS.has(host)) return "portal";
  if (host && MARKETING_HOSTS.has(host)) return "marketing";

  return "marketing";
};

const applyDevHostCookie = (
  request: NextRequest,
  response: NextResponse,
) => {
  if (process.env.NODE_ENV !== "development") return;

  const queryHost = request.nextUrl.searchParams.get("__host");
  if (!queryHost) return;

  if (queryHost === "app" || queryHost === "portal") {
    response.cookies.set(DEV_HOST_COOKIE, "app", { path: "/" });
    return;
  }

  if (queryHost === "web" || queryHost === "marketing") {
    response.cookies.set(DEV_HOST_COOKIE, "web", { path: "/" });
  }
};

const rewriteForSurface = (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (isAssetPath(pathname) || isInternalPrefixed(pathname)) {
    const response = NextResponse.next();
    applyDevHostCookie(request, response);
    return response;
  }

  const surface = resolveSurface(request);
  const url = request.nextUrl.clone();
  const prefix = surface === "portal" ? "/app" : "/web";
  url.pathname = pathname === "/" ? prefix : `${prefix}${pathname}`;

  const response = NextResponse.rewrite(url);
  applyDevHostCookie(request, response);
  return response;
};

/**
 * Hostname-based surface split:
 * - getblume.ai / www → (marketing) via /web/*
 * - app.getblume.ai → (portal) via /app/*
 *
 * Locally, use ?__host=app|web (sets a blume-host cookie).
 * Clerk runs only for the portal surface when keys are configured.
 */
const clerkHandler = hasClerkKeys()
  ? clerkMiddleware((_auth, request) => rewriteForSurface(request))
  : null;

export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const { pathname } = request.nextUrl;
  const surface = resolveSurface(request);
  const portalRequest =
    surface === "portal" ||
    isPortalPath(pathname) ||
    pathname.startsWith("/__clerk");

  if (clerkHandler && portalRequest) {
    return clerkHandler(request, event);
  }

  return rewriteForSurface(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
