import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001", "192.168.0.190:3000", "192.168.0.190:3001"],
    },
  },
  allowedDevOrigins: ["192.168.0.190", "192.168.0.190:3000", "192.168.0.190:3001"],
};

export default nextConfig;
