import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/prisma";
import { registerSchema, validateRequest } from "@/validators";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(body, registerSchema);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { name, email, password, orgName } = validation.data;

    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const result = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role: "ADMIN",
        },
      });

      const slug = orgName
        ? orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 50)
        : `${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

      let uniqueSlug = slug;
      let counter = 1;
      while (await tx.organization.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
      }

      const org = await tx.organization.create({
        data: {
          name: orgName ?? `${name}'s Workspace`,
          slug: uniqueSlug,
          ownerId: user.id,
          plan: "FREE",
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          orgId: org.id,
          role: "OWNER",
        },
      });

      await tx.activityLog.create({
        data: {
          action: "USER_REGISTERED",
          entity: "User",
          entityId: user.id,
          details: { email: user.email, orgId: org.id },
          userId: user.id,
          orgId: org.id,
        },
      });

      return { user: { id: user.id, name: user.name, email: user.email }, org: { id: org.id, name: org.name, slug: org.slug } };
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: result.user,
        org: result.org,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register Error]", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
