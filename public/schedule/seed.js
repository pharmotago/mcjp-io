const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: 'C:\\Antigravity\\BriskSchedules\\.env', override: true });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Hash with unique random salt — matches production utils.ts 'salt:hash' format
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function seedPeter() {
  console.log('🧹 Clearing all existing data for Amcal Pharmacy Woywoy Rosters...');
  
  // 1. Delete all records (cascade constraints will handle foreign keys, but deleting in reverse order is safer)
  await supabase.from('brisk_invitations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_timecards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_leave_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('brisk_employees').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  console.log('✅ All tables cleared.');

  console.log('👤 Registering Peter Kim and default staff (Wendy Lobb, Laynie, Emersyn)...');

  // 2. Insert Employee Profiles
  const { data: insertedEmployees, error: empsError } = await supabase
    .from('brisk_employees')
    .insert([
      {
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
      },
      {
        name: 'Wendy Lobb',
        email: 'wendy@mcjp.io',
        role: 'Pharmacy Assistant',
        hourly_rate: 30.00,
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
      },
      {
        name: 'Laynie',
        email: 'laynie@mcjp.io',
        role: 'Pharmacy Assistant',
        hourly_rate: 30.00,
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
      },
      {
        name: 'Emersyn',
        email: 'emersyn@mcjp.io',
        role: 'Pharmacy Assistant',
        hourly_rate: 30.00,
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
      },
      {
        name: 'Vicki',
        email: 'vicki@mcjp.io',
        role: 'Pharmacy Assistant',
        hourly_rate: 30.00,
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
      },
      {
        name: 'Katherine',
        email: 'katherine@mcjp.io',
        role: 'Pharmacy Assistant',
        hourly_rate: 30.00,
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
      }
    ])
    .select();

  if (empsError || !insertedEmployees || insertedEmployees.length === 0) {
    console.error('❌ Failed to create employee profiles:', empsError?.message);
    process.exit(1);
  }

  const employee = insertedEmployees.find(e => e.email === 'pharmotago@gmail.com');
  const insertedIds = insertedEmployees.map(e => e.id);

  // 3. Create User Account — ADMIN_PASSWORD must be set in environment variables
  const defaultPassword = process.env.ADMIN_PASSWORD;
  if (!defaultPassword) {
    console.error('❌ ADMIN_PASSWORD environment variable is not set. Aborting for security.');
    await supabase.from('brisk_employees').delete().in('id', insertedIds);
    process.exit(1);
  }

  const email = 'pharmotago@gmail.com';
  
  // 먼저 기존 auth.users 에 동일 메일이 있으면 삭제 처리 (클리어 목적)
  const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
  if (!listError && usersList && usersList.users) {
    const existingUser = usersList.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      console.log(`🧹 Removing existing auth user ${email}...`);
      await supabase.auth.admin.deleteUser(existingUser.id);
    }
  }

  console.log(`🔑 Creating Supabase Auth account for ${email}...`);
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: { name: 'Peter Kim' }
  });

  if (authError || !authUser || !authUser.user) {
    console.error('❌ Failed to create auth user:', authError?.message);
    // Cleanup employees
    await supabase.from('brisk_employees').delete().in('id', insertedIds);
    process.exit(1);
  }

  const uid = authUser.user.id;
  const passwordHash = hashPassword(defaultPassword);

  const { error: userError } = await supabase
    .from('brisk_users')
    .insert({
      id: uid, // Auth user ID와 매핑
      email: email,
      password_hash: passwordHash,
      role: 'owner',
      employee_id: employee.id,
      name: 'Peter Kim' // name 필드 추가
    });

  if (userError) {
    console.error('❌ Failed to create user account:', userError.message);
    // Cleanup employees and auth user
    await supabase.from('brisk_employees').delete().in('id', insertedIds);
    await supabase.auth.admin.deleteUser(uid);
    process.exit(1);
  }

  console.log('==========================================');
  console.log(' 🎉 Peter Kim registered successfully! 🎉');
  console.log('==========================================');
  console.log(' 📧 Email: pharmotago@gmail.com');
  console.log(' 🔑 Password: ******** (set via ADMIN_PASSWORD env variable)');
  console.log(' 💼 Role: Pharmacist Manager (Owner)');
  console.log('==========================================');
}

seedPeter();
