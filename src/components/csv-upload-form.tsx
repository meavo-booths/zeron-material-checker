"use client";

import { useState, useTransition } from "react";
import { importCsvAction } from "@/app/actions/import-csv";
import type { ImportResult } from "@/lib/import/types";

export function CsvUploadForm() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="card space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          try {
            const importResult = await importCsvAction(formData);
            setResult(importResult);
            event.currentTarget.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
          }
        });
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">CSV fallback upload</h2>
        <p className="mt-1 text-sm text-meavo-grey">
          Upload a Zeron delivery export when the Google Sheet is unavailable.
        </p>
      </div>

      <input name="file" type="file" accept=".csv,text/csv" required className="input" />
      <button type="submit" className="btn-secondary" disabled={pending}>
        {pending ? "Uploading..." : "Upload CSV"}
      </button>

      {error && <p className="text-sm text-meavo-danger">{error}</p>}

      {result && (
        <div className="rounded-xl bg-meavo-beige p-4 text-sm">
          <p>
            Created: <strong>{result.created}</strong> · Skipped: <strong>{result.skipped}</strong>{" "}
            · Errors: <strong>{result.errors.length}</strong>
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-meavo-danger">
              {result.errors.slice(0, 10).map((item) => (
                <li key={`${item.row}-${item.message}`}>
                  Row {item.row}: {item.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
