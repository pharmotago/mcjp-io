import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const results: Record<string, string> = {};

  // Standard Vercel auto-injected environment variables from Supabase Integration
  const connectionStrings = [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_PRISMA_URL,
    // Sometimes prefixed
    process.env.mcjp_POSTGRES_URL,
    process.env.mcjp_POSTGRES_URL_NON_POOLING
  ].filter(Boolean) as string[];

  for (const connStr of connectionStrings) {
    const displayStr = connStr.replace(/:([^@:]+)@/, ':****@'); // Hide password
    const client = new Client({
      connectionString: connStr,
      ssl: {
        rejectUnauthorized: false
      }
    });
    try {
      await client.connect();
      const res = await client.query('ALTER TABLE public.brisk_employees ADD COLUMN IF NOT EXISTS phone TEXT;');
      results[displayStr] = 'SUCCESS: ' + JSON.stringify(res);
      await client.end();
      return NextResponse.json({ success: true, message: 'Altered successfully via Vercel Supabase integration!', results }, { status: 200 });
    } catch (err) {
      results[displayStr] = 'FAILED: ' + (err instanceof Error ? err.message : String(err));
      try {
        await client.end();
      } catch (e) {}
    }
  }

  // Diagnostic dump of keys
  const injectedKeys = Object.keys(process.env).filter(key => 
    key.includes('POSTGRES') || key.includes('SUPABASE') || key.includes('DATABASE')
  );

  return NextResponse.json({
    success: false,
    message: 'Could not connect using any of the available environment variables. Please check Vercel deployment logs.',
    results,
    diagnostics: {
      injectedKeys,
      hasPostgresUrl: !!process.env.POSTGRES_URL
    }
  }, { status: 500 });
}
