import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_LIVE_CONFIG } from '@/lib/gemini-live-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Hands the browser what it needs to open a Gemini Live session. Prefers a
// short-lived ephemeral token so the raw GEMINI_API_KEY never reaches the
// client; transparently falls back to the raw key if the project/SDK can't
// mint one (older SDK, feature not enabled, etc.).
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_LIVE_MODEL || GEMINI_LIVE_CONFIG.DEFAULT_MODEL;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is not set in the server environment (.env.local).' },
      { status: 500 }
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const token = await (ai as any).authTokens?.create?.({
      config: {
        uses: 1,
        expireTime,
        httpOptions: { apiVersion: GEMINI_LIVE_CONFIG.API_VERSION },
      },
    });
    if (token?.name) {
      return NextResponse.json({ token: token.name, model, mode: 'ephemeral' });
    }
  } catch (err: any) {
    console.warn(
      '[gemini-live] ephemeral token unavailable, using raw key:',
      err?.message || err
    );
  }

  return NextResponse.json({ token: apiKey, model, mode: 'raw' });
}
