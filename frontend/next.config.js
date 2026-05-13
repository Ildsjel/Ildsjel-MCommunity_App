/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
  images: {
    remotePatterns: [
      // Local dev
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'http',  hostname: '127.0.0.1' },
      // Render backend (grimr-api.onrender.com or custom domain)
      { protocol: 'https', hostname: '*.onrender.com' },
      // Allow any HTTPS host so a custom domain works without a rebuild
      { protocol: 'https', hostname: '**' },
    ],
  },
}

module.exports = nextConfig
