import { NextRequest } from 'next/server';
import { supabase } from '../../../supabase';
import { hashPassword, jsonResponse } from '../../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, inviteCode } = await req.json();

    if (!email || !password || !name) {
      return jsonResponse({ error: 'Email, password, and name are required.' }, 400);
    }

    // Check if any users exist in the database (bootstrap check)
    const { count, error: countError } = await supabase
      .from('brisk_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return jsonResponse({ error: `Database error: ${countError.message}` }, 500);
    }

    const isBootstrap = count === 0;

    let targetRole = 'employee';
    let targetEmail = email.toLowerCase();

    if (isBootstrap) {
      // First user is automatically Owner
      targetRole = 'owner';
    } else {
      // Standard registration: must provide a valid invite code
      if (!inviteCode) {
        return jsonResponse({ error: 'An invitation code is required to register.' }, 400);
      }

      // Check invite code
      const { data: invite, error: inviteError } = await supabase
        .from('brisk_invitations')
        .select('*')
        .eq('code', inviteCode.toUpperCase().trim())
        .eq('used', false)
        .single();

      if (inviteError || !invite) {
        return jsonResponse({ error: 'Invalid or already used invitation code.' }, 400);
      }

      targetRole = invite.role;
      targetEmail = invite.email.toLowerCase(); // enforce invited email
    }

    // 1. Create Employee Profile
    const { data: employee, error: empError } = await supabase
      .from('brisk_employees')
      .insert({
        name,
        email: targetEmail,
        role: isBootstrap ? 'Pharmacist Manager' : (role || 'Pharmacy Staff'),
        hourly_rate: isBootstrap ? 85.00 : 25.00,
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

    // 2. Create User Credentials
    const passwordHash = hashPassword(password);
    const { error: userError } = await supabase
      .from('brisk_users')
      .insert({
        email: targetEmail,
        password_hash: passwordHash,
        role: targetRole,
        employee_id: employee.id
      });

    if (userError) {
      // Cleanup employee to maintain consistency
      await supabase.from('brisk_employees').delete().eq('id', employee.id);
      return jsonResponse({ error: `Failed to create user account: ${userError.message}` }, 500);
    }

    // 3. Mark Invitation Code as Used (if not bootstrap)
    if (!isBootstrap && inviteCode) {
      await supabase
        .from('brisk_invitations')
        .update({ used: true })
        .eq('code', inviteCode.toUpperCase().trim());
    }

    return jsonResponse({
      success: true,
      message: 'Account registered successfully.',
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
