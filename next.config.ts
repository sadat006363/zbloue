/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
      },
    ],
  },
  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '100kb',
    },
  },
};

export default nextConfig;