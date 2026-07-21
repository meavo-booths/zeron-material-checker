import type { DeliveryPricePoint } from "@/lib/analysis/outliers";

/** Minimum relative qty/price swing to consider a unit mix-up. */
export const UNIT_MISMATCH_MIN_FACTOR = 1.8;

/** How close qtyFactor × priceFactor must be to 1 (reciprocal). */
export const UNIT_MISMATCH_RECIPROCAL_TOLERANCE = 0.35;

/** How close line total must stay to typical for the "stable total" rule. */
export const UNIT_MISMATCH_LINE_TOTAL_TOLERANCE = 0.3;

export type UnitMismatchSuspicion = DeliveryPricePoint & {
  typicalQuantity: number;
  typicalUnitCost: number;
  quantityFactor: number;
  priceFactor: number;
  reciprocalScore: number;
  lineTotal: number;
  typicalLineTotal: number;
  lineTotalDeviationPct: number;
  reason: "reciprocal_qty_price" | "stable_line_total";
  explanation: string;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/**
 * Detects likely unit-of-measure entry errors:
 * e.g. 5 rolls × 30m entered as 150 rolls (qty ×30, unit price ~÷30).
 *
 * Primary rule: quantity and unit price move by roughly reciprocal factors.
 * Secondary rule: qty and unit price both move a lot, but line total stays stable.
 */
export function analyzeUnitMismatches(
  deliveries: DeliveryPricePoint[],
): UnitMismatchSuspicion[] {
  const byCode = new Map<string, DeliveryPricePoint[]>();
  for (const delivery of deliveries) {
    if (
      delivery.quantity === null ||
      delivery.quantity <= 0 ||
      delivery.unitCost <= 0
    ) {
      continue;
    }
    const list = byCode.get(delivery.itemCode) ?? [];
    list.push(delivery);
    byCode.set(delivery.itemCode, list);
  }

  const findings: UnitMismatchSuspicion[] = [];

  for (const group of byCode.values()) {
    if (group.length < 3) continue;

    const quantities = group.map((d) => d.quantity!).filter((q) => q > 0);
    const prices = group.map((d) => d.unitCost).filter((p) => p > 0);
    const typicalQuantity = median(quantities);
    const typicalUnitCost = median(prices);
    if (typicalQuantity <= 0 || typicalUnitCost <= 0) continue;

    const typicalLineTotal = typicalQuantity * typicalUnitCost;

    for (const delivery of group) {
      const quantity = delivery.quantity!;
      const quantityFactor = quantity / typicalQuantity;
      const priceFactor = delivery.unitCost / typicalUnitCost;
      const reciprocalScore = quantityFactor * priceFactor;
      const lineTotal = quantity * delivery.unitCost;
      const lineTotalDeviationPct =
        Math.abs(lineTotal - typicalLineTotal) / typicalLineTotal;

      const qtyMoved =
        quantityFactor >= UNIT_MISMATCH_MIN_FACTOR ||
        quantityFactor <= 1 / UNIT_MISMATCH_MIN_FACTOR;
      const priceMoved =
        priceFactor >= UNIT_MISMATCH_MIN_FACTOR ||
        priceFactor <= 1 / UNIT_MISMATCH_MIN_FACTOR;

      if (!qtyMoved || !priceMoved) continue;

      const reciprocal =
        Math.abs(reciprocalScore - 1) <= UNIT_MISMATCH_RECIPROCAL_TOLERANCE;
      const stableTotal =
        lineTotalDeviationPct <= UNIT_MISMATCH_LINE_TOTAL_TOLERANCE;

      if (!reciprocal && !stableTotal) continue;

      const reason = reciprocal ? "reciprocal_qty_price" : "stable_line_total";
      const explanation = reciprocal
        ? `Quantity is ~${quantityFactor.toFixed(1)}× typical while unit price is ~${priceFactor.toFixed(2)}× typical (product ≈ ${reciprocalScore.toFixed(2)}). Likely a unit mix-up (e.g. meters entered as rolls).`
        : `Quantity and unit price both moved sharply, but line total stayed within ${(UNIT_MISMATCH_LINE_TOTAL_TOLERANCE * 100).toFixed(0)}% of typical — consistent with a unit-of-measure entry error.`;

      findings.push({
        ...delivery,
        typicalQuantity,
        typicalUnitCost,
        quantityFactor,
        priceFactor,
        reciprocalScore,
        lineTotal,
        typicalLineTotal,
        lineTotalDeviationPct,
        reason,
        explanation,
      });
    }
  }

  return findings.sort((a, b) => {
    const aScore = Math.abs(a.reciprocalScore - 1);
    const bScore = Math.abs(b.reciprocalScore - 1);
    if (aScore !== bScore) return aScore - bScore;
    return b.deliveryDate.getTime() - a.deliveryDate.getTime();
  });
}
