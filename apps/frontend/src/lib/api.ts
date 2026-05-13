const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { accessToken?: string | null } = {},
): Promise<T> {
  const { accessToken, headers: h, ...rest } = init;
  const headers = new Headers(h);
  if (rest.body != null && !(rest.body instanceof FormData)) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  }
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers });
  } catch (e) {
    const mixed =
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      base.startsWith('http:');
    const hint = mixed
      ? ' A página está em HTTPS e a API em HTTP — o navegador bloqueia. Usa HTTPS na URL da API.'
      : '';
    const detail = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Sem ligação à API (${base}).${hint} Verifica NEXT_PUBLIC_API_URL no build do Railway (URL pública da API, com /api), se o serviço da API está online e CORS_ORIGIN na API com o domínio deste site. (${detail})`,
    );
  }
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.json();
      msg = (j.message as string) || JSON.stringify(j);
    } catch {
      try {
        msg = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type');
  if (ct?.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as T;
}
