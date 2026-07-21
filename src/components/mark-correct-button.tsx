"use client";

import { useTransition } from "react";
import { markOutlierCorrectAction } from "@/app/actions/accept-outlier";

export function MarkCorrectButton({
  deliveryRowId,
  itemCode,
}: {
  deliveryRowId: string;
  itemCode: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await markOutlierCorrectAction(formData);
        });
      }}
    >
      <input type="hidden" name="deliveryRowId" value={deliveryRowId} />
      <input type="hidden" name="itemCode" value={itemCode} />
      <button type="submit" className="btn-secondary text-xs" disabled={pending}>
        {pending ? "Saving..." : "Mark as correct"}
      </button>
    </form>
  );
}
