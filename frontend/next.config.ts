import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    // pdfjs-dist uses canvas alias — disable for SSR (only applies when --webpack is used)
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
