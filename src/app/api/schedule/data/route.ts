import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const passwords = ['R0E7E8tbnSCOJlI1', 'Lynden5620968.', 'peter123'];
  const results: Record<string, string> = {};

  for (const password of passwords) {
    const connectionStrings = [
      `postgres://postgres:${password}@[2406:da12:557:f800:464b:f0dd:2b1e:53d6]:5432/postgres`,
      `postgres://postgres.gcslfkujlfnznedatrsn:${password}@[2406:da12:557:f800:464b:f0dd:2b1e:53d6]:6543/postgres`
    ];

    for (const connStr of connectionStrings) {
      const displayStr = connStr.replace(password, '****');
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
