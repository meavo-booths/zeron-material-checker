import Link from "next/link";
import { requireZeronAccess } from "@/lib/meavo-auth";
import { getUnitMismatchDashboardData } from "@/lib/domain/dashboard";
import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatQuantity,
} from "@/lib/analysis/outliers";

type SearchParams = Promise<{ itemCode?: string }>;

export default async function EntryErrorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireZeronAccess();
  const params = await searchParams;
  const { findings, stats } = await getUnitMismatchDashboardData({
    itemCode: params.itemCode?.trim() || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-meavo-ink">Entry errors</h1>
        <p className="mt-1 text-sm text-meavo-grey">
          Suspected unit-of-measure mistakes: quantity and unit price move in opposite
          directions by roughly the same factor (e.g. 5×30m rolls entered as 150 rolls).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Deliveries scanned" value={stats.totalDeliveries} />
        <StatCard label="Suspected rows" value={stats.suspectedRows} />
        <StatCard label="Affected items" value={stats.affectedItems} />
      </div>

      <form method="get" className="card flex flex-wrap items-end gap-4">
        <div className="min-w-[12rem] flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="itemCode">
            Item code
          </label>
          <input
            id="itemCode"
            name="itemCode"
            defaultValue={params.itemCode ?? ""}
            className="input"
            placeholder="0114"
          />
        </div>
        <button type="submit" className="btn-secondary">
          Apply filter
        </button>
      </form>

      {findings.length === 0 ? (
        <div className="card">
          <p className="text-sm text-meavo-grey">
            No reciprocal quantity/price mismatches found. Need at least three deliveries
            with quantity for an item to establish a typical pattern.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {findings.map((row) => (
            <section key={row.id} className="card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {row.itemCode} · {row.itemName || "—"}
                  </h2>
                  <p className="mt-1 text-sm text-meavo-grey">
                    {formatDate(row.deliveryDate)} · process {row.processNumber || "—"} ·{" "}
                    {row.unit ?? "unit"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={
                      row.reason === "reciprocal_qty_price"
                        ? "badge-danger"
                        : "badge-warning"
                    }
                  >
                    {row.reason === "reciprocal_qty_price"
                      ? "Reciprocal qty/price"
                      : "Stable line total"}
                  </span>
                  <Link
                    href={`/items/${encodeURIComponent(row.itemCode)}`}
                    className="btn-secondary text-xs"
                  >
                    Item history
                  </Link>
                </div>
              </div>

              <p className="text-sm text-meavo-ink">{row.explanation}</p>

              <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Metric
                  label="Quantity"
                  value={`${formatQuantity(row.quantity)} (typical ${formatQuantity(row.typicalQuantity)})`}
                  hint={`${row.quantityFactor.toFixed(2)}×`}
                />
                <Metric
                  label="Unit cost"
                  value={`${formatCurrency(row.unitCost)} (typical ${formatCurrency(row.typicalUnitCost)})`}
                  hint={`${row.priceFactor.toFixed(2)}×`}
                />
                <Metric
                  label="Line total"
                  value={`${formatCurrency(row.lineTotal)} (typical ${formatCurrency(row.typicalLineTotal)})`}
                  hint={formatPercent(row.lineTotalDeviationPct)}
                />
                <Metric
                  label="Qty × price factor"
                  value={row.reciprocalScore.toFixed(2)}
                  hint="≈ 1 suggests unit mix-up"
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-meavo-grey">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-meavo-ink">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl bg-meavo-beige px-3 py-2">
      <p className="text-xs text-meavo-grey">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
      <p className="text-xs text-meavo-grey">{hint}</p>
    </div>
  );
}
