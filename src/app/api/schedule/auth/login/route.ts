import { NextRequest } from 'next/server';
import { supabase } from '../../../supabase';
import { hashPassword, jsonResponse, signToken } from '../../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return jsonResponse({ error: 'Email and password are required.' }, 400);
    }

    // Query user matching credentials
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
      .eq('email', email.toLowerCase().trim())
      .eq('password_hash', passwordHash)
      .single();

    if (userError || !user) {
      return jsonResponse({ error: 'Invalid email or password.' }, 401);
    }

    // Extract employee name
    const name = user.brisk_employees ? (user.brisk_employees as any).name : 'Pharmacist Manager';
    
    // Generate secure stateless JWT token
    const token = signToken({
      email: user.email,
      role: user.role,
      employeeId: user.employee_id || ''
    });

    return jsonResponse({
      success: true,
      token,
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
