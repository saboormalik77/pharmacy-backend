/** @type {import('next').NextConfig} */
const nextConfig = {
  // Vercel will automatically detect Next.js and handle the build
  // No special output configuration needed
  transpilePackages: ['react-is'],
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
}

module.exports = nextConfig
