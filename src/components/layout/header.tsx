"use client";

import Link from "next/link";
import { useAppStore } from "@/store";
import { cn, getInitials, formatNumber } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Search,
  ChevronDown,
  LogOut,
  User,
  Settings,
  CreditCard,
  HelpCircle,
  Plus,
} from "lucide-react";

export function Header() {
  const { user, sidebarOpen } = useAppStore();

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30 h-16 border-b bg-card/95 backdrop-blur flex items-center justify-between px-6 transition-all duration-300",
        sidebarOpen ? "left-64" : "left-[68px]"
      )}
    >
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search posts, campaigns, analytics..."
            className="pl-9 bg-muted/50 border-0"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard/compose">
          <Button size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Post
          </Button>
        </Link>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="font-semibold text-sm">Notifications</h3>
              <button className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {[
                {
                  title: "New comment on your post",
                  desc: "Social Media Pro commented on your Instagram post",
                  time: "2m ago",
                },
                {
                  title: "Post published successfully",
                  desc: "Your post about AI features is now live on Twitter",
                  time: "1h ago",
                },
                {
                  title: "Campaign goal reached",
                  desc: "Product Launch Q1 reached 50% of engagement goal",
                  time: "3h ago",
                },
              ].map((n, i) => (
                <div
                  key={i}
                  className="p-3 hover:bg-muted/50 cursor-pointer border-b last:border-0"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {n.desc}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{n.time}</p>
                </div>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {user ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {user?.role}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="p-3 border-b">
              <p className="font-medium text-sm">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuItem>
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem>
              <CreditCard className="w-4 h-4 mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="w-4 h-4 mr-2" />
              Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
