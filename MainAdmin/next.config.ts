import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Prevent Next from inferring a monorepo root outside this app.
    // This avoids Turbopack trying to scan parent directories (e.g. ~/Documents),
    // which can fail on macOS due to privacy restrictions.
    root: __dirname,
  },
  async rewrites() {
    const backendBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(
      /\/api\/?$/,
      ""
    );

    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
