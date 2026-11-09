import { api } from './api-client';

/**
 * Opens a protected file (a leave document, say) in a new tab. It is fetched with the access
 * token, then shown from a temporary local link: the token never goes into a URL.
 */
export async function openProtectedFile(url: string) {
  const res = await api.get<Blob>(url, { responseType: 'blob' });
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 60_000);
}
