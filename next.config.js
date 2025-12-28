/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  compiler: {
    emotion: true,
  },
  // Use standalone output for Docker deployment
  output: "standalone",
};

module.exports = nextConfig;
