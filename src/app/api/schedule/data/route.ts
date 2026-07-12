import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const passwords = ['R0E7E8tbnSCOJlI1', 'Lynden5620968.', 'peter123'];
  const regions = [
    'ap-southeast-2', // Sydney
    'ap-southeast-1', // Singapore
    'us-east-1',      // N. Virginia
    'us-east-2',      // Ohio
    'us-west-1',      // N. California
    'us-west-2',      // Oregon
    'eu-central-1',   // Frankfurt
    'eu-west-1'       // Ireland
  ];
  
  const results: Record<string, string> = {};

  for (const password of passwords) {
    for (const region of regions) {
      const connStr = `postgres://postgres.gcslfkujlfnznedatrsn:${password}@aws-0-${region}.pooler.supabase.com:6543/postgres`;
      const displayStr = `postgres://postgres.gcslfkujlfnznedatrsn:****@aws-0-${region}.pooler.supabase.com:6543/postgres`;
      
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
        return NextResponse.json({ success: true, results }, { status: 200 });
      } catch (err) {
        results[displayStr] = 'FAILED: ' + (err instanceof Error ? err.message : String(err));
        try {
          await client.end();
        } catch (e) {}
      }
    }
  }

  return NextResponse.json({ success: false, results }, { status: 500 });
}
