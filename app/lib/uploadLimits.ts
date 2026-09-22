// Vercel's platform request-body limit for a Serverless Function sits around
// 4.5MB, and this app sends files as base64 inside a JSON body (~33%
// inflation over the raw file). Budget well under that ceiling so a real
// phone photo or inspection-report PDF fails with a clear message instead
// of a raw 413 the UI can't explain.
export const MAX_REQUEST_DATA_URL_CHARS = 4_000_000;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;

export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function totalDataUrlChars(dataUrls: string[]): number {
  return dataUrls.reduce((sum, url) => sum + url.length, 0);
}
