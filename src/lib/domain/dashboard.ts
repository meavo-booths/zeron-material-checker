import "server-only";

import { prisma } from "@/lib/prisma";
import {
  analyzeAllItemOutliers,
  analyzeItemOutliers,
  normalizeUnitCostKey,
  type DeliveryPricePoint,
  type ItemOutlierSummary,
} from "@/lib/analysis/outliers";
import { analyzeUnitMismatches } from "@/lib/analysis/unit-mismatch";

function toNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function toOptionalNumber(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
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
    quantity: toOptionalNumber(row.stockQuantity),
    unit: row.unit,
    totalCost: toOptionalNumber(row.totalCost),
    warehouse: row.warehouse,
    attachmentPresent: row.attachmentPresent,
    sourceTab: row.sourceTab,
    sourceFileName: row.sourceFileName,
  }));
}

export async function loadAcceptedUnitCostsByItem(
  itemCodes?: string[],
): Promise<Map<string, number[]>> {
  const rows = await prisma.zeronAcceptedUnitCost.findMany({
    where: itemCodes?.length ? { itemCode: { in: itemCodes } } : undefined,
    select: { itemCode: true, unitCost: true },
  });

  const map = new Map<string, number[]>();
  for (const row of rows) {
    const value = toNumber(row.unitCost);
    if (value <= 0) continue;
    const list = map.get(row.itemCode) ?? [];
    list.push(value);
    map.set(row.itemCode, list);
  }
  return map;
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
    acceptedPriceLevels: number;
  };
}> {
  const deliveries = await loadDeliveryPricePoints(filters);
  const itemCodes = [...new Set(deliveries.map((d) => d.itemCode))];
  const acceptedByItem = await loadAcceptedUnitCostsByItem(itemCodes);
  const summaries = analyzeAllItemOutliers(deliveries, acceptedByItem);
  const importedTabs = await prisma.zeronImportedTab.count();
  const acceptedPriceLevels = await prisma.zeronAcceptedUnitCost.count();

  return {
    summaries,
    stats: {
      totalDeliveries: deliveries.length,
      totalItems: itemCodes.length,
      itemsWithOutliers: summaries.length,
      totalOutlierRows: summaries.reduce((sum, item) => sum + item.outlierCount, 0),
      importedTabs,
      acceptedPriceLevels,
    },
  };
}

export async function getItemDetail(itemCode: string) {
  const deliveries = await loadDeliveryPricePoints({ itemCode });
  const acceptedByItem = await loadAcceptedUnitCostsByItem([itemCode]);
  const acceptedUnitCosts = acceptedByItem.get(itemCode) ?? [];
  const analysis = analyzeItemOutliers(deliveries, { acceptedUnitCosts });
  const acceptedRows = await prisma.zeronAcceptedUnitCost.findMany({
    where: { itemCode },
    orderBy: { createdAt: "desc" },
    include: {
      markedBy: { select: { email: true, name: true } },
    },
  });

  return {
    deliveries,
    analysis,
    acceptedRows,
    acceptedUnitCosts,
  };
}

export async function getUnitMismatchDashboardData(filters?: {
  itemCode?: string;
}) {
  const deliveries = await loadDeliveryPricePoints({
    itemCode: filters?.itemCode,
  });
  const findings = analyzeUnitMismatches(deliveries);

  return {
    findings,
    stats: {
      totalDeliveries: deliveries.length,
      suspectedRows: findings.length,
      affectedItems: new Set(findings.map((f) => f.itemCode)).size,
    },
  };
}

export async function markOutlierAsCorrect(input: {
  deliveryRowId: string;
  userId: string;
  note?: string;
}) {
  const row = await prisma.zeronDeliveryRow.findUnique({
    where: { id: input.deliveryRowId },
  });
  if (!row) {
    throw new Error("Delivery row not found");
  }

  const unitCostKey = normalizeUnitCostKey(toNumber(row.unitCost));
  if (!unitCostKey) {
    throw new Error("Invalid unit cost on delivery row");
  }

  return prisma.zeronAcceptedUnitCost.upsert({
    where: {
      itemCode_unitCost: {
        itemCode: row.itemCode,
        unitCost: unitCostKey,
      },
    },
    create: {
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitCost: unitCostKey,
      note: input.note?.trim() ?? "",
      deliveryRowId: row.id,
      markedById: input.userId,
    },
    update: {
      itemName: row.itemName,
      note: input.note?.trim() ?? "",
      deliveryRowId: row.id,
      markedById: input.userId,
    },
  });
}

export async function revokeAcceptedUnitCost(input: {
  acceptedId: string;
}) {
  await prisma.zeronAcceptedUnitCost.delete({
    where: { id: input.acceptedId },
  });
}
