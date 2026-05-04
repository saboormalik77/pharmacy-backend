/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel will automatically detect Next.js and handle the build
  // No special output configuration needed
  transpilePackages: ['react-is'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
