import { AccessToken } from 'livekit-server-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get('room') || process.env.LIVEKIT_ROOM || 'ecobot-control';
  const identity = searchParams.get('identity') || `operator-${Math.floor(Math.random() * 10000)}`;

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://govimithuru-agent-c8j0bu7s.livekit.cloud';

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      {
        error: 'LIVEKIT_API_KEY and LIVEKIT_API_SECRET are not set in environment.',
        room,
        identity,
      },
      { status: 200 }
    );
  }

  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: '12h',
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: livekitUrl,
      room,
      identity,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Token generation failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { room = (process.env.LIVEKIT_ROOM || 'ecobot-control'), identity = `operator-${Math.floor(Math.random() * 10000)}`, apiKey: customApiKey, apiSecret: customApiSecret } = body;

    const apiKey = customApiKey || process.env.LIVEKIT_API_KEY;
    const apiSecret = customApiSecret || process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://govimithuru-agent-c8j0bu7s.livekit.cloud';

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'LiveKit API key or secret missing. Provide them in request or configure environment.' },
        { status: 400 }
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: '12h',
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({
      token,
      url: livekitUrl,
      room,
      identity,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Token generation failed' }, { status: 500 });
  }
}
