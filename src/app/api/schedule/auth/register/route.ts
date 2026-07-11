import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../supabase-admin';
import { jsonResponse } from '../../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, inviteCode } = await req.json();

    if (!email || !password || !name) {
      return jsonResponse({ error: 'Email, password, and name are required.' }, 400);
    }

    if (!inviteCode) {
      return jsonResponse({ error: 'An invitation code is required to register.' }, 400);
    }

    const targetEmail = email.toLowerCase().trim();

    // 1. Verify invitation code in Supabase brisk_invitations
    const { data: invite, error: inviteFindErr } = await supabaseAdmin
      .from('brisk_invitations')
      .select('*')
      .eq('code', inviteCode.toUpperCase().trim())
      .maybeSingle();

    if (inviteFindErr || !invite) {
      return jsonResponse({ error: 'Invalid invitation code.' }, 400);
    }

    if (invite.used) {
      return jsonResponse({ error: 'This invitation code has already been used.' }, 400);
    }

    // Force matching email if invite specifies one
    if (invite.email && invite.email.toLowerCase().trim() !== targetEmail) {
      return jsonResponse({ error: `This invitation code is registered for email: ${invite.email}` }, 400);
    }

    const targetRole = invite.role; // 'manager' or 'employee'

    // 2. Create Auth User in Supabase Auth via Admin Client
    const { data: authUser, error: authCreateErr } = await supabaseAdmin.auth.admin.createUser({
      email: targetEmail,
      password: password,
      email_confirm: true,
      user_metadata: { name: name }
    });

    if (authCreateErr || !authUser.user) {
      const msg = authCreateErr ? authCreateErr.message : 'Unknown auth creation error';
      return jsonResponse({ error: `Failed to create Auth user: ${msg}` }, 400);
    }

    const uid = authUser.user.id;

    // 3. Create Employee Profile record
    const employeeData = {
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
    };

    const { data: employee, error: empErr } = await supabaseAdmin
      .from('brisk_employees')
      .insert(employeeData)
      .select()
      .single();

    if (empErr || !employee) {
      const msg = empErr ? empErr.message : 'Unknown employee profile error';
      // Rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(uid);
      return jsonResponse({ error: `Failed to create employee profile: ${msg}` }, 500);
    }

    const employeeId = employee.id;

    // 4. Create User Role mapping in brisk_users
    const { error: roleErr } = await supabaseAdmin
      .from('brisk_users')
      .insert({
        id: uid,
        email: targetEmail,
        role: targetRole,
        employee_id: employeeId,
        name: name,
        password_hash: 'auth-managed'
      });

    if (roleErr) {
      // Rollback employee and auth user
      await supabaseAdmin.from('brisk_employees').delete().eq('id', employeeId);
      await supabaseAdmin.auth.admin.deleteUser(uid);
      return jsonResponse({ error: `Failed to register user roles: ${roleErr.message}` }, 500);
    }

    // 5. Mark invitation as used
    await supabaseAdmin
      .from('brisk_invitations')
      .update({ used: true })
      .eq('code', invite.code);

    return jsonResponse({
      success: true,
      message: 'Account registered successfully.'
    }, 200);

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return jsonResponse({ error: message }, 500);
  }
}
