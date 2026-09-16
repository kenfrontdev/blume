import { ClerkProvider } from "@clerk/nextjs";

const hasClerkKeys = () => {
  const pk = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return Boolean(pk && pk.startsWith("pk_") && !pk.includes("placeholder"));
};

/**
 * Clerk only wraps the authenticated product surface when keys are set.
 * Marketing stays public; portal can still render without auth in local/dev.
 */
export default function PortalGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!hasClerkKeys()) {
    return children;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
