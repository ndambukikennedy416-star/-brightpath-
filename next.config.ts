import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 80],
    minimumCacheTTL: 2678400, // 31 days for /logo.jpg, /banner.jpg, /team.jpg
  },
  experimental: {
    optimizePackageImports: ["zod", "react-hook-form", "@hookform/resolvers"],
  },
};

export default nextConfig;
