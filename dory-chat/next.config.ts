import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: process.env.NODE_ENV === 'production' 
              ? '/dorychat-app' 
              : '',
  trailingSlash: true,
};

export default nextConfig;
