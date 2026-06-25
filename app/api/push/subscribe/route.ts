import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const { endpoint, keys } = await req.json();
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  await supabase.from('push_subscriptions').upsert({
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
  }, { onConflict: 'endpoint' });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { endpoint } = await req.json();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return NextResponse.json({ ok: true });
}
