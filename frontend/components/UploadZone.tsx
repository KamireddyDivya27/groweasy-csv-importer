"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export default function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSelect = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Only .csv files are supported.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("File is too large. Max size is 5MB.");
        return;
      }
      setError(null);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          validateAndSelect(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-12 text-center transition-colors cursor-pointer select-none",
          disabled
            ? "opacity-50 cursor-not-allowed border-gray-200 dark:border-gray-800"
            : isDragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-gray-300 dark:border-gray-700 hover:border-brand-400 hover:bg-gray-50 dark:hover:bg-gray-900",
        ].join(" ")}
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0L7 9m5-5l5 5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
          </svg>
        </div>
        <p className="text-base font-medium">
          Drop your CSV file here, or{" "}
          <span className="text-brand-600 dark:text-brand-400 underline">browse</span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Supports any CSV layout &mdash; Facebook, Google Ads, real estate CRMs, and more. Max 5MB.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          disabled={disabled}
          onChange={(e) => validateAndSelect(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
