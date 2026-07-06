import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json(
    { status: 'ok', message: 'Data API active. Please note that data operations are handled directly via Firebase client SDK.' },
    { status: 200 }
  );
}
