function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-muted ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Pulse className="h-8 w-48" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <Pulse className="h-3 w-24" />
          <Pulse className="mt-3 h-8 w-64" />
          <Pulse className="mt-2 h-4 w-40" />
          <Pulse className="mt-6 h-10 w-32" />
        </div>
        <Pulse className="h-32" />
        <Pulse className="h-32" />
        <div className="lg:col-span-2">
          <Pulse className="h-24" />
        </div>
      </div>
    </div>
  );
}
