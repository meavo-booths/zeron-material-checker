import Link from "next/link";
import { requireZeronAccess } from "@/lib/meavo-auth";
import { getMaterialsCatalog } from "@/lib/domain/dashboard";
import {
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/analysis/outliers";

type SearchParams = Promise<{
  q?: string;
  sort?: string;
}>;

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireZeronAccess();
  const params = await searchParams;
  const query = params.q?.trim() || undefined;
  const sort = params.sort ?? "code";

  const { materials: rawMaterials, stats } = await getMaterialsCatalog({
    itemName: query,
  });

  const materials = [...rawMaterials].sort((a, b) => {
    switch (sort) {
      case "latest":
        return b.latestUnitCost - a.latestUnitCost;
      case "average":
        return b.averageUnitCost - a.averageUnitCost;
      case "change":
        return Math.abs(b.changePct) - Math.abs(a.changePct);
      case "deliveries":
        return b.deliveryCount - a.deliveryCount;
      case "code":
      default:
        return a.itemCode.localeCompare(b.itemCode, "bg");
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-meavo-ink">Materials</h1>
        <p className="mt-1 text-sm text-meavo-grey">
          Average unit price across all deliveries, plus the latest delivery price for each material.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card">
          <p className="text-sm text-meavo-grey">Materials</p>
          <p className="mt-2 text-2xl font-semibold">{stats.totalMaterials}</p>
        </div>
        <div className="card">
          <p className="text-sm text-meavo-grey">Deliveries</p>
          <p className="mt-2 text-2xl font-semibold">{stats.totalDeliveries}</p>
        </div>
      </div>

      <form method="get" className="card grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm font-medium" htmlFor="q">
            Search code or name
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            className="input"
            placeholder="0114 or ПДЧ"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            <option value="code">Item code</option>
            <option value="average">Average price</option>
            <option value="latest">Latest price</option>
            <option value="change">Change vs average</option>
            <option value="deliveries">Delivery count</option>
          </select>
        </div>
        <div className="md:col-span-3">
          <button type="submit" className="btn-secondary">
            Apply
          </button>
        </div>
      </form>

      {materials.length === 0 ? (
        <div className="card">
          <p className="text-sm text-meavo-grey">
            No materials found. Sync the Google Sheet or upload a CSV from the Sync page.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Deliveries</th>
                <th>Average unit price</th>
                <th>Latest unit price</th>
                <th>vs average</th>
                <th>Latest delivery</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => (
                <tr key={material.itemCode}>
                  <td className="font-medium">{material.itemCode}</td>
                  <td>{material.itemName || "—"}</td>
                  <td>{material.deliveryCount}</td>
                  <td>
                    {formatCurrency(material.averageUnitCost)}
                    {material.unit ? (
                      <span className="text-meavo-grey"> / {material.unit}</span>
                    ) : null}
                  </td>
                  <td>
                    {formatCurrency(material.latestUnitCost)}
                    {material.unit ? (
                      <span className="text-meavo-grey"> / {material.unit}</span>
                    ) : null}
                  </td>
                  <td>
                    {material.deliveryCount > 1 ? (
                      <span
                        className={
                          Math.abs(material.changePct) > 0.2
                            ? "badge-danger"
                            : Math.abs(material.changePct) > 0.05
                              ? "badge-warning"
                              : "badge-success"
                        }
                      >
                        {material.changePct >= 0 ? "+" : ""}
                        {formatPercent(material.changePct)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {formatDate(material.latestDeliveryDate)}
                    {material.latestProcessNumber
                      ? ` · ${material.latestProcessNumber}`
                      : ""}
                  </td>
                  <td>
                    <Link
                      href={`/items/${encodeURIComponent(material.itemCode)}`}
                      className="btn-secondary text-xs"
                    >
                      History
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
