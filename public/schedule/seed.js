const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: 'C:\\Antigravity\\.env' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const SALT = 'brisk_salt_key_2026';

function hashPassword(password) {
  return crypto.pbkdf2Sync(password, SALT, 1000, 64, 'sha512').toString('hex');
}

async function seedPeter() {
  console.log('🧹 Clearing all existing BriskSchedules data...');
  
  // 1. Delete all records (cascade constraints will handle foreign keys, but deleting in reverse order is safer)
  await supabase.from('brisk_invitations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_timecards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_leave_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('✅ All tables cleared.');

  console.log('👤 Registering Peter Kim as primary Owner...');

  // 2. Insert Employee Profile
  const { data: employee, error: empError } = await supabase
    .from('brisk_employees')
    .insert({
      name: 'Peter Kim',
      email: 'pharmotago@gmail.com',
      role: 'Pharmacist Manager',
      hourly_rate: 85.00,
      max_hours: 45,
      availability: {
        0: null, // Sunday
        1: { start: '08:30', end: '17:30' }, // Monday
        2: { start: '08:30', end: '17:30' },
        3: { start: '08:30', end: '17:30' },
        4: { start: '08:30', end: '17:30' },
        5: { start: '08:30', end: '17:30' },
        6: { start: '09:00', end: '13:00' }  // Saturday
      },
      active: true
    })
    .select()
    .single();

  if (empError || !employee) {
    console.error('❌ Failed to create employee profile:', empError?.message);
    process.exit(1);
  }

  // 3. Create User Account
  const defaultPassword = 'peter123';
  const passwordHash = hashPassword(defaultPassword);

  const { error: userError } = await supabase
    .from('brisk_users')
    .insert({
      email: 'pharmotago@gmail.com',
      password_hash: passwordHash,
      role: 'owner',
      employee_id: employee.id
    });

  if (userError) {
    console.error('❌ Failed to create user account:', userError.message);
    // Cleanup employee
    await supabase.from('brisk_employees').delete().eq('id', employee.id);
    process.exit(1);
  }

  console.log('==========================================');
  console.log(' 🎉 Peter Kim registered successfully! 🎉');
  console.log('==========================================');
  console.log(' 📧 Email: pharmotago@gmail.com');
  console.log(' 🔑 Temporary Password: peter123');
  console.log(' 💼 Role: Pharmacist Manager (Owner)');
  console.log('==========================================');
}

seedPeter();
