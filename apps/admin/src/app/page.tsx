import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const sections = [
  { label: "Leads", desc: "View and manage incoming leads across all divisions.", href: "/leads" },
  { label: "Clients", desc: "Client records, contact info, and linked income.", href: "/clients" },
  { label: "Income", desc: "Track revenue by division and client.", href: "/income" },
  { label: "Expenses", desc: "Log and review expenses per division.", href: "/expenses" },
  { label: "Divisions", desc: "Manage PMG business divisions.", href: "/divisions" },
  { label: "AWS Pricing", desc: "Edit pricing packages for the AWS site.", href: "/aws-pricing" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <div className="w-full max-w-2xl flex flex-col gap-8">

        {/* Header */}
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit font-mono tracking-widest uppercase text-xs">
            Playhouse Media Group
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Internal tools for managing divisions, clients, leads, and financials.
          </p>
        </div>

        <Separator />

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sections.map((item) => (
            <a key={item.href} href={item.href}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-base">{item.label}</CardTitle>
                  <CardDescription>{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground font-mono">
          pmg-hub admin · internal use only
        </p>
      </div>
    </div>
  );
}
