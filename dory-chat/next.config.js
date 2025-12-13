/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: process.env.NODE_ENV === 'production' 
              ? '/dorychat-app' 
              : '',
  trailingSlash: true,
  output: 'standalone',
};

export default nextConfig;
