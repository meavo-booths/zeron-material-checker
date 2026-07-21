export const OUTLIER_THRESHOLD = 0.1;

export type DeliveryPricePoint = {
  id: string;
  processNumber: string;
  deliveryDate: Date;
  itemCode: string;
  itemName: string;
  unitCost: number;
  warehouse: string | null;
  attachmentPresent: boolean;
  sourceTab: string | null;
  sourceFileName: string | null;
};

export type OutlierDelivery = DeliveryPricePoint & {
  deviationPct: number;
  baselinePrice: number;
};

export type ItemOutlierSummary = {
  itemCode: string;
  itemName: string;
  deliveryCount: number;
  averageUnitCost: number;
  baselineUnitCost: number;
  outlierCount: number;
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

export function analyzeItemOutliers(
  deliveries: DeliveryPricePoint[],
  threshold = OUTLIER_THRESHOLD,
): ItemOutlierSummary | null {
  if (deliveries.length === 0) return null;

  const prices = deliveries.map((d) => d.unitCost).filter((p) => p > 0);
  if (prices.length === 0) return null;

  const baseline = median(prices);
  if (baseline <= 0) return null;

  const outliers: OutlierDelivery[] = [];
  const nonOutlierPrices: number[] = [];

  for (const delivery of deliveries) {
    const deviationPct = Math.abs(delivery.unitCost - baseline) / baseline;
    if (deviationPct > threshold) {
      outliers.push({
        ...delivery,
        deviationPct,
        baselinePrice: baseline,
      });
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
    outliers: outliers.sort(
      (a, b) => b.deliveryDate.getTime() - a.deliveryDate.getTime(),
    ),
  };
}

export function analyzeAllItemOutliers(
  deliveries: DeliveryPricePoint[],
  threshold = OUTLIER_THRESHOLD,
): ItemOutlierSummary[] {
  const byCode = new Map<string, DeliveryPricePoint[]>();

  for (const delivery of deliveries) {
    const list = byCode.get(delivery.itemCode) ?? [];
    list.push(delivery);
    byCode.set(delivery.itemCode, list);
  }

  const summaries: ItemOutlierSummary[] = [];

  for (const group of byCode.values()) {
    const summary = analyzeItemOutliers(group, threshold);
    if (summary && summary.outlierCount > 0) {
      summaries.push(summary);
    }
  }

  return summaries.sort((a, b) => {
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
