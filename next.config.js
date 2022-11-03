/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  serverRuntimeConfig: {
    redisUrl: process.env.REDIS_URL
  }
}

module.exports = nextConfig
