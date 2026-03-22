import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-card shrink-0">
            <SidebarTrigger className="mr-3" />
            <div className="rounded-lg bg-white dark:bg-white/10 p-0.5 shadow-sm mr-2.5">
              <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-contain" />
            </div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">
              Inditronics
            </h1>
            <span className="text-sm text-muted-foreground ml-2 hidden sm:inline">
              Noise Monitoring
            </span>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
