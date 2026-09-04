import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { requireAuth, handleApiError, paginatedResult, parsePagination, buildSearchFilter } from "@/lib/api-helpers";
import { createOrgSchema, validateRequest } from "@/validators";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const { page, limit } = parsePagination(searchParams);
    const search = searchParams.get("search");

    const where = {
      memberships: {
        some: { userId: session.user.id },
      },
      ...(search && buildSearchFilter(search, ["name", "slug"])),
    };

    const [orgs, total] = await Promise.all([
      db.organization.findMany({
        where,
        include: {
          memberships: {
            where: { userId: session.user.id },
            select: { role: true },
          },
          _count: {
            select: {
              socialAccounts: true,
              posts: { where: { status: "PUBLISHED" } },
              members: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.organization.count({ where }),
    ]);

    const orgsWithRole = orgs.map((org) => ({
      ...org,
      myRole: org.memberships[0]?.role ?? "MEMBER",
      memberships: undefined,
    }));

    return NextResponse.json(paginatedResult(orgsWithRole, total, { page, limit }));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const validation = validateRequest(body, createOrgSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, slug, logo } = validation.data;

    const existing = await db.organization.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "An organization with this slug already exists" },
        { status: 409 }
      );
    }

    const org = await db.$transaction(async (tx) => {
      const newOrg = await tx.organization.create({
        data: {
          name,
          slug,
          logo,
          ownerId: session.user.id,
          plan: "FREE",
        },
      });

      await tx.membership.create({
        data: {
          userId: session.user.id,
          orgId: newOrg.id,
          role: "OWNER",
        },
      });

      await tx.activityLog.create({
        data: {
          action: "ORG_CREATED",
          entity: "Organization",
          entityId: newOrg.id,
          details: { name: newOrg.name, slug: newOrg.slug },
          userId: session.user.id,
          orgId: newOrg.id,
        },
      });

      return newOrg;
    });

    return NextResponse.json(
      { message: "Organization created", org },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
