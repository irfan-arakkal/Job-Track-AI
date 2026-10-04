/** Shown instantly while a signed-in page loads its data on the server. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="bg-muted h-7 w-48 rounded-md" />
        <div className="bg-muted h-4 w-72 rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-muted h-24 rounded-xl" />
        ))}
      </div>
      <div className="bg-muted h-64 rounded-xl" />
    </div>
  );
}
