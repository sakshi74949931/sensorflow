import {
  LayoutDashboard,
  Router,
  Activity,
  Map,
  Bell,
  FileBarChart,
  Settings,
  LogOut,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Devices", url: "/devices", icon: Router },
  { title: "Live Monitoring", url: "/monitoring", icon: Activity },
  { title: "Map View", url: "/map", icon: Map },
  { title: "Alarms", url: "/alarms", icon: Bell },
  { title: "Reports", url: "/reports", icon: FileBarChart },
  { title: "Settings", url: "/settings", icon: Settings },
];

function UserInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary transition-all duration-200 group-hover/user:bg-sidebar-primary/30 group-hover/user:shadow-sm group-hover/user:shadow-sidebar-primary/10">
      {initials}
    </div>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="shrink-0 rounded-xl bg-white p-1 shadow-md shadow-black/20 transition-transform duration-200 hover:scale-105">
            <img
              src="/logo.png"
              alt="Inditronics"
              className="h-10 w-10 rounded-lg object-contain"
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-wider text-sidebar-foreground truncate">
                INDITRONICS
              </span>
              <span className="text-[10px] text-sidebar-foreground/50 tracking-wide">
                Noise Monitoring
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="py-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className={cn(
                          "relative transition-all duration-200 ease-out",
                          "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                          "group/navitem",
                        )}
                        activeClassName="sidebar-nav-active bg-sidebar-primary/12 text-sidebar-primary hover:bg-sidebar-primary/18 hover:text-sidebar-primary"
                      >
                        <item.icon className={cn(
                          "mr-2 h-[18px] w-[18px] shrink-0 transition-all duration-200 ease-out",
                          "group-hover/navitem:scale-110",
                          isActive && "text-sidebar-primary drop-shadow-[0_0_3px_hsl(88_50%_50%/0.4)]",
                        )} />
                        {!collapsed && (
                          <span className={cn(
                            "transition-all duration-200 ease-out",
                            isActive ? "font-semibold tracking-wide" : "font-normal",
                          )}>
                            {item.title}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="group/user mb-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors duration-200 hover:bg-sidebar-accent/40 cursor-default">
            <UserInitials name={user.name} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
              <p className="text-[11px] text-sidebar-foreground/50 capitalize">{user.role}</p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <div className="group/user flex justify-center mb-2">
            <UserInitials name={user.name} />
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-all duration-200",
            "text-sidebar-foreground/60 hover:bg-red-500/10 hover:text-red-400",
            collapsed && "justify-center",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
