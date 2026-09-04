import { prisma } from "@/lib/db";
import { UserRole } from "@prisma/client";

// ============================================================
// PERMISSION TYPES
// ============================================================

export type Permission =
  | "org:create"
  | "org:read"
  | "org:update"
  | "org:delete"
  | "org:manage_members"
  | "org:manage_billing"
  | "team:create"
  | "team:read"
  | "team:update"
  | "team:delete"
  | "team:manage_members"
  | "post:create"
  | "post:read"
  | "post:update"
  | "post:delete"
  | "post:schedule"
  | "post:publish"
  | "campaign:create"
  | "campaign:read"
  | "campaign:update"
  | "campaign:delete"
  | "calendar:create"
  | "calendar:read"
  | "calendar:update"
  | "calendar:delete"
  | "social_account:connect"
  | "social_account:read"
  | "social_account:update"
  | "social_account:disconnect"
  | "analytics:read"
  | "analytics:export"
  | "ai:generate"
  | "ai:read"
  | "ai:manage_templates"
  | "comment:read"
  | "comment:reply"
  | "comment:manage"
  | "approval:create"
  | "approval:decide"
  | "approval:read"
  | "notification:read"
  | "notification:manage"
  | "brand:create"
  | "brand:read"
  | "brand:update"
  | "brand:delete"
  | "billing:read"
  | "billing:manage";

// ============================================================
// ROLE PERMISSIONS
// ============================================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "org:create",
    "org:read",
    "org:update",
    "org:delete",
    "org:manage_members",
    "org:manage_billing",
    "team:create",
    "team:read",
    "team:update",
    "team:delete",
    "team:manage_members",
    "post:create",
    "post:read",
    "post:update",
    "post:delete",
    "post:schedule",
    "post:publish",
    "campaign:create",
    "campaign:read",
    "campaign:update",
    "campaign:delete",
    "calendar:create",
    "calendar:read",
    "calendar:update",
    "calendar:delete",
    "social_account:connect",
    "social_account:read",
    "social_account:update",
    "social_account:disconnect",
    "analytics:read",
    "analytics:export",
    "ai:generate",
    "ai:read",
    "ai:manage_templates",
    "comment:read",
    "comment:reply",
    "comment:manage",
    "approval:create",
    "approval:decide",
    "approval:read",
    "notification:read",
    "notification:manage",
    "brand:create",
    "brand:read",
    "brand:update",
    "brand:delete",
    "billing:read",
    "billing:manage",
  ],
  ADMIN: [
    "org:read",
    "org:update",
    "org:manage_members",
    "team:create",
    "team:read",
    "team:update",
    "team:delete",
    "team:manage_members",
    "post:create",
    "post:read",
    "post:update",
    "post:delete",
    "post:schedule",
    "post:publish",
    "campaign:create",
    "campaign:read",
    "campaign:update",
    "campaign:delete",
    "calendar:create",
    "calendar:read",
    "calendar:update",
    "calendar:delete",
    "social_account:connect",
    "social_account:read",
    "social_account:update",
    "social_account:disconnect",
    "analytics:read",
    "analytics:export",
    "ai:generate",
    "ai:read",
    "ai:manage_templates",
    "comment:read",
    "comment:reply",
    "comment:manage",
    "approval:create",
    "approval:decide",
    "approval:read",
    "notification:read",
    "notification:manage",
    "brand:create",
    "brand:read",
    "brand:update",
    "brand:delete",
    "billing:read",
  ],
  EDITOR: [
    "org:read",
    "team:read",
    "post:create",
    "post:read",
    "post:update",
    "post:schedule",
    "campaign:create",
    "campaign:read",
    "campaign:update",
    "calendar:create",
    "calendar:read",
    "calendar:update",
    "social_account:read",
    "analytics:read",
    "ai:generate",
    "ai:read",
    "ai:manage_templates",
    "comment:read",
    "comment:reply",
    "approval:create",
    "approval:read",
    "notification:read",
    "brand:read",
  ],
  VIEWER: [
    "org:read",
    "team:read",
    "post:read",
    "campaign:read",
    "calendar:read",
    "social_account:read",
    "analytics:read",
    "ai:read",
    "comment:read",
    "approval:read",
    "notification:read",
    "brand:read",
  ],
};

// ============================================================
// PERMISSION CHECKER
// ============================================================

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const permissions = getRolePermissions(userRole);
  return permissions.includes(permission);
}

export function hasAnyPermission(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  const userPermissions = getRolePermissions(userRole);
  return permissions.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(
  userRole: UserRole,
  permissions: Permission[]
): boolean {
  const userPermissions = getRolePermissions(userRole);
  return permissions.every((p) => userPermissions.includes(p));
}

// ============================================================
// ROLE-BASED ACCESS
// ============================================================

export function isOwner(role: UserRole): boolean {
  return role === "OWNER";
}

export function isAdminOrAbove(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function isEditorOrAbove(role: UserRole): boolean {
  return role === "OWNER" || role === "ADMIN" || role === "EDITOR";
}

export function canEdit(role: UserRole): boolean {
  return isEditorOrAbove(role);
}

export function canDelete(role: UserRole): boolean {
  return isAdminOrAbove(role);
}

export function canManageMembers(role: UserRole): boolean {
  return isAdminOrAbove(role);
}

export function canManageBilling(role: UserRole): boolean {
  return role === "OWNER";
}

export function canPublish(role: UserRole): boolean {
  return isEditorOrAbove(role);
}

export function canApprove(role: UserRole): boolean {
  return isAdminOrAbove(role);
}

// ============================================================
// DATABASE PERMISSION CHECKS
// ============================================================

export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<UserRole | null> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      userId_orgId: { userId, orgId },
    },
    select: { role: true },
  });

  return membership?.role ?? null;
}

