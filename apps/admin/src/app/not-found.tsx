import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const quickLinks = [
  { label: "Leads", href: "/leads" },
  { label: "Clients", href: "/clients" },
  { label: "Income", href: "/income" },
  { label: "Expenses", href: "/expenses" },
];

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <div className="w-full max-w-sm flex flex-col gap-8">

        {/* Error */}
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit font-mono text-xs">
            PMG Admin
          </Badge>
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-semibold tracking-tight">404</span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You've wandered off the map. This page doesn't exist or was moved —
            happens to the best of us.
          </p>
        </div>

        <Separator />

        {/* Quick links */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Where to next?
          </p>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Button key={link.href} asChild variant="outline" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Back */}
        <Button asChild size="sm" className="w-fit">
          <Link href="/">Back to dashboard</Link>
        </Button>

      </div>
    </div>
  );
}
