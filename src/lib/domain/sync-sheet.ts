import "server-only";

import {
  ZeronImportSourceType,
  ZeronImportStatus,
  type Prisma,
} from "@prisma/client";
import {
  getConfiguredSpreadsheetId,
  getSheetValues,
  hashSheetValues,
  listSheetTabs,
} from "@/lib/google-sheets-client";
import { parseDeliveryRowsFromMatrix, parseDeliveryRowsFromCsv } from "@/lib/import/deliveries";
import { emptyImportResult, type ImportResult } from "@/lib/import/types";
import { prisma } from "@/lib/prisma";
import type { SheetSyncResult, TabSyncStatus } from "@/lib/domain/sync-types";

export type { SheetSyncResult, TabSyncStatus } from "@/lib/domain/sync-types";

function resolveImportStatus(errorCount: number, created: number): ZeronImportStatus {
  if (errorCount > 0 && created === 0) return ZeronImportStatus.FAILED;
  if (errorCount > 0) return ZeronImportStatus.PARTIAL;
  return ZeronImportStatus.SUCCESS;
}

async function persistDeliveryRows(
  importRunId: string,
  sourceType: ZeronImportSourceType,
  sourceName: string,
  rows: ReturnType<typeof parseDeliveryRowsFromMatrix>["rows"],
): Promise<number> {
  if (rows.length === 0) return 0;

  const existing = await prisma.zeronDeliveryRow.findMany({
    where: {
      sourceKey: { in: rows.map((row) => row.sourceKey) },
    },
    select: { sourceKey: true },
  });
  const existingKeys = new Set(existing.map((row) => row.sourceKey));
  const newRows = rows.filter((row) => !existingKeys.has(row.sourceKey));
  if (newRows.length === 0) return 0;

  const data: Prisma.ZeronDeliveryRowCreateManyInput[] = newRows.map((row) => ({
    importRunId,
    sourceKey: row.sourceKey,
    processNumber: row.processNumber,
    deliveryDate: row.deliveryDate,
    itemCode: row.itemCode,
    itemName: row.itemName,
    stockQuantity: row.stockQuantity,
    unit: row.unit,
    unitCost: row.unitCost,
    totalCost: row.totalCost,
    warehouse: row.warehouse,
    extraCost: row.extraCost,
    itemType: row.itemType,
    sourceFileName: row.sourceFileName,
    attachmentPresent: row.attachmentPresent,
    sourceTab: sourceType === ZeronImportSourceType.GOOGLE_SHEET_TAB ? sourceName : null,
    sourceType,
  }));

  const result = await prisma.zeronDeliveryRow.createMany({
    data,
  });

  return result.count;
}

