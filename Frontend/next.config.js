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
    // First compile in dev can take several seconds; default chunk wait may surface as
    // ChunkLoadError for app/layout. Give the browser longer to receive lazy chunks.
    if (dev && !isServer && config.output) {
      config.output.chunkLoadTimeout = 120000
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
