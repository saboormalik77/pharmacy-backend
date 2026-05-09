/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Keep Turbopack scoped to this app directory (avoid scanning parent dirs).
    root: __dirname,
  },
  allowedDevOrigins: ['watch-scouring-agreed.ngrok-free.dev'],
  // Vercel will automatically detect Next.js and handle the build
  // No special output configuration needed
  transpilePackages: ['react-is'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
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
