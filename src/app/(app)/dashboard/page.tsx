import Link from "next/link";
import { auth } from "@/lib/auth";
import { getOutlierDashboardData } from "@/lib/domain/dashboard";
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/analysis/outliers";

type SearchParams = Promise<{
  itemCode?: string;
  warehouse?: string;
  attachmentOnly?: string;
}>;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await auth();
  const params = await searchParams;

  const { summaries, stats } = await getOutlierDashboardData({
    itemCode: params.itemCode?.trim() || undefined,
    warehouse: params.warehouse?.trim() || undefined,
    attachmentOnly: params.attachmentOnly === "1",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-meavo-ink">Outlier dashboard</h1>
        <p className="mt-1 text-sm text-meavo-grey">
          Items where delivery unit cost deviates by more than 10% from the baseline.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Deliveries" value={stats.totalDeliveries} />
        <StatCard label="Items analyzed" value={stats.totalItems} />
        <StatCard label="Items with outliers" value={stats.itemsWithOutliers} />
        <StatCard label="Outlier rows" value={stats.totalOutlierRows} />
        <StatCard label="Synced tabs" value={stats.importedTabs} />
      </div>

      <form method="get" className="card grid gap-4 md:grid-cols-4">
        <div>
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
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="warehouse">
            Warehouse
          </label>
          <input
            id="warehouse"
            name="warehouse"
            defaultValue={params.warehouse ?? ""}
            className="input"
            placeholder="Варна"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="attachmentOnly"
              value="1"
              defaultChecked={params.attachmentOnly === "1"}
            />
            Outliers with attachment only
          </label>
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn-secondary">
            Apply filters
          </button>
        </div>
      </form>

      {summaries.length === 0 ? (
        <div className="card">
          <p className="text-sm text-meavo-grey">
            No outliers found for the current filters. Sync the Google Sheet or upload a CSV from the Sync page.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((item) => (
            <section key={item.itemCode} className="card space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {item.itemCode} · {item.itemName || "—"}
                  </h2>
                  <p className="mt-1 text-sm text-meavo-grey">
                    {item.deliveryCount} deliveries · average excluding outliers:{" "}
                    <strong>{formatCurrency(item.averageUnitCost)}</strong> · baseline median:{" "}
                    <strong>{formatCurrency(item.baselineUnitCost)}</strong>
                  </p>
                </div>
                <Link href={`/items/${encodeURIComponent(item.itemCode)}`} className="btn-secondary">
                  View all deliveries
                </Link>
              </div>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Process #</th>
                      <th>Unit cost</th>
                      <th>Deviation</th>
                      <th>Attachment in Zeron</th>
                      <th>Source tab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.outliers.map((outlier) => (
                      <tr key={outlier.id}>
                        <td>{formatDate(outlier.deliveryDate)}</td>
                        <td>{outlier.processNumber || "—"}</td>
                        <td>{formatCurrency(outlier.unitCost)}</td>
                        <td>
                          <span className="badge-danger">{formatPercent(outlier.deviationPct)}</span>
                        </td>
                        <td>{outlier.attachmentPresent ? "Yes" : "No"}</td>
                        <td>{outlier.sourceTab ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
