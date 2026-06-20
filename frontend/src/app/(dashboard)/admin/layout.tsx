/**
 * Admin Dashboard Layout
 *
 * Sidebar navigation frame for the admin panel.
 * Implementation deferred to feature development phase.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar will be implemented here */}
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
