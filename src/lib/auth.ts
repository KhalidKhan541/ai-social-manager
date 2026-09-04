import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image: string | null;
      role: string;
      orgId: string | null;
      orgSlug: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    name: string | null;
    role: string;
    orgId: string | null;
    orgSlug: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
    signOut: "/auth/logout",
    verifyRequest: "/auth/verify",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            image: true,
            isActive: true,
          },
        });

        if (!user) {
          throw new Error("No account found with this email");
        }

        if (!user.isActive) {
          throw new Error("Account has been deactivated");
        }

        if (!user.passwordHash) {
          throw new Error(
            "This account uses social login. Please sign in with your provider."
          );
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true;
      }

      if (!user?.email) {
        return false;
      }

      try {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, isActive: true },
        });

        if (existingUser && !existingUser.isActive) {
          return false;
        }

        if (!existingUser) {
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? profile?.name ?? null,
              image: user.image ?? (profile as any)?.picture ?? null,
              emailVerified: new Date(),
            },
          });

          (user as any).id = newUser.id;
        } else {
          (user as any).id = existingUser.id;

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              lastLoginAt: new Date(),
              image: user.image ?? existingUser.image,
            },
          });
        }

        return true;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
      }

      if (trigger === "update" && session) {
        token.orgId = session.orgId ?? token.orgId;
        token.orgSlug = session.orgSlug ?? token.orgSlug;
        token.role = session.role ?? token.role;
      }

      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            role: true,
            isSuperAdmin: true,
            orgMemberships: {
              select: {
                role: true,
                org: {
                  select: {
                    id: true,
                    slug: true,
                  },
                },
              },
              take: 1,
              orderBy: { joinedAt: "asc" },
            },
          },
        });

        if (dbUser) {
          token.id = dbUser.id;
          const membership = dbUser.orgMemberships[0];

          if (membership) {
            token.role = dbUser.isSuperAdmin ? "OWNER" : membership.role;
            token.orgId = membership.org.id;
            token.orgSlug = membership.org.slug;
          } else if (dbUser.isSuperAdmin) {
            token.role = "OWNER";
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.orgId = token.orgId;
        session.user.orgSlug = token.orgSlug;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  events: {
    async signIn({ user, account }) {
      console.log(`User ${user.email} signed in via ${account?.provider}`);
    },
    async signOut({ token }) {
      console.log(`User ${token.email} signed out`);
    },
  },
};

export async function getCurrentUser() {
  const { getServerSession } = await import("next-auth");
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return null;
  }

  return session.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Authentication required");
  }

  return user;
}
