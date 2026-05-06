/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  experimental: {
    allowedOrigins: ['local-origin.dev', '*.local-origin.dev']
  }
  
};

export default nextConfig;  // ES modules syntax for .mjs