export default function PortalLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-white/5" />
        <div className="h-4 w-72 rounded-md bg-white/5" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl border border-white/5 bg-[#0a0f1d] p-5" />
        ))}
      </div>
      <div className="h-72 rounded-xl border border-white/5 bg-[#0a0f1d]" />
    </div>
  );
}
