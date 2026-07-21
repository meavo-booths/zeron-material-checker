import { requireZeronAccess } from "@/lib/meavo-auth";
import { getSheetSyncOverview } from "@/lib/domain/sync-sheet";
import { canManageImports } from "@/lib/permissions";
import { CsvUploadForm } from "@/components/csv-upload-form";
import { SyncSheetButton } from "@/components/sync-sheet-button";

export default async function SyncPage() {
  const session = await requireZeronAccess();
  const canImport = session.user?.id
    ? await canManageImports(session.user.id)
    : false;
  const overview = await getSheetSyncOverview();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-meavo-ink">Sync & Import</h1>
        <p className="mt-1 text-sm text-meavo-grey">
          Read delivery exports directly from the configured Google Sheet workbook.
        </p>
      </div>

      <div className="card space-y-3">
        <h2 className="text-lg font-semibold">Google Sheets source</h2>
        <dl className="grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-meavo-grey">Spreadsheet ID</dt>
            <dd className="font-medium">
              {overview.configuredSpreadsheetId ?? "Not configured"}
            </dd>
          </div>
          <div>
            <dt className="text-meavo-grey">Last sync</dt>
            <dd className="font-medium">
              {overview.state?.lastSyncedAt
                ? new Date(overview.state.lastSyncedAt).toLocaleString("bg-BG")
                : "Never"}
            </dd>
          </div>
          <div>
            <dt className="text-meavo-grey">Last error</dt>
            <dd className="font-medium">{overview.state?.lastError ?? "—"}</dd>
          </div>
        </dl>

        {canImport ? (
          <div className="space-y-4">
            <SyncSheetButton />
            <SyncSheetButton force />
          </div>
        ) : (
          <p className="text-sm text-meavo-grey">
            Only admins can trigger sheet sync. Ask an admin to run sync or grant you access.
          </p>
        )}
      </div>

      {canImport && <CsvUploadForm />}

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Imported tabs</h2>
        {overview.importedTabs.length === 0 ? (
          <p className="text-sm text-meavo-grey">No tabs imported yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tab</th>
                  <th>Rows</th>
                  <th>Imported at</th>
                </tr>
              </thead>
              <tbody>
                {overview.importedTabs.map((tab) => (
                  <tr key={tab.id}>
                    <td>{tab.tabName}</td>
                    <td>{tab.rowCount}</td>
                    <td>{new Date(tab.importedAt).toLocaleString("bg-BG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Recent import runs</h2>
        {overview.recentRuns.length === 0 ? (
          <p className="text-sm text-meavo-grey">No import runs yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Errors</th>
                  <th>Triggered by</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {overview.recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.sourceType}</td>
                    <td>{run.sourceName}</td>
                    <td>{run.status}</td>
                    <td>{run.rowCount}</td>
                    <td>{run.errorCount}</td>
                    <td>{run.triggeredBy?.email ?? "cron"}</td>
                    <td>{new Date(run.createdAt).toLocaleString("bg-BG")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
