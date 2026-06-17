import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
loadEnvConfig(resolve(appDir, "../.."));

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ── Finance ──────────────────────────────────────────────────────────
      { source: '/income',                    destination: '/finance/income',                    permanent: true },
      { source: '/income/:path*',             destination: '/finance/income/:path*',             permanent: true },
      { source: '/expenses',                  destination: '/finance/expenses',                  permanent: true },
      { source: '/expenses/:path*',           destination: '/finance/expenses/:path*',           permanent: true },
      { source: '/expense-categories',        destination: '/finance/categories',                permanent: true },
      { source: '/expense-categories/:path*', destination: '/finance/categories/:path*',         permanent: true },
      { source: '/ledger',                    destination: '/finance/distributions',              permanent: true },
      { source: '/ledger/:path*',             destination: '/finance/distributions/:path*',       permanent: true },
      { source: '/accounts',                  destination: '/finance/distributions',              permanent: true },
      { source: '/accounts/:path*',           destination: '/finance/distributions/:path*',       permanent: true },
      // ── Relationships ─────────────────────────────────────────────────────
      { source: '/clients',                   destination: '/relationships/clients',             permanent: true },
      { source: '/clients/:path*',            destination: '/relationships/clients/:path*',      permanent: true },
      { source: '/leads',                     destination: '/relationships/leads',               permanent: true },
      { source: '/leads/:path*',              destination: '/relationships/leads/:path*',        permanent: true },
      { source: '/divisions',                 destination: '/relationships/divisions',           permanent: true },
      { source: '/divisions/:path*',          destination: '/relationships/divisions/:path*',    permanent: true },
      // ── Insights ──────────────────────────────────────────────────────────
      { source: '/snapshots',                 destination: '/insights/snapshots',                permanent: true },
      { source: '/snapshots/:path*',          destination: '/insights/snapshots/:path*',         permanent: true },
      { source: '/reports',                   destination: '/insights/reports',                  permanent: true },
      { source: '/reports/:path*',            destination: '/insights/reports/:path*',           permanent: true },
    ];
  },
};

export default nextConfig;
