import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/api/supabase-admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { data: userRecords, error: userErr } = await supabaseAdmin
      .from('brisk_users')
      .select('*')
      .eq('email', 'pharmotago@gmail.com');

    const { data: employeeRecords, error: empErr } = await supabaseAdmin
      .from('brisk_employees')
      .select('*')
      .eq('email', 'pharmotago@gmail.com');

    return NextResponse.json({
      success: true,
      userRecords,
      employeeRecords,
      errors: {
        userErr: userErr?.message,
        empErr: empErr?.message
      }
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : String(err)
    }, { status: 500 });
  }
}
