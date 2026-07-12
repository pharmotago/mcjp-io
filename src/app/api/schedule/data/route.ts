import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.SUPABASE_URL || 'https://gcslfkujlfnznedatrsn.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdjc2xma3VqbGZuem5lZGF0cnNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjQ5MTA4OSwiZXhwIjoyMDkyMDY3MDg5fQ.RLVurx-xFrtJJ87k9OuovJ4nH9sWWi1kfjSyt5GWpO4';

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Accept': 'application/json'
      }
    });

    const schema = await res.json();
    const rpcPaths = Object.keys(schema.paths || {}).filter(path => path.startsWith('/rpc/'));

    return NextResponse.json({
      success: true,
      message: 'Retrieved PostgREST OpenAPI schema successfully',
      supabaseUrl,
      rpcPaths,
      allPaths: Object.keys(schema.paths || {})
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
