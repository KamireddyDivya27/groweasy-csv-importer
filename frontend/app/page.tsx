"use client";

import { useMemo, useState } from "react";
import Papa from "papaparse";
import UploadZone from "@/components/UploadZone";
import DataTable from "@/components/DataTable";
import SummaryCards from "@/components/SummaryCards";
import ThemeToggle from "@/components/ThemeToggle";
import ImportProgress from "@/components/ImportProgress";
import { importCsv } from "@/lib/api";
import { AppStage, CsvRow, ImportResponse, PreviewResponse } from "@/types";

/**
 * Parses a CSV file entirely in the browser for the preview step. No network
 * call happens here — per the assignment spec, the backend should only be
 * called once the user clicks "Confirm & Import".
 */
function parseCsvClientSide(file: File): Promise<PreviewResponse> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          reject(new Error("Could not detect any columns in this CSV."));
          return;
        }
        const rows = results.data.filter((row) =>
          Object.values(row).some((v) => (v ?? "").toString().trim() !== "")
        );
        if (rows.length === 0) {
          reject(new Error("CSV contains no data rows."));
          return;
        }
        resolve({ headers: results.meta.fields, rows, totalRows: rows.length });
      },
      error: (err) => reject(err),
    });
  });
}

const CRM_COLUMNS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
];

export default function HomePage() {
  const [stage, setStage] = useState<AppStage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleFileSelected = async (selected: File) => {
    setError(null);
    setFile(selected);
    setIsLoadingPreview(true);
    try {
      const data = await parseCsvClientSide(selected);
      setPreview(data);
      setStage("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse CSV.");
      setFile(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!file) return;
    setError(null);
    setStage("importing");
    try {
      const data = await importCsv(file);
      setResult(data);
      setStage("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to import CSV.");
      setStage("preview");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setStage("upload");
  };

  const skippedAsRows = useMemo(
    () =>
      result?.skipped.map((s) => ({
        row: String(s.row + 1),
        reason: s.reason,
        ...s.sourceData,
      })) || [],
    [result]
  );

  const skippedColumns = useMemo(() => {
    if (skippedAsRows.length === 0) return [];
    const cols = new Set<string>(["row", "reason"]);
    Object.keys(skippedAsRows[0]).forEach((k) => cols.add(k));
    return Array.from(cols);
  }, [skippedAsRows]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold">GrowEasy CSV Importer</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI-powered lead import, mapped to any CSV layout
            </p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {stage === "upload" && (
          <section className="space-y-4">
            <UploadZone onFileSelected={handleFileSelected} disabled={isLoadingPreview} />
            {isLoadingPreview && (
              <p className="text-sm text-gray-500 dark:text-gray-400">Parsing CSV&hellip;</p>
            )}
          </section>
        )}

        {stage === "preview" && preview && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  Preview &middot; {preview.totalRows} row(s) detected
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No AI processing yet. Review your data, then confirm to import.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Confirm &amp; Import
                </button>
              </div>
            </div>
            <DataTable columns={preview.headers} rows={preview.rows} />
          </section>
        )}

        {stage === "importing" && <ImportProgress rowCount={preview?.totalRows || 0} />}

        {stage === "result" && result && (
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Import Complete</h2>
              <button
                onClick={handleReset}
                className="rounded-lg border border-gray-300 dark:border-gray-700 px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Import Another File
              </button>
            </div>

            <SummaryCards
              totalRows={(preview?.totalRows ?? 0)}
              totalImported={result.totalImported}
              totalSkipped={result.totalSkipped}
            />

            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Imported CRM Records ({result.totalImported})
              </h3>
              <DataTable
                columns={CRM_COLUMNS}
                rows={result.imported as unknown as Record<string, string>[]}
                emptyMessage="No records were successfully imported."
                highlightColumns={["crm_status", "data_source"]}
              />
            </div>

            {result.totalSkipped > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Skipped Records ({result.totalSkipped})
                </h3>
                <DataTable
                  columns={skippedColumns}
                  rows={skippedAsRows}
                  emptyMessage="No records were skipped."
                  highlightColumns={["reason"]}
                />
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}