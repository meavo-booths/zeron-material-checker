import Link from "next/link";
import { notFound } from "next/navigation";
import { requireZeronAccess } from "@/lib/meavo-auth";
import { getItemDetail } from "@/lib/domain/dashboard";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatQuantity,
  isAcceptedUnitCost,
} from "@/lib/analysis/outliers";
import { MarkCorrectButton } from "@/components/mark-correct-button";
import { revokeAcceptedPriceAction } from "@/app/actions/accept-outlier";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  await requireZeronAccess();
  const { code } = await params;
  const itemCode = decodeURIComponent(code);
  const { deliveries, analysis, acceptedRows, acceptedUnitCosts } =
    await getItemDetail(itemCode);

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
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="card">
            <p className="text-sm text-meavo-grey">Average excluding open outliers</p>
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
            <p className="text-sm text-meavo-grey">Open outliers</p>
            <p className="mt-2 text-2xl font-semibold">{analysis.outlierCount}</p>
          </div>
          <div className="card">
            <p className="text-sm text-meavo-grey">Accepted price levels</p>
            <p className="mt-2 text-2xl font-semibold">{acceptedRows.length}</p>
          </div>
        </div>
      )}

      {acceptedRows.length > 0 && (
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold">Accepted unit costs</h2>
          <p className="text-sm text-meavo-grey">
            Future deliveries near these prices will not be flagged as outliers.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Unit cost</th>
                  <th>Marked by</th>
                  <th>When</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {acceptedRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className="badge-success">
                        {formatCurrency(Number(row.unitCost))}
                      </span>
                    </td>
                    <td>{row.markedBy?.email ?? "—"}</td>
                    <td>{new Date(row.createdAt).toLocaleString("bg-BG")}</td>
                    <td>
                      <form action={revokeAcceptedPriceAction}>
                        <input type="hidden" name="acceptedId" value={row.id} />
                        <input type="hidden" name="itemCode" value={itemCode} />
                        <button type="submit" className="btn-secondary text-xs">
                          Revoke
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Process #</th>
              <th>Qty</th>
              <th>Unit cost</th>
              <th>Status</th>
              <th>Attachment</th>
              <th>Warehouse</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => {
              const outlier = analysis?.outliers.find((row) => row.id === delivery.id);
              const accepted = isAcceptedUnitCost(delivery.unitCost, acceptedUnitCosts);
              return (
                <tr key={delivery.id}>
                  <td>{formatDate(delivery.deliveryDate)}</td>
                  <td>{delivery.processNumber || "—"}</td>
                  <td>
                    {formatQuantity(delivery.quantity)}
                    {delivery.unit ? ` ${delivery.unit}` : ""}
                  </td>
                  <td>{formatCurrency(delivery.unitCost)}</td>
                  <td>
                    {outlier ? (
                      <span className="badge-danger">
                        Outlier {formatPercent(outlier.deviationPct)}
                      </span>
                    ) : accepted ? (
                      <span className="badge-success">Marked correct</span>
                    ) : outlierIds.has(delivery.id) ? (
                      <span className="badge-danger">Outlier</span>
                    ) : (
                      <span className="badge-success">Normal</span>
                    )}
                  </td>
                  <td>{delivery.attachmentPresent ? "Yes" : "No"}</td>
                  <td>{delivery.warehouse ?? "—"}</td>
                  <td>
                    {outlier ? (
                      <MarkCorrectButton
                        deliveryRowId={delivery.id}
                        itemCode={itemCode}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
