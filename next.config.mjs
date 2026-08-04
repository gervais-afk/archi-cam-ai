/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
  transpilePackages: ["@react-pdf/renderer"],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
