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
      {
        protocol: "https",
        hostname: "**.fal.media",
      },
      {
        protocol: "https",
        hostname: "v3b.fal.media",
      },
      {
        protocol: "https",
        hostname: "v3.fal.media",
      },
    ],
  },
  transpilePackages: ["@react-pdf/renderer"],
  serverComponentsExternalPackages: ["@resvg/resvg-js"],
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
