"use client";

import { useAppStore } from "@/store";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen bg-muted/30">
      <Sidebar />
      <Header />
      <main
        className={cn(
          "pt-16 transition-all duration-300 min-h-screen",
          sidebarOpen ? "pl-64" : "pl-[68px]"
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
