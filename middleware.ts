import { clerkMiddleware } from "@clerk/nextjs/server";
import {
  NextResponse,
  type NextFetchEvent,
  type NextMiddleware,
  type NextRequest,
} from "next/server";

const MARKETING_HOSTS = new Set([
  "getblume.ai",
  "www.getblume.ai",
]);
const APP_HOSTS = new Set(["app.getblume.ai", "app.localhost"]);

const DEV_HOST_COOKIE = "blume-host";

type Surface = "marketing" | "portal";

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

const normalizePortalPath = (pathname: string) => {
  if (pathname === "/app") return "/";
  if (pathname.startsWith("/app/")) return pathname.slice(4);
  return pathname;
};

const isPublicPortalPath = (pathname: string) => {
  const normalized = normalizePortalPath(pathname);
  return (
    normalized.startsWith("/sign-in") || normalized.startsWith("/sign-up")
  );
};

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

const hasClerkSecret = () =>
  Boolean(process.env.CLERK_SECRET_KEY?.startsWith("sk_"));

let portalClerkMiddleware: NextMiddleware | null = null;

const getPortalClerkMiddleware = (): NextMiddleware => {
  if (portalClerkMiddleware) return portalClerkMiddleware;

  /**
   * Portal-only Clerk handler. Uses a plain /sign-in redirect instead of
   * auth.protect(), which can crash the Edge middleware when Clerk env
   * (sign-in URL / keys) is incomplete — Vercel surfaces that as
   * MIDDLEWARE_INVOCATION_FAILED.
   */
  portalClerkMiddleware = clerkMiddleware(async (auth, request) => {
    const { pathname } = request.nextUrl;

    if (!isAssetPath(pathname) && !isPublicPortalPath(pathname)) {
      const { userId } = await auth();
      if (!userId) {
        const signIn = new URL("/sign-in", request.url);
        signIn.searchParams.set("redirect_url", request.nextUrl.pathname);
        return NextResponse.redirect(signIn);
      }
    }

    return rewriteForSurface(request);
  });

  return portalClerkMiddleware;
};

/**
 * - getblume.ai / www → rewrite to /web/* only (never invokes Clerk)
 * - app.getblume.ai → Clerk session check + rewrite to /app/*
 */
export default function middleware(
  request: NextRequest,
  event: NextFetchEvent,
) {
  const surface = resolveSurface(request);
  const { pathname } = request.nextUrl;

  const marketingOnly =
    surface === "marketing" &&
    !isPortalPath(pathname) &&
    !pathname.startsWith("/__clerk");

  if (marketingOnly) {
    return rewriteForSurface(request);
  }

  if (!hasClerkSecret()) {
    return rewriteForSurface(request);
  }

  return getPortalClerkMiddleware()(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
