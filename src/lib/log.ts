'use client'

export async function clientLog(event: string, payload?: any) {
  try {
    await fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, payload }),
      keepalive: true,
    });
  } catch (e) {
    // swallow
  }
}


