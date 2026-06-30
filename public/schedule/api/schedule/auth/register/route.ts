import { NextRequest } from 'next/server';
import { supabase } from '../../../supabase';
import { hashPassword, jsonResponse, signToken } from '../../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, inviteCode } = await req.json();

    if (!email || !password || !name) {
      return jsonResponse({ error: 'Email, password, and name are required.' }, 400);
    }

    if (!inviteCode) {
      return jsonResponse({ error: 'An invitation code is required to register.' }, 400);
    }

    let targetEmail = email.toLowerCase().trim();

    // 1. Verify invitation code
    const { data: invite, error: inviteError } = await supabase
      .from('brisk_invitations')
      .select('*')
      .eq('code', inviteCode.toUpperCase().trim())
      .eq('used', false)
      .single();

    if (inviteError || !invite) {
      return jsonResponse({ error: 'Invalid or already used invitation code.' }, 400);
    }

    // Force matching email if invite specifies one (or allow any if email is empty/matching)
    const targetRole = invite.role;
    if (invite.email && invite.email.toLowerCase().trim() !== targetEmail) {
      return jsonResponse({ error: `This invitation code is registered for email: ${invite.email}` }, 400);
    }

    // 2. Create Employee Profile
    const { data: employee, error: empError } = await supabase
      .from('brisk_employees')
      .insert({
        name,
        email: targetEmail,
        role: targetRole === 'manager' ? 'Pharmacist Manager' : 'Pharmacy Staff',
        hourly_rate: targetRole === 'manager' ? 85.00 : 25.00,
        max_hours: 38,
        availability: {
          0: null,
          1: { start: '09:00', end: '17:00' },
          2: { start: '09:00', end: '17:00' },
          3: { start: '09:00', end: '17:00' },
          4: { start: '09:00', end: '17:00' },
          5: { start: '09:00', end: '17:00' },
          6: null
        },
        active: true
      })
      .select()
      .single();

    if (empError || !employee) {
      return jsonResponse({ error: `Failed to create employee profile: ${empError?.message}` }, 500);
    }

    // 3. Create User Credentials
    const passwordHash = hashPassword(password);
    const { error: userError } = await supabase
      .from('brisk_users')
      .insert({
        email: targetEmail,
        password_hash: passwordHash,
        role: targetRole, // 'manager' or 'employee'
        employee_id: employee.id
      });

    if (userError) {
      // Rollback employee to keep consistency
      await supabase.from('brisk_employees').delete().eq('id', employee.id);
      return jsonResponse({ error: `Failed to create user account: ${userError.message}` }, 500);
    }

    // 4. Mark Invitation Code as Used
    await supabase
      .from('brisk_invitations')
      .update({ used: true })
      .eq('code', inviteCode.toUpperCase().trim());

    // 5. Generate secure JWT token
    const token = signToken({
      email: targetEmail,
      role: targetRole,
      employeeId: employee.id
    });

    return jsonResponse({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        email: targetEmail,
        role: targetRole,
        employeeId: employee.id,
        name: name
      }
    }, 200);

  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}
