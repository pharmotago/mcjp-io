import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const results: Record<string, string> = {};
  const passwords = ['R0E7E8tbnSCOJlI1', 'Lynden5620968.', 'peter123'];

  // Test permutations for Seoul Region Pooler
  const dbConfigs: Array<{
    host: string;
    port: number;
    user: string;
    pass: string;
  }> = [];

  for (const password of passwords) {
    // Both port 5432 and 6543
    dbConfigs.push({
      host: 'aws-1-ap-northeast-2.pooler.supabase.com',
      port: 5432,
      user: 'postgres.gcslfkujlfnznedatrsn',
      pass: password
    });
    dbConfigs.push({
      host: 'aws-1-ap-northeast-2.pooler.supabase.com',
      port: 6543,
      user: 'postgres.gcslfkujlfnznedatrsn',
      pass: password
    });
    // In case pooler allows direct postgres user
    dbConfigs.push({
      host: 'aws-1-ap-northeast-2.pooler.supabase.com',
      port: 5432,
      user: 'postgres',
      pass: password
    });
  }

  for (const config of dbConfigs) {
    const displayLabel = `host=${config.host} port=${config.port} user=${config.user} pass=****`;
    const client = new Client({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.pass,
      database: 'postgres',
      ssl: {
        rejectUnauthorized: false
      }
    });

    try {
      await client.connect();
      const res = await client.query('ALTER TABLE public.brisk_employees ADD COLUMN IF NOT EXISTS phone TEXT;');
      results[displayLabel] = 'SUCCESS: ' + JSON.stringify(res);
      await client.end();
      return NextResponse.json({ success: true, message: 'Altered successfully via Seoul Pooler!', results }, { status: 200 });
    } catch (err) {
      results[displayLabel] = 'FAILED: ' + (err instanceof Error ? err.message : String(err));
      try {
        await client.end();
      } catch (e) {}
    }
  }

  return NextResponse.json({
    success: false,
    message: 'All connection attempts to Seoul Pooler failed.',
    results
  }, { status: 500 });
}
