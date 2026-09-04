"use client";

import { useState } from "react";
import { useAppStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Settings,
  Shield,
  UserPlus,
  Mail,
  MoreHorizontal,
  Crown,
  UserCheck,
  UserX,
  Eye,
  Trash2,
} from "lucide-react";

const teamMembers = [
  {
    id: "1",
    name: "Sarah Chen",
    email: "sarah@company.com",
    role: "owner",
    status: "active",
    lastActive: "Just now",
    postsCreated: 45,
  },
  {
    id: "2",
    name: "Mike Johnson",
    email: "mike@company.com",
    role: "admin",
    status: "active",
    lastActive: "2 hours ago",
    postsCreated: 32,
  },
  {
    id: "3",
    name: "Emily Rodriguez",
    email: "emily@company.com",
    role: "member",
    status: "active",
    lastActive: "1 day ago",
    postsCreated: 18,
  },
  {
    id: "4",
    name: "David Kim",
    email: "david@company.com",
    role: "member",
    status: "active",
    lastActive: "3 hours ago",
    postsCreated: 24,
  },
  {
    id: "5",
    name: "Lisa Wang",
    email: "lisa@company.com",
    role: "viewer",
    status: "invited",
    lastActive: "Never",
    postsCreated: 0,
  },
];

const roleConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  owner: { label: "Owner", color: "bg-amber-100 text-amber-700", icon: Crown },
  admin: { label: "Admin", color: "bg-purple-100 text-purple-700", icon: Shield },
  member: { label: "Member", color: "bg-blue-100 text-blue-700", icon: UserCheck },
  viewer: { label: "Viewer", color: "bg-gray-100 text-gray-700", icon: Eye },
};

export default function TeamPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  const filteredMembers = teamMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your team members and their permissions
          </p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Invite Member
        </Button>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Members", value: teamMembers.length, color: "text-primary" },
          {
            label: "Active",
            value: teamMembers.filter((m) => m.status === "active").length,
            color: "text-green-500",
          },
          {
            label: "Pending Invites",
            value: teamMembers.filter((m) => m.status === "invited").length,
            color: "text-orange-500",
          },
          {
            label: "Posts This Month",
            value: teamMembers.reduce((a, m) => a + m.postsCreated, 0),
            color: "text-blue-500",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Invite Form */}
      {showInvite && (
        <Card className="animate-fade-in">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Invite Team Member</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
            </div>
            <div className="flex gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-xs text-muted-foreground">Email</label>
                <Input
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="w-[160px] space-y-1">
                <label className="text-xs text-muted-foreground">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="admin">Admin</option>
                  <option value="member">Member</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              <Button>
                <Mail className="w-4 h-4 mr-1.5" />
                Send Invite
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Team Members</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[240px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredMembers.map((member) => {
              const role = roleConfig[member.role];
              const RoleIcon = role.icon;
              return (
                <div
                  key={member.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {member.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{member.name}</p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] gap-0.5 ${role.color}`}
                      >
                        <RoleIcon className="w-3 h-3" />
                        {role.label}
                      </Badge>
                      {member.status === "invited" && (
                        <Badge variant="outline" className="text-[10px]">
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.email} · {member.lastActive}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium">{member.postsCreated}</p>
                    <p className="text-xs text-muted-foreground">posts</p>
                  </div>
                  {member.role !== "owner" && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
