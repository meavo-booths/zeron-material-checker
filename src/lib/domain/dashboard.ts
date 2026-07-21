import "server-only";

import { prisma } from "@/lib/prisma";
import {
  analyzeAllItemOutliers,
  type DeliveryPricePoint,
  type ItemOutlierSummary,
} from "@/lib/analysis/outliers";

function toNumber(value: string): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function loadDeliveryPricePoints(filters?: {
  itemCode?: string;
  warehouse?: string;
  attachmentOnly?: boolean;
}): Promise<DeliveryPricePoint[]> {
  const rows = await prisma.zeronDeliveryRow.findMany({
    where: {
      itemCode: filters?.itemCode,
      warehouse: filters?.warehouse || undefined,
      attachmentPresent: filters?.attachmentOnly ? true : undefined,
    },
    orderBy: [{ deliveryDate: "desc" }, { itemCode: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    processNumber: row.processNumber,
    deliveryDate: row.deliveryDate,
    itemCode: row.itemCode,
    itemName: row.itemName,
    unitCost: toNumber(row.unitCost),
    warehouse: row.warehouse,
    attachmentPresent: row.attachmentPresent,
    sourceTab: row.sourceTab,
    sourceFileName: row.sourceFileName,
  }));
}

export async function getOutlierDashboardData(filters?: {
  itemCode?: string;
  warehouse?: string;
  attachmentOnly?: boolean;
}): Promise<{
  summaries: ItemOutlierSummary[];
  stats: {
    totalDeliveries: number;
    totalItems: number;
    itemsWithOutliers: number;
    totalOutlierRows: number;
    importedTabs: number;
  };
}> {
  const deliveries = await loadDeliveryPricePoints(filters);
  const summaries = analyzeAllItemOutliers(deliveries);

  const itemCodes = new Set(deliveries.map((d) => d.itemCode));
  const importedTabs = await prisma.zeronImportedTab.count();

  return {
    summaries,
    stats: {
      totalDeliveries: deliveries.length,
      totalItems: itemCodes.size,
      itemsWithOutliers: summaries.length,
      totalOutlierRows: summaries.reduce((sum, item) => sum + item.outlierCount, 0),
      importedTabs,
    },
  };
}

export async function getItemDetail(itemCode: string) {
  const deliveries = await loadDeliveryPricePoints({ itemCode });
  const { analyzeItemOutliers } = await import("@/lib/analysis/outliers");
  const analysis = analyzeItemOutliers(deliveries);

  return {
    deliveries,
    analysis,
  };
}
