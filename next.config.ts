import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  experimental: {
    webpackBuildWorker: true,
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
    pagesBufferLength: 10,
  },
}

export default nextConfig
