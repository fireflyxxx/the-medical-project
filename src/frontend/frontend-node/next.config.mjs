/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/doctor',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
