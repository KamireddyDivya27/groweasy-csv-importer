export default function ImportProgress({ rowCount }: { rowCount: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-200 dark:border-gray-800 p-16 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 dark:border-brand-500/20 border-t-brand-500" />
      <div>
        <p className="text-base font-medium">Mapping {rowCount} rows into GrowEasy CRM format&hellip;</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The AI is analyzing your columns and extracting lead data in batches. This may take a moment for larger files.
        </p>
      </div>
    </div>
  );
}
