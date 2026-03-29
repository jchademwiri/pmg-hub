export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center min-h-screen bg-background text-foreground px-6">
      <div className="w-full max-w-2xl flex flex-col gap-10">

        {/* Header */}
        <div>
          <p className="text-xs font-mono tracking-widest uppercase text-zinc-400 mb-2">
            Playhouse Media Group
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-zinc-500 text-sm">
            Internal tools for managing divisions, clients, leads, and financials.
          </p>
        </div>

        {/* Nav cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Leads", desc: "View and manage incoming leads across all divisions.", href: "/leads" },
            { label: "Clients", desc: "Client records, contact info, and linked income.", href: "/clients" },
            { label: "Income", desc: "Track revenue by division and client.", href: "/income" },
            { label: "Expenses", desc: "Log and review expenses per division.", href: "/expenses" },
            { label: "Divisions", desc: "Manage PMG business divisions.", href: "/divisions" },
            { label: "AWS Pricing", desc: "Edit pricing packages for the AWS site.", href: "/aws-pricing" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group flex flex-col gap-1 rounded-xl border border-black/8 dark:border-white/10 p-5 hover:bg-black/4 dark:hover:bg-white/5 transition-colors"
            >
              <span className="font-medium text-foreground group-hover:underline underline-offset-2">
                {item.label}
              </span>
              <span className="text-sm text-zinc-500">{item.desc}</span>
            </a>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-zinc-400 font-mono">
          pmg-hub admin · internal use only
        </p>
      </div>
    </div>
  );
}
