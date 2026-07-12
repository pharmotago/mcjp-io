import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabaseUrl = 'https://gcslfkujlfnznedatrsn.supabase.co';

  try {
    const res = await fetch(supabaseUrl, { method: 'HEAD' });
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return NextResponse.json({
      success: true,
      status: res.status,
      headers
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
