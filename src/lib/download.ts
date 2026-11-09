import { api } from './api-client';

/**
 * Downloads a file from the API (exports, PDFs). It goes through the API client so the
 * access token is sent, then hands the browser a temporary link to save the file.
 */
export async function downloadFile(url: string, params: Record<string, string | number | undefined>, fallbackName: string) {
  const res = await api.get<Blob>(url, { params, responseType: 'blob' });
  const disposition = String(res.headers['content-disposition'] ?? '');
  const name = /filename="?([^";]+)"?/.exec(disposition)?.[1] ?? fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
