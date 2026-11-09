import { api, type Envelope } from './api-client';

/**
 * Sends a file as the request body, its name in X-File-Name (the API's upload format).
 * The API checks the real type from the content; `accept`/`maxBytes` here only save a
 * round trip for obvious mistakes.
 */
export async function uploadFile<T>(method: 'post' | 'put', url: string, file: File) {
  const res = await api.request<Envelope<T>>({
    method,
    url,
    data: file,
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) },
    timeout: 120_000,
  });
  return res.data.data;
}

/** "1.2 MB", "340 KB" */
export const formatBytes = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
