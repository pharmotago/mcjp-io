import { NextRequest } from 'next/server';
import { adminAuth, adminDb } from '../../../firebase-admin';
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

    // 1. Verify invitation code in Firestore
    const inviteDoc = await adminDb
      .collection('organizations')
      .doc('amcal_woywoy')
      .collection('invitations')
      .doc(inviteCode.toUpperCase().trim())
      .get();

    if (!inviteDoc.exists) {
      return jsonResponse({ error: 'Invalid invitation code.' }, 400);
    }

    const invite = inviteDoc.data();
    if (!invite || invite.used) {
      return jsonResponse({ error: 'This invitation code has already been used.' }, 400);
    }

    // Force matching email if invite specifies one
    if (invite.email && invite.email.toLowerCase().trim() !== targetEmail) {
      return jsonResponse({ error: `This invitation code is registered for email: ${invite.email}` }, 400);
    }

    const targetRole = invite.role; // 'manager' or 'employee'

    // 2. Create Auth User in Firebase
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email: targetEmail,
        password: password,
        displayName: name
      });
    } catch (createErr: any) {
      return jsonResponse({ error: `Failed to create Firebase Auth user: ${createErr.message}` }, 400);
    }

    // 3. Create Employee Profile Document
    const employeeRef = adminDb
      .collection('organizations')
      .doc('amcal_woywoy')
      .collection('employees')
      .doc();

    const employeeId = employeeRef.id;

    try {
      await employeeRef.set({
        id: employeeId,
        name,
        email: targetEmail,
        role: targetRole === 'manager' ? 'Pharmacist Manager' : 'Pharmacy Staff',
        hourlyRate: targetRole === 'manager' ? 85.00 : 25.00,
        maxHours: 38,
        availability: {
          0: null,
          1: { start: '09:00', end: '17:00' },
          2: { start: '09:00', end: '17:00' },
          3: { start: '09:00', end: '17:00' },
          4: { start: '09:00', end: '17:00' },
          5: { start: '09:00', end: '17:00' },
          6: null
        },
        active: true,
        uid: userRecord.uid
      });
    } catch (empErr: any) {
      // Rollback user creation to maintain consistency
      await adminAuth.deleteUser(userRecord.uid);
      return jsonResponse({ error: `Failed to create employee profile: ${empErr.message}` }, 500);
    }

    // 4. Create User Role mapping
    try {
      await adminDb
        .collection('organizations')
        .doc('amcal_woywoy')
        .collection('users')
        .doc(userRecord.uid)
        .set({
          role: targetRole, // 'manager' or 'employee'
          employeeId,
          name,
          email: targetEmail,
          createdAt: new Date().toISOString()
        });
    } catch (roleErr: any) {
      // Rollback employee document and auth user
      await employeeRef.delete();
      await adminAuth.deleteUser(userRecord.uid);
      return jsonResponse({ error: `Failed to register user roles: ${roleErr.message}` }, 500);
    }

    // 5. Mark invitation as used
    await inviteDoc.ref.update({ used: true });

    return jsonResponse({
      success: true,
      message: 'Account registered successfully.'
    }, 200);

  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}
