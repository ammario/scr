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
  output: "export",
  distDir: "server/dist",
};

module.exports = nextConfig;
