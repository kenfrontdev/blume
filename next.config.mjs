/** @type {import('next').NextConfig} */
const nextConfig = {
  // Load the Neon serverless driver from node_modules at runtime instead of
  // bundling it. This is the standard recommendation for the driver and also
  // lets local development retarget it at a local Neon HTTP proxy (see
  // scripts/dev/neon-local-preload.mjs) without touching application code.
  serverExternalPackages: ["@neondatabase/serverless"],
};

export default nextConfig;
