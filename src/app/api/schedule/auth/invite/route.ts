import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '../../../firebase-admin';
import { getRequestUser, jsonResponse } from '../../utils';

export async function OPTIONS() {
  return jsonResponse({}, 200);
}

export async function POST(req: NextRequest) {
  try {
    const requester = await getRequestUser(req);

    // Permission check: Only managers or owners can create invitations
    if (!requester.isAuthenticated || (requester.role !== 'owner' && requester.role !== 'manager')) {
      return jsonResponse({ error: 'Access denied. Managers or owners only.' }, 403);
    }

    const { email, role } = await req.json();

    if (!email || !role) {
      return jsonResponse({ error: 'Email and role are required.' }, 400);
    }

    if (role !== 'manager' && role !== 'employee') {
      return jsonResponse({ error: 'Invalid role. Choose manager or employee.' }, 400);
    }

    // Generate unique 6 character code
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();

    // Store in Firestore: /organizations/amcal_woywoy/invitations/{code}
    await adminDb
      .collection('organizations')
      .doc('amcal_woywoy')
      .collection('invitations')
      .doc(code)
      .set({
        code,
        email: email.toLowerCase(),
        role,
        used: false,
        createdAt: new Date().toISOString()
      });

    return jsonResponse({
      success: true,
      code,
      inviteUrl: `https://schedule.mcjp.io/?invite=${code}`
    }, 200);

  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
}
