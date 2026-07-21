"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { importCsvText } from "@/lib/domain/sync-sheet";
import { canManageImports } from "@/lib/permissions";

export async function importCsvAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const allowed = await canManageImports(session.user.id);
  if (!allowed) {
    throw new Error("You do not have permission to import CSV files");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Please choose a CSV file");
  }

  const text = await file.text();
  const result = await importCsvText(text, file.name, session.user.id);

  revalidatePath("/dashboard");
  revalidatePath("/sync");

  return result;
}
