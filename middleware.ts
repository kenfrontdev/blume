import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Clerk middleware (§11). Matcher includes `/__clerk/:path*` for the
 * Frontend API proxy path used by the SDK.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
