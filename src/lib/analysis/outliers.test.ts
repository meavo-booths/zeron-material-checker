import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeItemOutliers,
  OUTLIER_THRESHOLD,
} from "@/lib/analysis/outliers";
import { analyzeUnitMismatches } from "@/lib/analysis/unit-mismatch";
import { parseDeliveryRowsFromMatrix } from "@/lib/import/deliveries";

function point(
  partial: Partial<Parameters<typeof analyzeItemOutliers>[0][number]> & {
    id: string;
    unitCost: number;
  },
) {
  return {
    processNumber: partial.processNumber ?? `P-${partial.id}`,
    deliveryDate: partial.deliveryDate ?? new Date("2024-01-01"),
    itemCode: partial.itemCode ?? "0114",
    itemName: partial.itemName ?? "Item",
    quantity: partial.quantity ?? 10,
    unit: partial.unit ?? "бр",
    totalCost: partial.totalCost ?? null,
    warehouse: partial.warehouse ?? "Варна",
    attachmentPresent: partial.attachmentPresent ?? false,
    sourceTab: partial.sourceTab ?? "tab",
    sourceFileName: partial.sourceFileName ?? null,
    ...partial,
  };
}

test("parseDeliveryRowsFromMatrix maps Bulgarian headers", () => {
  const matrix = [
    [
      "Номер на процес",
      "Дата",
      "Код артикул",
      "Име артикул",
      "Стоково количество",
      "Мярка",
      "Ед.себестойност",
      "Себестойност",
      "Склад",
      "Доп.разход",
      "Тип артикул",
      "Име файл",
    ],
    [
      "P-100",
      "15.03.2024",
      "0114",
      "ПДЧ Бяло",
      "10",
      "бр",
      "12,50",
      "125",
      "Варна",
      "0",
      "Материал",
      "invoice.pdf",
    ],
  ];

  const { rows, errors } = parseDeliveryRowsFromMatrix(matrix, "2024-03-15");
  assert.equal(errors.length, 0);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.itemCode, "0114");
  assert.equal(rows[0]?.unitCost, "12.5");
  assert.equal(rows[0]?.attachmentPresent, true);
});

test("analyzeItemOutliers uses 20% threshold", () => {
  const summary = analyzeItemOutliers(
    [
      point({ id: "1", unitCost: 10, deliveryDate: new Date("2024-01-01") }),
      point({ id: "2", unitCost: 10.2, deliveryDate: new Date("2024-02-01") }),
      point({ id: "3", unitCost: 11.5, deliveryDate: new Date("2024-03-01") }),
      point({ id: "4", unitCost: 15, deliveryDate: new Date("2024-04-01") }),
    ],
    { threshold: OUTLIER_THRESHOLD },
  );

  assert.ok(summary);
  assert.equal(OUTLIER_THRESHOLD, 0.2);
  assert.equal(summary.outlierCount, 1);
  assert.equal(summary.outliers[0]?.processNumber, "P-4");
});

test("accepted unit costs suppress outliers", () => {
  const summary = analyzeItemOutliers(
    [
      point({ id: "1", unitCost: 10 }),
      point({ id: "2", unitCost: 10.1 }),
      point({ id: "3", unitCost: 15 }),
    ],
    { acceptedUnitCosts: [15] },
  );

  assert.ok(summary);
  assert.equal(summary.outlierCount, 0);
  assert.equal(summary.acceptedCount, 1);
});

test("analyzeUnitMismatches flags reciprocal qty/price errors", () => {
  const findings = analyzeUnitMismatches([
    point({ id: "1", quantity: 5, unitCost: 30, deliveryDate: new Date("2024-01-01") }),
    point({ id: "2", quantity: 5, unitCost: 31, deliveryDate: new Date("2024-02-01") }),
    point({ id: "3", quantity: 4, unitCost: 29, deliveryDate: new Date("2024-03-01") }),
    point({
      id: "4",
      quantity: 150,
      unitCost: 1,
      deliveryDate: new Date("2024-04-01"),
      processNumber: "P-BAD",
    }),
  ]);

  assert.ok(findings.length >= 1);
  assert.equal(findings[0]?.processNumber, "P-BAD");
  assert.equal(findings[0]?.reason, "reciprocal_qty_price");
});