async function importTab(
  spreadsheetId: string,
  tabName: string,
  triggeredById: string | null,
  force = false,
): Promise<TabSyncStatus> {
  const values = await getSheetValues(spreadsheetId, tabName);
  if (values.length === 0) {
    return {
      tabName,
      status: "skipped",
      rowCount: 0,
      errorCount: 0,
      message: "Tab is empty",
    };
  }

  const contentHash = hashSheetValues(values);
  const existingTab = await prisma.zeronImportedTab.findUnique({
    where: {
      spreadsheetId_tabName: {
        spreadsheetId,
        tabName,
      },
    },
  });

  if (!force && existingTab?.contentHash === contentHash) {
    return {
      tabName,
      status: "skipped",
      rowCount: existingTab.rowCount,
      errorCount: 0,
      message: "Already imported",
    };
  }

  const { rows, errors } = parseDeliveryRowsFromMatrix(values, tabName);
  const importRun = await prisma.zeronImportRun.create({
    data: {
      sourceType: ZeronImportSourceType.GOOGLE_SHEET_TAB,
      sourceName: tabName,
      status: ZeronImportStatus.PENDING,
      triggeredById,
      errorCount: errors.length,
      errors: JSON.stringify(errors),
    },
  });

  try {
    const created = await persistDeliveryRows(
      importRun.id,
      ZeronImportSourceType.GOOGLE_SHEET_TAB,
      tabName,
      rows,
    );

    const status = resolveImportStatus(errors.length, created);
    await prisma.zeronImportRun.update({
      where: { id: importRun.id },
      data: {
        status,
        rowCount: created,
        skippedCount: Math.max(0, rows.length - created),
        errorCount: errors.length,
        completedAt: new Date(),
      },
    });

    await prisma.zeronImportedTab.upsert({
      where: {
        spreadsheetId_tabName: {
          spreadsheetId,
          tabName,
        },
      },
      create: {
        spreadsheetId,
        tabName,
        contentHash,
        rowCount: created,
        importRunId: importRun.id,
      },
      update: {
        contentHash,
        rowCount: created,
        importedAt: new Date(),
        importRunId: importRun.id,
      },
    });

    return {
      tabName,
      status: errors.length > 0 && created === 0 ? "failed" : "imported",
      rowCount: created,
      errorCount: errors.length,
      message: errors.length > 0 ? `${errors.length} row validation errors` : undefined,
    };
  } catch (error) {
    await prisma.zeronImportRun.update({
      where: { id: importRun.id },
      data: {
        status: ZeronImportStatus.FAILED,
        completedAt: new Date(),
        errors: JSON.stringify([
          {
            row: 0,
            message: error instanceof Error ? error.message : String(error),
          },
        ]),
      },
    });

    return {
      tabName,
      status: "failed",
      rowCount: 0,
      errorCount: 1,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function syncGoogleSheet(
  triggeredById: string | null,
  options?: { force?: boolean; spreadsheetId?: string },
): Promise<SheetSyncResult> {
  const spreadsheetId = options?.spreadsheetId ?? getConfiguredSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID is not configured");
  }

  const tabs = await listSheetTabs(spreadsheetId);
  const tabResults: TabSyncStatus[] = [];

  for (const tabName of tabs) {
    tabResults.push(
      await importTab(spreadsheetId, tabName, triggeredById, options?.force ?? false),
    );
  }

  const totalImported = tabResults
    .filter((tab) => tab.status === "imported")
    .reduce((sum, tab) => sum + tab.rowCount, 0);
  const totalSkipped = tabResults.filter((tab) => tab.status === "skipped").length;
  const totalFailed = tabResults.filter((tab) => tab.status === "failed").length;

  await prisma.zeronSheetState.upsert({
    where: { id: "default" },
    create: {
      spreadsheetId,
      lastSyncedAt: new Date(),
      lastError: totalFailed > 0 ? `${totalFailed} tab(s) failed` : null,
    },
    update: {
      spreadsheetId,
      lastSyncedAt: new Date(),
      lastError: totalFailed > 0 ? `${totalFailed} tab(s) failed` : null,
    },
  });

  return {
    spreadsheetId,
    tabs: tabResults,
    totalImported,
    totalSkipped,
    totalFailed,
  };
}

export async function importCsvText(
  text: string,
  fileName: string,
  triggeredById: string | null,
): Promise<ImportResult> {
  const result = emptyImportResult();
  const { rows, errors } = parseDeliveryRowsFromCsv(text, fileName);

  result.errors.push(...errors);
  result.skipped = 0;

  const importRun = await prisma.zeronImportRun.create({
    data: {
      sourceType: ZeronImportSourceType.CSV_UPLOAD,
      sourceName: fileName,
      status: ZeronImportStatus.PENDING,
      triggeredById,
      errorCount: errors.length,
      errors: JSON.stringify(errors),
    },
  });

  try {
    const created = await persistDeliveryRows(
      importRun.id,
      ZeronImportSourceType.CSV_UPLOAD,
      fileName,
      rows,
    );

    result.created = created;
    result.updated = 0;
    result.ok = errors.length === 0 || created > 0;

    await prisma.zeronImportRun.update({
      where: { id: importRun.id },
      data: {
        status: resolveImportStatus(errors.length, created),
        rowCount: created,
        skippedCount: Math.max(0, rows.length - created),
        errorCount: errors.length,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    result.ok = false;
    result.errors.push({
      row: 0,
      message: error instanceof Error ? error.message : String(error),
    });

    await prisma.zeronImportRun.update({
      where: { id: importRun.id },
      data: {
        status: ZeronImportStatus.FAILED,
        completedAt: new Date(),
        errors: JSON.stringify(result.errors),
      },
    });
  }

  return result;
}

export async function getSheetSyncOverview() {
  const state = await prisma.zeronSheetState.findUnique({
    where: { id: "default" },
  });

  const importedTabs = await prisma.zeronImportedTab.findMany({
    orderBy: { importedAt: "desc" },
    take: 20,
  });

  const recentRuns = await prisma.zeronImportRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      triggeredBy: {
        select: { email: true, name: true },
      },
    },
  });

  return {
    state,
    configuredSpreadsheetId: getConfiguredSpreadsheetId(),
    importedTabs,
    recentRuns,
  };
}
