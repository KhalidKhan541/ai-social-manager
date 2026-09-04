"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { PLATFORMS } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Link2,
  Unlink,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  MoreHorizontal,
  Shield,
  Clock,
  Users,
} from "lucide-react";

export default function AccountsPage() {
  const { accounts } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Manage your social media account connections
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw
              className={`w-4 h-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Sync All
          </Button>
          <Button>
            <Link2 className="w-4 h-4 mr-1.5" />
            Connect Account
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Connected",
            value: accounts.filter((a) => a.connected).length,
            color: "text-green-500",
          },
          {
            label: "Disconnected",
            value: accounts.filter((a) => !a.connected).length,
            color: "text-red-500",
          },
          {
            label: "Total Followers",
            value: accounts
              .filter((a) => a.connected)
              .reduce((a, c) => a + c.followers, 0)
              .toLocaleString(),
            color: "text-blue-500",
          },
          {
            label: "Last Synced",
            value: "2 min ago",
            color: "text-purple-500",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {accounts.map((account) => {
          const platform = PLATFORMS[account.platform];
          return (
            <Card
              key={account.id}
              className={`hover:shadow-md transition-all ${
                !account.connected ? "opacity-75" : ""
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0"
                    style={{ backgroundColor: platform?.color ?? "#888" }}
                  >
                    {account.platform[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{account.displayName}</h3>
                      {account.connected ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 text-[10px] gap-0.5"
                        >
                          <Check className="w-3 h-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="bg-red-100 text-red-700 text-[10px] gap-0.5"
                        >
                          <AlertCircle className="w-3 h-3" />
                          Disconnected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.handle} · {platform?.name}
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {account.followers.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Followers
                        </p>
                      </div>
                      {account.lastSync && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          Last synced: {new Date(account.lastSync).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1">
                    <RefreshCw className="w-4 h-4 mr-1.5" />
                    Sync
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    View Profile
                  </Button>
                  {account.connected && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                    >
                      <Unlink className="w-4 h-4 mr-1.5" />
                      Disconnect
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
