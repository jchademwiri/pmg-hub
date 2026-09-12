import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOGO_CACHE = new Map<string, string>();

/**
 * Resolves a division or organisation name to an embedded PNG base64 Data URI.
 * Works across monorepo packages, Next.js Server Components / Actions, and tests.
 */
export function getLogoDataUri(orgName?: string | null): string | null {
  const normalized = (orgName || "").toLowerCase();
  const fileName = /tender edge|edge solutions|tes/.test(normalized)
    ? "tes-logo.png"
    : /apex web|apex|aws/.test(normalized)
      ? "aws-logo.png"
      : "pmg-logo.png";

  if (LOGO_CACHE.has(fileName)) {
    return LOGO_CACHE.get(fileName)!;
  }

  const candidates = [
    join(process.cwd(), "public", "logo", fileName),
    join(process.cwd(), "apps", "admin", "public", "logo", fileName),
    join(process.cwd(), "apps", "portal", "public", "logo", fileName),
    join(process.cwd(), "..", "..", "apps", "admin", "public", "logo", fileName),
    join(process.cwd(), "..", "apps", "admin", "public", "logo", fileName),
    join(__dirname, "../../../../apps/admin/public/logo", fileName),
    join(__dirname, "../../../apps/admin/public/logo", fileName),
    join(__dirname, "../../apps/admin/public/logo", fileName),
  ];

  const foundPath = candidates.find((p) => {
    try {
      return existsSync(p);
    } catch {
      return false;
    }
  });

  if (foundPath) {
    try {
      const buffer = readFileSync(foundPath);
      const dataUri = `data:image/png;base64,${buffer.toString("base64")}`;
      LOGO_CACHE.set(fileName, dataUri);
      return dataUri;
    } catch (err) {
      console.warn(`[getLogoDataUri] Failed to read logo at ${foundPath}:`, err);
    }
  }

  return null;
}
