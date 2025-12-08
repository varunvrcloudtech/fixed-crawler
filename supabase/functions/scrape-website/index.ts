interface ReqPayload { url?: string }
const MAX_BYTES = 200 * 1024; // 200 KB
const TIMEOUT_MS = 10000;
console.info('scrape-website function starting');
Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const contentType = req.headers.get('content-type') || '';
    let url: string | undefined;
    if (contentType.includes('application/json')) {
      const body: ReqPayload = await req.json().catch(() => ({}));
      url = body.url;
    } else {
      const params = new URL(req.url).searchParams;
      url = params.get('url') || undefined;
    }
    if (!url) return new Response(JSON.stringify({ error: 'Missing url' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    try { new URL(url); } catch (e) { return new Response(JSON.stringify({ error: 'Invalid url' }), { status: 400, headers: { 'Content-Type': 'application/json' } }); }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const resp = await fetch(url, { signal: controller.signal, redirect: 'follow' }).catch((err) => { throw err; });
    clearTimeout(id);

    const headersObj: Record<string,string> = {};
    resp.headers.forEach((v,k)=>headersObj[k]=v);

    if (!resp.ok) {
      return new Response(JSON.stringify({ url, status: resp.status, statusText: resp.statusText }), { status: 502, headers: { 'Content-Type': 'application/json' } });
    }

    const contentTypeResp = resp.headers.get('content-type') || '';
    const reader = resp.body?.getReader();
    if (!reader) return new Response(JSON.stringify({ error: 'No response body' }), { status: 502, headers: { 'Content-Type': 'application/json' } });

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        received += value.length;
        if (received > MAX_BYTES) {
          // truncate
          const allowed = value.subarray(0, value.length - (received - MAX_BYTES));
          chunks.push(allowed);
          break;
        }
        chunks.push(value);
      }
    }
    const combined = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
    let offset = 0;
    for (const c of chunks) { combined.set(c, offset); offset += c.length; }
    const text = new TextDecoder('utf-8', { fatal: false }).decode(combined);

    const out = { url, status: resp.status, content_type: contentTypeResp, html: text };
    return new Response(JSON.stringify(out), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    if (err.name === 'AbortError') return new Response(JSON.stringify({ error: 'Timeout' }), { status: 504, headers: { 'Content-Type': 'application/json' } });
    console.error('scrape error', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});