export const OUTLIER_THRESHOLD = 0.2;

export type DeliveryPricePoint = {
  id: string;
  processNumber: string;
  deliveryDate: Date;
  itemCode: string;
  itemName: string;
  unitCost: number;
  quantity: number | null;
  unit: string | null;
  totalCost: number | null;
  warehouse: string | null;
  attachmentPresent: boolean;
  sourceTab: string | null;
  sourceFileName: string | null;
};

export type OutlierDelivery = DeliveryPricePoint & {
  deviationPct: number;
  baselinePrice: number;
  accepted: boolean;
};

export type ItemOutlierSummary = {
  itemCode: string;
  itemName: string;
  deliveryCount: number;
  averageUnitCost: number;
  baselineUnitCost: number;
  outlierCount: number;
  acceptedCount: number;
  outliers: OutlierDelivery[];
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

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Normalize unit cost for accepted-price matching. */
export function normalizeUnitCostKey(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return value.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function isAcceptedUnitCost(
  unitCost: number,
  acceptedCosts: Iterable<number>,
  tolerance = 0.005,
): boolean {
  if (unitCost <= 0) return false;
  for (const accepted of acceptedCosts) {
    if (accepted <= 0) continue;
    if (Math.abs(unitCost - accepted) / accepted <= tolerance) {
      return true;
    }
  }
  return false;
}

export function analyzeItemOutliers(
  deliveries: DeliveryPricePoint[],
  options?: {
    threshold?: number;
    acceptedUnitCosts?: number[];
  },
): ItemOutlierSummary | null {
  if (deliveries.length === 0) return null;

  const threshold = options?.threshold ?? OUTLIER_THRESHOLD;
  const acceptedUnitCosts = options?.acceptedUnitCosts ?? [];

  const prices = deliveries.map((d) => d.unitCost).filter((p) => p > 0);
  if (prices.length === 0) return null;

  const baseline = median(prices);
  if (baseline <= 0) return null;

  const outliers: OutlierDelivery[] = [];
  const nonOutlierPrices: number[] = [];
  let acceptedCount = 0;

  for (const delivery of deliveries) {
    const accepted = isAcceptedUnitCost(delivery.unitCost, acceptedUnitCosts);
    const deviationPct = Math.abs(delivery.unitCost - baseline) / baseline;

    if (deviationPct > threshold) {
      if (accepted) {
        acceptedCount++;
        nonOutlierPrices.push(delivery.unitCost);
      } else {
        outliers.push({
          ...delivery,
          deviationPct,
          baselinePrice: baseline,
          accepted: false,
        });
      }
    } else {
      nonOutlierPrices.push(delivery.unitCost);
    }
  }

  const averageUnitCost =
    nonOutlierPrices.length > 0 ? average(nonOutlierPrices) : baseline;

  const latestName =
    [...deliveries]
      .sort((a, b) => b.deliveryDate.getTime() - a.deliveryDate.getTime())
      .find((d) => d.itemName.trim())?.itemName ?? deliveries[0]!.itemName;

  return {
    itemCode: deliveries[0]!.itemCode,
    itemName: latestName,
    deliveryCount: deliveries.length,
    averageUnitCost,
    baselineUnitCost: baseline,
    outlierCount: outliers.length,
    acceptedCount,
    outliers: outliers.sort((a, b) => {
      if (b.deviationPct !== a.deviationPct) {
        return b.deviationPct - a.deviationPct;
      }
      return b.deliveryDate.getTime() - a.deliveryDate.getTime();
    }),
  };
}

export function analyzeAllItemOutliers(
  deliveries: DeliveryPricePoint[],
  acceptedByItemCode: Map<string, number[]> = new Map(),
  threshold = OUTLIER_THRESHOLD,
): ItemOutlierSummary[] {
  const byCode = new Map<string, DeliveryPricePoint[]>();

  for (const delivery of deliveries) {
    const list = byCode.get(delivery.itemCode) ?? [];
    list.push(delivery);
    byCode.set(delivery.itemCode, list);
  }

  const summaries: ItemOutlierSummary[] = [];

  for (const [itemCode, group] of byCode.entries()) {
    const summary = analyzeItemOutliers(group, {
      threshold,
      acceptedUnitCosts: acceptedByItemCode.get(itemCode) ?? [],
    });
    if (summary && summary.outlierCount > 0) {
      summaries.push(summary);
    }
  }

  return summaries.sort((a, b) => {
    const aMax = a.outliers[0]?.deviationPct ?? 0;
    const bMax = b.outliers[0]?.deviationPct ?? 0;
    if (bMax !== aMax) {
      return bMax - aMax;
    }
    if (b.outlierCount !== a.outlierCount) {
      return b.outlierCount - a.outlierCount;
    }
    return a.itemCode.localeCompare(b.itemCode, "bg");
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("bg-BG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("bg-BG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function formatQuantity(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("bg-BG", {
    maximumFractionDigits: 4,
  }).format(value);
}
