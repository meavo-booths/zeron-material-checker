"use server";

import { revalidatePath } from "next/cache";
import { requireZeronAccess } from "@/lib/meavo-auth";
import {
  markOutlierAsCorrect,
  revokeAcceptedUnitCost,
} from "@/lib/domain/dashboard";

export async function markOutlierCorrectAction(formData: FormData) {
  const session = await requireZeronAccess();
  const deliveryRowId = formData.get("deliveryRowId")?.toString();
  if (!deliveryRowId) {
    throw new Error("Missing delivery row");
  }

  await markOutlierAsCorrect({
    deliveryRowId,
    userId: session.user.id,
    note: formData.get("note")?.toString(),
  });

  revalidatePath("/dashboard");
  revalidatePath("/entry-errors");
  const itemCode = formData.get("itemCode")?.toString();
  if (itemCode) {
    revalidatePath(`/items/${encodeURIComponent(itemCode)}`);
  }
}

export async function revokeAcceptedPriceAction(formData: FormData) {
  await requireZeronAccess();
  const acceptedId = formData.get("acceptedId")?.toString();
  if (!acceptedId) {
    throw new Error("Missing accepted price id");
  }

  await revokeAcceptedUnitCost({ acceptedId });
  revalidatePath("/dashboard");
  revalidatePath("/entry-errors");
  const itemCode = formData.get("itemCode")?.toString();
  if (itemCode) {
    revalidatePath(`/items/${encodeURIComponent(itemCode)}`);
  }
}
