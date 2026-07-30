import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(resolve(appDir, "../.."));

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: ["localhost:3000", "192.168.0.190:3000"],
    },
  },
  async redirects() {
    return [
      {
        source: '/leads/:id',
        destination: '/relationships/leads/:id',
        permanent: true,
      },
      {
        source: '/leads',
        destination: '/relationships/leads',
        permanent: true,
      },
    ];
  },
  allowedDevOrigins: ["192.168.0.190", "192.168.0.190:3000", "192.168.0.190:3001"],
};

export default nextConfig;
