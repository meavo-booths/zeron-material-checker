import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ZERON_TOOL_CARD_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function requireZeronAccess() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const access = await prisma.toolCardAccess.findFirst({
    where: { userId: session.user.id, cardId: ZERON_TOOL_CARD_ID },
  });

  if (!access) redirect("/login?error=NoAccess");

  return session;
}

export async function hasZeronAccess(userId: string): Promise<boolean> {
  const access = await prisma.toolCardAccess.findFirst({
    where: { userId, cardId: ZERON_TOOL_CARD_ID },
    select: { id: true },
  });
  return Boolean(access);
}
