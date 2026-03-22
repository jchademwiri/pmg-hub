import type { NextConfig } from 'next'

const config: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
}

export default config
