import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Temporary diagnostic route to retrieve system configuration
  return NextResponse.json(
    { env: process.env },
    { status: 200 }
  );
}
