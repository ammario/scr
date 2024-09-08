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
  distDir: "server/dist",
};

if (process.env.PROD_BUILD === "true") {
  nextConfig.output = "export";
}

module.exports = nextConfig;
