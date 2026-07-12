import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const envDump: Record<string, string | undefined> = {
    mcjp_POSTGRES_PASSWORD: process.env.mcjp_POSTGRES_PASSWORD,
    mcjp_POSTGRES_USER: process.env.mcjp_POSTGRES_USER,
    mcjp_POSTGRES_HOST: process.env.mcjp_POSTGRES_HOST,
    mcjp_POSTGRES_DATABASE: process.env.mcjp_POSTGRES_DATABASE,
    mcjp_POSTGRES_URL: process.env.mcjp_POSTGRES_URL,
    mcjp_POSTGRES_URL_NON_POOLING: process.env.mcjp_POSTGRES_URL_NON_POOLING,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_HOST: process.env.POSTGRES_HOST,
    POSTGRES_DATABASE: process.env.POSTGRES_DATABASE,
    POSTGRES_URL: process.env.POSTGRES_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    mcjp_SUPABASE_URL: process.env.mcjp_SUPABASE_URL
  };

  return NextResponse.json({
    success: true,
    envDump
  }, { status: 200 });
}
