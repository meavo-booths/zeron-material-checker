import Link from "next/link";
import { notFound } from "next/navigation";
import { requireZeronAccess } from "@/lib/meavo-auth";
import { getItemDetail } from "@/lib/domain/dashboard";
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/analysis/outliers";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireZeronAccess();
  const { code } = await params;
  const itemCode = decodeURIComponent(code);
  const { deliveries, analysis } = await getItemDetail(itemCode);

  if (deliveries.length === 0) {
    notFound();
  }

  const outlierIds = new Set(analysis?.outliers.map((row) => row.id) ?? []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-meavo-grey">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>{" "}
            / {itemCode}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            {itemCode} · {analysis?.itemName || deliveries[0]?.itemName || "—"}
          </h1>
        </div>
      </div>

      {analysis && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="card">
            <p className="text-sm text-meavo-grey">Average excluding outliers</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(analysis.averageUnitCost)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-meavo-grey">Baseline median</p>
            <p className="mt-2 text-2xl font-semibold">
              {formatCurrency(analysis.baselineUnitCost)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-meavo-grey">Outliers</p>
            <p className="mt-2 text-2xl font-semibold">{analysis.outlierCount}</p>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Process #</th>
              <th>Unit cost</th>
              <th>Status</th>
              <th>Attachment</th>
              <th>Warehouse</th>
              <th>Source tab</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => {
              const outlier = analysis?.outliers.find((row) => row.id === delivery.id);
              return (
                <tr key={delivery.id}>
                  <td>{formatDate(delivery.deliveryDate)}</td>
                  <td>{delivery.processNumber || "—"}</td>
                  <td>{formatCurrency(delivery.unitCost)}</td>
                  <td>
                    {outlier ? (
                      <span className="badge-danger">
                        Outlier {formatPercent(outlier.deviationPct)}
                      </span>
                    ) : outlierIds.has(delivery.id) ? (
                      <span className="badge-danger">Outlier</span>
                    ) : (
                      <span className="badge-success">Normal</span>
                    )}
                  </td>
                  <td>{delivery.attachmentPresent ? "Yes" : "No"}</td>
                  <td>{delivery.warehouse ?? "—"}</td>
                  <td>{delivery.sourceTab ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
