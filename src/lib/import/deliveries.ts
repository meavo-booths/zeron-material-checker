import { createHash } from "node:crypto";
import { parseCsv } from "@/lib/import/csv";

const HEADER_ALIASES: Record<string, string[]> = {
  processNumber: ["номер на процес", "process number", "process"],
  date: ["дата", "date"],
  itemCode: ["код артикул", "item code", "article code"],
  itemName: ["име артикул", "item name", "article name"],
  stockQuantity: ["стоково количество", "quantity", "stock quantity"],
  unit: ["мярка", "unit", "measure"],
  unitCost: ["ед.себестойност", "ед себестойност", "unit cost", "unit price"],
  totalCost: ["себестойност", "total cost"],
  warehouse: ["склад", "warehouse"],
  extraCost: ["доп.разход", "доп разход", "extra cost"],
  itemType: ["тип артикул", "item type"],
  sourceFileName: ["име файл", "file name", "filename"],
};

const COLUMN_ORDER = [
  "processNumber",
  "date",
  "itemCode",
  "itemName",
  "stockQuantity",
  "unit",
  "unitCost",
  "totalCost",
  "warehouse",
  "extraCost",
  "itemType",
  "sourceFileName",
] as const;

export type DeliveryField = (typeof COLUMN_ORDER)[number];

export type ParsedDeliveryRow = {
  rowNum: number;
  processNumber: string;
  deliveryDate: Date;
  itemCode: string;
  itemName: string;
  stockQuantity: string | null;
  unit: string | null;
  unitCost: string;
  totalCost: string | null;
  warehouse: string | null;
  extraCost: string | null;
  itemType: string | null;
  sourceFileName: string | null;
  attachmentPresent: boolean;
  sourceKey: string;
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildHeaderIndex(headers: string[]): Partial<Record<DeliveryField, number>> {
  const index: Partial<Record<DeliveryField, number>> = {};

  headers.forEach((header, i) => {
    const normalized = normalizeHeader(header);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) {
        index[field as DeliveryField] = i;
      }
    }
  });

  COLUMN_ORDER.forEach((field, i) => {
    if (index[field] === undefined && headers[i]?.trim()) {
      index[field] = i;
    }
  });

  return index;
}

function getCell(row: string[], index: Partial<Record<DeliveryField, number>>, field: DeliveryField): string {
  const pos = index[field];
  if (pos === undefined) return "";
  return row[pos]?.trim() ?? "";
}

export function parseDecimal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return num.toString();
}

export function parseDeliveryDate(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Missing date");
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T00:00:00.000Z`);
  }

  const dotted = trimmed.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (dotted) {
    const day = dotted[1]!.padStart(2, "0");
    const month = dotted[2]!.padStart(2, "0");
    const yearRaw = dotted[3]!;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${value}`);
  }
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()),
  );
}

function buildSourceKey(parts: {
  sourceName: string;
  processNumber: string;
  itemCode: string;
  deliveryDate: Date;
  unitCost: string;
  rowNum: number;
}): string {
  const payload = [
    parts.sourceName,
    parts.processNumber,
    parts.itemCode,
    parts.deliveryDate.toISOString().slice(0, 10),
    parts.unitCost,
    String(parts.rowNum),
  ].join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export function parseDeliveryRowsFromMatrix(
  matrix: string[][],
  sourceName: string,
): { rows: ParsedDeliveryRow[]; errors: Array<{ row: number; message: string }> } {
  if (matrix.length === 0) {
    return { rows: [], errors: [] };
  }

  const headers = matrix[0]!.map((cell) => cell.trim());
  const dataRows = matrix.slice(1);
  const headerIndex = buildHeaderIndex(headers);
  const rows: ParsedDeliveryRow[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 0; i < dataRows.length; i++) {
    const rowNum = i + 2;
    const row = dataRows[i] ?? [];

    try {
      const itemCode = getCell(row, headerIndex, "itemCode");
      const unitCostRaw = getCell(row, headerIndex, "unitCost");
      if (!itemCode && !unitCostRaw) continue;

      if (!itemCode) {
        throw new Error("Missing item code (Код артикул)");
      }

      const unitCost = parseDecimal(unitCostRaw);
      if (!unitCost) {
        throw new Error("Missing or invalid unit cost (Ед.себестойност)");
      }

      const deliveryDate = parseDeliveryDate(getCell(row, headerIndex, "date"));
      const processNumber = getCell(row, headerIndex, "processNumber");
      const sourceFileName = getCell(row, headerIndex, "sourceFileName") || null;

      const parsed: ParsedDeliveryRow = {
        rowNum,
        processNumber,
        deliveryDate,
        itemCode,
        itemName: getCell(row, headerIndex, "itemName"),
        stockQuantity: getCell(row, headerIndex, "stockQuantity") || null,
        unit: getCell(row, headerIndex, "unit") || null,
        unitCost,
        totalCost: parseDecimal(getCell(row, headerIndex, "totalCost")),
        warehouse: getCell(row, headerIndex, "warehouse") || null,
        extraCost: parseDecimal(getCell(row, headerIndex, "extraCost")),
        itemType: getCell(row, headerIndex, "itemType") || null,
        sourceFileName,
        attachmentPresent: Boolean(sourceFileName?.trim()),
        sourceKey: buildSourceKey({
          sourceName,
          processNumber,
          itemCode,
          deliveryDate,
          unitCost,
          rowNum,
        }),
      };

      rows.push(parsed);
    } catch (error) {
      errors.push({
        row: rowNum,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { rows, errors };
}

export function parseDeliveryRowsFromCsv(
  text: string,
  sourceName: string,
): { rows: ParsedDeliveryRow[]; errors: Array<{ row: number; message: string }> } {
  const { headers, rows } = parseCsv(text);
  const matrix = [headers, ...rows];
  return parseDeliveryRowsFromMatrix(matrix, sourceName);
}
