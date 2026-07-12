interface SummaryCardsProps {
  totalRows: number;
  totalImported: number;
  totalSkipped: number;
}

export default function SummaryCards({
  totalRows,
  totalImported,
  totalSkipped,
}: SummaryCardsProps) {
  const cards = [
    { label: "Total Rows", value: totalRows, color: "text-gray-900 dark:text-gray-100" },
    { label: "Successfully Imported", value: totalImported, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Skipped", value: totalSkipped, color: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">{c.label}</p>
          <p className={`mt-1 text-3xl font-semibold tabular-nums ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
