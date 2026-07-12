import { ImportResponse, PreviewResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data.error || `Request failed with status ${res.status}`;
  } catch {
    return `Request failed with status ${res.status}`;
  }
}

export async function previewCsv(file: File): Promise<PreviewResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/csv/preview`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}

export async function importCsv(file: File): Promise<ImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/csv/import`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return res.json();
}
