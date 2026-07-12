"use client";

interface DataTableProps {
  columns: string[];
  rows: Record<string, string>[];
  maxHeight?: string;
  emptyMessage?: string;
  highlightColumns?: string[];
}

export default function DataTable({
  columns,
  rows,
  maxHeight = "60vh",
  emptyMessage = "No rows to display.",
  highlightColumns = [],
}: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center text-gray-500 dark:text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="overflow-auto rounded-xl border border-gray-200 dark:border-gray-800"
      style={{ maxHeight }}
    >
      <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-900">
          <tr>
            <th className="sticky left-0 z-20 bg-gray-100 dark:bg-gray-900 px-3 py-2.5 text-left font-semibold text-gray-500 dark:text-gray-400 w-12">
              #
            </th>
            {columns.map((col) => (
              <th
                key={col}
                className={[
                  "px-3 py-2.5 text-left font-semibold whitespace-nowrap",
                  highlightColumns.includes(col)
                    ? "text-brand-700 dark:text-brand-400"
                    : "text-gray-700 dark:text-gray-300",
                ].join(" ")}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/60"
            >
              <td className="sticky left-0 bg-white dark:bg-gray-950 px-3 py-2 text-gray-400 tabular-nums">
                {idx + 1}
              </td>
              {columns.map((col) => (
                <td
                  key={col}
                  className="px-3 py-2 whitespace-nowrap max-w-xs truncate text-gray-800 dark:text-gray-200"
                  title={row[col] || ""}
                >
                  {row[col] || <span className="text-gray-300 dark:text-gray-700">&mdash;</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
