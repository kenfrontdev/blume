/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      { source: "/p/:path*", destination: "/app/p/:path*" },
      { source: "/sign-in", destination: "/app/sign-in" },
      { source: "/sign-in/:path*", destination: "/app/sign-in/:path*" },
      { source: "/sign-up", destination: "/app/sign-up" },
      { source: "/sign-up/:path*", destination: "/app/sign-up/:path*" },
      { source: "/login", destination: "/app/login" },
    ];
  },
};

export default nextConfig;
