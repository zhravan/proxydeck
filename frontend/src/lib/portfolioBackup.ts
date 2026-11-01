import { httpGet, httpPost } from "../utils/http";

export type PortfolioImportSummary = {
  dryRun: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export async function downloadPortfolioExport(
  path: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await httpGet(path);
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error && typeof j.error === "string") msg = j.error;
      } catch {
        /* ignore */
      }
      return { ok: false, error: msg };
    }
    const blob = await res.blob();
    const cd = res.headers.get("Content-Disposition");
    const m = cd?.match(/filename="([^"]+)"/);
    const filename = m?.[1] ?? "export.bin";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Download failed" };
  }
}

export async function postDomainsImport(body: Record<string, unknown>): Promise<
  { ok: true; summary: PortfolioImportSummary } | { ok: false; error: string }
> {
  try {
    const res = await httpPost("/api/domains/import", { json: body });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error && typeof j.error === "string") msg = j.error;
      } catch {
        /* ignore */
      }
      return { ok: false, error: msg };
    }
    const summary = (await res.json()) as PortfolioImportSummary;
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}

export async function postServersImport(body: Record<string, unknown>): Promise<
  { ok: true; summary: PortfolioImportSummary } | { ok: false; error: string }
> {
  try {
    const res = await httpPost("/api/servers/import", { json: body });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        const j = (await res.json()) as { error?: string };
        if (j?.error && typeof j.error === "string") msg = j.error;
      } catch {
        /* ignore */
      }
      return { ok: false, error: msg };
    }
    const summary = (await res.json()) as PortfolioImportSummary;
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Import failed" };
  }
}
