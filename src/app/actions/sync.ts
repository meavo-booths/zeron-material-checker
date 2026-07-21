"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canManageImports } from "@/lib/permissions";
import { syncGoogleSheet } from "@/lib/domain/sync-sheet";

export async function syncSheetAction(force = false) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const allowed = await canManageImports(session.user.id);
  if (!allowed) {
    throw new Error("You do not have permission to sync imports");
  }

  const result = await syncGoogleSheet(session.user.id, { force });
  revalidatePath("/dashboard");
  revalidatePath("/sync");
  return result;
}
