"use client";

import { useState, useTransition } from "react";
import { syncSheetAction } from "@/app/actions/sync";
import type { SheetSyncResult } from "@/lib/domain/sync-types";

export function SyncSheetButton({ force = false }: { force?: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SheetSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="btn-primary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const syncResult = await syncSheetAction(force);
              setResult(syncResult);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Sync failed");
            }
          });
        }}
      >
        {pending ? "Syncing..." : force ? "Force sync all tabs" : "Sync now"}
      </button>

      {error && <p className="text-sm text-meavo-danger">{error}</p>}

      {result && (
        <div className="card space-y-3">
          <p className="text-sm text-meavo-grey">
            Spreadsheet: <span className="font-medium text-meavo-ink">{result.spreadsheetId}</span>
          </p>
          <p className="text-sm">
            Imported rows: <strong>{result.totalImported}</strong> · Skipped tabs:{" "}
            <strong>{result.totalSkipped}</strong> · Failed tabs:{" "}
            <strong>{result.totalFailed}</strong>
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tab</th>
                  <th>Status</th>
                  <th>Rows</th>
                  <th>Errors</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {result.tabs.map((tab) => (
                  <tr key={tab.tabName}>
                    <td>{tab.tabName}</td>
                    <td>
                      <span
                        className={
                          tab.status === "imported"
                            ? "badge-success"
                            : tab.status === "skipped"
                              ? "badge-warning"
                              : "badge-danger"
                        }
                      >
                        {tab.status}
                      </span>
                    </td>
                    <td>{tab.rowCount}</td>
                    <td>{tab.errorCount}</td>
                    <td>{tab.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
