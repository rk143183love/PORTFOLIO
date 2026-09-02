export default async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
  try {
    const body = await req.json();
    const { username, password, slot, image } = body || {};
    if (!process.env.ADMIN_USERNAME || username !== process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return new Response('Unauthorized', { status: 401 });
    }
    if (!/^project-0[1-6]\.jpg$/.test(slot || '')) return new Response('Invalid slot', { status: 400 });
    if (!image || !/^data:image\/(jpeg|png|webp);base64,/.test(image)) return new Response('Invalid image', { status: 400 });
    const base64 = image.split(',')[1];
    if (base64.length > 11_000_000) return new Response('Image too large', { status: 413 });
    const token = process.env.GITHUB_TOKEN;
    if (!token) return new Response('GitHub integration is not configured', { status: 500 });
    const repo = 'rk143183love/PORTFOLIO';
    const path = `assets/${slot}`;
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    const api = `https://api.github.com/repos/${repo}/contents/${path}`;
    const current = await fetch(api, { headers });
    let sha;
    if (current.ok) sha = (await current.json()).sha;
    const payload = { message: `Update ${slot} from portfolio admin`, content: base64 };
    if (sha) payload.sha = sha;
    const result = await fetch(api, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!result.ok) return new Response(await result.text(), { status: 502 });
    return Response.json({ ok: true, slot });
  } catch (e) { return new Response('Upload failed', { status: 500 }); }
};
