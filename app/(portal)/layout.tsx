/**
 * Portal route-group layout. ClerkProvider lives in the root layout so
 * SignIn / useSession always have a provider on every host.
 */
export default function PortalGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
