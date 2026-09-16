import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Blume",
  description: "Spec-driven development management platform",
};

/**
 * Always wrap with ClerkProvider. Gating on env at build time caused
 * production deploys to omit the provider (NEXT_PUBLIC_* inlined empty)
 * while <SignIn /> still mounted — hence useSession errors.
 *
 * Requires NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY on Vercel,
 * then a fresh deploy so the publishable key is baked into the build.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}
