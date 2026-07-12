import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const passwords = ['R0E7E8tbnSCOJlI1', 'Lynden5620968.', 'peter123'];
  const results: Record<string, string> = {};

  for (const password of passwords) {
    // Try AP-Southeast-2 pooler and direct ports
    const connectionStrings = [
      `postgres://postgres.gcslfkujlfnznedatrsn:${password}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=require`,
      `postgres://postgres.gcslfkujlfnznedatrsn:${password}@db.gcslfkujlfnznedatrsn.supabase.co:5432/postgres?sslmode=require`
    ];

    for (const connStr of connectionStrings) {
      const client = new Client({ connectionString: connStr });
      try {
        await client.connect();
        const res = await client.query('ALTER TABLE public.brisk_employees ADD COLUMN IF NOT EXISTS phone TEXT;');
        results[connStr.replace(password, '****')] = 'SUCCESS: ' + JSON.stringify(res);
        await client.end();
        // If successfully altered, we can break early
        return NextResponse.json({ success: true, results }, { status: 200 });
      } catch (err) {
        results[connStr.replace(password, '****')] = 'FAILED: ' + (err instanceof Error ? err.message : String(err));
        try {
          await client.end();
        } catch (e) {}
      }
    }
  }

  return NextResponse.json({ success: false, results }, { status: 500 });
}
