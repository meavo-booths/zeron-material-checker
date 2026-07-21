import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analyzeItemOutliers,
  OUTLIER_THRESHOLD,
} from "@/lib/analysis/outliers";
import { parseDeliveryRowsFromMatrix } from "@/lib/import/deliveries";

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

test("analyzeItemOutliers flags prices above threshold", () => {
  const summary = analyzeItemOutliers(
    [
      {
        id: "1",
        processNumber: "P-1",
        deliveryDate: new Date("2024-01-01"),
        itemCode: "0114",
        itemName: "Item",
        unitCost: 10,
        warehouse: "Варна",
        attachmentPresent: true,
        sourceTab: "tab",
        sourceFileName: "a.pdf",
      },
      {
        id: "2",
        processNumber: "P-2",
        deliveryDate: new Date("2024-02-01"),
        itemCode: "0114",
        itemName: "Item",
        unitCost: 10.2,
        warehouse: "Варна",
        attachmentPresent: false,
        sourceTab: "tab",
        sourceFileName: null,
      },
      {
        id: "3",
        processNumber: "P-3",
        deliveryDate: new Date("2024-03-01"),
        itemCode: "0114",
        itemName: "Item",
        unitCost: 15,
        warehouse: "Варна",
        attachmentPresent: true,
        sourceTab: "tab",
        sourceFileName: "b.pdf",
      },
    ],
    OUTLIER_THRESHOLD,
  );

  assert.ok(summary);
  assert.equal(summary.outlierCount, 1);
  assert.equal(summary.outliers[0]?.processNumber, "P-3");
  assert.ok(summary.averageUnitCost < 11);
});
