import { prisma } from "@/lib/prisma";

export async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { systemRole: true },
  });
  return user?.systemRole === "ADMIN";
}

export async function canManageImports(userId: string): Promise<boolean> {
  return isAdmin(userId);
}

export async function canViewDashboard(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return Boolean(user);
}
