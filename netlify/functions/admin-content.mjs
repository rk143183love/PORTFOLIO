const repo = 'rk143183love/PORTFOLIO';
const path = 'data/site.json';

const jsonHeaders = { 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' };

function auth(body) {
  return process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && body?.username === process.env.ADMIN_USERNAME && body?.password === process.env.ADMIN_PASSWORD;
}

async function github(method = 'GET', body, sha) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GitHub integration is not configured');
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...jsonHeaders };
  const api = `https://api.github.com/repos/${repo}/contents/${path}`;
  const r = await fetch(api, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
  const text = await r.text();
  if (!r.ok) throw new Error(text);
  return text ? JSON.parse(text) : {};
}

export default async (req) => {
  try {
    if (req.method === 'GET') {
      const r = await github();
      return new Response(JSON.stringify({ ok: true, content: JSON.parse(Buffer.from(r.content, 'base64').toString('utf8')) }), { status: 200, headers: jsonHeaders });
    }
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = await req.json();
    if (!auth(body)) return new Response('Unauthorized', { status: 401 });
    const clean = body.content;
    if (!clean || typeof clean !== 'object') return new Response('Invalid content', { status: 400 });
    const current = await github();
    const encoded = Buffer.from(JSON.stringify(clean, null, 2) + '\n').toString('base64');
    await github('PUT', { message: 'Update portfolio content from admin', content: encoded, sha: current.sha });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders });
  } catch (e) {
    return new Response(e?.message || 'Save failed', { status: 500 });
  }
};