export async function isOrgMember(userId: string, orgId: string): Promise<boolean> {
  const membership = await prisma.orgMember.findUnique({
    where: {
      userId_orgId: { userId, orgId },
    },
    select: { id: true },
  });

  return !!membership;
}

export async function isTeamMember(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
    select: { id: true },
  });

  return !!membership;
}

export async function getUserPermissions(
  userId: string,
  orgId: string
): Promise<Permission[]> {
  const role = await getUserOrgRole(userId, orgId);

  if (!role) {
    return [];
  }

  return getRolePermissions(role);
}

export async function checkUserPermission(
  userId: string,
  orgId: string,
  permission: Permission
): Promise<boolean> {
  const permissions = await getUserPermissions(userId, orgId);
  return permissions.includes(permission);
}

export async function checkUserAnyPermission(
  userId: string,
  orgId: string,
  permissions: Permission[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId, orgId);
  return permissions.some((p) => userPermissions.includes(p));
}

// ============================================================
// RESOURCE-LEVEL PERMISSIONS
// ============================================================

export async function canAccessPost(
  userId: string,
  postId: string
): Promise<{ allowed: boolean; role: UserRole | null }> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { orgId: true, authorId: true },
  });

  if (!post) {
    return { allowed: false, role: null };
  }

  const role = await getUserOrgRole(userId, post.orgId);

  if (!role) {
    return { allowed: false, role: null };
  }

  // Author always has access
  if (post.authorId === userId) {
    return { allowed: true, role };
  }

  // Otherwise, check role-based permissions
  return {
    allowed: isEditorOrAbove(role),
    role,
  };
}

export async function canAccessCampaign(
  userId: string,
  campaignId: string
): Promise<{ allowed: boolean; role: UserRole | null }> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { orgId: true },
  });

  if (!campaign) {
    return { allowed: false, role: null };
  }

  const role = await getUserOrgRole(userId, campaign.orgId);
  return { allowed: !!role, role };
}

export async function canAccessSocialAccount(
  userId: string,
  socialAccountId: string
): Promise<{ allowed: boolean; role: UserRole | null }> {
  const account = await prisma.socialAccount.findUnique({
    where: { id: socialAccountId },
    select: { orgId: true },
  });

  if (!account) {
    return { allowed: false, role: null };
  }

  const role = await getUserOrgRole(userId, account.orgId);
  return { allowed: !!role, role };
}

// ============================================================
// PERMISSION GUARD HELPERS
// ============================================================

export class PermissionError extends Error {
  constructor(
    message: string,
    public requiredPermission: Permission,
    public userRole?: UserRole
  ) {
    super(message);
    this.name = "PermissionError";
  }
}

export function requirePermission(
  role: UserRole,
  permission: Permission
): void {
  if (!hasPermission(role, permission)) {
    throw new PermissionError(
      `Permission denied: requires ${permission}, but user has role ${role}`,
      permission,
      role
    );
  }
}

export function requireAnyPermission(
  role: UserRole,
  permissions: Permission[]
): void {
  if (!hasAnyPermission(role, permissions)) {
    throw new PermissionError(
      `Permission denied: requires one of [${permissions.join(", ")}], but user has role ${role}`,
      permissions[0],
      role
    );
  }
}

export function requireRole(role: UserRole, requiredRole: UserRole): void {
  const roleHierarchy: UserRole[] = ["OWNER", "ADMIN", "EDITOR", "VIEWER"];
  const userIndex = roleHierarchy.indexOf(role);
  const requiredIndex = roleHierarchy.indexOf(requiredRole);

  if (userIndex > requiredIndex) {
    throw new PermissionError(
      `Role denied: requires ${requiredRole} or above, but user has role ${role}`,
      "org:manage_members",
      role
    );
  }
}

// ============================================================
// TEAM PERMISSIONS
// ============================================================

export async function getUserTeamRole(
  userId: string,
  teamId: string
): Promise<UserRole | null> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: { userId, teamId },
    },
    select: { role: true },
  });

  return membership?.role ?? null;
}

export async function getUserTeams(userId: string, orgId: string) {
  return prisma.teamMember.findMany({
    where: {
      userId,
      team: { orgId },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          color: true,
        },
      },
    },
  });
}

export async function isTeamAdmin(
  userId: string,
  teamId: string
): Promise<boolean> {
  const role = await getUserTeamRole(userId, teamId);
  return role === "OWNER" || role === "ADMIN";
}
