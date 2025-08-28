export const runtime = 'edge';

export async function GET() {
  return new Response(JSON.stringify({ ok: true, now: Date.now() }), {
    headers: { 'content-type': 'application/json' },
  });
}
