import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import("next").NextConfig} */
const nextConfig = {
  turbopack: {
    // Prevent Next from inferring a monorepo root outside this app.
    // This avoids Turbopack trying to scan parent directories (e.g. ~/Documents),
    // which can fail on macOS due to privacy restrictions.
    root: __dirname,
  },
  async rewrites() {
    // Proxy `/api/*` to the backend during local dev so the browser
    // can call same-origin URLs (no CORS headaches).
    const backendBase =
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "");

    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;

