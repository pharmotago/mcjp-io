import { NextRequest } from 'next/server';
import { supabase } from '../../supabase';
import { hashPassword, jsonResponse } from '../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required.' }, 400);
    }

    // Check if the database has any users
    const { count, error: countError } = await supabase
      .from('brisk_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      return jsonResponse({ error: `Database error: ${countError.message}` }, 500);
    }

    // Bootstrap check: If no users exist, notify client that they can register directly as Owner
    if (count === 0) {
      return jsonResponse({ bootstrap: true, message: 'Database is empty. Register the first owner user.' }, 200);
    }

    // Query user
    const passwordHash = hashPassword(password);
    const { data: user, error: userError } = await supabase
      .from('brisk_users')
      .select(`
        id,
        email,
        role,
        employee_id,
        brisk_employees (
          name
        )
      `)
      .eq('email', email.toLowerCase())
      .eq('password_hash', passwordHash)
      .single();

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid email or password.' }, 401);
    }

    // Format return payload
    const name = user.brisk_employees ? (user.brisk_employees as any).name : 'Owner';
    
    return jsonResponse({
      success: true,
      user: {
        email: user.email,
        role: user.role,
        employeeId: user.employee_id,
        name: name
      }
    }, 200);

  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}
