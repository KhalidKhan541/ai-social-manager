"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";
import {
  LayoutDashboard,
  PenSquare,
  Calendar,
  FileText,
  BarChart3,
  Inbox,
  Hash,
  Image,
  Megaphone,
  Users,
  Settings,
  CreditCard,
  Sparkles,
  Link2,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Compose", href: "/dashboard/compose", icon: PenSquare },
  { name: "Calendar", href: "/dashboard/calendar", icon: Calendar },
  { name: "Posts", href: "/dashboard/posts", icon: FileText },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Inbox", href: "/dashboard/inbox", icon: Inbox, badge: 4 },
  { name: "Hashtags", href: "/dashboard/hashtag-manager", icon: Hash },
  { name: "Media Library", href: "/dashboard/media-library", icon: Image },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { name: "AI Studio", href: "/dashboard/ai-studio", icon: Sparkles },
];

const bottomNav = [
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
  { name: "Billing", href: "/dashboard/billing", icon: CreditCard },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r bg-card transition-all duration-300",
        sidebarOpen ? "w-64" : "w-[68px]"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div
          className={cn(
            "flex items-center h-16 border-b px-4",
            sidebarOpen ? "justify-between" : "justify-center"
          )}
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="text-lg font-bold">SocialPilot</span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="hidden md:flex w-6 h-6 items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    !sidebarOpen && "justify-center px-2"
                  )}
                  title={sidebarOpen ? undefined : item.name}
                >
                  <item.icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && (
                    <>
                      <span className="flex-1">{item.name}</span>
                      {item.badge && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground px-1.5">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom Navigation */}
        <div className="border-t py-4 px-3 space-y-1">
          {bottomNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  !sidebarOpen && "justify-center px-2"
                )}
                title={sidebarOpen ? undefined : item.name}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* Connected Accounts */}
          {sidebarOpen && (
            <div className="pt-3 mt-3 border-t">
              <p className="px-3 text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Connected
              </p>
              <div className="space-y-1">
                <Link
                  href="/dashboard/accounts"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                >
                  <Link2 className="w-4 h-4" />
                  <span>4 Accounts</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
