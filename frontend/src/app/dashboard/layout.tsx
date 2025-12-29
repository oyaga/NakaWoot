import { Sidebar } from "@/components/sidebar";
import { AuthGuard } from "@/components/auth-guard";
import { RealtimeProvider } from "@/components/realtime-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <RealtimeProvider>
        <div className="flex h-screen overflow-hidden bg-slate-950">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </RealtimeProvider>
    </AuthGuard>
  );
}
