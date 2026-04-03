/**
 * Centralized API Service for ERP Google Sheets Backend
 *
 * This module is the single source of truth for all network requests.
 * It provides:
 *  - In-memory cache with configurable TTL (avoids redundant network calls)
 *  - Parallel batch fetching (all sheets in one HTTP request on initial load)
 *  - Targeted single-sheet refresh (only re-fetch what changed after a write)
 *  - A clean POST helper for all sheet write operations
 *
 * IMPORTANT: The Google Apps Script endpoint and its response format are
 * intentionally unchanged. This layer only controls when/how the frontend
 * calls it.
 */

export const SCRIPT_BASE =
  "https://script.google.com/macros/s/AKfycbygSkpwhyYTjKeO5LRz06kTXMaM0mLMDwLNNaUR_rBItSshetknhJHGWuAJ3a2CMrX4/exec";

// ---------------------------------------------------------------------------
// Cache Configuration
// ---------------------------------------------------------------------------

/**
 * Default cache TTL in milliseconds.
 * Data fetched within this window is served from memory instead of network.
 * 30s is a safe default for a jewellery ERP — data changes slowly relative
 * to how often users navigate between pages.
 */
const DEFAULT_TTL_MS = 30_000; // 30 seconds

interface CacheEntry {
  data: any;
  fetchedAt: number; // Date.now() timestamp
  ttl: number;       // milliseconds until stale
}

/** In-memory cache keyed by sheet name (or "batch" for the full batch). */
const cache: Map<string, CacheEntry> = new Map();

/** Returns true if the entry exists and is still fresh. */
function isCacheFresh(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.fetchedAt < entry.ttl;
}

/** Store a result in cache. */
function setCache(key: string, data: any, ttl = DEFAULT_TTL_MS): void {
  cache.set(key, { data, fetchedAt: Date.now(), ttl });
}

/** Get a cached result (regardless of freshness). */
function getCache(key: string): any | null {
  return cache.get(key)?.data ?? null;
}

// ---------------------------------------------------------------------------
// Public Cache Control
// ---------------------------------------------------------------------------

/**
 * Invalidate the cache for a single sheet, or clear everything.
 *
 * Call this immediately before refreshing data after a write so the
 * next fetch is guaranteed to hit the network.
 *
 * @param sheetName - Pass a sheet name to clear just that entry,
 *                    or omit to clear ALL cached data (including batch).
 */
export function invalidateCache(sheetName?: string): void {
  if (sheetName) {
    cache.delete(sheetName);
    // Also bust the batch cache — it contained that sheet's data
    cache.delete("batch");
  } else {
    cache.clear();
  }
}

// ---------------------------------------------------------------------------
// Batch Fetch (Initial Load Optimization)
// ---------------------------------------------------------------------------

/**
 * The canonical list of sheets fetched on startup.
 * Order doesn't matter — all data is keyed by sheet name in the result.
 */
export const ALL_SHEETS = [
  "24K Metal Stock",
  "Alloy Converstion",
  "Production Planning",
  "Department Issue Return",
  "Karigar Issue",
  "Production Orders",
  "Login Master",
  "Department Issue",
  "Master Drop Down",
  "Main Calculation",
] as const;

export type SheetName = (typeof ALL_SHEETS)[number];

/**
 * Fetches all sheets in exactly ONE HTTP request using the batch endpoint
 * (`?batch=true`). The Apps Script returns a single JSON payload containing
 * all sheet data keyed by sheet name.
 *
 * Falls back to 6 parallel individual fetches if the batch endpoint is
 * unavailable (e.g., old Apps Script deployment that hasn't been updated yet).
 *
 * Results are cached individually per-sheet so targeted invalidation still
 * works correctly.
 */
export async function fetchAllSheetsParallel(
  sheets: readonly string[] = ALL_SHEETS,
  force = false
): Promise<Record<string, any>> {
  // --- Try batch endpoint first ---
  const batchKey = "batch";
  if (!force && isCacheFresh(batchKey)) {
    return getCache(batchKey);
  }

  const t = Date.now();

  try {
    const res = await fetch(`${SCRIPT_BASE}?batch=true&t=${t}`, {
      cache: "no-store",
    });
    const json = await res.json();

    if (json.success && json.data) {
      // 🔹 Fetch any requested sheets that the backend batch API omitted
      const missingSheets = sheets.filter(s => !json.data[s]);
      if (missingSheets.length > 0) {
        const missingResults = await Promise.all(
          missingSheets.map(s => fetchSheet(s as SheetName, force))
        );
        missingSheets.forEach((s, idx) => {
          json.data[s] = missingResults[idx];
        });
      }

      // Cache the whole batch AND each sheet individually
      setCache(batchKey, json.data);
      // Backend already returns { success: true, data: [...] } for each sheet
      Object.entries(json.data as Record<string, any>).forEach(
        ([name, sheetData]) => setCache(name, sheetData)
      );
      return json.data;
    }
  } catch {
    // Batch endpoint not available — fall through to parallel individual fetches
  }

  // --- Fallback: parallel individual fetches ---
  const results = await Promise.all(
    sheets.map((sheet) => fetchSheet(sheet as SheetName, force))
  );

  const combined: Record<string, any> = {};
  sheets.forEach((sheet, i) => {
    combined[sheet] = results[i];
  });

  setCache(batchKey, combined);
  return combined;
}

// ---------------------------------------------------------------------------
// Single-Sheet Fetch (Targeted Refresh After Write)
// ---------------------------------------------------------------------------

/**
 * Fetch a single sheet, serving from cache if fresh.
 *
 * After a write operation (e.g., KarigarIssue submit), call
 * `invalidateCache("Karigar Issue")` first, then `fetchSheet("Karigar Issue")`
 * to refresh only that one sheet instead of all 6.
 *
 * @param sheetName - The exact Google Sheet tab name
 * @param force     - Set true to bypass cache and always hit network
 * @returns The full API response `{ success, data }`
 */
export async function fetchSheet(
  sheetName: SheetName | string,
  force = false
): Promise<{ success: boolean; data: any[][] }> {
  if (!force && isCacheFresh(sheetName)) {
    return getCache(sheetName);
  }

  const t = Date.now();
  const url = `${SCRIPT_BASE}?sheet=${encodeURIComponent(sheetName)}&t=${t}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();

  if (json.success) {
    setCache(sheetName, json);
  }

  return json;
}

// ---------------------------------------------------------------------------
// POST Helper (Sheet Writes)
// ---------------------------------------------------------------------------

/**
 * Send a form POST to the Apps Script endpoint.
 *
 * Wraps the raw fetch + URLSearchParams boilerplate so pages don't
 * need to know the endpoint URL.
 *
 * @param params - Key-value pairs to send as application/x-www-form-urlencoded
 * @returns The parsed JSON response from Apps Script
 */
export async function postToSheet(
  params: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string;[key: string]: any }> {
  const res = await fetch(SCRIPT_BASE, {
    method: "POST",
    body: new URLSearchParams(params),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// Upload Helper (File → Google Drive via Apps Script)
// ---------------------------------------------------------------------------

/**
 * Upload a base64-encoded file to a Google Drive folder via Apps Script.
 *
 * @returns The public Drive URL of the uploaded file, or null on failure.
 */
export async function uploadFileToDrive(
  base64Data: string,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<string | null> {
  const result = await postToSheet({
    action: "uploadFile",
    base64Data,
    fileName,
    mimeType,
    folderId,
  });
  return result.success ? result.fileUrl : null;
}
