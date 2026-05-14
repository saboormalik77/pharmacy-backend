/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Keep Turbopack scoped to this app directory (avoid scanning parent dirs).
    root: __dirname,
  },
  // Allow tunnel/proxy hosts to hit dev-only assets (e.g. /_next/webpack-hmr).
  // Next supports glob suffixes: https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
  allowedDevOrigins: [
    '*.ngrok-free.app',
    '*.ngrok-free.dev',
    '*.ngrok.io',
    '*.ngrok.app',
    '*.trycloudflare.com',
    // Legacy single hostname (safe to remove once unused)
    'watch-scouring-agreed.ngrok-free.dev',
    ...(process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ],
  // Vercel will automatically detect Next.js and handle the build
  // No special output configuration needed
  transpilePackages: ['react-is'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@clerk/nextjs'],
  },
  webpack: (config, { dev, isServer }) => {
    // Next.js overrides webpack's default chunkLoadTimeout to a low value in dev.
    // The first cold compile of app/layout (Clerk + all providers) can take 30-60s,
    // so give the browser 5 minutes before it gives up and throws ChunkLoadError.
    if (dev && !isServer) {
      config.output = config.output ?? {}
      config.output.chunkLoadTimeout = 300000
    }
    return config
  },
  async rewrites() {
    const backendBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(
      /\/api\/?$/,
      ''
    )

    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
