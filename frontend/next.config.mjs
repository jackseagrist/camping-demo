/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['source.unsplash.com'],
  },
  env: {
    BACKEND_URL: process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' 
      ? 'https://your-backend-production-url.com' 
      : 'http://localhost:8000'),
  },
};

export default nextConfig;
